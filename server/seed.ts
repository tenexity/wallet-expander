import { db } from "./db";
import {
  accounts,
  productCategories,
  products,
  segmentProfiles,
  profileCategories,
  tasks,
  playbooks,
  playbookTasks,
  programAccounts,
  programRevenueSnapshots,
  dataUploads,
  accountMetrics,
  accountCategoryGaps,
  subscriptionPlans,
  territoryManagers,
  orders,
  orderItems,
  revShareTiers,
  settings,
  agentState,
  agentContacts,
  agentAccountCategorySpend,
  agentInteractions,
  agentPlaybooks,
  agentCompetitors,
  agentAccountCompetitors,
  agentPlaybookLearnings,
  agentProjects,
  contacts,
  projects,
  orderSignals,
  competitorMentions,
} from "@shared/schema";
import { sql } from "drizzle-orm";

// ─── TENANT ────────────────────────────────────────────────────────────────────
const TENANT_ID = 8; // Graham's demo tenant

export async function seed() {
  console.log("🌱 Seeding ABC Supply Co. demo data...");

  // ── Clear in FK-safe order ────────────────────────────────────────────────
  await db.delete(competitorMentions);
  await db.delete(orderSignals);
  await db.delete(projects);
  await db.delete(contacts);
  await db.delete(programRevenueSnapshots);
  await db.delete(programAccounts);
  await db.delete(accountCategoryGaps);
  await db.delete(accountMetrics);
  await db.delete(playbookTasks);
  await db.delete(tasks);
  await db.delete(playbooks);
  await db.delete(profileCategories);
  await db.delete(segmentProfiles);
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(products);
  await db.delete(productCategories);
  await db.delete(dataUploads);
  await db.delete(accounts);
  await db.delete(territoryManagers);
  await db.delete(revShareTiers);
  await db.delete(settings);

  await db.execute(
    sql`UPDATE tenants SET subscription_status = 'active', plan_type = 'professional' WHERE id = ${TENANT_ID}`
  );

  // ── Territory Managers ────────────────────────────────────────────────────
  const tms = await db
    .insert(territoryManagers)
    .values([
      {
        tenantId: TENANT_ID,
        name: "Sarah Chen",
        email: "sarah.chen@marksupply.com",
        territories: ["Northeast", "Mid-Atlantic"],
        isActive: true,
      },
      {
        tenantId: TENANT_ID,
        name: "James Rivera",
        email: "james.rivera@marksupply.com",
        territories: ["Southeast", "Florida"],
        isActive: true,
      },
      {
        tenantId: TENANT_ID,
        name: "Mike Thornton",
        email: "mike.thornton@marksupply.com",
        territories: ["Midwest", "Great Lakes"],
        isActive: true,
      },
    ])
    .returning();
  console.log(`✓ ${tms.length} territory managers`);

  const [sarah, james, mike] = tms;

  // ── Product Categories ────────────────────────────────────────────────────
  const cats = await db
    .insert(productCategories)
    .values([
      { tenantId: TENANT_ID, name: "HVAC Equipment" },            // 0
      { tenantId: TENANT_ID, name: "Refrigerant & Supplies" },    // 1
      { tenantId: TENANT_ID, name: "Ductwork & Fittings" },       // 2
      { tenantId: TENANT_ID, name: "Controls & Thermostats" },    // 3
      { tenantId: TENANT_ID, name: "Water Heaters" },             // 4
      { tenantId: TENANT_ID, name: "Tools & Safety" },            // 5
      { tenantId: TENANT_ID, name: "Pipe & Fittings" },           // 6
      { tenantId: TENANT_ID, name: "PVF (Pipe, Valves, Fittings)" }, // 7
      { tenantId: TENANT_ID, name: "Plumbing Fixtures" },         // 8
      { tenantId: TENANT_ID, name: "Drainage Systems" },          // 9
      { tenantId: TENANT_ID, name: "Insulation Materials" },      // 10
      { tenantId: TENANT_ID, name: "Electrical Components" },     // 11
    ])
    .returning();
  console.log(`✓ ${cats.length} categories`);

  // ── Products ──────────────────────────────────────────────────────────────
  const productRows: {
    tenantId: number;
    sku: string;
    name: string;
    categoryId: number;
    unitCost: string;
    unitPrice: string;
  }[] = [
      // HVAC
      { tenantId: TENANT_ID, sku: "HVAC-1001", name: "Carrier 3-Ton AC Unit", categoryId: cats[0].id, unitCost: "1400", unitPrice: "1890" },
      { tenantId: TENANT_ID, sku: "HVAC-1002", name: "Trane Heat Pump XR15", categoryId: cats[0].id, unitCost: "1250", unitPrice: "1688" },
      { tenantId: TENANT_ID, sku: "HVAC-1003", name: "Lennox Furnace SL280V", categoryId: cats[0].id, unitCost: "980", unitPrice: "1323" },
      // Refrigerant
      { tenantId: TENANT_ID, sku: "REF-2001", name: "R-410A 25lb Cylinder", categoryId: cats[1].id, unitCost: "95", unitPrice: "128" },
      { tenantId: TENANT_ID, sku: "REF-2002", name: "Vacuum Pump 2-Stage", categoryId: cats[1].id, unitCost: "210", unitPrice: "284" },
      // Ductwork
      { tenantId: TENANT_ID, sku: "DUCT-3001", name: "6\" Flex Duct 25ft", categoryId: cats[2].id, unitCost: "48", unitPrice: "65" },
      { tenantId: TENANT_ID, sku: "DUCT-3002", name: "Sheet Metal Elbow 6\"", categoryId: cats[2].id, unitCost: "12", unitPrice: "16" },
      // Controls
      { tenantId: TENANT_ID, sku: "CTRL-4001", name: "Honeywell T6 Pro", categoryId: cats[3].id, unitCost: "42", unitPrice: "57" },
      { tenantId: TENANT_ID, sku: "CTRL-4002", name: "Ecobee Smart Thermostat", categoryId: cats[3].id, unitCost: "145", unitPrice: "196" },
      { tenantId: TENANT_ID, sku: "CTRL-4003", name: "Nest Learning Thermostat", categoryId: cats[3].id, unitCost: "175", unitPrice: "236" },
      // Water Heaters
      { tenantId: TENANT_ID, sku: "WH-5001", name: "Bradford White 50gal Gas", categoryId: cats[4].id, unitCost: "480", unitPrice: "648" },
      { tenantId: TENANT_ID, sku: "WH-5002", name: "Rheem 40gal Electric", categoryId: cats[4].id, unitCost: "340", unitPrice: "459" },
      { tenantId: TENANT_ID, sku: "WH-5003", name: "Navien NPE-240A Tankless", categoryId: cats[4].id, unitCost: "890", unitPrice: "1202" },
      // Tools
      { tenantId: TENANT_ID, sku: "TOOL-6001", name: "Milwaukee Drill M18", categoryId: cats[5].id, unitCost: "165", unitPrice: "223" },
      // Pipe
      { tenantId: TENANT_ID, sku: "PIPE-7001", name: "1\" Copper Type L 10ft", categoryId: cats[6].id, unitCost: "38", unitPrice: "51" },
      { tenantId: TENANT_ID, sku: "PIPE-7002", name: "3/4\" PEX Roll 500ft", categoryId: cats[6].id, unitCost: "95", unitPrice: "128" },
      // PVF
      { tenantId: TENANT_ID, sku: "PVF-8001", name: "Ball Valve 1\" Brass", categoryId: cats[7].id, unitCost: "22", unitPrice: "30" },
      { tenantId: TENANT_ID, sku: "PVF-8002", name: "Gate Valve 2\" Bronze", categoryId: cats[7].id, unitCost: "58", unitPrice: "78" },
      // Fixtures
      { tenantId: TENANT_ID, sku: "FIX-9001", name: "Kohler Toilet Cimarron", categoryId: cats[8].id, unitCost: "280", unitPrice: "378" },
      { tenantId: TENANT_ID, sku: "FIX-9002", name: "Delta Pull-Down Faucet", categoryId: cats[8].id, unitCost: "195", unitPrice: "263" },
      // Drainage
      { tenantId: TENANT_ID, sku: "DRN-10001", name: "4\" ABS P-Trap", categoryId: cats[9].id, unitCost: "8", unitPrice: "11" },
      // Insulation
      { tenantId: TENANT_ID, sku: "INS-11001", name: "Armaflex 1\" pipe insulation 6ft", categoryId: cats[10].id, unitCost: "14", unitPrice: "19" },
      // Electrical
      { tenantId: TENANT_ID, sku: "ELEC-12001", name: "240V Disconnect Box", categoryId: cats[11].id, unitCost: "62", unitPrice: "84" },
    ];
  const prods = await db.insert(products).values(productRows).returning();
  console.log(`✓ ${prods.length} products`);

  // ── Accounts (20 named, narrative-specific) ───────────────────────────────
  const accountDefs = [
    // Sarah's territory — Northeast
    { name: "Metro HVAC Solutions", segment: "HVAC", region: "Northeast", assignedTm: sarah.name, baseRev: 245000, state: "graduated" },
    { name: "Allied Mechanical Group", segment: "Mechanical", region: "Mid-Atlantic", assignedTm: sarah.name, baseRev: 198000, state: "enrolled" },
    { name: "Northeast Heating & Cooling", segment: "HVAC", region: "Northeast", assignedTm: sarah.name, baseRev: 156000, state: "enrolled" },
    { name: "Premier Plumbing NJ", segment: "Plumbing", region: "Mid-Atlantic", assignedTm: sarah.name, baseRev: 134000, state: "candidate" },
    { name: "Coastal Mechanical", segment: "Mechanical", region: "Northeast", assignedTm: sarah.name, baseRev: 88000, state: "at_risk" },
    // James's territory — Southeast
    { name: "Sunshine HVAC Florida", segment: "HVAC", region: "Florida", assignedTm: james.name, baseRev: 189000, state: "graduated" },
    { name: "Gulf Coast Plumbing", segment: "Plumbing", region: "Southeast", assignedTm: james.name, baseRev: 143000, state: "enrolled" },
    { name: "Tampa Bay Mechanical", segment: "Mechanical", region: "Florida", assignedTm: james.name, baseRev: 210000, state: "enrolled" },
    { name: "Palmetto Heating & Air", segment: "HVAC", region: "Southeast", assignedTm: james.name, baseRev: 97000, state: "at_risk" },
    { name: "Atlantic Plumbing Co", segment: "Plumbing", region: "Southeast", assignedTm: james.name, baseRev: 72000, state: "candidate" },
    { name: "Carolina Climate Control", segment: "HVAC", region: "Southeast", assignedTm: james.name, baseRev: 61000, state: "candidate" },
    // Mike's territory — Midwest
    { name: "Great Lakes Heating", segment: "HVAC", region: "Great Lakes", assignedTm: mike.name, baseRev: 178000, state: "graduated" },
    { name: "Midwest Pipe & Supply", segment: "Plumbing", region: "Midwest", assignedTm: mike.name, baseRev: 162000, state: "candidate" },
    { name: "Heartland Mechanical", segment: "Mechanical", region: "Midwest", assignedTm: mike.name, baseRev: 145000, state: "enrolled" },
    { name: "Chicago Comfort Systems", segment: "HVAC", region: "Great Lakes", assignedTm: mike.name, baseRev: 118000, state: "candidate" },
    { name: "Lake Shore Plumbing", segment: "Plumbing", region: "Great Lakes", assignedTm: mike.name, baseRev: 94000, state: "candidate" },
    { name: "Detroit Climate Pro", segment: "HVAC", region: "Midwest", assignedTm: mike.name, baseRev: 87000, state: "candidate" },
    { name: "Ohio Valley HVAC", segment: "HVAC", region: "Midwest", assignedTm: mike.name, baseRev: 76000, state: "candidate" },
    { name: "Buckeye Mechanical", segment: "Mechanical", region: "Great Lakes", assignedTm: mike.name, baseRev: 234000, state: "enrolled" },
    { name: "Indiana Plumbing Services", segment: "Plumbing", region: "Midwest", assignedTm: mike.name, baseRev: 58000, state: "candidate" },
  ];

  const accs = await db
    .insert(accounts)
    .values(
      accountDefs.map((a) => ({
        tenantId: TENANT_ID,
        name: a.name,
        segment: a.segment,
        region: a.region,
        assignedTm: a.assignedTm,
        status: "active",
      }))
    )
    .returning();
  console.log(`✓ ${accs.length} accounts`);

  // ── Orders (12 months shaped by account state) ────────────────────────────
  const orderRows: {
    tenantId: number;
    accountId: number;
    orderDate: Date;
    totalAmount: string;
    marginAmount: string;
  }[] = [];

  for (let i = 0; i < accs.length; i++) {
    const acc = accs[i];
    const def = accountDefs[i];
    const monthlyBase = def.baseRev / 12;

    for (let mAgo = 11; mAgo >= 0; mAgo--) {
      let multiplier = 1.0;

      if (def.state === "graduated") {
        // Clear upward trend throughout year
        multiplier = 0.85 + (11 - mAgo) * 0.025;
      } else if (def.state === "enrolled") {
        // Flat first half, then uptick last 3 months
        multiplier = mAgo > 3 ? 1.0 + Math.random() * 0.05 : 1.12 + Math.random() * 0.06;
      } else if (def.state === "at_risk") {
        // Slight decline in recent months; last 2 months very low
        multiplier = mAgo > 2 ? 0.95 + Math.random() * 0.08 : 0.55 + Math.random() * 0.1;
      } else {
        // Candidates / no-program: steady moderate
        multiplier = 0.9 + Math.random() * 0.2;
      }

      const numOrders = def.baseRev > 150000 ? 3 : 2;
      for (let o = 0; o < numOrders; o++) {
        const d = new Date();
        d.setMonth(d.getMonth() - mAgo);
        d.setDate(Math.floor(Math.random() * 25) + 1);
        const amt = Math.floor((monthlyBase / numOrders) * multiplier);
        orderRows.push({
          tenantId: TENANT_ID,
          accountId: acc.id,
          orderDate: d,
          totalAmount: String(amt),
          marginAmount: String(Math.floor(amt * 0.26)),
        });
      }
    }
  }

  const ordersCreated = await db.insert(orders).values(orderRows).returning();
  console.log(`✓ ${ordersCreated.length} orders`);

  // Order items — each order gets 2-4 line items
  const itemRows: {
    tenantId: number;
    orderId: number;
    productId: number;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
  }[] = [];

  for (const order of ordersCreated) {
    const n = Math.floor(Math.random() * 3) + 2;
    let rem = parseFloat(order.totalAmount);
    for (let j = 0; j < n; j++) {
      const prod = prods[Math.floor(Math.random() * prods.length)];
      const line =
        j === n - 1 ? rem : Math.floor((rem / (n - j)) * (0.5 + Math.random()));
      rem -= line;
      const up = parseFloat(prod.unitPrice);
      itemRows.push({
        tenantId: TENANT_ID,
        orderId: order.id,
        productId: prod.id,
        quantity: String(Math.max(1, Math.round(line / up))),
        unitPrice: String(up),
        lineTotal: String(Math.max(1, Math.floor(line))),
      });
    }
  }
  await db.insert(orderItems).values(itemRows);
  console.log(`✓ ${itemRows.length} order items`);

  // ── Segment Profiles (ICP) ────────────────────────────────────────────────
  const profiles = await db
    .insert(segmentProfiles)
    .values([
      {
        tenantId: TENANT_ID,
        segment: "HVAC",
        name: "Full-Scope HVAC Contractor",
        description: "HVAC contractors who purchase across all major categories — equipment, refrigerant, controls, and water heaters",
        minAnnualRevenue: "75000",
        status: "approved",
        approvedBy: "Admin",
        approvedAt: sql`CURRENT_TIMESTAMP`,
      },
      {
        tenantId: TENANT_ID,
        segment: "Plumbing",
        name: "Full-Scope Plumbing Contractor",
        description: "Plumbing contractors purchasing pipe, fixtures, water heaters, and drainage across all job types",
        minAnnualRevenue: "60000",
        status: "approved",
        approvedBy: "Admin",
        approvedAt: sql`CURRENT_TIMESTAMP`,
      },
      {
        tenantId: TENANT_ID,
        segment: "Mechanical",
        name: "Commercial Mechanical Contractor",
        description: "Commercial mechanical with diverse HVAC and plumbing needs — highest-value segment",
        minAnnualRevenue: "100000",
        status: "approved",
        approvedBy: "Admin",
        approvedAt: sql`CURRENT_TIMESTAMP`,
      },
    ])
    .returning();

  const pcRows: {
    tenantId: number;
    profileId: number;
    categoryId: number;
    expectedPct: string;
    importance: string;
    isRequired: boolean;
    notes?: string;
  }[] = [
      // HVAC ICP
      { tenantId: TENANT_ID, profileId: profiles[0].id, categoryId: cats[0].id, expectedPct: "35", importance: "1", isRequired: true },
      { tenantId: TENANT_ID, profileId: profiles[0].id, categoryId: cats[1].id, expectedPct: "18", importance: "1", isRequired: true },
      { tenantId: TENANT_ID, profileId: profiles[0].id, categoryId: cats[2].id, expectedPct: "15", importance: "1", isRequired: false },
      { tenantId: TENANT_ID, profileId: profiles[0].id, categoryId: cats[3].id, expectedPct: "12", importance: "1.5", isRequired: false, notes: "Growing — smart thermostats" },
      { tenantId: TENANT_ID, profileId: profiles[0].id, categoryId: cats[4].id, expectedPct: "10", importance: "2", isRequired: false, notes: "Strategic — high margin" },
      { tenantId: TENANT_ID, profileId: profiles[0].id, categoryId: cats[5].id, expectedPct: "5", importance: "0.5", isRequired: false },
      { tenantId: TENANT_ID, profileId: profiles[0].id, categoryId: cats[10].id, expectedPct: "5", importance: "1", isRequired: false },
      // Plumbing ICP
      { tenantId: TENANT_ID, profileId: profiles[1].id, categoryId: cats[6].id, expectedPct: "30", importance: "1", isRequired: true },
      { tenantId: TENANT_ID, profileId: profiles[1].id, categoryId: cats[7].id, expectedPct: "20", importance: "1", isRequired: true },
      { tenantId: TENANT_ID, profileId: profiles[1].id, categoryId: cats[4].id, expectedPct: "18", importance: "2", isRequired: false, notes: "Strategic — water heaters" },
      { tenantId: TENANT_ID, profileId: profiles[1].id, categoryId: cats[8].id, expectedPct: "15", importance: "1", isRequired: false },
      { tenantId: TENANT_ID, profileId: profiles[1].id, categoryId: cats[9].id, expectedPct: "10", importance: "1", isRequired: false },
      { tenantId: TENANT_ID, profileId: profiles[1].id, categoryId: cats[5].id, expectedPct: "7", importance: "0.5", isRequired: false },
      // Mechanical ICP
      { tenantId: TENANT_ID, profileId: profiles[2].id, categoryId: cats[0].id, expectedPct: "25", importance: "1", isRequired: true },
      { tenantId: TENANT_ID, profileId: profiles[2].id, categoryId: cats[6].id, expectedPct: "20", importance: "1", isRequired: true },
      { tenantId: TENANT_ID, profileId: profiles[2].id, categoryId: cats[2].id, expectedPct: "15", importance: "1", isRequired: false },
      { tenantId: TENANT_ID, profileId: profiles[2].id, categoryId: cats[7].id, expectedPct: "12", importance: "1", isRequired: false },
      { tenantId: TENANT_ID, profileId: profiles[2].id, categoryId: cats[10].id, expectedPct: "10", importance: "1.5", isRequired: false, notes: "Commercial insulation" },
      { tenantId: TENANT_ID, profileId: profiles[2].id, categoryId: cats[11].id, expectedPct: "10", importance: "1", isRequired: false },
      { tenantId: TENANT_ID, profileId: profiles[2].id, categoryId: cats[5].id, expectedPct: "8", importance: "0.5", isRequired: false },
    ];
  await db.insert(profileCategories).values(pcRows);
  console.log(`✓ ${profiles.length} segment profiles`);

  // ── Account Metrics & Gaps (scripted per account) ─────────────────────────
  // Opportunity scores tied to demo state
  const scoreByState: Record<string, number> = {
    graduated: 62,
    enrolled: 74,
    at_risk: 55,
    candidate: 85,
  };

  // Scripted gaps: [categoryIndex, expectedPct, actualPct]
  const scriptedGaps: Record<string, [number, number, number][]> = {
    "Metro HVAC Solutions": [[3, 12, 11], [4, 10, 9]],          // almost closed — graduated
    "Allied Mechanical Group": [[7, 12, 3], [10, 10, 0], [11, 10, 2]],  // $58K opp
    "Northeast Heating & Cooling": [[4, 10, 1], [3, 12, 2]],           // water heater + controls gap
    "Coastal Mechanical": [[4, 10, 0], [7, 12, 1]],           // stalled gaps — at risk
    "Sunshine HVAC Florida": [[3, 12, 11], [4, 10, 10]],         // graduated — gaps closed
    "Gulf Coast Plumbing": [[9, 10, 2], [4, 18, 3]],           // drainage + water heater
    "Tampa Bay Mechanical": [[10, 10, 0], [11, 10, 2], [7, 12, 3]], // $58K opp
    "Palmetto Heating & Air": [[3, 12, 1], [4, 10, 0]],           // at risk — competitor
    "Great Lakes Heating": [[3, 12, 11], [4, 10, 9]],          // graduated
    "Midwest Pipe & Supply": [[7, 20, 3], [4, 18, 2]],           // high score candidate
    "Heartland Mechanical": [[10, 10, 0], [11, 10, 1]],         // early enrolled
    "Buckeye Mechanical": [[7, 12, 2], [10, 10, 0], [11, 10, 3]], // big account
  };

  const metricsRows: {
    tenantId: number;
    accountId: number;
    last12mRevenue: string;
    last3mRevenue: string;
    yoyGrowthRate: string;
    categoryCount: number;
    categoryPenetration: string;
    categoryGapScore: string;
    opportunityScore: string;
    matchedProfileId: number;
  }[] = [];

  const gapRows: {
    tenantId: number;
    accountId: number;
    categoryId: number;
    expectedPct: string;
    actualPct: string;
    gapPct: string;
    estimatedOpportunity: string;
  }[] = [];

  for (let i = 0; i < accs.length; i++) {
    const acc = accs[i];
    const def = accountDefs[i];
    const score =
      (scoreByState[def.state] || 75) + Math.floor(Math.random() * 8 - 4);
    const penetration =
      def.state === "graduated" ? 68 + Math.floor(Math.random() * 8) :
        def.state === "enrolled" ? 45 + Math.floor(Math.random() * 12) :
          def.state === "at_risk" ? 32 + Math.floor(Math.random() * 8) :
            28 + Math.floor(Math.random() * 15);
    const yoy =
      def.state === "graduated" ? 22 + Math.floor(Math.random() * 8) :
        def.state === "enrolled" ? 12 + Math.floor(Math.random() * 6) :
          def.state === "at_risk" ? -5 + Math.floor(Math.random() * 4) :
            5 + Math.floor(Math.random() * 8);
    const profile =
      def.segment === "HVAC" ? profiles[0] :
        def.segment === "Plumbing" ? profiles[1] : profiles[2];

    metricsRows.push({
      tenantId: TENANT_ID,
      accountId: acc.id,
      last12mRevenue: String(def.baseRev),
      last3mRevenue: String(Math.floor((def.baseRev / 4) * (1 + yoy / 100))),
      yoyGrowthRate: String(yoy),
      categoryCount: Math.floor(penetration / 10),
      categoryPenetration: String(penetration),
      categoryGapScore: String(100 - penetration),
      opportunityScore: String(Math.max(50, Math.min(99, score))),
      matchedProfileId: profile.id,
    });

    const gaps = scriptedGaps[def.name];
    if (gaps) {
      for (const [catIdx, exp, act] of gaps) {
        const gap = exp - act;
        gapRows.push({
          tenantId: TENANT_ID,
          accountId: acc.id,
          categoryId: cats[catIdx].id,
          expectedPct: String(exp),
          actualPct: String(act),
          gapPct: String(gap),
          estimatedOpportunity: String(Math.floor(def.baseRev * (gap / 100))),
        });
      }
    } else {
      // Generic gaps for unlisted accounts
      for (let g = 0; g < 2; g++) {
        const catIdx = (i + g * 3) % cats.length;
        const exp = 12 + g * 4;
        const act = Math.floor(Math.random() * 4);
        gapRows.push({
          tenantId: TENANT_ID,
          accountId: acc.id,
          categoryId: cats[catIdx].id,
          expectedPct: String(exp),
          actualPct: String(act),
          gapPct: String(exp - act),
          estimatedOpportunity: String(Math.floor(def.baseRev * ((exp - act) / 100))),
        });
      }
    }
  }

  await db.insert(accountMetrics).values(metricsRows);
  await db.insert(accountCategoryGaps).values(gapRows);
  console.log("✓ Account metrics & gaps");

  // ── Playbooks (4 named, scripted) ─────────────────────────────────────────
  const pbs = await db
    .insert(playbooks)
    .values([
      {
        tenantId: TENANT_ID,
        name: "Water Heater Expansion — Q1",
        generatedBy: "AI VP Dashboard",
        taskCount: 6,
        filtersUsed: { segment: ["HVAC", "Plumbing"], category: "Water Heaters" },
      },
      {
        tenantId: TENANT_ID,
        name: "PVF Category Recovery",
        generatedBy: "AI VP Dashboard",
        taskCount: 5,
        filtersUsed: { segment: ["Plumbing", "Mechanical"], category: "PVF" },
      },
      {
        tenantId: TENANT_ID,
        name: "Smart Thermostat Upsell — Controls Push",
        generatedBy: "AI VP Dashboard",
        taskCount: 4,
        filtersUsed: { segment: ["HVAC"], category: "Controls & Thermostats" },
      },
      {
        tenantId: TENANT_ID,
        name: "At-Risk Account Recovery",
        generatedBy: "AI VP Dashboard",
        taskCount: 3,
        filtersUsed: { enrollmentStatus: "at_risk" },
      },
    ])
    .returning();
  console.log(`✓ ${pbs.length} playbooks`);

  // ── Tasks (scripted call/email scripts per playbook) ──────────────────────
  const waterHeaterCall = `Hi [Contact], this is [Rep] from ABC Supply. I wanted to reach out because I've been reviewing your account and noticed a big opportunity on the water heater side.

We just became a preferred Bradford White and Rheem distributor — which means contractor-exclusive pricing and same-day availability on the 20 most popular models.

Given your volume in HVAC and plumbing, I estimate you could save $400-600/month by consolidating your water heater purchases with us.

Can I put together a custom quote based on your typical install mix?`;

  const waterHeaterEmail = `Subject: Water Heater Opportunity — Contractor-Exclusive Pricing

Hi [Contact],

I've been looking at your account and want to flag a big opportunity before Q2: we just became a preferred Bradford White and Rheem distributor.

What this means for you:
• Contractor pricing 10-15% below retail distributors
• Same-day availability on 20 most popular residential models  
• Free jobsite delivery on orders over $500

Based on your typical volume, I estimate this saves you $400-600 per month.

Would you share what models you install most? I'll put together a custom quote this week.

Best, [Rep]`;

  const pvfCall = `Hi [Contact], this is [Rep] from ABC Supply. Quick call — I know you're sourcing pipe, valves, and fittings from a few different places right now.

We've significantly expanded our PVF inventory and now stock full lines of brass, copper, and plastic. Single-source convenience, next-day delivery, volume discounts on case orders.

Can I send you our updated PVF pricing sheet and a sample quote?`;

  const thermostatCall = `Hi [Contact], [Rep] from ABC Supply. Wanted to flag our Q1 thermostat promotion before it closes.

15% off all Honeywell and Ecobee smart thermostats, and buy-10-get-1-free on Nest Learning. Given your HVAC installation volume, I think you'd see solid savings.

Would you be interested in a quote for your typical monthly quantity?`;

  const atRiskCall = `Hi [Contact], this is [Rep] from ABC Supply. I wanted to check in — I noticed we haven't seen an order from you in a few weeks and wanted to make sure everything is going smoothly.

Is there anything we can do better on service, pricing, or availability? I want to make sure we're continuing to earn your business.

Is there 10 minutes this week to reconnect?`;

  const now = new Date();
  const taskDefs: {
    tenantId: number;
    accountId: number;
    assignedTm: string;
    taskType: "call" | "email" | "visit";
    title: string;
    description: string;
    script: string;
    gapCategories: string[];
    status: string;
    dueDate: Date;
    completedAt: Date | null;
    outcome: string | null;
  }[] = [];

  // Sarah's tasks
  const sarahAccounts = accs.filter((_, i) => accountDefs[i].assignedTm === sarah.name);
  const [metroHvac, allied, neHeating, , coastalMech] = sarahAccounts;

  const due = (days: number) => { const d = new Date(now); d.setDate(d.getDate() + days); return d; };
  const past = (days: number) => { const d = new Date(now); d.setDate(d.getDate() - days); return d; };

  taskDefs.push(
    { tenantId: TENANT_ID, accountId: neHeating.id, assignedTm: sarah.name, taskType: "call", title: "Call: Introduce Bradford White Water Heater Program", description: "Northeast Heating hasn't ordered water heaters in 6 months. 10% gap vs ICP.", script: waterHeaterCall, gapCategories: ["Water Heaters"], status: "pending", dueDate: due(2), completedAt: null, outcome: null },
    { tenantId: TENANT_ID, accountId: allied.id, assignedTm: sarah.name, taskType: "email", title: "Email: PVF Pricing Sheet — Allied Mechanical", description: "Allied has a $28K PVF gap. Send pricing sheet to purchasing manager.", script: waterHeaterEmail.replace("Water Heater Opportunity", "PVF Pricing — Let's Consolidate Your Pipe & Valves"), gapCategories: ["PVF (Pipe, Valves, Fittings)"], status: "in_progress", dueDate: due(1), completedAt: null, outcome: null },
    { tenantId: TENANT_ID, accountId: coastalMech.id, assignedTm: sarah.name, taskType: "call", title: "Call: At-Risk Check-In — Coastal Mechanical", description: "90 days enrolled, no revenue growth. Last order 47 days ago.", script: atRiskCall, gapCategories: ["Water Heaters", "PVF (Pipe, Valves, Fittings)"], status: "pending", dueDate: due(0), completedAt: null, outcome: null },
    { tenantId: TENANT_ID, accountId: metroHvac.id, assignedTm: sarah.name, taskType: "call", title: "Call: Controls Upsell — Metro HVAC (Completed)", description: "Completed controls pitch — customer agreed to trial order.", script: thermostatCall, gapCategories: ["Controls & Thermostats"], status: "completed", dueDate: past(10), completedAt: past(8), outcome: "Positive — customer placed a trial order for 10 Honeywell T6 Pro units. Follow up in 30 days." },
  );

  // James's tasks
  const jamesAccounts = accs.filter((_, i) => accountDefs[i].assignedTm === james.name);
  const [, gulfCoast, tampaBay, palmetto] = jamesAccounts;

  taskDefs.push(
    { tenantId: TENANT_ID, accountId: palmetto.id, assignedTm: james.name, taskType: "call", title: "URGENT Call: Palmetto — Competitor Mention Detected", description: "Ferguson quote mentioned in email. Act within 24 hours.", script: atRiskCall, gapCategories: ["Controls & Thermostats"], status: "pending", dueDate: due(0), completedAt: null, outcome: null },
    { tenantId: TENANT_ID, accountId: tampaBay.id, assignedTm: james.name, taskType: "email", title: "Email: Insulation & Electrical Quote — Tampa Bay Mechanical", description: "Tampa Bay has $58K combined opportunity in insulation and electrical.", script: pvfCall, gapCategories: ["Insulation Materials", "Electrical Components"], status: "pending", dueDate: due(3), completedAt: null, outcome: null },
    { tenantId: TENANT_ID, accountId: gulfCoast.id, assignedTm: james.name, taskType: "call", title: "Call: Drainage Systems Introduction — Gulf Coast Plumbing", description: "Gulf Coast has 0% spend in drainage vs 10% ICP target.", script: pvfCall, gapCategories: ["Drainage Systems"], status: "pending", dueDate: due(5), completedAt: null, outcome: null },
  );

  // Mike's tasks
  const mikeAccounts = accs.filter((_, i) => accountDefs[i].assignedTm === mike.name);
  const [, midwestPipe, heartland, , , , , buckeye] = mikeAccounts;

  taskDefs.push(
    { tenantId: TENANT_ID, accountId: midwestPipe.id, assignedTm: mike.name, taskType: "call", title: "Call: Midwest Pipe — Top Unenrolled Opportunity (Score 89)", description: "No outreach logged in 45 days. $162K account with major PVF gap.", script: pvfCall, gapCategories: ["PVF (Pipe, Valves, Fittings)"], status: "pending", dueDate: due(1), completedAt: null, outcome: null },
    { tenantId: TENANT_ID, accountId: heartland.id, assignedTm: mike.name, taskType: "email", title: "Email: Welcome Package — Heartland Mechanical (Just Enrolled)", description: "Send intro email and attach playbook summary within first week of enrollment.", script: waterHeaterEmail, gapCategories: ["Insulation Materials", "Electrical Components"], status: "pending", dueDate: due(2), completedAt: null, outcome: null },
    { tenantId: TENANT_ID, accountId: buckeye.id, assignedTm: mike.name, taskType: "call", title: "Call: Buckeye Mechanical — PVF Consolidation Opportunity", description: "Buckeye is the highest-revenue enrolled account. $27K PVF gap.", script: pvfCall, gapCategories: ["PVF (Pipe, Valves, Fittings)"], status: "in_progress", dueDate: due(4), completedAt: null, outcome: null },
  );

  const createdTasks = await db.insert(tasks).values(taskDefs).returning();
  console.log(`✓ ${createdTasks.length} tasks`);

  // Link tasks to playbooks
  const ptLinks: { tenantId: number; playbookId: number; taskId: number }[] = [];
  createdTasks.forEach((t, i) => {
    const pbIdx = i < 4 ? 0 : i < 7 ? 1 : 2;
    ptLinks.push({ tenantId: TENANT_ID, playbookId: pbs[pbIdx % pbs.length].id, taskId: t.id });
  });
  await db.insert(playbookTasks).values(ptLinks);

  // ── Program Accounts (enrolled/graduated/at_risk) ─────────────────────────
  const programDefs = [
    // Graduated
    { accIdx: 0, state: "graduated", daysIn: 82, revenueStart: 245000, revenueEnd: 312000, tm: sarah.name, note: "Met all ICP category targets; controls and water heater gaps closed" },
    { accIdx: 5, state: "graduated", daysIn: 71, revenueStart: 189000, revenueEnd: 241000, tm: james.name, note: "Fastest graduation — consistent 18% MoM growth" },
    { accIdx: 11, state: "graduated", daysIn: 90, revenueStart: 178000, revenueEnd: 228000, tm: mike.name, note: "Enrolled by previous TM; Mike inherited and closed successfully" },
    // Enrolled active
    { accIdx: 1, state: "active", daysIn: 62, revenueStart: 198000, revenueEnd: null, tm: sarah.name, note: null },
    { accIdx: 2, state: "active", daysIn: 31, revenueStart: 156000, revenueEnd: null, tm: sarah.name, note: null },
    { accIdx: 6, state: "active", daysIn: 45, revenueStart: 143000, revenueEnd: null, tm: james.name, note: null },
    { accIdx: 7, state: "active", daysIn: 28, revenueStart: 210000, revenueEnd: null, tm: james.name, note: null },
    { accIdx: 13, state: "active", daysIn: 19, revenueStart: 145000, revenueEnd: null, tm: mike.name, note: null },
    { accIdx: 18, state: "active", daysIn: 55, revenueStart: 234000, revenueEnd: null, tm: mike.name, note: null },
    // At risk
    { accIdx: 4, state: "at_risk", daysIn: 90, revenueStart: 88000, revenueEnd: null, tm: sarah.name, note: null },
    { accIdx: 8, state: "at_risk", daysIn: 68, revenueStart: 97000, revenueEnd: null, tm: james.name, note: null },
  ];

  const baselineStart = new Date(now);
  baselineStart.setFullYear(baselineStart.getFullYear() - 1);
  const baselineEnd = new Date(now);
  baselineEnd.setMonth(baselineEnd.getMonth() - 1);

  const paRows = programDefs.map((pd) => {
    const enrolledAt = new Date(now);
    enrolledAt.setDate(enrolledAt.getDate() - pd.daysIn);
    const graduatedAt = pd.state === "graduated" ? new Date(now) : null;
    if (graduatedAt) graduatedAt.setDate(graduatedAt.getDate() - 5);

    return {
      tenantId: TENANT_ID,
      accountId: accs[pd.accIdx].id,
      enrolledBy: pd.tm,
      baselineStart,
      baselineEnd,
      baselineRevenue: String(pd.revenueStart),
      shareRate: "0.15",
      status: pd.state,
      targetPenetration: "75",
      targetIncrementalRevenue: String(Math.floor(pd.revenueStart * 0.3)),
      targetDurationMonths: 90,
      graduationCriteria: "any",
      graduatedAt,
      graduationNotes: pd.note,
      ...(pd.state === "graduated" && pd.revenueEnd ? {
        graduationRevenue: String(pd.revenueEnd),
        incrementalRevenue: String(pd.revenueEnd - pd.revenueStart),
        enrollmentDurationDays: pd.daysIn,
        icpCategoriesAtEnrollment: 3,
        icpCategoriesAchieved: 2,
        graduationPenetration: "85"
      } : {})
    };
  });

  const programAccsCreated = await db.insert(programAccounts).values(paRows).returning();
  console.log(`✓ ${programAccsCreated.length} program accounts`);

  // Revenue snapshots — 7 months of data shaped by state
  for (let p = 0; p < programAccsCreated.length; p++) {
    const pa = programAccsCreated[p];
    const pd = programDefs[p];
    const baseline = pd.revenueStart;

    for (let i = 6; i >= 0; i--) {
      let growthFactor = 1.0;
      if (pd.state === "graduated") growthFactor = 1 + (6 - i) * 0.045;
      else if (pd.state === "active") growthFactor = i > 3 ? 1.0 : 1 + (4 - i) * 0.035;
      else growthFactor = i > 2 ? 0.97 : 0.72; // at_risk: recently declined

      const periodStart = new Date(now);
      periodStart.setMonth(periodStart.getMonth() - (i + 1));
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() - i);
      const periodRevenue = Math.floor((baseline / 12) * growthFactor);
      const baselineMonthly = Math.floor(baseline / 12);
      const incremental = Math.max(0, periodRevenue - baselineMonthly);

      await db.insert(programRevenueSnapshots).values({
        programAccountId: pa.id,
        periodStart,
        periodEnd,
        periodRevenue: String(periodRevenue),
        baselineComparison: String(baselineMonthly),
        incrementalRevenue: String(incremental),
        feeAmount: String(Math.floor(incremental * 0.15)),
      });
    }
  }
  console.log("✓ Revenue snapshots");

  // ── Rev-share tiers ───────────────────────────────────────────────────────
  await db.insert(revShareTiers).values([
    { tenantId: TENANT_ID, minRevenue: "0", maxRevenue: "50000", shareRate: "15", displayOrder: 1, isActive: true },
    { tenantId: TENANT_ID, minRevenue: "50000", maxRevenue: "150000", shareRate: "12", displayOrder: 2, isActive: true },
    { tenantId: TENANT_ID, minRevenue: "150000", maxRevenue: null, shareRate: "10", displayOrder: 3, isActive: true },
  ]);

  // ── Settings ──────────────────────────────────────────────────────────────
  await db.insert(settings).values([
    { tenantId: TENANT_ID, key: "companyName", value: "ABC Supply Co." },
    { tenantId: TENANT_ID, key: "appTitle", value: "Wallet Share Expander" },
  ]);

  // ── Data uploads (history) ────────────────────────────────────────────────
  await db.insert(dataUploads).values([
    { tenantId: TENANT_ID, uploadType: "accounts", fileName: "mark_supply_accounts_2024.csv", rowCount: 487, status: "completed", uploadedBy: "Graham" },
    { tenantId: TENANT_ID, uploadType: "orders", fileName: "orders_q3_q4_2023.csv", rowCount: 15234, status: "completed", uploadedBy: "Graham" },
    { tenantId: TENANT_ID, uploadType: "orders", fileName: "orders_q1_q2_2024.csv", rowCount: 12891, status: "completed", uploadedBy: "Graham" },
    { tenantId: TENANT_ID, uploadType: "products", fileName: "product_catalog_v3.csv", rowCount: 2341, status: "completed", uploadedBy: "Graham" },
    { tenantId: TENANT_ID, uploadType: "categories", fileName: "category_taxonomy.csv", rowCount: 156, status: "completed", uploadedBy: "Graham" },
  ]);

  // ── Subscription plans ────────────────────────────────────────────────────
  await db.delete(subscriptionPlans);
  await db.insert(subscriptionPlans).values([
    {
      name: "Starter",
      slug: "starter",
      stripeMonthlyPriceId: null,
      stripeYearlyPriceId: null,
      monthlyPrice: "0",
      yearlyPrice: "0",
      features: ["1 enrolled account", "Basic gap analysis", "Standard playbooks", "Email support"],
      limits: { accounts: 1, users: 1 },
      isActive: true,
      displayOrder: 1,
    },
    {
      name: "Growth",
      slug: "growth",
      stripeMonthlyPriceId: null,
      stripeYearlyPriceId: null,
      monthlyPrice: "299",
      yearlyPrice: "2990",
      features: ["Up to 20 enrolled accounts", "3 territory managers", "AI gap analysis", "Playbooks with call scripts", "Email support"],
      limits: { accounts: 20, users: 3 },
      isActive: true,
      displayOrder: 2,
    },
    {
      name: "Scale",
      slug: "scale",
      stripeMonthlyPriceId: null,
      stripeYearlyPriceId: null,
      monthlyPrice: "699",
      yearlyPrice: "6990",
      features: ["Unlimited enrolled accounts", "Unlimited territory managers", "Agentic daily briefings", "Email intelligence", "Ask Anything AI", "Priority support"],
      limits: { accounts: -1, users: -1 },
      isActive: true,
      displayOrder: 3,
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      stripeMonthlyPriceId: null,
      stripeYearlyPriceId: null,
      monthlyPrice: "0",
      yearlyPrice: "0",
      features: ["Unlimited everything", "CRM integration", "Custom AI training", "White-label", "Dedicated CSM", "SSO"],
      limits: { accounts: -1, users: -1 },
      isActive: true,
      displayOrder: 4,
    },
  ]);

  // ── Agent Detail Tables (contacts, spend, interactions, playbooks, competitors) ──
  await db.delete(agentContacts).where(sql`tenant_id = ${TENANT_ID}`);
  await db.delete(agentAccountCategorySpend).where(sql`tenant_id = ${TENANT_ID}`);
  await db.delete(agentInteractions).where(sql`tenant_id = ${TENANT_ID}`);
  await db.delete(agentPlaybooks).where(sql`tenant_id = ${TENANT_ID}`);
  await db.delete(agentAccountCompetitors).where(sql`tenant_id = ${TENANT_ID}`);
  await db.delete(agentCompetitors).where(sql`tenant_id = ${TENANT_ID}`);
  await db.delete(agentPlaybookLearnings).where(sql`tenant_id = ${TENANT_ID}`);

  // Contacts for priority accounts
  await db.insert(agentContacts).values([
    { tenantId: TENANT_ID, accountId: accs[12].id, name: "Mike Thornton", role: "purchasing_mgr", email: "mthornton@midwestpipe.com", isPrimary: true },
    { tenantId: TENANT_ID, accountId: accs[12].id, name: "Sarah Chen", role: "coo", email: "schen@midwestpipe.com", isPrimary: false },
    { tenantId: TENANT_ID, accountId: accs[8].id, name: "James Rivera", role: "owner", email: "jrivera@palmettoheating.com", isPrimary: true },
    { tenantId: TENANT_ID, accountId: accs[8].id, name: "Tom Nguyen", role: "ap", email: "tnguyen@palmettoheating.com", isPrimary: false },
    { tenantId: TENANT_ID, accountId: accs[1].id, name: "Dave Morrison", role: "purchasing_mgr", email: "dmorrison@alliedmech.com", isPrimary: true },
    { tenantId: TENANT_ID, accountId: accs[1].id, name: "Linda Hayes", role: "owner", email: "lhayes@alliedmech.com", isPrimary: false },
  ]);
  console.log("✓ Agent contacts seeded");

  // Category spend gaps for priority accounts
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);
  await db.insert(agentAccountCategorySpend).values([
    { tenantId: TENANT_ID, accountId: accs[12].id, categoryId: 1, currentSpend: "4200", potentialSpend: "31700", gapPercentage: "86.8", gapDollars: "27500", lastOrderDate: sixtyDaysAgo, daysSinceOrder: 60, trend: "new_gap" },
    { tenantId: TENANT_ID, accountId: accs[12].id, categoryId: 3, currentSpend: "8100", potentialSpend: "34000", gapPercentage: "76.2", gapDollars: "25900", lastOrderDate: thirtyDaysAgo, daysSinceOrder: 30, trend: "declining" },
    { tenantId: TENANT_ID, accountId: accs[12].id, categoryId: 2, currentSpend: "18500", potentialSpend: "22000", gapPercentage: "15.9", gapDollars: "3500", lastOrderDate: thirtyDaysAgo, daysSinceOrder: 30, trend: "stable" },
    { tenantId: TENANT_ID, accountId: accs[8].id, categoryId: 4, currentSpend: "3200", potentialSpend: "13900", gapPercentage: "77", gapDollars: "10700", lastOrderDate: thirtyDaysAgo, daysSinceOrder: 30, trend: "declining" },
    { tenantId: TENANT_ID, accountId: accs[8].id, categoryId: 1, currentSpend: "12800", potentialSpend: "18000", gapPercentage: "28.9", gapDollars: "5200", lastOrderDate: thirtyDaysAgo, daysSinceOrder: 30, trend: "stable" },
    { tenantId: TENANT_ID, accountId: accs[1].id, categoryId: 1, currentSpend: "6200", potentialSpend: "24000", gapPercentage: "74.2", gapDollars: "17800", lastOrderDate: sixtyDaysAgo, daysSinceOrder: 60, trend: "new_gap" },
    { tenantId: TENANT_ID, accountId: accs[1].id, categoryId: 2, currentSpend: "22400", potentialSpend: "28000", gapPercentage: "20", gapDollars: "5600", lastOrderDate: thirtyDaysAgo, daysSinceOrder: 30, trend: "growing" },
  ]);
  console.log("✓ Agent category spend seeded");

  // Recent interactions
  await db.insert(agentInteractions).values([
    { tenantId: TENANT_ID, accountId: accs[12].id, interactionType: "email", direction: "outbound", subject: "PVF Pricing Sheet — Midwest Pipe", body: "Sent updated PVF pricing sheet with volume discounts.", occurredAt: new Date(now.getTime() - 3 * 86400000), sentimentSignal: "neutral" },
    { tenantId: TENANT_ID, accountId: accs[12].id, interactionType: "call", direction: "outbound", subject: "Intro call — Mike Thornton", body: "Discussed current PVF sourcing. Currently buying from local distributor. Interested in seeing competitive pricing.", occurredAt: new Date(now.getTime() - 10 * 86400000), sentimentSignal: "positive" },
    { tenantId: TENANT_ID, accountId: accs[8].id, interactionType: "email", direction: "inbound", subject: "RE: Controls Quote Follow-up", body: "James mentioned Ferguson sent a competitive quote for Controls & Thermostats. Needs response within the week.", occurredAt: new Date(now.getTime() - 1 * 86400000), sentimentSignal: "competitor_mention" },
    { tenantId: TENANT_ID, accountId: accs[8].id, interactionType: "call", direction: "outbound", subject: "Quarterly review — Palmetto Heating", body: "Reviewed Q4 spend. Revenue flat. James satisfied with HVAC supply but exploring Controls options.", occurredAt: new Date(now.getTime() - 14 * 86400000), sentimentSignal: "neutral" },
    { tenantId: TENANT_ID, accountId: accs[1].id, interactionType: "email", direction: "outbound", subject: "PVF Volume Discount Proposal", body: "Sent proposal for PVF volume discount program. $17.8K gap identified.", occurredAt: new Date(now.getTime() - 5 * 86400000), sentimentSignal: "positive" },
    { tenantId: TENANT_ID, accountId: accs[1].id, interactionType: "call", direction: "inbound", subject: "Order inquiry — Allied Mechanical", body: "Dave called about lead times for copper fittings. Good engagement signal.", occurredAt: new Date(now.getTime() - 7 * 86400000), sentimentSignal: "positive" },
  ]);
  console.log("✓ Agent interactions seeded");

  // Active playbooks
  await db.insert(agentPlaybooks).values([
    {
      tenantId: TENANT_ID, accountId: accs[12].id, status: "active",
      playbookJson: {
        playbook_type: "gap_closure",
        priority_action: "Schedule PVF demo with Mike Thornton. Show volume pricing vs current local distributor.",
        urgency_level: "immediate",
        email_subject: "ABC Supply PVF Solutions for Midwest Pipe",
        email_draft: "Hi Mike,\n\nFollowing up on our conversation about your PVF sourcing. I've put together a custom pricing sheet that shows how we can save you up to 15% on your current PVF spend.\n\nWould you have 15 minutes this week to review? I can walk you through our volume discount program.\n\nBest,\nYour ABC Supply Rep",
        talking_points: [
          "Current PVF gap is $27.5K — largest single opportunity in territory",
          "Volume discount tiers: 5% at $10K/mo, 10% at $20K/mo, 15% at $30K/mo",
          "Same-day delivery from local warehouse vs 3-day from current distributor",
          "Reference: Similar account (Summit Mechanical) closed $22K PVF gap in 45 days",
        ],
        call_script: "Hi Mike, this is [Rep Name] from ABC Supply. I wanted to follow up on the PVF pricing sheet I sent over. I noticed you're currently sourcing from a local distributor, and I think we can offer significantly better pricing with our volume discount program. Do you have a few minutes to discuss?",
      },
      focusCategories: ["PVF", "Water Heaters"],
    },
    {
      tenantId: TENANT_ID, accountId: accs[8].id, status: "active",
      playbookJson: {
        playbook_type: "competitive_defense",
        priority_action: "Counter Ferguson quote on Controls & Thermostats. Prepare competitive pricing within 24 hours.",
        urgency_level: "immediate",
        email_subject: "Updated Controls & Thermostats Pricing — Palmetto Heating",
        email_draft: "Hi James,\n\nI heard you received a quote from another supplier for Controls & Thermostats. I want to make sure we're giving you the best value.\n\nI've prepared an updated pricing sheet that matches or beats any competitive offer, plus includes our same-day delivery guarantee and dedicated tech support line.\n\nCan we connect today to review?\n\nBest,\nYour ABC Supply Rep",
        talking_points: [
          "Ferguson quote likely doesn't include installation support or same-day delivery",
          "$10.7K Controls gap — we can close this with competitive pricing",
          "Existing relationship: Palmetto has been a loyal HVAC customer for 2+ years",
          "Offer: Match Ferguson pricing + 5% loyalty discount on first order",
        ],
        call_script: "Hi James, this is [Rep Name] from ABC Supply. I understand you received a competitive quote for Controls & Thermostats. I want to make sure we earn your business — I've put together updated pricing that I think you'll find very competitive. Can we review it together?",
      },
      focusCategories: ["Controls & Thermostats"],
    },
    {
      tenantId: TENANT_ID, accountId: accs[1].id, status: "active",
      playbookJson: {
        playbook_type: "gap_closure",
        priority_action: "Follow up on PVF volume discount proposal sent to Dave Morrison.",
        urgency_level: "this_week",
        email_subject: "Following Up on PVF Proposal — Allied Mechanical",
        email_draft: "Hi Dave,\n\nJust following up on the PVF volume discount proposal I sent last week. We identified a $17.8K opportunity where we can help you consolidate your PVF purchasing.\n\nHave you had a chance to review? Happy to answer any questions.\n\nBest,\nYour ABC Supply Rep",
        talking_points: [
          "$17.8K PVF gap — second largest opportunity in enrolled accounts",
          "Dave showed interest in copper fittings — good engagement signal",
          "Allied already growing in HVAC Equipment (+8% QoQ) — build on momentum",
        ],
        call_script: "Hi Dave, this is [Rep Name] from ABC Supply. I wanted to follow up on the PVF proposal I sent. I know you mentioned interest in copper fittings — our PVF program includes competitive pricing on all copper products. Do you have a few minutes?",
      },
      focusCategories: ["PVF"],
    },
  ]);
  console.log("✓ Agent playbooks seeded");

  // Competitors
  const [fergusonComp] = await db.insert(agentCompetitors).values([
    { tenantId: TENANT_ID, name: "Ferguson Enterprises", categoriesCompetingIn: ["Controls & Thermostats", "PVF", "Water Heaters"], winRateAgainst: "42", notes: "Primary competitor in Southeast region" },
    { tenantId: TENANT_ID, name: "Winsupply", categoriesCompetingIn: ["PVF", "HVAC Equipment"], winRateAgainst: "58", notes: "Strong in PVF but weaker in HVAC" },
  ]).returning();

  await db.insert(agentAccountCompetitors).values([
    { tenantId: TENANT_ID, accountId: accs[8].id, competitorId: fergusonComp.id, categoriesLost: ["Controls & Thermostats"], detectedVia: "email_mention", confidence: "confirmed" },
  ]);
  console.log("✓ Agent competitors seeded");

  // Playbook learnings
  await db.insert(agentPlaybookLearnings).values([
    { tenantId: TENANT_ID, tradeType: "HVAC", playbookType: "gap_closure", learning: "PVF gap closure works best when paired with volume discount proposal + same-day delivery guarantee", evidenceCount: 8, successRate: "72", isActive: true },
    { tenantId: TENANT_ID, tradeType: "Plumbing", playbookType: "competitive_defense", learning: "When Ferguson is quoting, respond within 24 hours with match + loyalty discount. Win rate jumps from 42% to 67%", evidenceCount: 5, successRate: "67", isActive: true },
    { tenantId: TENANT_ID, tradeType: "HVAC", playbookType: "gap_closure", learning: "Accounts with score >80 convert to enrollment 3x faster when approached with category-specific pricing sheets", evidenceCount: 12, successRate: "78", isActive: true },
  ]);
  console.log("✓ Agent playbook learnings seeded");

  // ── Agent Projects ──────────────────────────────────────────────────────────
  await db.delete(agentProjects).where(sql`tenant_id = ${TENANT_ID}`);

  const midwestId = accs[12].id;
  const palmettoId = accs[8].id;
  const alliedId = accs[1].id;

  await db.insert(agentProjects).values([
    { tenantId: TENANT_ID, accountId: midwestId, name: "Eastside Mixed-Use Development", projectType: "new_construction", status: "bidding", estimatedValue: "340000", inferredFrom: "permit_data" },
    { tenantId: TENANT_ID, accountId: midwestId, name: "Downtown Office HVAC Retrofit", projectType: "renovation", status: "active", estimatedValue: "125000", inferredFrom: "order_pattern" },
    { tenantId: TENANT_ID, accountId: palmettoId, name: "Palmetto Gardens Condo Complex", projectType: "new_construction", status: "active", estimatedValue: "210000", inferredFrom: "rep_note" },
    { tenantId: TENANT_ID, accountId: palmettoId, name: "County Hospital Wing Expansion", projectType: "renovation", status: "bidding", estimatedValue: "175000", inferredFrom: "permit_data" },
    { tenantId: TENANT_ID, accountId: alliedId, name: "Metro Transit Authority — Station Upgrades", projectType: "renovation", status: "active", estimatedValue: "420000", inferredFrom: "order_pattern" },
    { tenantId: TENANT_ID, accountId: alliedId, name: "Riverwalk Commercial Strip", projectType: "new_construction", status: "complete", estimatedValue: "95000", inferredFrom: "rep_note" },
  ]);
  console.log("✓ Agent projects seeded");

  // ── Agent State (Daily Briefing demo data) ──────────────────────────────────
  await db.delete(agentState).where(sql`tenant_id = ${TENANT_ID}`);

  const agentRunTypes = [
    {
      agentRunType: "daily-briefing",
      currentFocus: "Monitoring 11 enrolled accounts. 2 at-risk signals detected.",
      lastRunSummary: `Scanned 20 accounts across 3 segments. Found 9 unenrolled accounts with opportunity scores above 80. Detected 2 at-risk signals: Coastal Mechanical (no growth in 90 days) and Palmetto Heating & Air (competitor mention in email). Top priority: Midwest Pipe & Supply — $53K opportunity with zero PVF spend.`,
      pendingActions: JSON.stringify([
        { account_name: accs[12].name, account_id: accs[12].id, action: `Call Mike Thornton — ${accs[12].name} has $27.5K in PVF leakage and $25.9K in Water Heaters. No outreach in 45 days.`, urgency: "immediate", why: "Score 84, $53K total opportunity. Highest-value unenrolled account." },
        { account_name: accs[8].name, account_id: accs[8].id, action: "URGENT: Ferguson competitor quote detected in email. Call James Rivera to counter within 24 hours.", urgency: "immediate", why: "At-risk enrolled account. Competitor actively quoting $10.7K Controls gap." },
        { account_name: accs[1].name, account_id: accs[1].id, action: `Follow up on PVF pricing sheet sent to ${accs[1].name}. $17.8K PVF gap still open.`, urgency: "this_week", why: "Enrolled account with active email task in progress." },
      ]),
      openQuestions: JSON.stringify([
        { account_name: accs[8].name, account_id: accs[8].id, signal: "Ferguson competitor quote mentioned in recent email thread. Controls & Thermostats category at risk." },
        { account_name: accs[4].name, account_id: accs[4].id, signal: "90 days enrolled with minimal revenue growth. Last order was 47 days ago. Possible churn risk." },
      ]),
    },
    { agentRunType: "weekly-account-review", currentFocus: "Last review analyzed 20 accounts across 3 segments.", lastRunSummary: null, pendingActions: null, openQuestions: null },
    { agentRunType: "email-intelligence", currentFocus: "Processed 47 email interactions this week.", lastRunSummary: null, pendingActions: null, openQuestions: null },
    { agentRunType: "generate-playbook", currentFocus: "Generated 5 playbooks. Focus on PVF and Controls gaps.", lastRunSummary: null, pendingActions: null, openQuestions: null },
    { agentRunType: "synthesize-learnings", currentFocus: "Active learnings: 5 patterns, avg success rate 71%.", lastRunSummary: null, pendingActions: null, openQuestions: null },
  ];

  for (const rt of agentRunTypes) {
    await db.insert(agentState).values({
      tenantId: TENANT_ID,
      agentRunType: rt.agentRunType,
      currentFocus: rt.currentFocus,
      lastRunAt: rt.lastRunSummary ? new Date(now.getTime() - 5 * 60 * 60 * 1000) : null,
      lastRunSummary: rt.lastRunSummary,
      pendingActions: rt.pendingActions,
      openQuestions: rt.openQuestions,
      patternNotes: "",
    });
  }
  console.log(`✓ ${agentRunTypes.length} agent state rows`);

  // ── CRM Intelligence: Contacts ──────────────────────────────────────────────
  const crmNow = new Date();
  const daysAgo = (d: number) => new Date(crmNow.getTime() - d * 86400000);
  const daysFromNow = (d: number) => new Date(crmNow.getTime() + d * 86400000);

  const acctId = (index: number) => accs[index].id;

  const contactRows = await db.insert(contacts).values([
    // Metro HVAC Solutions [0]
    { tenantId: TENANT_ID, accountId: acctId(0), firstName: "Frank", lastName: "Moretti", email: "fmoretti@metrohvac.com", phone: "201-555-0142", title: "VP of Purchasing", role: "decision_maker", department: "Procurement", isPrimary: true, lastContactedAt: daysAgo(2), notes: "Key relationship — approves all orders over $25K. Prefers email communication. Mentioned expansion plans for Q3.", source: "email_sync" },
    { tenantId: TENANT_ID, accountId: acctId(0), firstName: "Lisa", lastName: "Park", email: "lpark@metrohvac.com", phone: "201-555-0188", title: "Purchasing Manager", role: "purchaser", department: "Procurement", isPrimary: false, lastContactedAt: daysAgo(5), notes: "Handles day-to-day orders. Very responsive. Prefers phone calls.", source: "email_sync" },
    { tenantId: TENANT_ID, accountId: acctId(0), firstName: "Dennis", lastName: "Kowalski", email: "dkowalski@metrohvac.com", title: "Estimator", role: "estimator", department: "Operations", isPrimary: false, lastContactedAt: daysAgo(14), source: "email_sync" },

    // Allied Mechanical Group [1]
    { tenantId: TENANT_ID, accountId: acctId(1), firstName: "Robert", lastName: "Chang", email: "rchang@alliedmech.com", phone: "215-555-0233", title: "Owner / President", role: "owner", department: "Executive", isPrimary: true, lastContactedAt: daysAgo(45), notes: "Founded the company in 2008. Very loyal but exploring competitors on PVF pricing. Need to re-engage.", source: "email_sync" },
    { tenantId: TENANT_ID, accountId: acctId(1), firstName: "Angela", lastName: "Russo", email: "arusso@alliedmech.com", phone: "215-555-0241", title: "Office Manager", role: "gatekeeper", department: "Admin", isPrimary: false, lastContactedAt: daysAgo(12), source: "email_sync" },

    // Northeast Heating & Cooling [2]
    { tenantId: TENANT_ID, accountId: acctId(2), firstName: "Tom", lastName: "Brennan", email: "tbrennan@northeasthvac.com", phone: "617-555-0311", title: "General Manager", role: "decision_maker", department: "Management", isPrimary: true, lastContactedAt: daysAgo(1), notes: "Very active account. Just awarded major school district project. Wants competitive pricing on Carrier equipment.", source: "email_sync" },
    { tenantId: TENANT_ID, accountId: acctId(2), firstName: "Sarah", lastName: "Whitfield", email: "swhitfield@northeasthvac.com", title: "Project Coordinator", role: "project_manager", department: "Operations", isPrimary: false, lastContactedAt: daysAgo(3), source: "email_sync" },

    // Premier Plumbing NJ [3]
    { tenantId: TENANT_ID, accountId: acctId(3), firstName: "Mike", lastName: "DeSantis", email: "mdesantis@premierplumbingnj.com", phone: "609-555-0422", title: "Owner", role: "owner", department: "Executive", isPrimary: true, lastContactedAt: daysAgo(8), notes: "Family business, 3rd generation. Price-sensitive but values reliability. Currently comparing our water heater pricing with Ferguson.", source: "email_sync" },

    // Sunshine HVAC Florida [5]
    { tenantId: TENANT_ID, accountId: acctId(5), firstName: "Carlos", lastName: "Mendez", email: "cmendez@sunshinehvac.com", phone: "813-555-0501", title: "CEO", role: "decision_maker", department: "Executive", isPrimary: true, lastContactedAt: daysAgo(3), notes: "Aggressive growth — opening 2 new service areas. Major opportunity for equipment + supplies bundle.", source: "email_sync" },
    { tenantId: TENANT_ID, accountId: acctId(5), firstName: "Diane", lastName: "Torres", email: "dtorres@sunshinehvac.com", phone: "813-555-0509", title: "Purchasing Director", role: "purchaser", department: "Procurement", isPrimary: false, lastContactedAt: daysAgo(1), notes: "Very organized, sends weekly POs. Currently evaluating our pricing vs. Winsupply on refrigerant.", source: "email_sync" },
    { tenantId: TENANT_ID, accountId: acctId(5), firstName: "Ray", lastName: "Nguyen", email: "rnguyen@sunshinehvac.com", title: "Lead Estimator", role: "estimator", department: "Operations", isPrimary: false, lastContactedAt: daysAgo(7), source: "email_sync" },

    // Gulf Coast Plumbing [6]
    { tenantId: TENANT_ID, accountId: acctId(6), firstName: "Jim", lastName: "Crawford", email: "jcrawford@gulfcoastplumbing.com", phone: "504-555-0612", title: "Operations Manager", role: "decision_maker", department: "Operations", isPrimary: true, lastContactedAt: daysAgo(20), notes: "Handles both purchasing and operations. Frustrated with recent delivery delays — need to address.", source: "email_sync" },

    // Tampa Bay Mechanical [7]
    { tenantId: TENANT_ID, accountId: acctId(7), firstName: "Patricia", lastName: "Vega", email: "pvega@tampabaymech.com", phone: "727-555-0744", title: "Controller", role: "decision_maker", department: "Finance", isPrimary: true, lastContactedAt: daysAgo(6), notes: "Controls budget. Very data-driven — responds well to ROI arguments. Interested in volume discount tiers.", source: "email_sync" },
    { tenantId: TENANT_ID, accountId: acctId(7), firstName: "Kevin", lastName: "O'Brien", email: "kobrien@tampabaymech.com", title: "Field Supervisor", role: "influencer", department: "Field", isPrimary: false, lastContactedAt: daysAgo(30), source: "email_sync" },

    // Great Lakes Heating [11]
    { tenantId: TENANT_ID, accountId: acctId(11), firstName: "David", lastName: "Kowalczyk", email: "dkowalczyk@greatlakesheating.com", phone: "312-555-0811", title: "President", role: "owner", department: "Executive", isPrimary: true, lastContactedAt: daysAgo(4), notes: "Largest HVAC account in Great Lakes. Considering switching from Lennox to Carrier for commercial line. Huge opportunity.", source: "email_sync" },
    { tenantId: TENANT_ID, accountId: acctId(11), firstName: "Amy", lastName: "Richardson", email: "arichardson@greatlakesheating.com", phone: "312-555-0819", title: "Purchasing Coordinator", role: "purchaser", department: "Procurement", isPrimary: false, lastContactedAt: daysAgo(2), source: "email_sync" },

    // Midwest Pipe & Supply [12]
    { tenantId: TENANT_ID, accountId: acctId(12), firstName: "Greg", lastName: "Hoffmann", email: "ghoffmann@midwestpipe.com", phone: "314-555-0901", title: "VP of Operations", role: "decision_maker", department: "Operations", isPrimary: true, lastContactedAt: daysAgo(11), notes: "Concerned about PVF lead times. Comparing us to HD Supply. Need to demonstrate reliability advantage.", source: "email_sync" },

    // Chicago Comfort Systems [14]
    { tenantId: TENANT_ID, accountId: acctId(14), firstName: "Sandra", lastName: "Chen", email: "schen@chicagocomfort.com", phone: "773-555-1001", title: "General Manager", role: "decision_maker", department: "Management", isPrimary: true, lastContactedAt: daysAgo(15), notes: "Managing 3 large commercial retrofit projects. Needs competitive pricing on controls & thermostats package.", source: "email_sync" },

    // Carolina Climate Control [10]
    { tenantId: TENANT_ID, accountId: acctId(10), firstName: "William", lastName: "Hayes", email: "whayes@carolinaclimate.com", phone: "704-555-1102", title: "Procurement Manager", role: "purchaser", department: "Procurement", isPrimary: true, lastContactedAt: daysAgo(60), notes: "Haven't spoken in 2 months. Account showing declining order frequency. At risk of losing to local competitor.", source: "email_sync" },

    // Palmetto Heating & Air [8]
    { tenantId: TENANT_ID, accountId: acctId(8), firstName: "Nicole", lastName: "Washington", email: "nwashington@palmettoheat.com", phone: "843-555-1211", title: "Owner", role: "owner", department: "Executive", isPrimary: true, lastContactedAt: daysAgo(9), notes: "Growing fast — just hired 5 new techs. Needs to expand their product range. Perfect candidate for insulation + ductwork cross-sell.", source: "email_sync" },

    // Detroit Climate Pro [16]
    { tenantId: TENANT_ID, accountId: acctId(16), firstName: "Marcus", lastName: "Johnson", email: "mjohnson@detroitclimate.com", phone: "313-555-1301", title: "Chief Estimator", role: "estimator", department: "Estimating", isPrimary: true, lastContactedAt: daysAgo(7), notes: "Key influence on equipment selection. Prefers Trane but open to Carrier if pricing is right.", source: "email_sync" },

    // Buckeye Mechanical [18]
    { tenantId: TENANT_ID, accountId: acctId(18), firstName: "Jennifer", lastName: "Adams", email: "jadams@buckeyemech.com", phone: "614-555-1411", title: "Director of Purchasing", role: "decision_maker", department: "Procurement", isPrimary: true, lastContactedAt: daysAgo(3), notes: "Just consolidated 3 branch locations. Wants single-source supply agreement. High-value opportunity.", source: "email_sync" },
    { tenantId: TENANT_ID, accountId: acctId(18), firstName: "Brian", lastName: "Mueller", email: "bmueller@buckeyemech.com", title: "Project Manager", role: "project_manager", department: "Projects", isPrimary: false, lastContactedAt: daysAgo(18), source: "email_sync" },

    // Coastal Mechanical [4]
    { tenantId: TENANT_ID, accountId: acctId(4), firstName: "Tony", lastName: "Mancini", email: "tmancini@coastalmech.com", phone: "203-555-1522", title: "Purchasing Agent", role: "purchaser", department: "Procurement", isPrimary: true, lastContactedAt: daysAgo(10), notes: "Reliable account. Looking for better terms on drainage systems. Mentioned competitor quote from Ferguson.", source: "email_sync" },

    // Indiana Plumbing Services [19]
    { tenantId: TENANT_ID, accountId: acctId(19), firstName: "Steve", lastName: "Patel", email: "spatel@indianaplumbing.com", phone: "317-555-1601", title: "Operations Director", role: "decision_maker", department: "Operations", isPrimary: true, lastContactedAt: daysAgo(22), notes: "Expanding into commercial plumbing. Needs fixtures and PVF at volume pricing. Currently buying some categories from HD Supply.", source: "email_sync" },
  ]).returning();
  console.log(`✓ ${contactRows.length} CRM contacts`);

  // ── CRM Intelligence: Projects ──────────────────────────────────────────────
  const projectRows = await db.insert(projects).values([
    // Metro HVAC — awarded large hospital project
    { tenantId: TENANT_ID, accountId: acctId(0), name: "St. Mary's Hospital HVAC Renovation", location: "Newark, NJ", projectType: "renovation", estimatedValue: "485000", stage: "awarded", startDate: daysFromNow(30), bidDeadline: daysAgo(15), generalContractor: "Turner Construction", unitCount: null, squareFootage: 125000, productCategories: JSON.stringify(["HVAC Equipment", "Controls & Thermostats", "Ductwork & Fittings", "Insulation Materials"]), competitorsInvolved: JSON.stringify(["Ferguson", "Winsupply"]), notes: "Won against Ferguson. Key differentiator was our Carrier pricing and delivery commitment. 4-phase installation over 18 months.", source: "email_sync" },
    { tenantId: TENANT_ID, accountId: acctId(0), name: "Liberty Park Office Complex", location: "Jersey City, NJ", projectType: "new_construction", estimatedValue: "320000", stage: "bidding", bidDeadline: daysFromNow(12), generalContractor: "Skanska", squareFootage: 85000, productCategories: JSON.stringify(["HVAC Equipment", "Ductwork & Fittings", "Controls & Thermostats"]), competitorsInvolved: JSON.stringify(["HD Supply", "Johnstone Supply"]), notes: "Competitive bid — need to be aggressive on controls pricing. GC has existing relationship with HD Supply.", source: "email_sync" },

    // Northeast Heating — school district
    { tenantId: TENANT_ID, accountId: acctId(2), name: "Westfield School District HVAC Upgrade", location: "Westfield, MA", projectType: "retrofit", estimatedValue: "275000", stage: "awarded", startDate: daysFromNow(45), generalContractor: "Gilbane Building Co", squareFootage: 95000, productCategories: JSON.stringify(["HVAC Equipment", "Controls & Thermostats", "Insulation Materials"]), competitorsInvolved: JSON.stringify(["Ferguson"]), notes: "District-wide upgrade across 4 schools. Phased delivery required. Energy efficiency specs favor our Carrier VRF line.", source: "email_sync" },

    // Sunshine HVAC — multiple Florida projects
    { tenantId: TENANT_ID, accountId: acctId(5), name: "Bayshore Condos Phase II", location: "Tampa, FL", projectType: "new_construction", estimatedValue: "520000", stage: "in_progress", startDate: daysAgo(60), endDate: daysFromNow(120), generalContractor: "Suffolk Construction", unitCount: 180, squareFootage: 220000, productCategories: JSON.stringify(["HVAC Equipment", "Refrigerant & Supplies", "Ductwork & Fittings", "Controls & Thermostats", "Insulation Materials"]), competitorsInvolved: JSON.stringify(["Winsupply", "Baker Distributing"]), notes: "Largest active project. Phase I delivered on time. Currently supplying 60% of materials — opportunity to capture remaining 40% from Winsupply.", source: "email_sync" },
    { tenantId: TENANT_ID, accountId: acctId(5), name: "Riverwalk Medical Office", location: "St. Petersburg, FL", projectType: "new_construction", estimatedValue: "185000", stage: "bidding", bidDeadline: daysFromNow(8), generalContractor: "Brasfield & Gorrie", squareFootage: 42000, productCategories: JSON.stringify(["HVAC Equipment", "Controls & Thermostats", "Plumbing Fixtures"]), competitorsInvolved: JSON.stringify(["Ferguson", "Baker Distributing"]), notes: "Medical-grade HVAC requirements. Our Carrier Puron units meet spec. Bid deadline approaching — need pricing finalized this week.", source: "email_sync" },

    // Great Lakes Heating — commercial retrofit
    { tenantId: TENANT_ID, accountId: acctId(11), name: "Lakeview Plaza Commercial Retrofit", location: "Chicago, IL", projectType: "retrofit", estimatedValue: "410000", stage: "bidding", bidDeadline: daysFromNow(18), generalContractor: "Pepper Construction", squareFootage: 110000, productCategories: JSON.stringify(["HVAC Equipment", "Controls & Thermostats", "Ductwork & Fittings", "Electrical Components"]), competitorsInvolved: JSON.stringify(["HD Supply", "Johnstone Supply"]), notes: "Customer considering Lennox-to-Carrier switch. If we win this, it could shift their entire commercial line to us. High strategic value.", source: "email_sync" },

    // Gulf Coast Plumbing — hotel renovation
    { tenantId: TENANT_ID, accountId: acctId(6), name: "Grand Pelican Resort Plumbing Overhaul", location: "Biloxi, MS", projectType: "renovation", estimatedValue: "290000", stage: "awarded", startDate: daysFromNow(15), generalContractor: "Yates Construction", unitCount: 320, productCategories: JSON.stringify(["Plumbing Fixtures", "PVF (Pipe, Valves, Fittings)", "Water Heaters", "Drainage Systems"]), competitorsInvolved: JSON.stringify(["Ferguson"]), notes: "320-room hotel renovation. Won on plumbing fixtures pricing. Need to finalize water heater selection — customer comparing Rheem vs A.O. Smith.", source: "email_sync" },

    // Midwest Pipe & Supply — warehouse complex
    { tenantId: TENANT_ID, accountId: acctId(12), name: "Gateway Logistics Center", location: "St. Louis, MO", projectType: "new_construction", estimatedValue: "195000", stage: "identified", generalContractor: "Alberici Constructors", squareFootage: 250000, productCategories: JSON.stringify(["PVF (Pipe, Valves, Fittings)", "Drainage Systems", "Pipe & Fittings"]), notes: "Early stage — customer mentioned this project in recent email. Large warehouse needing fire suppression and drainage. Need to get on bid list.", source: "email_sync" },

    // Chicago Comfort — multi-building retrofit
    { tenantId: TENANT_ID, accountId: acctId(14), name: "Michigan Ave Office Park Controls Upgrade", location: "Chicago, IL", projectType: "retrofit", estimatedValue: "155000", stage: "in_progress", startDate: daysAgo(30), endDate: daysFromNow(90), productCategories: JSON.stringify(["Controls & Thermostats", "Electrical Components"]), notes: "Smart building conversion. Installing Honeywell BMS across 3 buildings. Steady weekly orders for controls & sensors.", source: "email_sync" },

    // Tampa Bay Mechanical — tenant improvement
    { tenantId: TENANT_ID, accountId: acctId(7), name: "Crossroads Shopping Center TI", location: "Tampa, FL", projectType: "tenant_improvement", estimatedValue: "92000", stage: "in_progress", startDate: daysAgo(14), endDate: daysFromNow(45), generalContractor: "Hensel Phelps", squareFootage: 35000, productCategories: JSON.stringify(["HVAC Equipment", "Ductwork & Fittings", "Plumbing Fixtures"]), notes: "Tenant improvement for 4 new retail spaces. Quick turnaround needed. Good margin opportunity on ductwork.", source: "email_sync" },

    // Buckeye Mechanical — consolidated supply opportunity
    { tenantId: TENANT_ID, accountId: acctId(18), name: "Columbus Data Center Build-Out", location: "Columbus, OH", projectType: "new_construction", estimatedValue: "680000", stage: "bidding", bidDeadline: daysFromNow(25), generalContractor: "Whiting-Turner", squareFootage: 75000, productCategories: JSON.stringify(["HVAC Equipment", "Controls & Thermostats", "Electrical Components", "Insulation Materials", "PVF (Pipe, Valves, Fittings)"]), competitorsInvolved: JSON.stringify(["HD Supply", "Ferguson", "Winsupply"]), notes: "Massive opportunity — precision cooling requirements. Customer wants single-source supplier. Our breadth of categories is key differentiator.", source: "email_sync" },

    // Palmetto Heating — maintenance contract
    { tenantId: TENANT_ID, accountId: acctId(8), name: "Palmetto Regional Hospital HVAC Maintenance", location: "Charleston, SC", projectType: "maintenance", estimatedValue: "78000", stage: "awarded", startDate: daysAgo(90), endDate: daysFromNow(275), productCategories: JSON.stringify(["Refrigerant & Supplies", "Controls & Thermostats", "Tools & Safety"]), notes: "Annual maintenance contract. Steady recurring revenue. Cross-sell opportunity for insulation and ductwork when replacements needed.", source: "email_sync" },

    // Allied Mechanical — competitive situation
    { tenantId: TENANT_ID, accountId: acctId(1), name: "Philadelphia Airport Terminal B Renovation", location: "Philadelphia, PA", projectType: "renovation", estimatedValue: "750000", stage: "bidding", bidDeadline: daysFromNow(35), generalContractor: "Clark Construction", squareFootage: 200000, productCategories: JSON.stringify(["HVAC Equipment", "PVF (Pipe, Valves, Fittings)", "Controls & Thermostats", "Insulation Materials", "Electrical Components"]), competitorsInvolved: JSON.stringify(["Ferguson", "HD Supply", "Winsupply"]), notes: "Largest bid opportunity this quarter. Airport authority requires prevailing wage. Customer relationship strained — need to rebuild trust. Owner Robert Chang is key.", source: "email_sync" },

    // Indiana Plumbing — commercial expansion
    { tenantId: TENANT_ID, accountId: acctId(19), name: "Carmel Town Center Mixed-Use", location: "Carmel, IN", projectType: "new_construction", estimatedValue: "230000", stage: "identified", generalContractor: "Shiel Sexton", unitCount: 96, squareFootage: 145000, productCategories: JSON.stringify(["Plumbing Fixtures", "PVF (Pipe, Valves, Fittings)", "Water Heaters", "Drainage Systems"]), notes: "Customer's first major commercial project. Needs support on spec and pricing. Opportunity to become their go-to commercial supplier.", source: "email_sync" },

    // Lake Shore Plumbing — renovation
    { tenantId: TENANT_ID, accountId: acctId(15), name: "Navy Pier Restaurant Row Plumbing", location: "Chicago, IL", projectType: "renovation", estimatedValue: "145000", stage: "awarded", startDate: daysFromNow(10), generalContractor: "Power Construction", productCategories: JSON.stringify(["Plumbing Fixtures", "Pipe & Fittings", "Drainage Systems", "Water Heaters"]), competitorsInvolved: JSON.stringify(["Ferguson"]), notes: "Won competitive bid. 6 restaurant buildouts requiring commercial-grade plumbing. Tight timeline — delivery reliability critical.", source: "email_sync" },
  ]).returning();
  console.log(`✓ ${projectRows.length} CRM projects`);

  // ── CRM Intelligence: Order Signals ─────────────────────────────────────────
  const signalRows = await db.insert(orderSignals).values([
    // Immediate urgency signals
    { tenantId: TENANT_ID, accountId: acctId(0), projectId: projectRows[0].id, signalType: "quote_request", productCategory: "HVAC Equipment", productDetails: "Carrier 50XC rooftop units, 15-ton, qty 8 for hospital renovation", estimatedQuantity: "8 units", estimatedValue: "124000", urgency: "immediate", pricingMentioned: true, competitorPriceMentioned: true, notes: "Ferguson quoted $14,800/unit. We need to beat or match. Delivery needed within 6 weeks.", status: "quoted" },
    { tenantId: TENANT_ID, accountId: acctId(5), projectId: projectRows[3].id, signalType: "delivery_request", productCategory: "Refrigerant & Supplies", productDetails: "R-410A refrigerant, 50 cylinders for Bayshore Phase II", estimatedQuantity: "50 cylinders", estimatedValue: "18500", urgency: "immediate", notes: "Running low on-site. Need delivery by Friday or project delays. Diane Torres handling.", status: "new" },
    { tenantId: TENANT_ID, accountId: acctId(2), signalType: "purchase_intent", productCategory: "Controls & Thermostats", productDetails: "Honeywell T6 Pro thermostats and zone controllers for school district", estimatedQuantity: "120 units", estimatedValue: "32000", urgency: "immediate", pricingMentioned: true, notes: "Tom Brennan wants pricing today. Schools need installation during spring break window.", status: "new" },

    // This week urgency
    { tenantId: TENANT_ID, accountId: acctId(11), projectId: projectRows[5].id, signalType: "quote_request", productCategory: "HVAC Equipment", productDetails: "Carrier WeatherExpert rooftop units, mixed tonnage (5-20 ton)", estimatedQuantity: "12 units", estimatedValue: "186000", urgency: "this_week", pricingMentioned: true, competitorPriceMentioned: true, notes: "David Kowalczyk comparing Lennox vs Carrier pricing. If we win this quote, likely converts entire commercial line. Strategic importance.", status: "new" },
    { tenantId: TENANT_ID, accountId: acctId(6), projectId: projectRows[6].id, signalType: "quote_request", productCategory: "Water Heaters", productDetails: "Commercial tankless water heaters — Navien NPE-2 or equivalent, qty 24", estimatedQuantity: "24 units", estimatedValue: "67000", urgency: "this_week", pricingMentioned: true, notes: "Grand Pelican Resort needs water heater selection finalized. Customer comparing Rheem vs Navien. Our Navien pricing is competitive.", status: "contacted" },
    { tenantId: TENANT_ID, accountId: acctId(18), projectId: projectRows[10].id, signalType: "pricing_inquiry", productCategory: "Controls & Thermostats", productDetails: "Building automation controllers, sensors, and actuators for data center", estimatedQuantity: "Bulk lot", estimatedValue: "95000", urgency: "this_week", pricingMentioned: true, competitorPriceMentioned: true, notes: "Jennifer Adams wants consolidated pricing. HD Supply quoted controls separately — we can beat them on a package deal.", status: "new" },

    // This month
    { tenantId: TENANT_ID, accountId: acctId(5), projectId: projectRows[4].id, signalType: "quote_request", productCategory: "HVAC Equipment", productDetails: "Carrier Puron 50HC units for medical office, with HEPA filtration", estimatedQuantity: "6 units", estimatedValue: "78000", urgency: "this_month", pricingMentioned: true, notes: "Medical-grade specs. Bid deadline in 8 days. Need to finalize pricing with manufacturer rep.", status: "new" },
    { tenantId: TENANT_ID, accountId: acctId(14), signalType: "reorder", productCategory: "Controls & Thermostats", productDetails: "Honeywell smart sensors and zone controllers — weekly standing order", estimatedQuantity: "25 units/week", estimatedValue: "8500", urgency: "this_month", notes: "Steady recurring orders for Michigan Ave retrofit. Customer very satisfied with quality. Upsell opportunity for wireless sensors.", status: "won" },
    { tenantId: TENANT_ID, accountId: acctId(8), signalType: "product_inquiry", productCategory: "Insulation Materials", productDetails: "Owens Corning commercial duct wrap and pipe insulation", estimatedQuantity: "2,000 linear feet", estimatedValue: "12000", urgency: "this_month", notes: "Nicole Washington expanding into insulation installation. First-time buyer in this category — cross-sell success!", status: "new" },
    { tenantId: TENANT_ID, accountId: acctId(12), signalType: "pricing_inquiry", productCategory: "PVF (Pipe, Valves, Fittings)", productDetails: "Copper pipe (types L & M), brass valves, various fittings", estimatedValue: "45000", urgency: "this_month", pricingMentioned: true, competitorPriceMentioned: true, notes: "Greg Hoffmann comparing us to HD Supply on PVF pricing. Need to demonstrate lead time advantage — we're 2 weeks faster.", status: "contacted" },

    // Next quarter
    { tenantId: TENANT_ID, accountId: acctId(1), projectId: projectRows[12].id, signalType: "quote_request", productCategory: "HVAC Equipment", productDetails: "Large-scale HVAC package for airport terminal renovation", estimatedQuantity: "Full package", estimatedValue: "385000", urgency: "next_quarter", pricingMentioned: true, notes: "Preliminary pricing request for airport project. Bid not due for 5 weeks. Need to rebuild relationship with Robert Chang first.", status: "new" },
    { tenantId: TENANT_ID, accountId: acctId(18), projectId: projectRows[10].id, signalType: "purchase_intent", productCategory: "Insulation Materials", productDetails: "Spray foam and rigid board insulation for data center walls", estimatedQuantity: "Full facility", estimatedValue: "42000", urgency: "next_quarter", notes: "Data center requires R-30+ insulation throughout. Spec review in progress.", status: "new" },

    // Exploring
    { tenantId: TENANT_ID, accountId: acctId(19), signalType: "product_inquiry", productCategory: "Plumbing Fixtures", productDetails: "Commercial-grade fixtures — Kohler Triton Bowe and similar", estimatedQuantity: "96 units (residential), 12 commercial", estimatedValue: "58000", urgency: "exploring", notes: "Steve Patel exploring commercial fixture lines for first time. Needs education on specs and pricing tiers. Great relationship-building opportunity.", status: "new" },
    { tenantId: TENANT_ID, accountId: acctId(3), signalType: "pricing_inquiry", productCategory: "Water Heaters", productDetails: "A.O. Smith commercial water heaters — comparing to Ferguson pricing", estimatedValue: "22000", urgency: "this_week", pricingMentioned: true, competitorPriceMentioned: true, notes: "Mike DeSantis got a Ferguson quote at $1,850/unit. Our current price is $1,920. Need to match or justify the premium.", status: "contacted" },

    // Won signals showing success
    { tenantId: TENANT_ID, accountId: acctId(0), signalType: "reorder", productCategory: "Ductwork & Fittings", productDetails: "Spiral ductwork and flex connectors — monthly standing order", estimatedValue: "15000", urgency: "this_month", notes: "Consistent monthly reorder. Relationship strong. Recently increased order size by 20%.", status: "won" },
    { tenantId: TENANT_ID, accountId: acctId(7), signalType: "purchase_intent", productCategory: "HVAC Equipment", productDetails: "Mini-split systems for retail tenant improvement", estimatedQuantity: "16 units", estimatedValue: "28000", urgency: "this_week", notes: "Patricia Vega approved budget. Quick win — need to get PO processed this week.", status: "won" },
    { tenantId: TENANT_ID, accountId: acctId(15), projectId: projectRows[14].id, signalType: "quote_request", productCategory: "Plumbing Fixtures", productDetails: "Commercial kitchen plumbing packages for 6 restaurant buildouts", estimatedQuantity: "6 packages", estimatedValue: "54000", urgency: "this_week", pricingMentioned: true, notes: "Navy Pier project — quote accepted. Delivery schedule confirmed. First shipment next week.", status: "won" },

    // Lost signal for learning
    { tenantId: TENANT_ID, accountId: acctId(10), signalType: "quote_request", productCategory: "HVAC Equipment", productDetails: "Residential heat pump systems — bulk order", estimatedValue: "35000", urgency: "this_month", competitorPriceMentioned: true, notes: "Lost to local competitor on price. William Hayes hasn't responded to follow-up. Account at risk.", status: "lost" },
  ]).returning();
  console.log(`✓ ${signalRows.length} CRM order signals`);

  // ── CRM Intelligence: Competitor Mentions ──────────────────────────────────
  const threatRows = await db.insert(competitorMentions).values([
    // Critical threats
    { tenantId: TENANT_ID, accountId: acctId(1), projectId: projectRows[12].id, competitorName: "Ferguson", mentionType: "switch_threat", productCategory: "PVF (Pipe, Valves, Fittings)", competitorPrice: "$12.50/ft copper L", ourPrice: "$13.10/ft copper L", details: "Robert Chang mentioned Ferguson is offering a 15% volume discount on PVF for the airport project. Also offering free jobsite delivery. Owner has been shopping around — relationship cooling. Need immediate outreach with competitive counter-offer.", threatLevel: "critical", responseNeeded: true, notes: "Longest-standing account in Mid-Atlantic. Losing this would be a $200K+ annual revenue hit." },
    { tenantId: TENANT_ID, accountId: acctId(10), competitorName: "Local Competitor (Carolina Supply)", mentionType: "switch_threat", productCategory: "HVAC Equipment", details: "William Hayes stopped returning calls after we lost the heat pump bid. Carolina Supply offering same-day delivery from local warehouse. They're cherry-picking our best categories. Account has gone silent for 60 days.", threatLevel: "critical", responseNeeded: true, notes: "Account showing classic defection pattern: declining orders → competitor mentions → silence. Need win-back strategy." },

    // High threats
    { tenantId: TENANT_ID, accountId: acctId(11), projectId: projectRows[5].id, competitorName: "HD Supply", mentionType: "pricing", productCategory: "Controls & Thermostats", competitorPrice: "$2,850 per BAS controller", ourPrice: "$3,100 per BAS controller", details: "David Kowalczyk received HD Supply quote for Lakeview Plaza controls package. Their per-unit pricing is 8% lower. However, they can't match our delivery timeline. Need to emphasize total cost of ownership and installation support.", threatLevel: "high", responseNeeded: true },
    { tenantId: TENANT_ID, accountId: acctId(12), competitorName: "HD Supply", mentionType: "quote", productCategory: "PVF (Pipe, Valves, Fittings)", competitorPrice: "Bulk lot: $38,000", ourPrice: "Bulk lot: $42,500", details: "Greg Hoffmann shared HD Supply's PVF package pricing. They're 10% lower on the bulk lot. Greg values our lead times (2 weeks vs their 4-6 weeks) but price gap is significant. Consider volume discount or payment terms to close the gap.", threatLevel: "high", responseNeeded: true },
    { tenantId: TENANT_ID, accountId: acctId(3), competitorName: "Ferguson", mentionType: "pricing", productCategory: "Water Heaters", competitorPrice: "$1,850/unit (A.O. Smith)", ourPrice: "$1,920/unit (A.O. Smith)", details: "Mike DeSantis got competitive pricing from Ferguson on commercial water heaters. 3.6% price gap. Ferguson also offering 90-day payment terms vs our 30-day. Need to either match price or offer extended terms.", threatLevel: "high", responseNeeded: true, notes: "Price-sensitive account. Small margin for negotiation." },

    // Medium threats
    { tenantId: TENANT_ID, accountId: acctId(5), projectId: projectRows[3].id, competitorName: "Winsupply", mentionType: "product_comparison", productCategory: "Refrigerant & Supplies", competitorPrice: "$385/cylinder R-410A", ourPrice: "$410/cylinder R-410A", details: "Diane Torres comparing refrigerant pricing for Bayshore project. Winsupply is 6% cheaper per cylinder. However, they had a recent delivery failure that cost Sunshine HVAC a day of lost labor. Our reliability record is key selling point.", threatLevel: "medium", responseNeeded: false, respondedAt: daysAgo(5), notes: "Addressed in last call. Diane agreed reliability matters more but asked us to 'sharpen our pencils' on next quote." },
    { tenantId: TENANT_ID, accountId: acctId(5), projectId: projectRows[4].id, competitorName: "Baker Distributing", mentionType: "quote", productCategory: "HVAC Equipment", competitorPrice: "$11,200/unit (competing brand)", ourPrice: "$12,800/unit (Carrier Puron)", details: "Baker Distributing quoting Daikin units as Carrier alternative for medical office. Daikin units are 12% cheaper but don't have medical-grade HEPA option. Our spec advantage should hold.", threatLevel: "medium", responseNeeded: false, respondedAt: daysAgo(2), notes: "Spec review shows Carrier is the only option meeting medical-grade requirements. Baker's quote likely won't pass plan review." },
    { tenantId: TENANT_ID, accountId: acctId(18), projectId: projectRows[10].id, competitorName: "HD Supply", mentionType: "pricing", productCategory: "Electrical Components", competitorPrice: "Package: $28,000", ourPrice: "Package: $31,500", details: "Jennifer Adams received electrical components quote from HD Supply for data center project. Their pricing is competitive but they can't bundle with HVAC + controls. Our single-source advantage is key.", threatLevel: "medium", responseNeeded: true },
    { tenantId: TENANT_ID, accountId: acctId(4), competitorName: "Ferguson", mentionType: "quote", productCategory: "Drainage Systems", competitorPrice: "$8,500 for drainage package", ourPrice: "$9,200 for drainage package", details: "Tony Mancini mentioned Ferguson quoted drainage systems package 8% lower. Longtime customer but price pressure increasing. Consider loyalty discount.", threatLevel: "medium", responseNeeded: true },

    // Low threats — informational
    { tenantId: TENANT_ID, accountId: acctId(0), competitorName: "Johnstone Supply", mentionType: "positive_mention", productCategory: "Tools & Safety", details: "Frank Moretti mentioned Johnstone Supply has a good selection of specialty HVAC tools. Not a threat to our core categories but worth monitoring if they expand into equipment.", threatLevel: "low", responseNeeded: false, notes: "Johnstone is a regional player. Unlikely to compete on our core lines." },
    { tenantId: TENANT_ID, accountId: acctId(7), competitorName: "Winsupply", mentionType: "negative_mention", productCategory: "Ductwork & Fittings", details: "Kevin O'Brien (field supervisor) complained about Winsupply's ductwork quality on a recent job. Said he prefers our product. Good competitive intel — Winsupply having quality issues.", threatLevel: "low", responseNeeded: false, respondedAt: daysAgo(1), notes: "Positive competitive intel. Our ductwork quality is a differentiator. Worth mentioning in next account review." },
    { tenantId: TENANT_ID, accountId: acctId(14), competitorName: "Johnstone Supply", mentionType: "pricing", productCategory: "Refrigerant & Supplies", competitorPrice: "$375/cylinder R-410A", ourPrice: "$410/cylinder R-410A", details: "Sandra Chen saw Johnstone pricing in a trade publication. Hasn't actively shopped around but asked if we can be more competitive. Informational inquiry, not an active threat.", threatLevel: "low", responseNeeded: false },

    // Competitor with pricing advantage we've already addressed
    { tenantId: TENANT_ID, accountId: acctId(11), competitorName: "Johnstone Supply", mentionType: "quote", productCategory: "Refrigerant & Supplies", competitorPrice: "$365/cylinder R-410A", ourPrice: "$395/cylinder R-410A", details: "Amy Richardson mentioned Johnstone offered lower refrigerant pricing. We countered with a volume commitment discount bringing our price to $380. Customer accepted.", threatLevel: "low", responseNeeded: false, respondedAt: daysAgo(8), notes: "Successfully defended with volume discount. Customer stayed." },

    // Competitive win
    { tenantId: TENANT_ID, accountId: acctId(15), projectId: projectRows[14].id, competitorName: "Ferguson", mentionType: "quote", productCategory: "Plumbing Fixtures", competitorPrice: "$7,800/restaurant package", ourPrice: "$7,200/restaurant package", details: "Won against Ferguson on Navy Pier restaurant buildout. Our commercial kitchen plumbing packages were 8% cheaper with faster delivery. Ferguson couldn't match our bundled pricing.", threatLevel: "low", responseNeeded: false, respondedAt: daysAgo(4), notes: "Competitive win! Our bundled approach beats Ferguson's à la carte pricing." },
  ]).returning();
  console.log(`✓ ${threatRows.length} CRM competitor mentions`);

  console.log("\n✅ ABC Supply Co. demo data seeded successfully.");
  console.log("   3 TMs · 20 accounts · 3 graduated · 6 enrolled · 2 at-risk");
  console.log(`   ${contactRows.length} contacts · ${projectRows.length} projects · ${signalRows.length} order signals · ${threatRows.length} competitor mentions`);
  console.log("   Agent state seeded for daily briefing demo.");
  console.log("   Run on Replit: npx tsx server/seed.ts");
}

const isDirectRun = process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js");
if (isDirectRun) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed error:", err);
      process.exit(1);
    });
}
