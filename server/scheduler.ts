import { storage } from "./storage";
import schedule from "node-schedule";
import { trainModel, predictNextOdds } from "./ml/predictions";

// Mock betting odds data
const mockEvents = [
  {
    sport: "Football",
    event: "Premier League: Chelsea vs Arsenal",
    team1: "Chelsea",
    team2: "Arsenal",
  },
  {
    sport: "Basketball",
    event: "NBA: Lakers vs Warriors",
    team1: "Lakers",
    team2: "Warriors",
  }
];

// Store historical odds for ML predictions
const historicalOdds: Record<string, number[]> = {
  "Premier League: Chelsea vs Arsenal": [],
  "NBA: Lakers vs Warriors": []
};

async function generateMockOdds() {
  const odds1 = 2.0 + Math.random() * 0.3; // Generate odds between 2.0 and 2.3
  const odds2 = 2.0 + Math.random() * 0.3;
  return { odds1, odds2 };
}

async function calculateArbitrage(odds1: number, odds2: number) {
  // Calculate implied probabilities
  const prob1 = 1 / odds1;
  const prob2 = 1 / odds2;

  // Calculate total probability
  const totalProb = prob1 + prob2;

  // Calculate arbitrage percentage and profit
  const percentage = totalProb * 100;
  const profit = ((1 / totalProb) - 1) * 100;

  return { percentage, profit };
}

async function checkArbitrageOpportunities() {
  console.log("Checking for arbitrage opportunities...");
  const bettingSites = await storage.getBettingSites();

  for (const event of mockEvents) {
    const { odds1, odds2 } = await generateMockOdds();
    const { percentage, profit } = await calculateArbitrage(odds1, odds2);

    // Store historical odds for ML
    historicalOdds[event.event].push(odds1);
    if (historicalOdds[event.event].length > 100) {
      historicalOdds[event.event].shift(); // Keep last 100 data points
    }

    // If we have enough historical data, use ML to predict next odds
    if (historicalOdds[event.event].length >= 20) {
      try {
        const model = await trainModel(historicalOdds[event.event]);
        const predictedOdds = await predictNextOdds(model, historicalOdds[event.event].slice(-10));
        console.log(`ML Prediction for ${event.event}: Next odds likely to be around ${predictedOdds.toFixed(3)}`);
      } catch (err) {
        console.error('ML prediction error:', err);
      }
    }

    console.log(`Generated opportunity: ${event.event}, odds1: ${odds1}, odds2: ${odds2}, profit: ${profit}%`);

    // Create opportunity if arbitrage exists (total probability < 100%)
    if (percentage < 100) {
      await storage.createOpportunity({
        ...event,
        site1Id: bettingSites[0].id,
        site2Id: bettingSites[1].id,
        site1Odds: odds1.toFixed(4),
        site2Odds: odds2.toFixed(4),
        arbitragePercentage: percentage.toFixed(4),
        profit: profit.toFixed(4)
      });
      console.log(`Created arbitrage opportunity with ${profit.toFixed(2)}% profit`);
    }
  }
}

// Run arbitrage check every 15 seconds during development
export function startScheduler() {
  console.log("Starting arbitrage scheduler with ML predictions...");

  // Initial check
  checkArbitrageOpportunities();

  // Schedule recurring checks
  schedule.scheduleJob("*/15 * * * * *", checkArbitrageOpportunities);
}