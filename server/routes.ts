import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { startScheduler } from "./scheduler";
import { insertBettingSiteSchema } from "@shared/schema";

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