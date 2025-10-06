import { z } from "zod";
import {
  Market,
  marketSchema,
  providerSchema,
  Provider,
  CanonicalEvent,
  canonicalEventSchema,
  runnerSchema,
} from "@shared/schema";

export type OddsFormat = "decimal" | "american" | "fractional";

export interface ProviderEndpoint {
  id: string;
  name: string;
  slug: string;
  sport?: string;
  league?: string;
  url: string;
  oddsFormat: OddsFormat;
  transform?: (payload: unknown) => ProviderOddsPayload;
  fetcher?: () => Promise<unknown> | unknown;
}

export const providerOddsPayloadSchema = z.object({
  events: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        startTime: z.string(),
        sport: z.string().optional(),
        league: z.string().optional(),
        homeTeam: z.string().optional(),
        awayTeam: z.string().optional(),
        markets: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
              type: z
                .enum(["moneyline", "spread", "total", "other"])
                .default("other"),
              line: z.number().optional(),
              runners: z
                .array(
                  z.object({
                    id: z.string(),
                    name: z.string(),
                    price: z.union([z.number(), z.string()]),
                  })
                )
                .nonempty(),
            })
          )
          .nonempty(),
      })
    )
    .nonempty(),
  generatedAt: z.string().optional(),
});

export type ProviderOddsPayload = z.infer<typeof providerOddsPayloadSchema>;
export type ProviderOddsEvent = ProviderOddsPayload["events"][number];
export type ProviderOddsMarket = ProviderOddsEvent["markets"][number];
export type ProviderOddsRunner = ProviderOddsMarket["runners"][number];

export async function fetchProviderPayload(
  endpoint: ProviderEndpoint
): Promise<ProviderOddsPayload> {
  const raw = endpoint.fetcher
    ? await endpoint.fetcher()
    : await (async () => {
        const res = await fetch(endpoint.url);
        if (!res.ok) {
          throw new Error(
            `Failed to fetch odds from ${endpoint.slug}: ${res.status}`
          );
        }
        return res.json();
      })();
  const transformed = endpoint.transform ? endpoint.transform(raw) : raw;
  const parsed = providerOddsPayloadSchema.safeParse(transformed);
  if (!parsed.success) {
    throw new Error(
      `Invalid odds payload for ${endpoint.slug}: ${parsed.error.message}`
    );
  }

  return parsed.data;
}

export function convertOddsToDecimal(
  price: number | string,
  format: OddsFormat
): number {
  if (format === "decimal") {
    const value = typeof price === "string" ? Number(price) : price;
    if (!Number.isFinite(value) || value <= 1) {
      throw new Error(`Invalid decimal odds: ${price}`);
    }
    return value;
  }

  if (format === "american") {
    const value = typeof price === "string" ? Number(price) : price;
    if (!Number.isFinite(value) || Math.abs(value) < 100) {
      throw new Error(`Invalid American odds: ${price}`);
    }
    if (value > 0) {
      return value / 100 + 1;
    }
    return 100 / Math.abs(value) + 1;
  }

  if (format === "fractional") {
    if (typeof price === "number") {
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error(`Invalid fractional odds: ${price}`);
      }
      return price + 1;
    }
    const [numStr, denStr] = price.split("/");
    const numerator = Number(numStr);
    const denominator = Number(denStr);
    if (
      !Number.isFinite(numerator) ||
      !Number.isFinite(denominator) ||
      denominator === 0
    ) {
      throw new Error(`Invalid fractional odds: ${price}`);
    }
    return numerator / denominator + 1;
  }

  throw new Error(`Unsupported odds format: ${format}`);
}

export interface NormalizeOptions {
  canonicalEvents?: CanonicalEvent[];
  timestamp?: string;
  oddsFormat?: OddsFormat;
}

function inferCanonicalEvent(
  event: ProviderOddsEvent,
  provider: Provider,
  candidates: CanonicalEvent[] = []
): CanonicalEvent {
  const directMatch = candidates.find((candidate) => candidate.id === event.id);
  if (directMatch) return directMatch;

  const fuzzyMatch = candidates.find((candidate) => {
    if (candidate.eventName.toLowerCase() === event.name.toLowerCase()) {
      return true;
    }
    if (
      candidate.homeTeam &&
      candidate.awayTeam &&
      event.homeTeam &&
      event.awayTeam
    ) {
      const homeMatch =
        candidate.homeTeam.toLowerCase() === event.homeTeam.toLowerCase();
      const awayMatch =
        candidate.awayTeam.toLowerCase() === event.awayTeam.toLowerCase();
      return homeMatch && awayMatch;
    }
    return false;
  });

  return (
    fuzzyMatch || {
      id: `${provider.slug}-${event.id}`,
      eventName: event.name,
      startTime: event.startTime,
      sport: event.sport || "unknown",
      league: event.league,
      homeTeam: event.homeTeam,
      awayTeam: event.awayTeam,
    }
  );
}

export function normalizeMarkets(
  provider: Provider,
  payload: ProviderOddsPayload,
  options: NormalizeOptions = {}
): Market[] {
  const timestamp =
    options.timestamp || payload.generatedAt || new Date().toISOString();
  const canonicalEvents = options.canonicalEvents || [];
  const oddsFormat = options.oddsFormat || "decimal";

  const markets: Market[] = [];

  for (const event of payload.events) {
    const canonicalEvent = inferCanonicalEvent(
      event,
      provider,
      canonicalEvents
    );
    const canonical = canonicalEventSchema.parse(canonicalEvent);

    for (const market of event.markets) {
      for (const runner of market.runners) {
        const decimalOdds = convertOddsToDecimal(runner.price, oddsFormat);
        const normalizedRunner = runnerSchema.parse({
          id: runner.id,
          name: runner.name,
        });

        const normalizedMarket = marketSchema.parse({
          id: `${provider.slug}-${event.id}-${market.id}-${runner.id}`,
          provider,
          eventId: canonical.id,
          eventName: canonical.eventName,
          league: canonical.league,
          sport: canonical.sport,
          marketName: market.name,
          marketType: market.type ?? "other",
          runner: normalizedRunner,
          oddsDecimal: decimalOdds,
          impliedProbability: Number((1 / decimalOdds).toFixed(6)),
          timestamp,
          line: market.line,
        });

        markets.push(normalizedMarket);
      }
    }
  }

  return dedupeMarkets(markets);
}

export function dedupeMarkets(markets: Market[]): Market[] {
  const map = new Map<string, Market>();
  for (const market of markets) {
    const key = `${market.eventId}:${market.marketName}:${market.runner.id}:${market.provider.id}`;
    const existing = map.get(key);
    if (!existing || existing.timestamp < market.timestamp) {
      map.set(key, market);
    }
  }
  return Array.from(map.values());
}

export async function ingestProvider(
  endpoint: ProviderEndpoint,
  options: NormalizeOptions = {}
): Promise<Market[]> {
  const provider = providerSchema.parse({
    id: endpoint.id,
    name: endpoint.name,
    slug: endpoint.slug,
  });
  const payload = await fetchProviderPayload(endpoint);
  return normalizeMarkets(provider, payload, {
    ...options,
    oddsFormat: options.oddsFormat || endpoint.oddsFormat,
  });
}
