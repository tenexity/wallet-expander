import { db } from "./db";
import { settings } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const DEMO_SETTINGS: Array<{ key: string; value: string }> = [
  { key: "companyName", value: "ABC Supply Co." },
  { key: "appTitle", value: "Wallet Share" },
];

const LOGO_PATHS = [
  path.resolve(process.cwd(), "server", "assets", "demo-logo.png"),
  path.resolve(process.cwd(), "attached_assets", "Tenexity Official Logo BW Cirlce.png"),
];

function getLogoBase64(): string | null {
  for (const logoPath of LOGO_PATHS) {
    try {
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        console.log(`[sync-settings] Logo loaded from: ${logoPath}`);
        return `data:image/png;base64,${logoBuffer.toString("base64")}`;
      }
    } catch {
      continue;
    }
  }
  console.warn("[sync-settings] WARNING: Logo file not found in any expected location. companyLogo will NOT be synced.");
  return null;
}

export async function syncDemoSettings(): Promise<void> {
  const demoTenantId = parseInt(process.env.DEMO_TENANT_ID ?? process.env.SCHEDULER_TENANT_ID ?? "8", 10);

  const logoBase64 = getLogoBase64();
  const allSettings = logoBase64
    ? [...DEMO_SETTINGS, { key: "companyLogo", value: logoBase64 }]
    : DEMO_SETTINGS;

  let created = 0;
  for (const setting of allSettings) {
    const [existing] = await db
      .select()
      .from(settings)
      .where(
        and(
          eq(settings.tenantId, demoTenantId),
          eq(settings.key, setting.key)
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(settings).values({
        tenantId: demoTenantId,
        key: setting.key,
        value: setting.value,
      });
      console.log(`[sync-settings] Created setting: ${setting.key} for tenant ${demoTenantId}`);
      created++;
    }
  }

  console.log(`[sync-settings] Demo tenant settings synced successfully (${created} created, ${allSettings.length - created} already existed)`);
}
