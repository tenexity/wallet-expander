import OpenAI from "openai";
import { z } from "zod";
import { storage } from "./storage";
import { withRetry } from "./utils/retry";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  timeout: 60000,
  maxRetries: 0,
});

interface CategorySuggestion {
  categoryName: string;
  expectedPct: number;
  importance: number;
  isRequired: boolean;
  notes: string;
}

const categorySuggestionSchema = z.object({
  categoryName: z.string(),
  expectedPct: z.number(),
  importance: z.number().default(1),
  isRequired: z.boolean().default(false),
  notes: z.string().default(""),
});

interface SegmentAnalysisResult {
  description: string;
  minAnnualRevenue: number;
  categories: CategorySuggestion[];
}

const segmentAnalysisResultSchema = z.object({
  description: z.string(),
  minAnnualRevenue: z.number(),
  categories: z.array(categorySuggestionSchema),
});

const taskGenerationResultSchema = z.object({
  title: z.string(),
  taskType: z.enum(["call", "email", "visit"]),
  description: z.string(),
  script: z.string(),
});

type TaskGenerationResult = z.infer<typeof taskGenerationResultSchema>;

function safeParseJSON<T>(content: string, schema: z.ZodSchema<T>, fallback: T): T {
  try {
    const parsed = JSON.parse(content);
    const result = schema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    console.error("AI response validation failed:", result.error);
    return fallback;
  } catch (error) {
    console.error("AI response JSON parse failed:", error);
    return fallback;
  }
}

export async function analyzeSegment(segment: string): Promise<SegmentAnalysisResult> {
  // Use custom categories if available, otherwise fall back to product categories
  const customCats = await storage.getCustomCategories();
  const categories = customCats.length > 0 
    ? customCats.filter(c => c.isActive).map(c => ({ name: c.name }))
    : (await storage.getProductCategories()).map(c => ({ name: c.name }));
  const categoryNames = categories.map(c => c.name).join(", ");

  const prompt = `You are a sales analytics expert for a wholesale distributor serving ${segment} contractors.

Available product categories: ${categoryNames}

Analyze what a typical "Class A" ${segment} contractor should be purchasing from a full-service distributor.

Provide:
1. A brief description of this ideal customer profile (1-2 sentences)
2. Minimum annual revenue threshold for a Class A account
3. Expected category mix with percentages (should sum to ~100%)

For each category, provide:
- expectedPct: What percentage of their total purchases should come from this category
- importance: 0.5 (low margin/priority), 1.0 (normal), 1.5 (high priority), 2.0 (strategic priority)
- isRequired: Whether this category is essential for a full-scope contractor
- notes: Any relevant notes about this category

Respond in JSON format:
{
  "description": "...",
  "minAnnualRevenue": 50000,
  "categories": [
    {
      "categoryName": "...",
      "expectedPct": 30,
      "importance": 1.0,
      "isRequired": true,
      "notes": ""
    }
  ]
}`;

  try {
    const response = await withRetry(
      () => openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 2048,
      }),
      { maxRetries: 3, timeoutMs: 60000 }
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const fallbackCategories: CategorySuggestion[] = categories.slice(0, 5).map((cat, i) => ({
      categoryName: cat.name,
      expectedPct: Math.floor(80 / 5),
      importance: i === 0 ? 1.5 : 1.0,
      isRequired: i < 2,
      notes: "",
    }));
    
    const fallback: SegmentAnalysisResult = {
      description: `Full-scope ${segment} contractor purchasing across major categories`,
      minAnnualRevenue: 50000,
      categories: fallbackCategories,
    };

    return safeParseJSON(content, segmentAnalysisResultSchema, fallback) as SegmentAnalysisResult;
  } catch (error) {
    console.error("AI segment analysis error:", error);
    // Use custom categories if available, otherwise fall back to product categories
    const customCats = await storage.getCustomCategories();
    const fallbackCats = customCats.length > 0 
      ? customCats.filter(c => c.isActive).map(c => ({ name: c.name }))
      : (await storage.getProductCategories()).map(c => ({ name: c.name }));
    
    const errorFallbackCategories: CategorySuggestion[] = fallbackCats.slice(0, 5).map((cat, i) => ({
      categoryName: cat.name,
      expectedPct: Math.floor(80 / 5),
      importance: i === 0 ? 1.5 : 1.0,
      isRequired: i < 2,
      notes: "",
    }));
    
    return {
      description: `Full-scope ${segment} contractor purchasing across major categories`,
      minAnnualRevenue: 50000,
      categories: errorFallbackCategories,
    };
  }
}

