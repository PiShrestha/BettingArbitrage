import schedule from "node-schedule";
import type { Market } from "@shared/schema";
import { storage } from "./storage";
import { ingestProvider } from "./workers/ingestOdds";
import { detectArbitrageOpportunities } from "./workers/arbitrage";
import { createFixtureEndpoints } from "./workers/fixtures/providerFixtures";
import { analyzeMarkets } from "./analyticsClient";

const providers = createFixtureEndpoints();

interface SchedulerOptions {
  bankroll: number;
  minimumEdge: number;
  runIntervalSeconds: number;
}

const DEFAULT_OPTIONS: SchedulerOptions = {
  bankroll: 1_000,
  minimumEdge: 0.004,
  runIntervalSeconds: 15,
};

async function ingestAllProviders(): Promise<Market[]> {
  const results: Market[] = [];
  await Promise.all(
    providers.map(async (endpoint) => {
      try {
        const markets = await ingestProvider(endpoint);
        results.push(...markets);
      } catch (error) {
        console.error(
          `[scheduler] Failed to ingest provider ${endpoint.slug}:`,
          error
        );
      }
    })
  );
  return results;
}

async function runPipeline(options: SchedulerOptions): Promise<void> {
  const markets = await ingestAllProviders();
  await storage.upsertMarkets(markets);

  let opportunities = [];

  try {
    opportunities = await analyzeMarkets(markets, {
      bankroll: options.bankroll,
      minimumEdge: options.minimumEdge,
    });
  } catch (error) {
    console.error(
      "[scheduler] Analytics service unavailable, falling back to local detection",
      error
    );
    opportunities = detectArbitrageOpportunities(markets, {
      bankroll: options.bankroll,
      minimumEdge: options.minimumEdge,
      minimumProviders: 2,
    });
  }

  await storage.setArbitrageOpportunities(opportunities);

  if (opportunities.length) {
    const top = opportunities[0];
    console.info(
      `[scheduler] Found ${
        opportunities.length
      } arbitrage opportunities. Top edge ${(
        top.guaranteedProfitFraction * 100
      ).toFixed(2)}%`
    );
  } else {
    console.info("[scheduler] No arbitrage opportunities detected this cycle");
  }
}

export function startScheduler(
  partialOptions: Partial<SchedulerOptions> = {}
): void {
  const options = { ...DEFAULT_OPTIONS, ...partialOptions };
  console.info(
    `[scheduler] Starting arbitrage scheduler (interval ${options.runIntervalSeconds}s, bankroll $${options.bankroll})`
  );

  void runPipeline(options);

  schedule.scheduleJob(`*/${options.runIntervalSeconds} * * * * *`, () => {
    void runPipeline(options);
  });
}
