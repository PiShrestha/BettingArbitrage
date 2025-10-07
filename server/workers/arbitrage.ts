import {
  Market,
  ArbitrageOpportunity,
  ArbitrageStake,
  Provider,
} from "@shared/schema";

interface RunnerQuote {
  market: Market;
  provider: Provider;
  odds: number;
  impliedProbability: number;
}

interface MarketGroupingKey {
  eventId: string;
  marketName: string;
  runnerId: string;
}

function toGroupingKey(market: Market): MarketGroupingKey {
  return {
    eventId: market.eventId,
    marketName: market.marketName.toLowerCase(),
    runnerId: market.runner.id,
  };
}

function serializeGroupingKey(key: MarketGroupingKey): string {
  return `${key.eventId}::${key.marketName}::${key.runnerId}`;
}

function bestQuotesByRunner(markets: Market[]): Map<string, RunnerQuote> {
  const bestQuotes = new Map<string, RunnerQuote>();
  for (const market of markets) {
    const key = serializeGroupingKey(toGroupingKey(market));
    const existing = bestQuotes.get(key);
    if (!existing || existing.odds < market.oddsDecimal) {
      bestQuotes.set(key, {
        market,
        provider: market.provider,
        odds: market.oddsDecimal,
        impliedProbability: 1 / market.oddsDecimal,
      });
    }
  }
  return bestQuotes;
}

function groupQuotesByEventAndMarket(
  quotes: Map<string, RunnerQuote>
): Map<string, RunnerQuote[]> {
  const grouped = new Map<string, RunnerQuote[]>();
  for (const quote of Array.from(quotes.values())) {
    const key = `${
      quote.market.eventId
    }::${quote.market.marketName.toLowerCase()}`;
    const list = grouped.get(key) ?? [];
    list.push(quote);
    grouped.set(key, list);
  }
  return grouped;
}

export interface ArbitrageDetectionOptions {
  bankroll: number;
  minimumEdge?: number; // minimum guaranteed profit fraction
  minimumProviders?: number;
}

const DEFAULT_DETECTION_OPTIONS: Required<ArbitrageDetectionOptions> = {
  bankroll: 1000,
  minimumEdge: 0.005,
  minimumProviders: 2,
};

function calculateStakes(
  quotes: RunnerQuote[],
  bankroll: number
): { stakes: ArbitrageStake[]; guaranteedProfitFraction: number } | null {
  if (quotes.length < 2) {
    return null;
  }

  const sumImplied = quotes.reduce(
    (sum, quote) => sum + quote.impliedProbability,
    0
  );
  if (sumImplied >= 1) {
    return null;
  }

  const payoutMultiplier = 1 / sumImplied;
  const guaranteedProfitFraction = payoutMultiplier - 1;

  const stakes: ArbitrageStake[] = quotes.map((quote) => {
    const stakeFraction = quote.impliedProbability / sumImplied;
    const stakeAmount = stakeFraction * bankroll;
    const payout = stakeAmount * quote.odds;
    return {
      runner: quote.market.runner.name,
      providerId: quote.provider.id,
      providerName: quote.provider.name,
      odds: quote.odds,
      stakeFraction,
      stakeAmount,
      payout,
    };
  });

  return { stakes, guaranteedProfitFraction };
}

export function detectArbitrageOpportunities(
  markets: Market[],
  opts: ArbitrageDetectionOptions
): ArbitrageOpportunity[] {
  const options = { ...DEFAULT_DETECTION_OPTIONS, ...opts };
  const bestQuotes = bestQuotesByRunner(markets);
  const groups = groupQuotesByEventAndMarket(bestQuotes);

  const opportunities: ArbitrageOpportunity[] = [];

  for (const group of Array.from(groups.values())) {
    const uniqueProviders = new Set(
      group.map((quote: RunnerQuote) => quote.provider.id)
    );
    if (uniqueProviders.size < options.minimumProviders) {
      continue;
    }

    const result = calculateStakes(group, options.bankroll);
    if (!result) continue;
    if (result.guaranteedProfitFraction < options.minimumEdge) continue;

    const sample = group[0];
    opportunities.push({
      eventId: sample.market.eventId,
      eventName: sample.market.eventName,
      marketName: sample.market.marketName,
      sport: sample.market.sport,
      league: sample.market.league,
      sumImpliedProbability: group.reduce<number>((sum, quote: RunnerQuote) => {
        return sum + quote.impliedProbability;
      }, 0),
      guaranteedProfitFraction: result.guaranteedProfitFraction,
      bankroll: options.bankroll,
      stakes: result.stakes,
      createdAt: new Date().toISOString(),
    });
  }

  return opportunities.sort(
    (a, b) => b.guaranteedProfitFraction - a.guaranteedProfitFraction
  );
}

export function detectBestArbitrage(
  markets: Market[],
  opts: ArbitrageDetectionOptions
): ArbitrageOpportunity | null {
  const results = detectArbitrageOpportunities(markets, opts);
  return results[0] ?? null;
}
