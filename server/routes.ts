import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { startScheduler } from "./scheduler";
import { insertBettingSiteSchema } from "@shared/schema";
import { simulateOpportunity } from "./analyticsClient";
import { z } from "zod";
import {
  arbitrageOpportunitySchema,
  simulationSummarySchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Start the scheduler
  startScheduler();

  // Get all opportunities
  app.get("/api/opportunities", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const opportunities = await storage.getOpportunities();
    res.json(opportunities);
  });

  app.get("/api/arbitrage/opportunities", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const limit = Number.parseInt(String(req.query.limit ?? "100"), 10);
    const opportunities = await storage.getArbitrageOpportunities();
    res.json(
      Number.isFinite(limit) && limit > 0
        ? opportunities.slice(0, limit)
        : opportunities
    );
  });

  app.get("/api/arbitrage/history", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const history = await storage.getArbitrageHistory();
    res.json(history);
  });

  app.get("/api/markets", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const limit = Number.parseInt(String(req.query.limit ?? "200"), 10);
    const markets = await storage.getMarkets();
    res.json(
      Number.isFinite(limit) && limit > 0 ? markets.slice(0, limit) : markets
    );
  });

  app.post("/api/arbitrage/simulate", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const payloadSchema = z.object({
      opportunity: arbitrageOpportunitySchema,
      trials: z.number().int().positive().optional(),
      bankroll: z.number().positive().optional(),
    });

    const parsed = payloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error.flatten());
    }

    try {
      const simulation = await simulateOpportunity(parsed.data);
      simulationSummarySchema.parse(simulation);
      res.json(simulation);
    } catch (error) {
      console.error("[routes] Simulation request failed", error);
      res.status(502).json({
        message:
          error instanceof Error
            ? error.message
            : "Unable to execute simulation",
      });
    }
  });

  // Get all betting sites
  app.get("/api/betting-sites", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const sites = await storage.getBettingSites();
    res.json(sites);
  });

  // Add new betting site
  app.post("/api/betting-sites", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsedData = insertBettingSiteSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res.status(400).json(parsedData.error);
    }
    const site = await storage.createBettingSite(parsedData.data);
    res.status(201).json(site);
  });

  const httpServer = createServer(app);
  return httpServer;
}
