import { db } from "../db";
import { syncedEmails, accounts, type SyncedEmail } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import OpenAI from "openai";
import { z } from "zod";

const EmailAnalysisSchema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative", "urgent"]),
  summary: z.string().max(300),
  action_items: z.array(z.object({
    action: z.string(),
    priority: z.enum(["high", "medium", "low"]),
    category: z.string(),
  })).max(5),
  opportunity_signals: z.array(z.object({
    signal: z.string(),
    confidence: z.enum(["high", "medium", "low"]),
    category: z.string(),
  })).max(5),
  account_mentions: z.array(z.string()).max(10),
});

export async function analyzeEmail(email: SyncedEmail, tenantId: number): Promise<void> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const tenantAccounts = await db.select({ id: accounts.id, name: accounts.name })
    .from(accounts)
    .where(eq(accounts.tenantId, tenantId));

  const accountNames = tenantAccounts.map(a => a.name);

  const prompt = `Analyze this business email for a building materials distributor's sales intelligence platform.

FROM: ${email.fromName} <${email.fromAddress}>
SUBJECT: ${email.subject}
DATE: ${email.receivedAt ? new Date(email.receivedAt).toLocaleDateString() : "Unknown"}

BODY:
${(email.bodyText || email.bodyPreview || "").slice(0, 3000)}

KNOWN CUSTOMER ACCOUNTS:
${accountNames.slice(0, 100).join(", ")}

Return a JSON analysis with:
1. "sentiment": overall tone (positive/neutral/negative/urgent)
2. "summary": 1-2 sentence summary of the email's key points
3. "action_items": specific follow-up actions needed, with priority and category
4. "opportunity_signals": any buying signals, expansion opportunities, or competitive intel
5. "account_mentions": any customer account names mentioned or referenced (match against the known accounts list when possible)

Focus on sales-relevant insights: pricing discussions, product inquiries, complaints, reorder signals, competitive mentions, and expansion opportunities.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a sales intelligence analyst for a building materials distributor. Analyze emails and extract actionable insights. Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 1000,
    });

    const raw = JSON.parse(completion.choices[0].message.content ?? "{}");
    const analysis = EmailAnalysisSchema.parse(raw);

    let linkedAccountId = email.linkedAccountId;
    if (!linkedAccountId && analysis.account_mentions.length > 0) {
      for (const mention of analysis.account_mentions) {
        const matchedAccount = tenantAccounts.find(
          a => a.name.toLowerCase() === mention.toLowerCase()
        );
        if (matchedAccount) {
          linkedAccountId = matchedAccount.id;
          break;
        }
      }
    }

    await db.update(syncedEmails)
      .set({
        aiAnalyzed: true,
        aiSentiment: analysis.sentiment,
        aiSummary: analysis.summary,
        aiActionItems: analysis.action_items,
        aiOpportunitySignals: analysis.opportunity_signals,
        aiAccountMentions: analysis.account_mentions,
        linkedAccountId: linkedAccountId || email.linkedAccountId,
      })
      .where(eq(syncedEmails.id, email.id));

  } catch (err: any) {
    console.error(`AI analysis failed for email ${email.id}:`, err?.message);
    await db.update(syncedEmails)
      .set({ aiAnalyzed: true, aiSummary: `Analysis failed: ${err?.message}` })
      .where(eq(syncedEmails.id, email.id));
  }
}

export async function analyzeUnprocessedEmails(tenantId: number, limit: number = 10): Promise<{ analyzed: number; errors: number }> {
  const unanalyzed = await db.select()
    .from(syncedEmails)
    .where(and(
      eq(syncedEmails.tenantId, tenantId),
      eq(syncedEmails.aiAnalyzed, false),
    ))
    .limit(limit);

  let analyzed = 0;
  let errors = 0;

  for (const email of unanalyzed) {
    try {
      await analyzeEmail(email, tenantId);
      analyzed++;
    } catch {
      errors++;
    }
  }

  return { analyzed, errors };
}
