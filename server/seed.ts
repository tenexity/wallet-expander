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
} from "@shared/schema";
import { sql } from "drizzle-orm";

// ─── TENANT ────────────────────────────────────────────────────────────────────
const TENANT_ID = 8; // Graham's demo tenant

async function seed() {
  console.log("🌱 Seeding ABC Supply Co. demo data...");

  // ── Clear in FK-safe order ────────────────────────────────────────────────
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

  console.log("\n✅ ABC Supply Co. demo data seeded successfully.");
  console.log("   3 TMs · 20 accounts · 3 graduated · 6 enrolled · 2 at-risk");
  console.log("   Run on Replit: npx tsx server/seed.ts");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
