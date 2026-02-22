import { db } from "../db";
import { syncedEmails, accounts, customCategories, type SyncedEmail } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import OpenAI from "openai";
import { z } from "zod";

const ContactSchema = z.object({
  first_name: z.string(),
  last_name: z.string().optional().default(""),
  email: z.string().optional().default(""),
  title: z.string().optional().default(""),
  role: z.enum(["purchaser", "project_manager", "estimator", "owner", "decision_maker", "influencer", "gatekeeper", "unknown"]).default("unknown"),
  department: z.string().optional().default(""),
});

const ProjectSchema = z.object({
  name: z.string(),
  location: z.string().optional().default(""),
  project_type: z.enum(["new_construction", "renovation", "retrofit", "maintenance", "tenant_improvement", "unknown"]).default("unknown"),
  estimated_value: z.string().optional().default(""),
  stage: z.enum(["identified", "bidding", "awarded", "in_progress", "completed", "unknown"]).default("identified"),
  start_date: z.string().optional().default(""),
  bid_deadline: z.string().optional().default(""),
  general_contractor: z.string().optional().default(""),
  unit_count: z.number().optional(),
  square_footage: z.number().optional(),
  product_categories: z.array(z.string()).default([]),
});

const OrderSignalSchema = z.object({
  signal_type: z.enum(["quote_request", "reorder", "pricing_inquiry", "product_inquiry", "purchase_intent", "delivery_request"]),
  product_category: z.string().optional().default(""),
  product_details: z.string().optional().default(""),
  estimated_quantity: z.string().optional().default(""),
  estimated_value: z.string().optional().default(""),
  delivery_date: z.string().optional().default(""),
  urgency: z.enum(["immediate", "this_week", "this_month", "next_quarter", "exploring"]).default("exploring"),
  pricing_mentioned: z.boolean().default(false),
  competitor_price_mentioned: z.boolean().default(false),
});

const CompetitorMentionSchema = z.object({
  competitor_name: z.string(),
  mention_type: z.enum(["quote", "pricing", "product_comparison", "switch_threat", "positive_mention", "negative_mention"]),
  product_category: z.string().optional().default(""),
  competitor_price: z.string().optional().default(""),
  our_price: z.string().optional().default(""),
  details: z.string().optional().default(""),
  threat_level: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  response_needed: z.boolean().default(false),
});

const EnhancedEmailAnalysisSchema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative", "urgent"]),
  summary: z.string().max(500),
  sales_urgency: z.object({
    level: z.enum(["immediate", "this_week", "this_month", "next_quarter", "no_urgency"]),
    deadline: z.string().optional().default(""),
    reason: z.string().optional().default(""),
  }),
  action_items: z.array(z.object({
    action: z.string(),
    priority: z.enum(["high", "medium", "low"]),
    task_type: z.enum(["call", "email", "visit", "quote", "follow_up", "internal"]),
    product_category: z.string().optional().default(""),
    deadline: z.string().optional().default(""),
  })).max(5),
  contacts_detected: z.array(ContactSchema).max(5),
  projects_detected: z.array(ProjectSchema).max(3),
  order_signals: z.array(OrderSignalSchema).max(5),
  competitor_mentions: z.array(CompetitorMentionSchema).max(5),
  account_mentions: z.array(z.string()).max(10),
  product_categories_discussed: z.array(z.string()).max(10),
});

export type EnhancedEmailAnalysis = z.infer<typeof EnhancedEmailAnalysisSchema>;