export async function generateCallScript(
  accountName: string,
  segment: string,
  gapCategories: string[],
  revenue: number
): Promise<TaskGenerationResult> {
  const prompt = `You are a Territory Manager at Mark Supply, a wholesale distributor.

Account: ${accountName}
Segment: ${segment}
Annual Revenue: $${revenue.toLocaleString()}
Gap Categories (categories they should be buying from us but aren't): ${gapCategories.join(", ")}

Generate a call script for reaching out to this account about the gap categories.

The script should:
1. Start with a warm, relationship-focused opening
2. Reference that they're a valued customer
3. Naturally transition to discussing the gap category (pick the most strategic one)
4. Include specific benefits of consolidating purchases with Mark Supply
5. End with a clear next step (scheduling a call, sending a quote, etc.)

Keep it conversational - this is a trusted supplier relationship, not a cold call.

Respond in JSON format:
{
  "title": "Brief task title (5-7 words)",
  "taskType": "call",
  "description": "One sentence description of the opportunity",
  "script": "The full call script with natural paragraphs"
}`;

  try {
    const response = await withRetry(
      () => openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 2048,
      }),
      { maxRetries: 3, timeoutMs: 60000 }
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const fallback: TaskGenerationResult = {
      title: `Discuss ${gapCategories[0] || "products"} with ${accountName}`,
      taskType: "call",
      description: `High-opportunity account missing ${gapCategories[0] || "products"} category`,
      script: `Hi, this is [Your Name] from Mark Supply. I wanted to reach out about our ${gapCategories[0] || "products"} line that I think could benefit your business. Would you have time this week for a quick call?`,
    };

    return safeParseJSON(content, taskGenerationResultSchema, fallback);
  } catch (error) {
    console.error("AI call script generation error:", error);
    return {
      title: `Discuss ${gapCategories[0] || "products"} with ${accountName}`,
      taskType: "call",
      description: `High-opportunity account missing ${gapCategories[0] || "products"} category`,
      script: `Hi, this is [Your Name] from Mark Supply. I wanted to reach out about our ${gapCategories[0] || "products"} line that I think could benefit your business. Would you have time this week for a quick call?`,
    };
  }
}

export async function generateEmailTemplate(
  accountName: string,
  segment: string,
  gapCategories: string[],
  revenue: number
): Promise<TaskGenerationResult> {
  const prompt = `You are a Territory Manager at Mark Supply, a wholesale distributor.

Account: ${accountName}
Segment: ${segment}  
Annual Revenue: $${revenue.toLocaleString()}
Gap Categories (categories they should be buying from us but aren't): ${gapCategories.join(", ")}

Generate an email template for reaching out to this account about the gap categories.

The email should:
1. Be brief (3 paragraphs max)
2. Reference their business and relationship with Mark Supply
3. Introduce the gap category naturally (seasonal tie-in, new inventory, promotion, etc.)
4. Highlight 2-3 specific benefits
5. Include a clear call-to-action

Include a subject line. Tone should be helpful and professional, not pushy.

Respond in JSON format:
{
  "title": "Brief task title (5-7 words)",
  "taskType": "email",
  "description": "One sentence description of the opportunity",
  "script": "Subject: [subject line]\\n\\n[email body with paragraphs]"
}`;

  try {
    const response = await withRetry(
      () => openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 2048,
      }),
      { maxRetries: 3, timeoutMs: 60000 }
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const fallback: TaskGenerationResult = {
      title: `Email about ${gapCategories[0] || "products"} to ${accountName}`,
      taskType: "email",
      description: `Send information about ${gapCategories[0] || "products"} opportunities`,
      script: `Subject: ${gapCategories[0] || "Products"} Solutions for Your Business\n\nHi [Contact],\n\nI wanted to reach out about our expanded ${gapCategories[0] || "products"} inventory that could benefit your projects.\n\nLet me know if you'd like to learn more.\n\nBest,\n[Your Name]`,
    };

    return safeParseJSON(content, taskGenerationResultSchema, fallback);
  } catch (error) {
    console.error("AI email template generation error:", error);
    return {
      title: `Email about ${gapCategories[0] || "products"} to ${accountName}`,
      taskType: "email",
      description: `Send information about ${gapCategories[0] || "products"} opportunities`,
      script: `Subject: ${gapCategories[0] || "Products"} Solutions for Your Business\n\nHi [Contact],\n\nI wanted to reach out about our expanded ${gapCategories[0] || "products"} inventory that could benefit your projects.\n\nLet me know if you'd like to learn more.\n\nBest,\n[Your Name]`,
    };
  }
}

