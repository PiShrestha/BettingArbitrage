import {
  pgTable,
  text,
  serial,
  integer,
  decimal,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  notificationsEnabled: boolean("notifications_enabled")
    .default(true)
    .notNull(),
});

export const bettingSites = pgTable("betting_sites", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
});

export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  sport: text("sport").notNull(),
  event: text("event").notNull(),
  team1: text("team1").notNull(),
  team2: text("team2").notNull(),
  arbitragePercentage: decimal("arbitrage_percentage").notNull(),
  profit: decimal("profit").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  site1Id: integer("site1_id")
    .references(() => bettingSites.id)
    .notNull(),
  site2Id: integer("site2_id")
    .references(() => bettingSites.id)
    .notNull(),
  site1Odds: decimal("site1_odds").notNull(),
  site2Odds: decimal("site2_odds").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  notificationsEnabled: true,
});

export const insertOpportunitySchema = createInsertSchema(opportunities);
export const insertBettingSiteSchema = createInsertSchema(bettingSites);

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Opportunity = typeof opportunities.$inferSelect;
export type BettingSite = typeof bettingSites.$inferSelect;
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;
export type InsertBettingSite = z.infer<typeof insertBettingSiteSchema>;

export const providerSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export const runnerSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const marketSchema = z.object({
  id: z.string(),
  provider: providerSchema,
  eventId: z.string(),
  eventName: z.string(),
  league: z.string().optional(),
  sport: z.string().optional(),
  marketName: z.string(),
  marketType: z
    .enum(["moneyline", "spread", "total", "other"])
    .default("other"),
  runner: runnerSchema,
  oddsDecimal: z.number().positive(),
  impliedProbability: z.number().min(0).max(1),
  timestamp: z.string(),
  line: z.number().optional(),
  additionalMetadata: z.record(z.any()).optional(),
});

export const canonicalEventSchema = z.object({
  id: z.string(),
  eventName: z.string(),
  startTime: z.string(),
  sport: z.string(),
  league: z.string().optional(),
  homeTeam: z.string().optional(),
  awayTeam: z.string().optional(),
});

export const arbitrageStakeSchema = z.object({
  runner: z.string(),
  providerId: z.string(),
  providerName: z.string(),
  odds: z.number().positive(),
  stakeFraction: z.number().min(0),
  stakeAmount: z.number().min(0),
  payout: z.number().min(0),
});

export const arbitrageOpportunitySchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
  marketName: z.string(),
  sport: z.string().optional(),
  league: z.string().optional(),
  sumImpliedProbability: z.number(),
  guaranteedProfitFraction: z.number(),
  bankroll: z.number(),
  stakes: z.array(arbitrageStakeSchema),
  createdAt: z.string(),
});

export type Provider = z.infer<typeof providerSchema>;
export type Runner = z.infer<typeof runnerSchema>;
export type Market = z.infer<typeof marketSchema>;
export type CanonicalEvent = z.infer<typeof canonicalEventSchema>;
export type ArbitrageStake = z.infer<typeof arbitrageStakeSchema>;
export type ArbitrageOpportunity = z.infer<typeof arbitrageOpportunitySchema>;
