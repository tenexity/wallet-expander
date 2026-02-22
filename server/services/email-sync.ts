import { db } from "../db";
import { syncedEmails, emailConnections, accounts, type EmailConnection, type SyncedEmail, type InsertSyncedEmail } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { getValidAccessToken } from "./email-oauth";

interface RawEmail {
  externalId: string;
  fromAddress: string;
  fromName: string;
  toAddresses: Array<{ email: string; name: string }>;
  ccAddresses: Array<{ email: string; name: string }>;
  subject: string;
  bodyPreview: string;
  bodyText: string;
  receivedAt: Date;
  direction: "inbound" | "outbound";
}

async function fetchMicrosoftEmails(accessToken: string, since?: Date): Promise<RawEmail[]> {
  const filter = since
    ? `&$filter=receivedDateTime ge ${since.toISOString()}`
    : "";

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?$top=50&$orderby=receivedDateTime desc&$select=id,from,toRecipients,ccRecipients,subject,bodyPreview,body,receivedDateTime,sender${filter}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Microsoft Graph API error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const messages: any[] = data.value || [];

  return messages.map((msg) => ({
    externalId: msg.id,
    fromAddress: msg.from?.emailAddress?.address || "",
    fromName: msg.from?.emailAddress?.name || "",
    toAddresses: (msg.toRecipients || []).map((r: any) => ({
      email: r.emailAddress?.address || "",
      name: r.emailAddress?.name || "",
    })),
    ccAddresses: (msg.ccRecipients || []).map((r: any) => ({
      email: r.emailAddress?.address || "",
      name: r.emailAddress?.name || "",
    })),
    subject: msg.subject || "",
    bodyPreview: msg.bodyPreview || "",
    bodyText: msg.body?.content
      ? msg.body.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000)
      : "",
    receivedAt: new Date(msg.receivedDateTime),
    direction: "inbound" as const,
  }));
}

async function fetchGmailEmails(accessToken: string, since?: Date): Promise<RawEmail[]> {
  const query = since ? `after:${Math.floor(since.getTime() / 1000)}` : "";
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50${query ? `&q=${encodeURIComponent(query)}` : ""}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listRes.ok) {
    const errText = await listRes.text();
    throw new Error(`Gmail API list error: ${listRes.status} ${errText}`);
  }

  const listData = await listRes.json();
  const messageRefs: Array<{ id: string }> = listData.messages || [];
  const emails: RawEmail[] = [];

  for (const ref of messageRefs.slice(0, 50)) {
    try {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${ref.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!msgRes.ok) continue;
      const msg = await msgRes.json();

      const headers = msg.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

      const fromRaw = getHeader("From");
      const fromMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/) || [null, "", fromRaw];

      let bodyText = "";
      const extractBody = (part: any): string => {
        if (part.body?.data) {
          return Buffer.from(part.body.data, "base64url").toString("utf-8");
        }
        if (part.parts) {
          for (const p of part.parts) {
            if (p.mimeType === "text/plain") {
              const text = extractBody(p);
              if (text) return text;
            }
          }
          for (const p of part.parts) {
            const text = extractBody(p);
            if (text) return text;
          }
        }
        return "";
      };

      bodyText = extractBody(msg.payload || {});
      if (bodyText.length > 5000) bodyText = bodyText.slice(0, 5000);

      const parseAddresses = (header: string) => {
        if (!header) return [];
        return header.split(",").map((addr) => {
          const match = addr.trim().match(/^(.+?)\s*<(.+?)>$/);
          return match
            ? { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2] }
            : { name: "", email: addr.trim() };
        });
      };

      emails.push({
        externalId: msg.id,
        fromAddress: fromMatch[2] || fromRaw,
        fromName: (fromMatch[1] || "").replace(/^"|"$/g, "").trim(),
        toAddresses: parseAddresses(getHeader("To")),
        ccAddresses: parseAddresses(getHeader("Cc")),
        subject: getHeader("Subject"),
        bodyPreview: (msg.snippet || "").slice(0, 200),
        bodyText: bodyText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
        receivedAt: new Date(parseInt(msg.internalDate)),
        direction: "inbound",
      });
    } catch {
      continue;
    }
  }

  return emails;
}

