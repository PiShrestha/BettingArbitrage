import {
  User,
  InsertUser,
  Opportunity,
  BettingSite,
  InsertBettingSite,
  Market,
  ArbitrageOpportunity,
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Betting sites operations
  getBettingSites(): Promise<BettingSite[]>;
  createBettingSite(site: InsertBettingSite): Promise<BettingSite>;

  // Opportunities operations
  getOpportunities(): Promise<Opportunity[]>;
  createOpportunity(
    opportunity: Omit<Opportunity, "id" | "createdAt">
  ): Promise<Opportunity>;

  // Market operations
  upsertMarkets(markets: Market[]): Promise<Market[]>;
  getMarkets(): Promise<Market[]>;

  // Arbitrage operations
  setArbitrageOpportunities(
    opportunities: ArbitrageOpportunity[]
  ): Promise<void>;
  getArbitrageOpportunities(): Promise<ArbitrageOpportunity[]>;
  getArbitrageHistory(): Promise<ArbitrageOpportunity[]>;

  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private opportunities: Map<number, Opportunity>;
  private bettingSites: Map<number, BettingSite>;
  private markets: Map<string, Market>;
  private readonly marketRetention = 500;
  private arbitrageLatest: Map<string, ArbitrageOpportunity>;
  private arbitrageHistory: ArbitrageOpportunity[];
  private readonly arbitrageHistoryLimit = 200;
  private currentUserId: number;
  private currentOpportunityId: number;
  private currentBettingSiteId: number;
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.opportunities = new Map();
    this.bettingSites = new Map();
    this.markets = new Map();
    this.arbitrageLatest = new Map();
    this.arbitrageHistory = [];
    this.currentUserId = 1;
    this.currentOpportunityId = 1;
    this.currentBettingSiteId = 3; // Start from 3 since we have 2 initial sites
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    // Initialize mock betting sites
    this.bettingSites.set(1, {
      id: 1,
      name: "Bet365",
      url: "https://bet365.com",
    });
    this.bettingSites.set(2, {
      id: 2,
      name: "Betway",
      url: "https://betway.com",
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email,
      notificationsEnabled: insertUser.notificationsEnabled ?? true,
    };
    this.users.set(id, user);
    return user;
  }

  async getBettingSites(): Promise<BettingSite[]> {
    return Array.from(this.bettingSites.values());
  }

  async createBettingSite(site: InsertBettingSite): Promise<BettingSite> {
    const id = this.currentBettingSiteId++;
    const newSite = { ...site, id };
    this.bettingSites.set(id, newSite);
    return newSite;
  }

  async getOpportunities(): Promise<Opportunity[]> {
    return Array.from(this.opportunities.values());
  }

  async createOpportunity(
    opportunity: Omit<Opportunity, "id" | "createdAt">
  ): Promise<Opportunity> {
    const id = this.currentOpportunityId++;
    const newOpportunity = {
      ...opportunity,
      id,
      createdAt: new Date(),
    };
    this.opportunities.set(id, newOpportunity);
    return newOpportunity;
  }

  async upsertMarkets(markets: Market[]): Promise<Market[]> {
    if (!markets.length) {
      return this.getMarkets();
    }

    for (const market of markets) {
      this.markets.set(market.id, market);
    }

    if (this.markets.size > this.marketRetention) {
      const sorted = Array.from(this.markets.values()).sort(
        (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)
      );
      const trimmed = sorted.slice(0, this.marketRetention);
      this.markets = new Map(trimmed.map((market) => [market.id, market]));
    }

    return this.getMarkets();
  }

  async getMarkets(): Promise<Market[]> {
    return Array.from(this.markets.values()).sort(
      (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)
    );
  }

  async setArbitrageOpportunities(
    opportunities: ArbitrageOpportunity[]
  ): Promise<void> {
    const now = new Date().toISOString();
    const updated = opportunities.map((opportunity) => ({
      ...opportunity,
      createdAt: opportunity.createdAt ?? now,
    }));

    this.arbitrageLatest = new Map(
      updated.map((opportunity) => [
        `${opportunity.eventId}:${opportunity.marketName}`,
        opportunity,
      ])
    );

    this.arbitrageHistory = [...updated, ...this.arbitrageHistory].slice(
      0,
      this.arbitrageHistoryLimit
    );
  }

  async getArbitrageOpportunities(): Promise<ArbitrageOpportunity[]> {
    return Array.from(this.arbitrageLatest.values()).sort(
      (a, b) => b.guaranteedProfitFraction - a.guaranteedProfitFraction
    );
  }

  async getArbitrageHistory(): Promise<ArbitrageOpportunity[]> {
    return [...this.arbitrageHistory];
  }
}

export const storage = new MemStorage();
