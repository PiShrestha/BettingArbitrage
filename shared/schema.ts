import { pgTable, text, serial, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  notificationsEnabled: boolean("notifications_enabled").default(true).notNull(),
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
  site1Id: integer("site1_id").references(() => bettingSites.id).notNull(),
  site2Id: integer("site2_id").references(() => bettingSites.id).notNull(),
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