export async function analyzeEmail(email: SyncedEmail, tenantId: number): Promise<EnhancedEmailAnalysis | null> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const [tenantAccounts, categories] = await Promise.all([
    db.select({ id: accounts.id, name: accounts.name, segment: accounts.segment })
      .from(accounts)
      .where(eq(accounts.tenantId, tenantId)),
    db.select({ id: customCategories.id, name: customCategories.name })
      .from(customCategories)
      .where(and(
        eq(customCategories.tenantId, tenantId),
        eq(customCategories.isActive, true),
      )),
  ]);

  const accountNames = tenantAccounts.map(a => a.name);
  const categoryNames = categories.map(c => c.name);

  const toAddrs = Array.isArray(email.toAddresses)
    ? (email.toAddresses as Array<{ email: string; name: string }>).map(a => `${a.name} <${a.email}>`).join(", ")
    : "";
  const ccAddrs = Array.isArray(email.ccAddresses)
    ? (email.ccAddresses as Array<{ email: string; name: string }>).map(a => `${a.name} <${a.email}>`).join(", ")
    : "";

  const prompt = `You are an expert sales intelligence analyst for a building materials distributor. Analyze the following email and extract comprehensive, actionable intelligence.

=== EMAIL ===
FROM: ${email.fromName} <${email.fromAddress}>
TO: ${toAddrs}
${ccAddrs ? `CC: ${ccAddrs}` : ""}
SUBJECT: ${email.subject}
DATE: ${email.receivedAt ? new Date(email.receivedAt).toLocaleDateString() : "Unknown"}
DIRECTION: ${email.direction || "inbound"}

BODY:
${(email.bodyText || email.bodyPreview || "").slice(0, 4000)}

=== CONTEXT ===

KNOWN CUSTOMER ACCOUNTS:
${accountNames.slice(0, 100).join(", ")}

YOUR PRODUCT CATEGORIES (map email content to these when possible):
${categoryNames.length > 0 ? categoryNames.join(", ") : "HVAC Equipment, Ductwork & Fittings, Refrigerant & Supplies, Controls & Thermostats, Water Heaters, Plumbing Fixtures, Pipe & Fittings, PVF (Pipe, Valves, Fittings), Drainage Systems, Insulation Materials, Tools & Safety, Electrical Components"}

COMMON COMPETITORS IN BUILDING MATERIALS DISTRIBUTION:
Ferguson, Winsupply, Hajoca, F.W. Webb, R.E. Michel, Johnstone Supply, Gensco, US LBM, Builders FirstSource, HD Supply, Grainger

=== EXTRACTION INSTRUCTIONS ===

Return a JSON object with the following fields:

1. "sentiment": Overall email tone — "positive", "neutral", "negative", or "urgent"

2. "summary": 2-3 sentence summary emphasizing sales-relevant information (who wants what, by when, and why it matters)

3. "sales_urgency": How time-sensitive this is for sales action
   - "level": "immediate" (needs response today), "this_week", "this_month", "next_quarter", "no_urgency"
   - "deadline": Specific deadline if mentioned (e.g. "2026-03-15" or "end of March")
   - "reason": Why it's urgent (e.g. "Bid deadline Friday", "Competitor quoting now")

4. "action_items": Specific follow-up actions for the sales team
   - "action": What needs to be done
   - "priority": "high", "medium", "low"
   - "task_type": "call", "email", "visit", "quote", "follow_up", "internal"
   - "product_category": Which product category this relates to (from the list above)
   - "deadline": When this should be done by

5. "contacts_detected": People mentioned or identified from email signatures, CC lines, or body
   - "first_name", "last_name", "email", "title", "department"
   - "role": "purchaser", "project_manager", "estimator", "owner", "decision_maker", "influencer", "gatekeeper", "unknown"

6. "projects_detected": Construction projects, jobs, or installations mentioned
   - "name": Project or job name/description
   - "location": City, state, or address if mentioned
   - "project_type": "new_construction", "renovation", "retrofit", "maintenance", "tenant_improvement", "unknown"
   - "estimated_value": Dollar value if mentioned
   - "stage": "identified", "bidding", "awarded", "in_progress", "completed", "unknown"
   - "start_date", "bid_deadline": Dates if mentioned (ISO format)
   - "general_contractor": GC name if mentioned
   - "unit_count": Number of units if a multi-unit project
   - "square_footage": Square footage if mentioned
   - "product_categories": Which of your product categories this project will need

7. "order_signals": Purchase intent, quote requests, reorder patterns
   - "signal_type": "quote_request", "reorder", "pricing_inquiry", "product_inquiry", "purchase_intent", "delivery_request"
   - "product_category": Map to your product categories
   - "product_details": Specific products or SKUs mentioned
   - "estimated_quantity": Quantities mentioned
   - "estimated_value": Dollar value if discussed
   - "delivery_date": Requested delivery date
   - "urgency": "immediate", "this_week", "this_month", "next_quarter", "exploring"
   - "pricing_mentioned": true if pricing/costs discussed
   - "competitor_price_mentioned": true if competitor pricing referenced

8. "competitor_mentions": Any reference to competing distributors or their offerings
   - "competitor_name": Company name
   - "mention_type": "quote" (they got a quote), "pricing" (price comparison), "product_comparison", "switch_threat", "positive_mention", "negative_mention"
   - "product_category": What category the competition is for
   - "competitor_price", "our_price": If pricing mentioned
   - "details": Context of the mention
   - "threat_level": "low", "medium", "high", "critical"
   - "response_needed": true if immediate competitive response needed

9. "account_mentions": Customer account names mentioned (match against known accounts when possible)

10. "product_categories_discussed": List of your product categories referenced or implied in this email

If a field has no data, return empty arrays [] or empty strings "". Only include data you can confidently extract — do not fabricate.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a senior sales intelligence analyst specializing in building materials distribution. You extract actionable intelligence from emails to help Territory Managers close more deals, defend against competitors, and identify project opportunities. Always return valid JSON matching the requested schema exactly.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.15,
      max_tokens: 2500,
    });

    const raw = JSON.parse(completion.choices[0].message.content ?? "{}");
    const analysis = EnhancedEmailAnalysisSchema.parse(raw);

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
        aiOpportunitySignals: analysis.order_signals,
        aiAccountMentions: analysis.account_mentions,
        linkedAccountId: linkedAccountId || email.linkedAccountId,
      })
      .where(eq(syncedEmails.id, email.id));

    return analysis;
  } catch (err: any) {
    console.error(`AI analysis failed for email ${email.id}:`, err?.message);
    await db.update(syncedEmails)
      .set({ aiAnalyzed: true, aiSummary: `Analysis failed: ${err?.message}` })
      .where(eq(syncedEmails.id, email.id));
    return null;
  }
}

export async function analyzeUnprocessedEmails(tenantId: number, limit: number = 10): Promise<{ analyzed: number; errors: number; crmRecordsCreated: number }> {
  const { linkEmailToCrm } = await import("./email-crm-linker.js");

  const unanalyzed = await db.select()
    .from(syncedEmails)
    .where(and(
      eq(syncedEmails.tenantId, tenantId),
      eq(syncedEmails.aiAnalyzed, false),
    ))
    .limit(limit);

  let analyzed = 0;
  let errors = 0;
  let crmRecordsCreated = 0;

  for (const email of unanalyzed) {
    try {
      const analysis = await analyzeEmail(email, tenantId);
      analyzed++;

      if (analysis) {
        const refetchedEmail = await db.select().from(syncedEmails).where(eq(syncedEmails.id, email.id)).limit(1);
        const updatedEmail = refetchedEmail[0] ?? email;
        const stats = await linkEmailToCrm(updatedEmail, analysis, tenantId);
        crmRecordsCreated += stats.contactsCreated + stats.projectsCreated + stats.orderSignalsCreated + stats.competitorMentionsCreated;
      }
    } catch (err: any) {
      console.error(`Email analysis pipeline error for email ${email.id}:`, err?.message);
      errors++;
    }
  }

  return { analyzed, errors, crmRecordsCreated };
}
