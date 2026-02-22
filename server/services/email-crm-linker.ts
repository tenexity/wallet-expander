import { db } from "../db";
import {
  contacts, projects, emailInteractions, orderSignals, competitorMentions,
  accounts, type SyncedEmail,
} from "@shared/schema";
import { eq, and, ilike } from "drizzle-orm";
import type { EnhancedEmailAnalysis } from "./email-ai-analysis";

export async function linkEmailToCrm(
  email: SyncedEmail,
  analysis: EnhancedEmailAnalysis,
  tenantId: number,
): Promise<{ contactsCreated: number; projectsCreated: number; orderSignalsCreated: number; competitorMentionsCreated: number }> {
  const stats = { contactsCreated: 0, projectsCreated: 0, orderSignalsCreated: 0, competitorMentionsCreated: 0 };

  const linkedAccountId = email.linkedAccountId ?? null;

  const contactIds = await processContacts(email, analysis, tenantId, linkedAccountId);
  stats.contactsCreated = contactIds.length;

  const projectIds = await processProjects(email, analysis, tenantId, linkedAccountId);
  stats.projectsCreated = projectIds.length;

  stats.orderSignalsCreated = await processOrderSignals(email, analysis, tenantId, linkedAccountId, projectIds[0] ?? null);
  stats.competitorMentionsCreated = await processCompetitorMentions(email, analysis, tenantId, linkedAccountId, projectIds[0] ?? null);

  await createEmailInteractions(email, contactIds, tenantId);

  return stats;
}

async function processContacts(
  email: SyncedEmail,
  analysis: EnhancedEmailAnalysis,
  tenantId: number,
  linkedAccountId: number | null,
): Promise<number[]> {
  const createdIds: number[] = [];

  const fromContact = findContactByEmail(analysis.contacts_detected, email.fromAddress ?? "");
  const allContacts = [...analysis.contacts_detected];

  if (!fromContact && email.fromName && email.fromAddress) {
    const nameParts = (email.fromName || "").trim().split(/\s+/);
    allContacts.push({
      first_name: nameParts[0] || email.fromName || "",
      last_name: nameParts.slice(1).join(" ") || "",
      email: email.fromAddress || "",
      title: "",
      role: "unknown" as const,
      department: "",
    });
  }

  for (const detected of allContacts) {
    if (!detected.first_name) continue;

    const emailAddr = detected.email || "";

    const existingByEmail = emailAddr
      ? await db.select({ id: contacts.id })
          .from(contacts)
          .where(and(
            eq(contacts.tenantId, tenantId),
            ilike(contacts.email, emailAddr),
          ))
          .limit(1)
      : [];

    if (existingByEmail.length > 0) {
      const existingId = existingByEmail[0].id;
      await db.update(contacts)
        .set({
          lastContactedAt: email.receivedAt ?? new Date(),
          ...(detected.title && { title: detected.title }),
          ...(detected.role !== "unknown" && { role: detected.role }),
          ...(detected.department && { department: detected.department }),
          ...(linkedAccountId && { accountId: linkedAccountId }),
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, existingId));
      createdIds.push(existingId);
      continue;
    }

    const existingByName = await db.select({ id: contacts.id })
      .from(contacts)
      .where(and(
        eq(contacts.tenantId, tenantId),
        ilike(contacts.firstName, detected.first_name),
        ...(detected.last_name ? [ilike(contacts.lastName, detected.last_name)] : []),
        ...(linkedAccountId ? [eq(contacts.accountId, linkedAccountId)] : []),
      ))
      .limit(1);

    if (existingByName.length > 0) {
      const existingId = existingByName[0].id;
      await db.update(contacts)
        .set({
          lastContactedAt: email.receivedAt ?? new Date(),
          ...(emailAddr && { email: emailAddr }),
          ...(detected.title && { title: detected.title }),
          ...(detected.role !== "unknown" && { role: detected.role }),
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, existingId));
      createdIds.push(existingId);
      continue;
    }

    const [newContact] = await db.insert(contacts)
      .values({
        tenantId,
        accountId: linkedAccountId,
        firstName: detected.first_name,
        lastName: detected.last_name || null,
        email: emailAddr || null,
        title: detected.title || null,
        role: detected.role || "unknown",
        department: detected.department || null,
        source: "email_sync",
        lastContactedAt: email.receivedAt ?? new Date(),
      })
      .returning({ id: contacts.id });

    if (newContact) createdIds.push(newContact.id);
  }

  return createdIds;
}