export async function syncEmailsForConnection(connection: EmailConnection): Promise<{ synced: number; errors: number }> {
  let synced = 0;
  let errors = 0;

  try {
    const accessToken = await getValidAccessToken(connection);

    const rawEmails = connection.provider === "microsoft"
      ? await fetchMicrosoftEmails(accessToken, connection.lastSyncAt || undefined)
      : await fetchGmailEmails(accessToken, connection.lastSyncAt || undefined);

    const tenantAccounts = await db.select()
      .from(accounts)
      .where(eq(accounts.tenantId, connection.tenantId));

    const accountNames = new Map<string, number>();
    for (const acc of tenantAccounts) {
      accountNames.set(acc.name.toLowerCase(), acc.id);
    }

    for (const email of rawEmails) {
      try {
        const existingEmail = await db.select({ id: syncedEmails.id })
          .from(syncedEmails)
          .where(and(
            eq(syncedEmails.connectionId, connection.id),
            eq(syncedEmails.externalId, email.externalId),
          ))
          .limit(1);

        if (existingEmail.length > 0) continue;

        let linkedAccountId: number | null = null;
        const fromNameLower = email.fromName?.toLowerCase() || "";
        const subjectLower = email.subject?.toLowerCase() || "";
        accountNames.forEach((id, name) => {
          if (!linkedAccountId && (fromNameLower.includes(name) || subjectLower.includes(name))) {
            linkedAccountId = id;
          }
        });

        const insertData: InsertSyncedEmail = {
          tenantId: connection.tenantId,
          connectionId: connection.id,
          externalId: email.externalId,
          fromAddress: email.fromAddress,
          fromName: email.fromName,
          toAddresses: email.toAddresses,
          ccAddresses: email.ccAddresses,
          subject: email.subject,
          bodyPreview: email.bodyPreview.slice(0, 200),
          bodyText: email.bodyText,
          receivedAt: email.receivedAt,
          direction: email.direction,
          linkedAccountId,
          aiAnalyzed: false,
        };

        await db.insert(syncedEmails).values(insertData);
        synced++;
      } catch (err) {
        errors++;
        console.error(`Failed to store email ${email.externalId}:`, err);
      }
    }

    await db.update(emailConnections)
      .set({ lastSyncAt: new Date(), syncError: null, updatedAt: new Date() })
      .where(eq(emailConnections.id, connection.id));

  } catch (err: any) {
    await db.update(emailConnections)
      .set({
        syncError: err?.message || String(err),
        status: err?.message?.includes("expired") ? "expired" : "error",
        updatedAt: new Date(),
      })
      .where(eq(emailConnections.id, connection.id));
    throw err;
  }

  return { synced, errors };
}

export async function getSyncedEmails(
  tenantId: number,
  options?: { connectionId?: number; accountId?: number; limit?: number; offset?: number; analyzed?: boolean }
): Promise<{ emails: SyncedEmail[]; total: number }> {
  const conditions = [eq(syncedEmails.tenantId, tenantId)];

  if (options?.connectionId) {
    conditions.push(eq(syncedEmails.connectionId, options.connectionId));
  }
  if (options?.accountId) {
    conditions.push(eq(syncedEmails.linkedAccountId, options.accountId));
  }
  if (options?.analyzed !== undefined) {
    conditions.push(eq(syncedEmails.aiAnalyzed, options.analyzed));
  }

  const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

  const [countResult] = await db.select({ count: syncedEmails.id })
    .from(syncedEmails)
    .where(whereClause!);

  const emails = await db.select()
    .from(syncedEmails)
    .where(whereClause!)
    .orderBy(desc(syncedEmails.receivedAt))
    .limit(options?.limit || 50)
    .offset(options?.offset || 0);

  return { emails, total: Number(countResult?.count || 0) };
}

export async function getSyncedEmail(id: number, tenantId: number): Promise<SyncedEmail | undefined> {
  const [email] = await db.select()
    .from(syncedEmails)
    .where(and(
      eq(syncedEmails.id, id),
      eq(syncedEmails.tenantId, tenantId),
    ))
    .limit(1);
  return email;
}
