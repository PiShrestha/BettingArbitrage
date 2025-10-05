import {
  User,
  InsertUser,
  Opportunity,
  BettingSite,
  InsertBettingSite,
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

  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private opportunities: Map<number, Opportunity>;
  private bettingSites: Map<number, BettingSite>;
  private currentUserId: number;
  private currentOpportunityId: number;
  private currentBettingSiteId: number;
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.opportunities = new Map();
    this.bettingSites = new Map();
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
}

export const storage = new MemStorage();