async function processProjects(
  email: SyncedEmail,
  analysis: EnhancedEmailAnalysis,
  tenantId: number,
  linkedAccountId: number | null,
): Promise<number[]> {
  const createdIds: number[] = [];

  for (const detected of analysis.projects_detected) {
    if (!detected.name) continue;

    const existing = await db.select({ id: projects.id })
      .from(projects)
      .where(and(
        eq(projects.tenantId, tenantId),
        ilike(projects.name, detected.name),
      ))
      .limit(1);

    if (existing.length > 0) {
      await db.update(projects)
        .set({
          ...(detected.location && { location: detected.location }),
          ...(detected.project_type !== "unknown" && { projectType: detected.project_type }),
          ...(detected.stage !== "unknown" && { stage: detected.stage }),
          ...(detected.general_contractor && { generalContractor: detected.general_contractor }),
          ...(detected.unit_count && { unitCount: detected.unit_count }),
          ...(detected.square_footage && { squareFootage: detected.square_footage }),
          ...(detected.product_categories.length > 0 && { productCategories: detected.product_categories }),
          updatedAt: new Date(),
        })
        .where(eq(projects.id, existing[0].id));
      createdIds.push(existing[0].id);
      continue;
    }

    const [newProject] = await db.insert(projects)
      .values({
        tenantId,
        accountId: linkedAccountId,
        name: detected.name,
        location: detected.location || null,
        projectType: detected.project_type !== "unknown" ? detected.project_type : null,
        estimatedValue: detected.estimated_value || null,
        stage: detected.stage !== "unknown" ? detected.stage : "identified",
        startDate: parseDate(detected.start_date),
        bidDeadline: parseDate(detected.bid_deadline),
        generalContractor: detected.general_contractor || null,
        unitCount: detected.unit_count ?? null,
        squareFootage: detected.square_footage ?? null,
        productCategories: detected.product_categories.length > 0 ? detected.product_categories : null,
        source: "email_sync",
        sourceEmailId: email.id,
      })
      .returning({ id: projects.id });

    if (newProject) createdIds.push(newProject.id);
  }

  return createdIds;
}

async function processOrderSignals(
  email: SyncedEmail,
  analysis: EnhancedEmailAnalysis,
  tenantId: number,
  linkedAccountId: number | null,
  projectId: number | null,
): Promise<number> {
  let count = 0;

  const existingForEmail = await db.select({ id: orderSignals.id, signalType: orderSignals.signalType, productCategory: orderSignals.productCategory })
    .from(orderSignals)
    .where(and(
      eq(orderSignals.tenantId, tenantId),
      eq(orderSignals.sourceEmailId, email.id),
    ));

  for (const signal of analysis.order_signals) {
    const alreadyExists = existingForEmail.some(
      e => e.signalType === signal.signal_type && e.productCategory === (signal.product_category || null)
    );
    if (alreadyExists) continue;

    await db.insert(orderSignals).values({
      tenantId,
      accountId: linkedAccountId,
      projectId,
      sourceEmailId: email.id,
      signalType: signal.signal_type,
      productCategory: signal.product_category || null,
      productDetails: signal.product_details || null,
      estimatedQuantity: signal.estimated_quantity || null,
      estimatedValue: signal.estimated_value || null,
      requestedDeliveryDate: parseDate(signal.delivery_date),
      urgency: signal.urgency,
      pricingMentioned: signal.pricing_mentioned,
      competitorPriceMentioned: signal.competitor_price_mentioned,
    });
    count++;
  }

  return count;
}

async function processCompetitorMentions(
  email: SyncedEmail,
  analysis: EnhancedEmailAnalysis,
  tenantId: number,
  linkedAccountId: number | null,
  projectId: number | null,
): Promise<number> {
  let count = 0;

  const existingForEmail = await db.select({ id: competitorMentions.id, competitorName: competitorMentions.competitorName, productCategory: competitorMentions.productCategory })
    .from(competitorMentions)
    .where(and(
      eq(competitorMentions.tenantId, tenantId),
      eq(competitorMentions.sourceEmailId, email.id),
    ));

  for (const mention of analysis.competitor_mentions) {
    if (!mention.competitor_name) continue;

    const alreadyExists = existingForEmail.some(
      e => e.competitorName === mention.competitor_name && e.productCategory === (mention.product_category || null)
    );
    if (alreadyExists) continue;

    await db.insert(competitorMentions).values({
      tenantId,
      accountId: linkedAccountId,
      projectId,
      sourceEmailId: email.id,
      competitorName: mention.competitor_name,
      mentionType: mention.mention_type,
      productCategory: mention.product_category || null,
      competitorPrice: mention.competitor_price || null,
      ourPrice: mention.our_price || null,
      details: mention.details || null,
      threatLevel: mention.threat_level,
      responseNeeded: mention.response_needed,
    });
    count++;
  }

  return count;
}

async function createEmailInteractions(
  email: SyncedEmail,
  contactIds: number[],
  tenantId: number,
): Promise<void> {
  for (const contactId of contactIds) {
    const existing = await db.select({ id: emailInteractions.id })
      .from(emailInteractions)
      .where(and(
        eq(emailInteractions.emailId, email.id),
        eq(emailInteractions.contactId, contactId),
      ))
      .limit(1);

    if (existing.length > 0) continue;

    const contact = await db.select({ email: contacts.email })
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .limit(1);

    const contactEmail = contact[0]?.email?.toLowerCase() ?? "";
    const fromEmail = (email.fromAddress ?? "").toLowerCase();
    const role = contactEmail === fromEmail ? "sender" : "participant";

    await db.insert(emailInteractions).values({
      tenantId,
      emailId: email.id,
      contactId,
      role,
    });
  }
}

function findContactByEmail(
  detected: EnhancedEmailAnalysis["contacts_detected"],
  targetEmail: string,
) {
  if (!targetEmail) return undefined;
  const lower = targetEmail.toLowerCase();
  return detected.find(c => (c.email || "").toLowerCase() === lower);
}

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}
