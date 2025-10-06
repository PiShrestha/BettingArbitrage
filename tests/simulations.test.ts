/// <reference types="vitest" />

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { backtestBets } from "../server/sim/pnlSimulator";
import { runMonteCarlo } from "../server/sim/montecarlo";

beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("simulation utilities", () => {
  it("computes bankroll evolution for deterministic bets", () => {
    const result = backtestBets(
      [
        { oddsDecimal: 2.0, result: "win", stakeAmount: 100 },
        { oddsDecimal: 1.5, result: "lose", stakeAmount: 50 },
        { oddsDecimal: 3.0, result: "win", stakeAmount: 25 },
      ],
      {
        startingBankroll: 500,
        useKellyWhenStakeMissing: false,
      }
    );

    expect(result.finalBankroll).toBeCloseTo(600, 5);
    expect(result.totalBets).toBe(3);
    expect(result.equityCurve.length).toBe(4);
    expect(typeof result.sharpe).toBe("number");
    expect(result.maxDrawdown).toBeGreaterThanOrEqual(0);
  });

  it("runs Monte Carlo simulation over strategy", () => {
    const summary = runMonteCarlo({
      simulations: 10,
      stepsPerSimulation: 5,
      startingBankroll: 1_000,
      defaultOdds: 2,
      defaultWinProbability: 0.55,
      strategy: ({ bankroll }) => ({
        stakeAmount: Math.min(50, bankroll * 0.05),
        oddsDecimal: 2,
        winProbability: 0.55,
      }),
    });

    expect(summary.finalBankrolls.length).toBe(10);
    expect(summary.meanFinalBankroll).toBeGreaterThan(0);
    expect(summary.probabilityOfLoss).toBeGreaterThanOrEqual(0);
    expect(summary.probabilityOfLoss).toBeLessThanOrEqual(1);
  });
});
