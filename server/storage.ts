import { type User, type InsertUser, type AgentState, type Setting, type InsertSetting, agentSystemPrompts, agentState, settings } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Agent system prompts
  getAgentSystemPrompt(promptKey: string): Promise<{ content: string } | undefined>;

  // Settings (key-value store)
  getSetting(key: string): Promise<Setting | undefined>;
  upsertSetting(setting: InsertSetting): Promise<Setting>;

  // Agent state (rolling memory between runs)
  getAgentState(tenantId: number, runType: string): Promise<AgentState | undefined>;
  upsertAgentState(
    tenantId: number,
    runType: string,
    data: Partial<Omit<AgentState, "id" | "tenantId" | "agentRunType">>,
  ): Promise<void>;
}

// ─── In-memory user store ─────────────────────────────────────────────────────

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // ── Settings ───────────────────────────────────────────────────────────────
  async getSetting(key: string): Promise<Setting | undefined> {
    try {
      const rows = await db
        .select()
        .from(settings)
        .where(eq(settings.key, key))
        .limit(1);
      return rows[0] ?? undefined;
    } catch {
      return undefined;
    }
  }

  async upsertSetting(setting: InsertSetting): Promise<Setting> {
    const existing = await this.getSetting(setting.key);
    if (existing) {
      const [updated] = await db
        .update(settings)
        .set({ value: setting.value, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(settings.key, setting.key))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(settings)
        .values(setting)
        .returning();
      return created;
    }
  }

  // ── Agent: System Prompt ────────────────────────────────────────────────────
  async getAgentSystemPrompt(promptKey: string): Promise<{ content: string } | undefined> {
    try {
      const rows = await db
        .select({ content: agentSystemPrompts.content })
        .from(agentSystemPrompts)
        .where(
          and(
            eq(agentSystemPrompts.promptKey, promptKey),
            eq(agentSystemPrompts.isActive, true),
          ),
        )
        .limit(1);
      return rows[0] ?? undefined;
    } catch {
      return undefined; // Graceful fallback — table may not exist yet
    }
  }

  // ── Agent: State ────────────────────────────────────────────────────────────
  async getAgentState(tenantId: number, runType: string): Promise<AgentState | undefined> {
    try {
      const rows = await db
        .select()
        .from(agentState)
        .where(
          and(
            eq(agentState.tenantId, tenantId),
            eq(agentState.agentRunType, runType),
          ),
        )
        .limit(1);
      return rows[0] ?? undefined;
    } catch {
      return undefined;
    }
  }

  async upsertAgentState(
    tenantId: number,
    runType: string,
    data: Partial<Omit<AgentState, "id" | "tenantId" | "agentRunType">>,
  ): Promise<void> {
    try {
      const existing = await this.getAgentState(tenantId, runType);
      if (existing) {
        await db
          .update(agentState)
          .set({ ...data, updatedAt: new Date() })
          .where(
            and(
              eq(agentState.tenantId, tenantId),
              eq(agentState.agentRunType, runType),
            ),
          );
      } else {
        await db.insert(agentState).values({
          tenantId,
          agentRunType: runType,
          ...data,
          updatedAt: new Date(),
        });
      }
    } catch (err) {
      console.error("[storage] upsertAgentState error:", err);
    }
  }
}

export const storage = new MemStorage();
