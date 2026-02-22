import { db } from "../db";
import { emailConnections, type EmailConnection, type InsertEmailConnection } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

function getBaseUrl(): string {
  return process.env.BASE_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
}

export function getMicrosoftAuthUrl(state: string): string {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) throw new Error("MICROSOFT_CLIENT_ID not configured");

  const redirectUri = `${getBaseUrl()}/api/auth/microsoft/callback`;
  const scopes = [
    "openid",
    "profile",
    "email",
    "offline_access",
    "https://graph.microsoft.com/Mail.Read",
    "https://graph.microsoft.com/User.Read",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    response_mode: "query",
    prompt: "consent",
  });

  return `${MICROSOFT_AUTH_URL}?${params.toString()}`;
}

export function getGoogleAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_EMAIL_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_EMAIL_CLIENT_ID not configured");

  const redirectUri = `${getBaseUrl()}/api/auth/google-email/callback`;
  const scopes = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.readonly",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    access_type: "offline",
    prompt: "consent",
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeMicrosoftCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  email: string;
}> {
  const clientId = process.env.MICROSOFT_CLIENT_ID!;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
  const redirectUri = `${getBaseUrl()}/api/auth/microsoft/callback`;

  const tokenRes = await fetch(MICROSOFT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const errorBody = await tokenRes.text();
    throw new Error(`Microsoft token exchange failed: ${errorBody}`);
  }

  const tokens = await tokenRes.json();

  const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileRes.ok) throw new Error("Failed to fetch Microsoft profile");
  const profile = await profileRes.json();

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    email: profile.mail || profile.userPrincipalName,
  };
}

export async function exchangeGoogleCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  email: string;
}> {
  const clientId = process.env.GOOGLE_EMAIL_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_EMAIL_CLIENT_SECRET!;
  const redirectUri = `${getBaseUrl()}/api/auth/google-email/callback`;

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const errorBody = await tokenRes.text();
    throw new Error(`Google token exchange failed: ${errorBody}`);
  }

  const tokens = await tokenRes.json();

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileRes.ok) throw new Error("Failed to fetch Google profile");
  const profile = await profileRes.json();

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    email: profile.email,
  };
}

export async function refreshMicrosoftToken(connection: EmailConnection): Promise<{ accessToken: string; expiresIn: number }> {
  const clientId = process.env.MICROSOFT_CLIENT_ID!;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;

  const tokenRes = await fetch(MICROSOFT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refreshToken!,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) throw new Error("Microsoft token refresh failed");
  const tokens = await tokenRes.json();

  await db.update(emailConnections)
    .set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || connection.refreshToken,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      status: "connected",
      updatedAt: new Date(),
    })
    .where(eq(emailConnections.id, connection.id));

  return { accessToken: tokens.access_token, expiresIn: tokens.expires_in };
}

export async function refreshGoogleToken(connection: EmailConnection): Promise<{ accessToken: string; expiresIn: number }> {
  const clientId = process.env.GOOGLE_EMAIL_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_EMAIL_CLIENT_SECRET!;

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refreshToken!,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) throw new Error("Google token refresh failed");
  const tokens = await tokenRes.json();

  await db.update(emailConnections)
    .set({
      accessToken: tokens.access_token,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      status: "connected",
      updatedAt: new Date(),
    })
    .where(eq(emailConnections.id, connection.id));

  return { accessToken: tokens.access_token, expiresIn: tokens.expires_in };
}

export async function getValidAccessToken(connection: EmailConnection): Promise<string> {
  if (connection.tokenExpiresAt && new Date(connection.tokenExpiresAt) > new Date(Date.now() + 60000)) {
    return connection.accessToken;
  }

  if (!connection.refreshToken) {
    await db.update(emailConnections)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(emailConnections.id, connection.id));
    throw new Error("Token expired and no refresh token available");
  }

  try {
    const result = connection.provider === "microsoft"
      ? await refreshMicrosoftToken(connection)
      : await refreshGoogleToken(connection);
    return result.accessToken;
  } catch (err) {
    await db.update(emailConnections)
      .set({ status: "expired", syncError: String(err), updatedAt: new Date() })
      .where(eq(emailConnections.id, connection.id));
    throw err;
  }
}

export async function saveEmailConnection(data: InsertEmailConnection): Promise<EmailConnection> {
  const existing = await db.select()
    .from(emailConnections)
    .where(and(
      eq(emailConnections.tenantId, data.tenantId),
      eq(emailConnections.provider, data.provider),
      eq(emailConnections.emailAddress, data.emailAddress),
    ))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db.update(emailConnections)
      .set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        status: "connected",
        syncError: null,
        updatedAt: new Date(),
      })
      .where(eq(emailConnections.id, existing[0].id))
      .returning();
    return updated;
  }

  const [connection] = await db.insert(emailConnections).values(data).returning();
  return connection;
}

export async function getEmailConnections(tenantId: number): Promise<EmailConnection[]> {
  return db.select()
    .from(emailConnections)
    .where(eq(emailConnections.tenantId, tenantId));
}

export async function getEmailConnection(id: number, tenantId: number): Promise<EmailConnection | undefined> {
  const [connection] = await db.select()
    .from(emailConnections)
    .where(and(
      eq(emailConnections.id, id),
      eq(emailConnections.tenantId, tenantId),
    ))
    .limit(1);
  return connection;
}

export async function disconnectEmailConnection(id: number, tenantId: number): Promise<void> {
  await db.update(emailConnections)
    .set({ status: "disconnected", accessToken: "", refreshToken: null, updatedAt: new Date() })
    .where(and(
      eq(emailConnections.id, id),
      eq(emailConnections.tenantId, tenantId),
    ));
}

export async function getActiveConnections(): Promise<EmailConnection[]> {
  return db.select()
    .from(emailConnections)
    .where(eq(emailConnections.status, "connected"));
}
