import { db } from "./db";
import { 
  accounts, 
  productCategories, 
  products,
  segmentProfiles, 
  profileCategories,
  tasks,
  programAccounts,
  programRevenueSnapshots,
  dataUploads,
  accountMetrics,
  accountCategoryGaps,
  subscriptionPlans,
} from "@shared/schema";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Clear existing data
  await db.delete(programRevenueSnapshots);
  await db.delete(programAccounts);
  await db.delete(accountCategoryGaps);
  await db.delete(accountMetrics);
  await db.delete(tasks);
  await db.delete(profileCategories);
  await db.delete(segmentProfiles);
  await db.delete(products);
  await db.delete(productCategories);
  await db.delete(dataUploads);
  await db.delete(accounts);

  // Seed product categories
  const categories = await db.insert(productCategories).values([
    { name: "HVAC Equipment" },
    { name: "Refrigerant & Supplies" },
    { name: "Ductwork & Fittings" },
    { name: "Controls & Thermostats" },
    { name: "Water Heaters" },
    { name: "Tools & Safety" },
    { name: "Pipe & Fittings" },
    { name: "PVF" },
    { name: "Fixtures" },
    { name: "Drainage" },
  ]).returning();

  console.log(`Created ${categories.length} categories`);

  // Seed accounts
  const accountsData = await db.insert(accounts).values([
    { name: "ABC Plumbing Co", segment: "Plumbing", region: "Northeast", assignedTm: "John Smith", status: "active" },
    { name: "Elite HVAC Services", segment: "HVAC", region: "Southeast", assignedTm: "Sarah Johnson", status: "active" },
    { name: "Metro Mechanical", segment: "Mechanical", region: "Midwest", assignedTm: "Mike Wilson", status: "active" },
    { name: "Premier Plumbing", segment: "Plumbing", region: "Northeast", assignedTm: "John Smith", status: "active" },
    { name: "Climate Control Inc", segment: "HVAC", region: "West", assignedTm: "Lisa Brown", status: "active" },
    { name: "Superior Heating", segment: "HVAC", region: "Midwest", assignedTm: "Mike Wilson", status: "active" },
    { name: "Valley Mechanical", segment: "Mechanical", region: "West", assignedTm: "Lisa Brown", status: "active" },
    { name: "Fast Flow Plumbing", segment: "Plumbing", region: "Southeast", assignedTm: "Sarah Johnson", status: "active" },
    { name: "Comfort Zone HVAC", segment: "HVAC", region: "Northeast", assignedTm: "John Smith", status: "active" },
    { name: "All-Pro Mechanical", segment: "Mechanical", region: "Southeast", assignedTm: "Sarah Johnson", status: "active" },
  ]).returning();

  console.log(`Created ${accountsData.length} accounts`);

  // Seed segment profiles
  const profiles = await db.insert(segmentProfiles).values([
    { 
      segment: "HVAC", 
      name: "Full-Scope HVAC Contractor", 
      description: "HVAC contractors who purchase a complete range of equipment and supplies",
      minAnnualRevenue: "50000",
      status: "approved",
      approvedBy: "Mark Minnich",
      approvedAt: sql`CURRENT_TIMESTAMP`,
    },
    { 
      segment: "Plumbing", 
      name: "Full-Scope Plumbing Contractor", 
      description: "Plumbing contractors purchasing across major categories",
      minAnnualRevenue: "40000",
      status: "approved",
      approvedBy: "Mark Minnich",
      approvedAt: sql`CURRENT_TIMESTAMP`,
    },
    { 
      segment: "Mechanical", 
      name: "Full-Scope Mechanical Contractor", 
      description: "Mechanical contractors with diverse purchasing needs",
      minAnnualRevenue: "60000",
      status: "draft",
    },
  ]).returning();

  console.log(`Created ${profiles.length} segment profiles`);

  // Seed profile categories for HVAC
  await db.insert(profileCategories).values([
    { profileId: profiles[0].id, categoryId: categories[0].id, expectedPct: "40", importance: "1", isRequired: true },
    { profileId: profiles[0].id, categoryId: categories[1].id, expectedPct: "18", importance: "1", isRequired: true },
    { profileId: profiles[0].id, categoryId: categories[2].id, expectedPct: "12", importance: "1", isRequired: false },
    { profileId: profiles[0].id, categoryId: categories[3].id, expectedPct: "8", importance: "1.5", isRequired: false, notes: "Growing category" },
    { profileId: profiles[0].id, categoryId: categories[4].id, expectedPct: "8", importance: "2", isRequired: false, notes: "Strategic priority" },
    { profileId: profiles[0].id, categoryId: categories[5].id, expectedPct: "4", importance: "0.5", isRequired: false, notes: "Low margin" },
    { profileId: profiles[0].id, categoryId: categories[6].id, expectedPct: "10", importance: "1", isRequired: false },
  ]);

  // Seed profile categories for Plumbing
  await db.insert(profileCategories).values([
    { profileId: profiles[1].id, categoryId: categories[6].id, expectedPct: "35", importance: "1", isRequired: true },
    { profileId: profiles[1].id, categoryId: categories[7].id, expectedPct: "20", importance: "1", isRequired: true },
    { profileId: profiles[1].id, categoryId: categories[4].id, expectedPct: "15", importance: "2", isRequired: false, notes: "Strategic priority" },
    { profileId: profiles[1].id, categoryId: categories[8].id, expectedPct: "12", importance: "1", isRequired: false },
    { profileId: profiles[1].id, categoryId: categories[5].id, expectedPct: "8", importance: "0.5", isRequired: false },
    { profileId: profiles[1].id, categoryId: categories[9].id, expectedPct: "10", importance: "1", isRequired: false },
  ]);

  console.log("Created profile categories");

  // Seed account metrics
  for (const account of accountsData) {
    const revenue = Math.floor(Math.random() * 200000 + 50000);
    const penetration = Math.floor(Math.random() * 40 + 30);
    const opportunityScore = Math.floor(Math.random() * 40 + 50);
    
    await db.insert(accountMetrics).values({
      accountId: account.id,
      last12mRevenue: String(revenue),
      last3mRevenue: String(Math.floor(revenue / 4)),
      yoyGrowthRate: String(Math.floor(Math.random() * 30 - 5)),
      categoryCount: Math.floor(Math.random() * 6 + 3),
      categoryPenetration: String(penetration),
      categoryGapScore: String(100 - penetration),
      opportunityScore: String(opportunityScore),
      matchedProfileId: profiles[Math.floor(Math.random() * profiles.length)].id,
    });

    // Seed category gaps for each account
    const numGaps = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numGaps; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const gapPct = Math.floor(Math.random() * 30 + 10);
      await db.insert(accountCategoryGaps).values({
        accountId: account.id,
        categoryId: category.id,
        expectedPct: String(gapPct + Math.floor(Math.random() * 20)),
        actualPct: String(Math.floor(Math.random() * 10)),
        gapPct: String(gapPct),
        estimatedOpportunity: String(Math.floor(revenue * gapPct / 100)),
      });
    }
  }

  console.log("Created account metrics and gaps");

  // Seed tasks
  const dueDate1 = new Date();
  dueDate1.setDate(dueDate1.getDate() + 2);
  const dueDate2 = new Date();
  dueDate2.setDate(dueDate2.getDate() + 3);
  const dueDate3 = new Date();
  dueDate3.setDate(dueDate3.getDate() + 5);
  const dueDate4 = new Date();
  dueDate4.setDate(dueDate4.getDate() - 3);

  await db.insert(tasks).values([
    {
      accountId: accountsData[0].id,
      assignedTm: "John Smith",
      taskType: "call",
      title: "Introduce Water Heater Line",
      description: "High-opportunity account missing water heater category",
      script: `Hi [Contact], this is [Your Name] from Mark Supply. I noticed you've been a great customer for pipe and fittings, and I wanted to reach out about our water heater line.\n\nWe've recently expanded our Bradford White and Rheem inventory, and I think there's a great opportunity for you to consolidate your purchases with us.\n\nWould you have 15 minutes this week to discuss how we can support your water heater needs?`,
      gapCategories: ["Water Heaters", "Tools & Safety"],
      status: "pending",
      dueDate: dueDate1,
    },
    {
      accountId: accountsData[1].id,
      assignedTm: "Sarah Johnson",
      taskType: "email",
      title: "Controls & Thermostats Promotion",
      description: "Send information about Q1 controls promotion",
      script: `Subject: Exclusive Q1 Thermostat Promotion for Elite HVAC\n\nHi [Contact],\n\nI hope the new year is treating you well! I wanted to reach out about an exclusive promotion we're running on Honeywell and Ecobee smart thermostats.\n\nGiven your HVAC installation volume, I think you could save significantly by consolidating your thermostat purchases with us.\n\nKey benefits:\n- 15% off all smart thermostats through March\n- Same-day availability on most models\n- Free technical support\n\nWould you like me to send over a quote for your typical monthly volume?\n\nBest,\n[Your Name]`,
      gapCategories: ["Controls & Thermostats"],
      status: "in_progress",
      dueDate: dueDate2,
    },
    {
      accountId: accountsData[2].id,
      assignedTm: "Mike Wilson",
      taskType: "visit",
      title: "Site Visit - Water Heater Opportunity",
      description: "Schedule jobsite visit to assess water heater needs",
      script: `Visit Objectives:\n1. Tour current jobsite to understand project scope\n2. Review their current water heater supplier and any pain points\n3. Present our commercial water heater options\n4. Discuss potential for bulk ordering and delivery scheduling\n\nKey talking points:\n- Our delivery flexibility\n- Technical support and warranty handling\n- Volume discount opportunities`,
      gapCategories: ["Water Heaters", "Ductwork"],
      status: "pending",
      dueDate: dueDate3,
    },
    {
      accountId: accountsData[3].id,
      assignedTm: "John Smith",
      taskType: "call",
      title: "PVF Category Introduction",
      description: "Discuss PVF product availability",
      script: `Hi [Contact], this is [Your Name] from Mark Supply.\n\nI wanted to follow up on our recent orders and check in on how everything's going. While I have you, I also wanted to mention that we've significantly expanded our PVF inventory.\n\nI know you're currently sourcing these elsewhere, but we can now offer competitive pricing with the convenience of single-source ordering.\n\nCan I send you our updated PVF catalog?`,
      gapCategories: ["PVF", "Tools"],
      status: "completed",
      completedAt: dueDate4,
      outcome: "Interested in quote for PVF, scheduled follow-up call",
      dueDate: dueDate4,
    },
  ]);

  console.log("Created tasks");

  // Seed program accounts (enrolled)
  const baselineStart = new Date();
  baselineStart.setFullYear(baselineStart.getFullYear() - 1);
  const baselineEnd = new Date();
  baselineEnd.setDate(baselineEnd.getDate() - 1);

  const enrolledAccounts = await db.insert(programAccounts).values([
    {
      accountId: accountsData[0].id,
      enrolledBy: "Graham",
      baselineStart,
      baselineEnd,
      baselineRevenue: "110000",
      shareRate: "0.15",
      status: "active",
    },
    {
      accountId: accountsData[1].id,
      enrolledBy: "Graham",
      baselineStart,
      baselineEnd,
      baselineRevenue: "195000",
      shareRate: "0.15",
      status: "active",
    },
    {
      accountId: accountsData[4].id,
      enrolledBy: "Graham",
      baselineStart,
      baselineEnd,
      baselineRevenue: "280000",
      shareRate: "0.15",
      status: "active",
    },
  ]).returning();

  console.log(`Created ${enrolledAccounts.length} program accounts`);

  // Seed revenue snapshots
  for (const pa of enrolledAccounts) {
    const baselineRevenue = parseFloat(pa.baselineRevenue);
    for (let i = 5; i >= 0; i--) {
      const periodRevenue = baselineRevenue / 12 * (1 + Math.random() * 0.4);
      const incrementalRevenue = periodRevenue - baselineRevenue / 12;
      const periodStart = new Date();
      periodStart.setMonth(periodStart.getMonth() - (i + 1));
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() - i);
      
      await db.insert(programRevenueSnapshots).values({
        programAccountId: pa.id,
        periodStart,
        periodEnd,
        periodRevenue: String(Math.floor(periodRevenue)),
        baselineComparison: String(Math.floor(baselineRevenue / 12)),
        incrementalRevenue: String(Math.floor(Math.max(0, incrementalRevenue))),
        feeAmount: String(Math.floor(Math.max(0, incrementalRevenue * 0.15))),
      });
    }
  }

  console.log("Created revenue snapshots");

  // Seed data uploads
  await db.insert(dataUploads).values([
    { uploadType: "accounts", fileName: "accounts_2024.csv", rowCount: 487, status: "completed", uploadedBy: "Graham" },
    { uploadType: "orders", fileName: "orders_q4_2023.csv", rowCount: 15234, status: "completed", uploadedBy: "Graham" },
    { uploadType: "products", fileName: "product_catalog.csv", rowCount: 2341, status: "completed", uploadedBy: "Graham" },
    { uploadType: "categories", fileName: "categories.csv", rowCount: 156, status: "completed", uploadedBy: "Graham" },
  ]);

  console.log("Created data uploads");

  // Seed subscription plans
  await db.delete(subscriptionPlans);
  await db.insert(subscriptionPlans).values([
    {
      name: "Starter",
      slug: "starter",
      stripeMonthlyPriceId: null, // Will be set after creating products in Stripe Dashboard
      stripeYearlyPriceId: null,
      monthlyPrice: "49",
      yearlyPrice: "490",
      features: [
        "Up to 100 accounts",
        "Up to 3 users",
        "Basic ICP profiles",
        "Standard playbooks",
        "Email support",
      ],
      limits: { accounts: 100, users: 3 },
      isActive: true,
      displayOrder: 1,
    },
    {
      name: "Professional",
      slug: "professional",
      stripeMonthlyPriceId: null,
      stripeYearlyPriceId: null,
      monthlyPrice: "149",
      yearlyPrice: "1490",
      features: [
        "Up to 500 accounts",
        "Up to 10 users",
        "Advanced ICP with AI insights",
        "Custom playbooks",
        "Priority email support",
        "API access",
      ],
      limits: { accounts: 500, users: 10 },
      isActive: true,
      displayOrder: 2,
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      stripeMonthlyPriceId: null,
      stripeYearlyPriceId: null,
      monthlyPrice: "499",
      yearlyPrice: "4990",
      features: [
        "Unlimited accounts",
        "Unlimited users",
        "Custom AI training",
        "White-label options",
        "Dedicated support",
        "SSO integration",
        "Custom integrations",
      ],
      limits: { accounts: -1, users: -1 }, // -1 = unlimited
      isActive: true,
      displayOrder: 3,
    },
  ]);

  console.log("Created subscription plans");

  console.log("Seeding complete!");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
