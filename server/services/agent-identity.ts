/**
 * Agent Identity Service — Phase 0
 *
 * Provides getCoreSystemPrompt() and writeAgentMemo() helpers that every
 * subsequent agent service must call.  These functions are the glue between
 * the agent "soul" (agent_system_prompts) and the agent "heartbeat"
 * (agent_state), ensuring every AI call starts with consistent identity and
 * updates its state when it finishes.
 */

import { storage } from "../storage";
import type { AgentState } from "@shared/schema";

const CORE_PROMPT_KEY = "core_agent_identity";

/**
 * Returns the active core agent identity prompt content.
 * Every agent service MUST prepend this to its OpenAI system prompt.
 *
 * Falls back to a minimal inline prompt if the DB row is missing so that
 * agent services never fail silently due to a missing seed.
 */
export async function getCoreSystemPrompt(): Promise<string> {
    try {
        const row = await storage.getAgentSystemPrompt(CORE_PROMPT_KEY);
        if (row?.content) return row.content;
    } catch (err) {
        console.warn("[agent-identity] getCoreSystemPrompt DB error:", err);
    }

    // Inline fallback — should only fire before seed data is loaded
    return [
        "You are the Revenue Intelligence Agent for Wallet Share Expander, an AI",
        "system purpose-built for MEP wholesale distribution.",
        "",
        "YOUR PURPOSE:",
        "Help wholesale distributor territory managers grow revenue from existing",
        "contractor accounts by identifying wallet share gaps, generating targeted",
        "playbooks, and surfacing the right action at the right moment.",
        "",
        "YOUR PRINCIPLES:",
        "- Always ground recommendations in specific data from the contractor's record.",
        "- Give territory managers one clear next action, not a list of ten.",
        "- Never fabricate data or express certainty you do not have.",
        "- Be aware of seasonality before flagging anomalies.",
    ].join("\n");
}

/**
 * Reads the current agent state for a given run type so prior observations
 * can be included in the OpenAI context.
 */
export async function readAgentState(
    tenantId: number,
    runType: string,
): Promise<AgentState | undefined> {
    try {
        return await storage.getAgentState(tenantId, runType);
    } catch (err) {
        console.warn("[agent-identity] readAgentState error:", err);
        return undefined;
    }
}

/**
 * Shape of the agent_memo JSON block that every agent service asks Claude
 * to include at the end of its response.
 */
export interface AgentMemo {
    last_run_summary: string;
    current_focus: string;
    pattern_notes_addition: string; // new observations to append with today's date
    anomalies_watching: Array<{
        account_name: string;
        signal: string;
        watch_until_date: string;
    }>;
}

/**
 * The instruction appended to every agent service's system prompt, asking
 * the model to write a memo back to agent_state.
 */
export const AGENT_MEMO_INSTRUCTION = `
At the end of your JSON response, include a field "agent_memo" with this structure:
{
  "last_run_summary": "2-4 sentences describing what you found and did in this run.",
  "current_focus": "Single sentence on what pattern or account you are watching most closely.",
  "pattern_notes_addition": "New cross-account observations to append with today's date, or empty string.",
  "anomalies_watching": [
    { "account_name": "...", "signal": "...", "watch_until_date": "YYYY-MM-DD" }
  ]
}
`;

/**
 * Parses the agent_memo from a Claude response object and writes it back to
 * agent_state.  Call at the END of every agent service execution.
 *
 * @param tenantId  - the org/tenant running the agent
 * @param runType   - matches agentState.agentRunType
 * @param memo      - the parsed agent_memo object from the Claude response
 */
export async function writeAgentMemo(
    tenantId: number,
    runType: string,
    memo: AgentMemo,
): Promise<void> {
    try {
        const existing = await storage.getAgentState(tenantId, runType);
        const appendedNotes =
            memo.pattern_notes_addition
                ? `\n[${new Date().toISOString().slice(0, 10)}] ${memo.pattern_notes_addition}` + (existing?.patternNotes ?? "")
                : existing?.patternNotes ?? null;

        await storage.upsertAgentState(tenantId, runType, {
            lastRunAt: new Date(),
            lastRunSummary: memo.last_run_summary,
            currentFocus: memo.current_focus,
            patternNotes: appendedNotes,
            anomaliesWatching: memo.anomalies_watching,
        });
    } catch (err) {
        // Non-fatal — agent memo write failure should not crash the service
        console.error("[agent-identity] writeAgentMemo error:", err);
    }
}

/**
 * Convenience helper: builds the context prefix that every agent service
 * prepends after the core system prompt:
 *  - Pattern notes (cross-account observations from prior runs)
 *  - Open questions (things the agent was monitoring)
 */
export function buildStatePreamble(state: AgentState | undefined): string {
    if (!state) return "";

    const parts: string[] = [];

    if (state.patternNotes) {
        parts.push(
            "PRIOR OBSERVATIONS (Cross-account patterns from previous runs):",
            state.patternNotes,
        );
    }

    if (state.openQuestions && Array.isArray(state.openQuestions) && state.openQuestions.length > 0) {
        parts.push(
            "\nOPEN QUESTIONS (Things flagged for monitoring):",
            (state.openQuestions as string[]).join("\n"),
        );
    }

    return parts.join("\n");
}