export async function generateVisitPlan(
  accountName: string,
  segment: string,
  gapCategories: string[],
  revenue: number
): Promise<TaskGenerationResult> {
  const prompt = `You are a Territory Manager at Mark Supply, a wholesale distributor.

Account: ${accountName}
Segment: ${segment}
Annual Revenue: $${revenue.toLocaleString()}
Gap Categories (categories they should be buying from us but aren't): ${gapCategories.join(", ")}

Generate a site visit plan for this account to assess and address the gap categories.

Include:
1. Clear objectives for the visit (3-4 bullet points)
2. Key talking points about the gap categories
3. Questions to ask about their current suppliers and pain points
4. Next steps to propose during the visit

Respond in JSON format:
{
  "title": "Brief task title (5-7 words)",
  "taskType": "visit",
  "description": "One sentence description of the visit purpose",
  "script": "Visit plan with objectives, talking points, and next steps"
}`;

  try {
    const response = await withRetry(
      () => openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 2048,
      }),
      { maxRetries: 3, timeoutMs: 60000 }
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const fallback: TaskGenerationResult = {
      title: `Site visit to ${accountName}`,
      taskType: "visit",
      description: `Assess ${gapCategories[0] || "product"} opportunities on-site`,
      script: `Visit Objectives:\n1. Assess current ${gapCategories[0] || "product"} needs\n2. Review supplier pain points\n3. Present our solutions\n4. Discuss next steps`,
    };

    return safeParseJSON(content, taskGenerationResultSchema, fallback);
  } catch (error) {
    console.error("AI visit plan generation error:", error);
    return {
      title: `Site visit to ${accountName}`,
      taskType: "visit",
      description: `Assess ${gapCategories[0] || "product"} opportunities on-site`,
      script: `Visit Objectives:\n1. Assess current ${gapCategories[0] || "product"} needs\n2. Review supplier pain points\n3. Present our solutions\n4. Discuss next steps`,
    };
  }
}

export async function generatePlaybookTasks(
  accounts: Array<{
    id: number;
    name: string;
    segment: string;
    assignedTm: string;
    revenue: number;
    gapCategories: string[];
  }>,
  priorityCategories: string[] = []
): Promise<Array<{
  accountId: number;
  assignedTm: string;
  taskType: string;
  title: string;
  description: string;
  script: string;
  gapCategories: string[];
}>> {
  const tasks = [];

  for (const account of accounts) {
    const relevantGaps = priorityCategories.length > 0
      ? account.gapCategories.filter(g => priorityCategories.includes(g))
      : account.gapCategories;

    if (relevantGaps.length === 0) continue;

    // Decide task type based on revenue and gap size
    const taskType = account.revenue > 200000 ? "visit" : account.revenue > 100000 ? "call" : "email";

    try {
      let taskResult: TaskGenerationResult;

      if (taskType === "call") {
        taskResult = await generateCallScript(account.name, account.segment, relevantGaps, account.revenue);
      } else if (taskType === "email") {
        taskResult = await generateEmailTemplate(account.name, account.segment, relevantGaps, account.revenue);
      } else {
        taskResult = await generateVisitPlan(account.name, account.segment, relevantGaps, account.revenue);
      }

      tasks.push({
        accountId: account.id,
        assignedTm: account.assignedTm,
        taskType: taskResult.taskType,
        title: taskResult.title,
        description: taskResult.description,
        script: taskResult.script,
        gapCategories: relevantGaps,
      });
    } catch (error) {
      console.error(`Failed to generate task for ${account.name}:`, error);
    }
  }

  return tasks;
}
