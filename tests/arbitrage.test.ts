/// <reference types="vitest" />

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ArbitrageStake } from "../shared/schema";
import type { Market, Provider } from "../shared/schema";
import {
  detectArbitrageOpportunities,
  detectBestArbitrage,
} from "../server/workers/arbitrage";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("arbitrage detection", () => {
  it("finds opportunities across providers", () => {
    const providerA: Provider = {
      id: "provider-a",
      name: "Provider A",
      slug: "provider-a",
    };
    const providerB: Provider = {
      id: "provider-b",
      name: "Provider B",
      slug: "provider-b",
    };

    const markets: Market[] = [
      {
        id: "event-1-moneyline-team-a-provider-a",
        provider: providerA,
        eventId: "event-1",
        eventName: "Team A vs Team B",
        league: "Test League",
        sport: "test",
        marketName: "Match Winner",
        marketType: "moneyline",
        runner: { id: "team-a", name: "Team A" },
        oddsDecimal: 2.1,
        impliedProbability: Number((1 / 2.1).toFixed(6)),
        timestamp: new Date().toISOString(),
        line: undefined,
      },
      {
        id: "event-1-moneyline-team-b-provider-b",
        provider: providerB,
        eventId: "event-1",
        eventName: "Team A vs Team B",
        league: "Test League",
        sport: "test",
        marketName: "Match Winner",
        marketType: "moneyline",
        runner: { id: "team-b", name: "Team B" },
        oddsDecimal: 2.15,
        impliedProbability: Number((1 / 2.15).toFixed(6)),
        timestamp: new Date().toISOString(),
        line: undefined,
      },
    ];

    const opportunities = detectArbitrageOpportunities(markets, {
      bankroll: 1_000,
      minimumEdge: 0.001,
      minimumProviders: 2,
    });

    expect(opportunities.length).toBeGreaterThan(0);
    const top = opportunities[0];
    expect(top.bankroll).toBe(1_000);
    expect(top.guaranteedProfitFraction).toBeGreaterThan(0);
    const totalStake = top.stakes.reduce(
      (sum: number, stake: ArbitrageStake) => sum + stake.stakeAmount,
      0
    );
    expect(totalStake).toBeGreaterThan(0);
  });

  it("returns null when no arbitrage exists", () => {
    const markets = [
      {
        id: "m1",
        provider: { id: "p1", name: "P1", slug: "p1" },
        eventId: "event-1",
        eventName: "Demo Event",
        league: "Test",
        sport: "test",
        marketName: "moneyline",
        marketType: "moneyline" as const,
        runner: { id: "runner-1", name: "Runner" },
        oddsDecimal: 1.8,
        impliedProbability: 1 / 1.8,
        timestamp: new Date().toISOString(),
      },
    ];

    const result = detectBestArbitrage(markets, {
      bankroll: 100,
      minimumEdge: 0.001,
      minimumProviders: 2,
    });

    expect(result).toBeNull();
  });
});
