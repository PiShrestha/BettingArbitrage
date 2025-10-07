import { z } from "zod";
import {
  arbitrageOpportunitySchema,
  simulationSummarySchema,
  arbitrageRiskMetricsSchema,
  type ArbitrageOpportunity,
  type Market,
  type SimulationSummary,
} from "@shared/schema";

const ANALYTICS_TIMEOUT_MS = Number.parseInt(
  process.env.ANALYTICS_TIMEOUT_MS ?? "8000",
  10
);
const ANALYTICS_URL = process.env.ANALYTICS_URL ?? "http://localhost:8081";

const analyzeResponseSchema = z.object({
  opportunities: z.array(
    arbitrageOpportunitySchema.extend({
      metrics: arbitrageRiskMetricsSchema.optional(),
      simulation: simulationSummarySchema.optional(),
    })
  ),
});

const simulateResponseSchema = simulationSummarySchema;

interface AnalyzeOptions {
  bankroll: number;
  minimumEdge: number;
}

interface AnalyzePayload {
  snapshotTime: string;
  bankroll: number;
  minimumEdge: number;
  markets: Market[];
}

export async function analyzeMarkets(
  markets: Market[],
  options: AnalyzeOptions
): Promise<ArbitrageOpportunity[]> {
  if (!markets.length) {
    return [];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANALYTICS_TIMEOUT_MS);

  try {
    const payload: AnalyzePayload = {
      snapshotTime: new Date().toISOString(),
      bankroll: options.bankroll,
      minimumEdge: options.minimumEdge,
      markets,
    };

    const response = await fetch(`${ANALYTICS_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Analytics service responded with ${response.status}: ${text}`
      );
    }

    const json = await response.json();
    const parsed = analyzeResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(`Invalid analytics response: ${parsed.error.message}`);
    }

    return parsed.data.opportunities;
  } finally {
    clearTimeout(timeout);
  }
}

interface SimulationRequest {
  opportunity: ArbitrageOpportunity;
  trials?: number;
  bankroll?: number;
}

export async function simulateOpportunity(
  request: SimulationRequest
): Promise<SimulationSummary> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANALYTICS_TIMEOUT_MS);

  try {
    const response = await fetch(`${ANALYTICS_URL}/api/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Analytics service responded with ${response.status}: ${text}`
      );
    }

    const json = await response.json();
    const parsed = simulateResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(`Invalid simulation response: ${parsed.error.message}`);
    }

    return parsed.data;
  } finally {
    clearTimeout(timeout);
  }
}
