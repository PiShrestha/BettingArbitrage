/// <reference types="vitest" />

import { describe, it, expect } from "vitest";
import { ingestProvider } from "../server/workers/ingestOdds";
import { createFixtureEndpoints } from "../server/workers/fixtures/providerFixtures";

describe("ingestProvider", () => {
  it("normalizes fixture payloads into markets", async () => {
    const endpoints = createFixtureEndpoints();
    const markets = await ingestProvider(endpoints[0]);

    expect(markets.length).toBeGreaterThan(0);
    for (const market of markets) {
      expect(market.provider.id).toBe(endpoints[0].id);
      expect(market.oddsDecimal).toBeGreaterThan(1);
      expect(market.impliedProbability).toBeGreaterThan(0);
      expect(market.runner.name.length).toBeGreaterThan(0);
    }
  });

  it("supports multiple providers without id collisions", async () => {
    const endpoints = createFixtureEndpoints();
    const marketsPerProvider = await Promise.all(
      endpoints.map((endpoint) => ingestProvider(endpoint))
    );
    const ids = new Set<string>();
    marketsPerProvider.flat().forEach((market) => ids.add(market.id));
    expect(ids.size).toBeGreaterThan(0);
    expect(ids.size).toBe(marketsPerProvider.flat().length);
  });
});
