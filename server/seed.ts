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
  tenants,
  settings,
} from "@shared/schema";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("Seeding database with comprehensive demo data...");

  // Clear existing data in correct order (respecting foreign keys)
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

  // Use tenant ID 8 (graham's tenant) for demo data
  // This ensures the logged-in user sees the mock data
  const TARGET_TENANT_ID = 8;
  
  // Ensure the target tenant has active subscription
  await db.execute(sql`UPDATE tenants SET subscription_status = 'active', plan_type = 'professional' WHERE id = ${TARGET_TENANT_ID}`);
  
  const tenantId = TARGET_TENANT_ID;
  console.log(`Using tenant ID: ${tenantId} with active subscription`);

  // Seed territory managers
  const tms = await db.insert(territoryManagers).values([
    { tenantId, name: "John Smith", email: "john.smith@marksupply.com", territories: ["Northeast", "Mid-Atlantic"], isActive: true },
    { tenantId, name: "Sarah Johnson", email: "sarah.johnson@marksupply.com", territories: ["Southeast", "Florida"], isActive: true },
    { tenantId, name: "Mike Wilson", email: "mike.wilson@marksupply.com", territories: ["Midwest", "Great Lakes"], isActive: true },
    { tenantId, name: "Lisa Brown", email: "lisa.brown@marksupply.com", territories: ["West Coast", "Mountain"], isActive: true },
    { tenantId, name: "David Martinez", email: "david.martinez@marksupply.com", territories: ["Southwest", "Texas"], isActive: true },
  ]).returning();

  console.log(`Created ${tms.length} territory managers`);

  // Seed product categories
  const categories = await db.insert(productCategories).values([
    { tenantId, name: "HVAC Equipment" },
    { tenantId, name: "Refrigerant & Supplies" },
    { tenantId, name: "Ductwork & Fittings" },
    { tenantId, name: "Controls & Thermostats" },
    { tenantId, name: "Water Heaters" },
    { tenantId, name: "Tools & Safety" },
    { tenantId, name: "Pipe & Fittings" },
    { tenantId, name: "PVF (Pipe, Valves, Fittings)" },
    { tenantId, name: "Plumbing Fixtures" },
    { tenantId, name: "Drainage Systems" },
    { tenantId, name: "Insulation Materials" },
    { tenantId, name: "Electrical Components" },
  ]).returning();

  console.log(`Created ${categories.length} categories`);

  // Seed products (sample products per category)
  const productData: { tenantId: number; sku: string; name: string; categoryId: number; unitCost: string; unitPrice: string }[] = [];
  const productNames: Record<string, string[]> = {
    "HVAC Equipment": ["Carrier 3-Ton AC Unit", "Trane Heat Pump XR15", "Lennox Furnace SL280V", "Rheem Package Unit", "Goodman Split System"],
    "Refrigerant & Supplies": ["R-410A 25lb Cylinder", "R-22 30lb Cylinder", "Refrigerant Gauge Set", "Vacuum Pump 2-Stage", "Leak Detector Kit"],
    "Controls & Thermostats": ["Honeywell T6 Pro", "Ecobee Smart Thermostat", "Nest Learning", "White-Rodgers 1F80", "Emerson Sensi"],
    "Water Heaters": ["Bradford White 50gal Gas", "Rheem 40gal Electric", "AO Smith Tankless", "Navien NPE-240A", "Rinnai RU180i"],
    "Pipe & Fittings": ["1\" Copper Type L 10ft", "3/4\" PEX Roll 500ft", "2\" PVC Schedule 40", "Copper 90° Elbow 1\"", "SharkBite Coupling 1\""],
    "Plumbing Fixtures": ["Kohler Toilet Cimarron", "Delta Faucet Leland", "Moen Shower Valve", "American Standard Sink", "Grohe Pull-Down"],
  };

  for (const cat of categories) {
    const names = productNames[cat.name] || [`${cat.name} Product 1`, `${cat.name} Product 2`, `${cat.name} Product 3`];
    names.forEach((name, idx) => {
      const baseCost = Math.floor(Math.random() * 500 + 50);
      productData.push({
        tenantId,
        sku: `${cat.name.substring(0, 3).toUpperCase()}-${1000 + cat.id * 100 + idx}`,
        name,
        categoryId: cat.id,
        unitCost: String(baseCost),
        unitPrice: String(Math.floor(baseCost * 1.35)),
      });
    });
  }

  const productsCreated = await db.insert(products).values(productData).returning();
  console.log(`Created ${productsCreated.length} products`);

  // Seed accounts - realistic B2B distributor customers
  const accountNames = [
    // HVAC segment
    { name: "Elite HVAC Services", segment: "HVAC", region: "Northeast", tm: "John Smith" },
    { name: "Climate Control Inc", segment: "HVAC", region: "West Coast", tm: "Lisa Brown" },
    { name: "Superior Heating & Cooling", segment: "HVAC", region: "Midwest", tm: "Mike Wilson" },
    { name: "Comfort Zone HVAC", segment: "HVAC", region: "Southeast", tm: "Sarah Johnson" },
    { name: "Arctic Air Systems", segment: "HVAC", region: "Northeast", tm: "John Smith" },
    { name: "Sun Belt Climate", segment: "HVAC", region: "Southwest", tm: "David Martinez" },
    { name: "Mountain Air HVAC", segment: "HVAC", region: "Mountain", tm: "Lisa Brown" },
    { name: "Great Lakes Heating", segment: "HVAC", region: "Great Lakes", tm: "Mike Wilson" },
    // Plumbing segment
    { name: "ABC Plumbing Co", segment: "Plumbing", region: "Northeast", tm: "John Smith" },
    { name: "Premier Plumbing", segment: "Plumbing", region: "Mid-Atlantic", tm: "John Smith" },
    { name: "Fast Flow Plumbing", segment: "Plumbing", region: "Southeast", tm: "Sarah Johnson" },
    { name: "WaterWorks Pro", segment: "Plumbing", region: "Florida", tm: "Sarah Johnson" },
    { name: "Pipeline Masters", segment: "Plumbing", region: "Texas", tm: "David Martinez" },
    { name: "Golden State Plumbing", segment: "Plumbing", region: "West Coast", tm: "Lisa Brown" },
    { name: "Midwest Pipe & Supply", segment: "Plumbing", region: "Midwest", tm: "Mike Wilson" },
    // Mechanical segment
    { name: "Metro Mechanical", segment: "Mechanical", region: "Northeast", tm: "John Smith" },
    { name: "All-Pro Mechanical", segment: "Mechanical", region: "Southeast", tm: "Sarah Johnson" },
    { name: "Valley Mechanical", segment: "Mechanical", region: "West Coast", tm: "Lisa Brown" },
    { name: "Industrial Mechanical Systems", segment: "Mechanical", region: "Midwest", tm: "Mike Wilson" },
    { name: "Precision Mechanical Corp", segment: "Mechanical", region: "Texas", tm: "David Martinez" },
    // Additional high-value accounts
    { name: "BuildRight Construction", segment: "General Contractor", region: "Northeast", tm: "John Smith" },
    { name: "Skyline Commercial Builders", segment: "General Contractor", region: "West Coast", tm: "Lisa Brown" },
    { name: "Heartland Construction Co", segment: "General Contractor", region: "Midwest", tm: "Mike Wilson" },
    { name: "Coastal Developers LLC", segment: "General Contractor", region: "Florida", tm: "Sarah Johnson" },
    { name: "Southwest Building Group", segment: "General Contractor", region: "Southwest", tm: "David Martinez" },
  ];

  const accountsData = await db.insert(accounts).values(
    accountNames.map(acc => ({
      tenantId,
      name: acc.name,
      segment: acc.segment,
      region: acc.region,
      assignedTm: acc.tm,
      status: "active",
    }))
  ).returning();

  console.log(`Created ${accountsData.length} accounts`);

  // Seed orders with order items for each account
  const orderData: { tenantId: number; accountId: number; orderDate: Date; totalAmount: string; marginAmount: string }[] = [];
  
  for (const account of accountsData) {
    const baseSpend = Math.floor(Math.random() * 150000 + 50000);
    const ordersPerMonth = Math.floor(Math.random() * 4 + 2);
    
    for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
      for (let orderNum = 0; orderNum < ordersPerMonth; orderNum++) {
        const orderDate = new Date();
        orderDate.setMonth(orderDate.getMonth() - monthsAgo);
        orderDate.setDate(Math.floor(Math.random() * 28) + 1);
        
        const orderTotal = Math.floor(baseSpend / 12 / ordersPerMonth * (0.8 + Math.random() * 0.4));
        orderData.push({
          tenantId,
          accountId: account.id,
          orderDate,
          totalAmount: String(orderTotal),
          marginAmount: String(Math.floor(orderTotal * 0.25)),
        });
      }
    }
  }

  const ordersCreated = await db.insert(orders).values(orderData).returning();
  console.log(`Created ${ordersCreated.length} orders`);

  // Seed order items for each order (2-5 items per order)
  const orderItemsData: { tenantId: number; orderId: number; productId: number; quantity: string; unitPrice: string; lineTotal: string }[] = [];
  
  for (const order of ordersCreated) {
    const numItems = Math.floor(Math.random() * 4) + 2; // 2-5 items per order
    const orderTotal = parseFloat(order.totalAmount);
    let remainingTotal = orderTotal;
    
    for (let i = 0; i < numItems; i++) {
      const product = productsCreated[Math.floor(Math.random() * productsCreated.length)];
      const isLastItem = i === numItems - 1;
      
      // Calculate line total - last item gets remaining amount for accurate totals
      const lineTotal = isLastItem 
        ? remainingTotal 
        : Math.floor(remainingTotal / (numItems - i) * (0.5 + Math.random()));
      
      remainingTotal -= lineTotal;
      
      const unitPrice = parseFloat(product.unitPrice || "100");
      const quantity = Math.max(1, Math.round(lineTotal / unitPrice));
      
      orderItemsData.push({
        tenantId,
        orderId: order.id,
        productId: product.id,
        quantity: String(quantity),
        unitPrice: String(unitPrice),
        lineTotal: String(Math.floor(lineTotal)),
      });
    }
  }
  
  await db.insert(orderItems).values(orderItemsData);
  console.log(`Created ${orderItemsData.length} order items`);

  // Seed segment profiles
  const profiles = await db.insert(segmentProfiles).values([
    { 
      tenantId,
      segment: "HVAC", 
      name: "Full-Scope HVAC Contractor", 
      description: "HVAC contractors who purchase a complete range of equipment and supplies across all major categories",
      minAnnualRevenue: "75000",
      status: "approved",
      approvedBy: "Mark Minnich",
      approvedAt: sql`CURRENT_TIMESTAMP`,
    },
    { 
      tenantId,
      segment: "Plumbing", 
      name: "Full-Scope Plumbing Contractor", 
      description: "Plumbing contractors purchasing across major categories including fixtures, pipe, and water heaters",
      minAnnualRevenue: "60000",
      status: "approved",
      approvedBy: "Mark Minnich",
      approvedAt: sql`CURRENT_TIMESTAMP`,
    },
    { 
      tenantId,
      segment: "Mechanical", 
      name: "Commercial Mechanical Contractor", 
      description: "Commercial mechanical contractors with diverse purchasing needs across HVAC and plumbing",
      minAnnualRevenue: "100000",
      status: "approved",
      approvedBy: "Mark Minnich",
      approvedAt: sql`CURRENT_TIMESTAMP`,
    },
    { 
      tenantId,
      segment: "General Contractor", 
      name: "Multi-Trade General Contractor", 
      description: "General contractors purchasing for multiple trade subcontractors",
      minAnnualRevenue: "150000",
      status: "approved",
      approvedBy: "Mark Minnich",
      approvedAt: sql`CURRENT_TIMESTAMP`,
    },
  ]).returning();

  console.log(`Created ${profiles.length} segment profiles`);

  // Seed profile categories for each ICP
  const profileCatData: { tenantId: number; profileId: number; categoryId: number; expectedPct: string; importance: string; isRequired: boolean; notes?: string }[] = [];
  
  // HVAC profile
  profileCatData.push(
    { tenantId, profileId: profiles[0].id, categoryId: categories[0].id, expectedPct: "35", importance: "1", isRequired: true },
    { tenantId, profileId: profiles[0].id, categoryId: categories[1].id, expectedPct: "18", importance: "1", isRequired: true },
    { tenantId, profileId: profiles[0].id, categoryId: categories[2].id, expectedPct: "15", importance: "1", isRequired: false },
    { tenantId, profileId: profiles[0].id, categoryId: categories[3].id, expectedPct: "12", importance: "1.5", isRequired: false, notes: "Growing category - smart thermostats" },
    { tenantId, profileId: profiles[0].id, categoryId: categories[4].id, expectedPct: "10", importance: "2", isRequired: false, notes: "Strategic priority - high margin" },
    { tenantId, profileId: profiles[0].id, categoryId: categories[5].id, expectedPct: "5", importance: "0.5", isRequired: false },
    { tenantId, profileId: profiles[0].id, categoryId: categories[10].id, expectedPct: "5", importance: "1", isRequired: false },
  );
  
  // Plumbing profile
  profileCatData.push(
    { tenantId, profileId: profiles[1].id, categoryId: categories[6].id, expectedPct: "30", importance: "1", isRequired: true },
    { tenantId, profileId: profiles[1].id, categoryId: categories[7].id, expectedPct: "20", importance: "1", isRequired: true },
    { tenantId, profileId: profiles[1].id, categoryId: categories[4].id, expectedPct: "18", importance: "2", isRequired: false, notes: "Strategic priority - water heaters" },
    { tenantId, profileId: profiles[1].id, categoryId: categories[8].id, expectedPct: "15", importance: "1", isRequired: false },
    { tenantId, profileId: profiles[1].id, categoryId: categories[9].id, expectedPct: "10", importance: "1", isRequired: false },
    { tenantId, profileId: profiles[1].id, categoryId: categories[5].id, expectedPct: "7", importance: "0.5", isRequired: false },
  );

  // Mechanical profile
  profileCatData.push(
    { tenantId, profileId: profiles[2].id, categoryId: categories[0].id, expectedPct: "25", importance: "1", isRequired: true },
    { tenantId, profileId: profiles[2].id, categoryId: categories[6].id, expectedPct: "20", importance: "1", isRequired: true },
    { tenantId, profileId: profiles[2].id, categoryId: categories[2].id, expectedPct: "15", importance: "1", isRequired: false },
    { tenantId, profileId: profiles[2].id, categoryId: categories[7].id, expectedPct: "12", importance: "1", isRequired: false },
    { tenantId, profileId: profiles[2].id, categoryId: categories[10].id, expectedPct: "10", importance: "1.5", isRequired: false, notes: "Commercial insulation needs" },
    { tenantId, profileId: profiles[2].id, categoryId: categories[11].id, expectedPct: "10", importance: "1", isRequired: false },
    { tenantId, profileId: profiles[2].id, categoryId: categories[5].id, expectedPct: "8", importance: "0.5", isRequired: false },
  );

  // General Contractor profile
  profileCatData.push(
    { tenantId, profileId: profiles[3].id, categoryId: categories[0].id, expectedPct: "20", importance: "1", isRequired: false },
    { tenantId, profileId: profiles[3].id, categoryId: categories[6].id, expectedPct: "18", importance: "1", isRequired: false },
    { tenantId, profileId: profiles[3].id, categoryId: categories[8].id, expectedPct: "15", importance: "1", isRequired: false },
    { tenantId, profileId: profiles[3].id, categoryId: categories[4].id, expectedPct: "12", importance: "2", isRequired: false, notes: "Water heater bundling opportunity" },
    { tenantId, profileId: profiles[3].id, categoryId: categories[2].id, expectedPct: "10", importance: "1", isRequired: false },
    { tenantId, profileId: profiles[3].id, categoryId: categories[11].id, expectedPct: "10", importance: "1", isRequired: false },
    { tenantId, profileId: profiles[3].id, categoryId: categories[5].id, expectedPct: "15", importance: "0.8", isRequired: false },
  );

  await db.insert(profileCategories).values(profileCatData);
  console.log("Created profile categories");

  // Seed account metrics with varied opportunity scores
  const metricsData: any[] = [];
  const gapsData: any[] = [];

  for (const account of accountsData) {
    const baseRevenue = Math.floor(Math.random() * 180000 + 40000);
    const penetration = Math.floor(Math.random() * 45 + 25);
    const opportunityScore = Math.floor(Math.random() * 35 + 55);
    const categoryCount = Math.floor(Math.random() * 6 + 3);
    const yoyGrowth = Math.floor(Math.random() * 35 - 8);
    
    const matchedProfile = profiles.find(p => p.segment === account.segment) || profiles[0];
    
    metricsData.push({
      tenantId,
      accountId: account.id,
      last12mRevenue: String(baseRevenue),
      last3mRevenue: String(Math.floor(baseRevenue / 4 * (1 + yoyGrowth / 100))),
      yoyGrowthRate: String(yoyGrowth),
      categoryCount,
      categoryPenetration: String(penetration),
      categoryGapScore: String(100 - penetration),
      opportunityScore: String(opportunityScore),
      matchedProfileId: matchedProfile.id,
    });

    // Generate 2-4 category gaps per account
    const numGaps = Math.floor(Math.random() * 3) + 2;
    const usedCategories = new Set<number>();
    
    for (let i = 0; i < numGaps; i++) {
      let category = categories[Math.floor(Math.random() * categories.length)];
      while (usedCategories.has(category.id)) {
        category = categories[Math.floor(Math.random() * categories.length)];
      }
      usedCategories.add(category.id);
      
      const expectedPct = Math.floor(Math.random() * 20 + 15);
      const actualPct = Math.floor(Math.random() * 8);
      const gapPct = expectedPct - actualPct;
      
      gapsData.push({
        tenantId,
        accountId: account.id,
        categoryId: category.id,
        expectedPct: String(expectedPct),
        actualPct: String(actualPct),
        gapPct: String(gapPct),
        estimatedOpportunity: String(Math.floor(baseRevenue * gapPct / 100)),
      });
    }
  }

  await db.insert(accountMetrics).values(metricsData);
  await db.insert(accountCategoryGaps).values(gapsData);
  console.log("Created account metrics and gaps");

  // Seed playbooks
  const playbooksData = await db.insert(playbooks).values([
    { tenantId, name: "Q1 Water Heater Expansion", generatedBy: "AI VP Dashboard", taskCount: 8, filtersUsed: { segment: ["HVAC", "Plumbing"], category: "Water Heaters" } },
    { tenantId, name: "Controls & Thermostat Push", generatedBy: "AI VP Dashboard", taskCount: 6, filtersUsed: { segment: ["HVAC"], category: "Controls & Thermostats" } },
    { tenantId, name: "PVF Category Recovery", generatedBy: "AI VP Dashboard", taskCount: 5, filtersUsed: { segment: ["Plumbing", "Mechanical"], category: "PVF" } },
    { tenantId, name: "High-Score Account Blitz", generatedBy: "AI VP Dashboard", taskCount: 12, filtersUsed: { minOpportunityScore: 75 } },
  ]).returning();

  console.log(`Created ${playbooksData.length} playbooks`);

  // Seed tasks with realistic scripts
  const taskScripts = {
    waterHeater: {
      call: `Hi [Contact], this is [Your Name] from Mark Supply. I noticed you've been a great customer for [current categories], and I wanted to reach out about our water heater line.

We've recently expanded our Bradford White and Rheem inventory, and with your volume, I think there's a significant opportunity to consolidate your purchases with us.

Key points to mention:
- Same-day availability on most residential models
- Competitive contractor pricing
- Free jobsite delivery on orders over $500
- Extended warranty programs

Would you have 15 minutes this week to discuss how we can support your water heater needs?`,
      email: `Subject: Water Heater Opportunity for [Account Name]

Hi [Contact],

I hope this message finds you well! I've been reviewing your account and noticed you're doing great volume in [current categories], but we haven't had a chance to discuss our water heater programs.

We've recently become a preferred distributor for Bradford White and Rheem, which means:

- Contractor-exclusive pricing (10-15% below retail distributors)
- Same-day availability on the 20 most popular residential models
- Free jobsite delivery for orders over $500
- Extended warranty registration handled by us

I'd love to send you a custom quote based on your typical monthly volume. What models do you install most frequently?

Best regards,
[Your Name]`,
    },
    controls: {
      call: `Hi [Contact], this is [Your Name] from Mark Supply. I wanted to reach out about an exclusive promotion we're running on smart thermostats this quarter.

Given your HVAC installation volume, I think you could see significant savings by consolidating your thermostat purchases with us.

Current promotion highlights:
- 15% off Honeywell T6 Pro and Ecobee thermostats
- Buy 10, get 1 free on Nest Learning thermostats
- Same-day availability
- Free contractor training on smart thermostat installation

Would you be interested in seeing a quote for your typical monthly volume?`,
      email: `Subject: Exclusive Q1 Thermostat Promotion for [Account Name]

Hi [Contact],

The smart thermostat market is booming, and I wanted to make sure you know about our Q1 promotion before it ends.

For [Account Name], here's what we're offering:

- 15% off all Honeywell and Ecobee smart thermostats
- Buy 10, Get 1 Free on Nest Learning thermostats
- Free 30-minute training session for your crew

This promotion runs through March 31st. Based on your typical HVAC installation volume, I estimate you could save $200-400 monthly by consolidating with us.

Interested in a quote? Just reply with your typical monthly thermostat models and quantities.

Best,
[Your Name]`,
    },
    pvf: {
      call: `Hi [Contact], this is [Your Name] from Mark Supply. I wanted to check in and see how things are going with your current projects.

While I have you, I also wanted to mention that we've significantly expanded our PVF inventory. I know you're currently sourcing pipe, valves, and fittings elsewhere, but we can now offer:

- Competitive pricing with single-source convenience
- Next-day delivery on most items
- Full line of brass, copper, and plastic fittings
- Volume discounts on case quantities

Can I send you our updated PVF catalog and a sample quote?`,
    },
  };

  const now = new Date();
  const tasksToCreate: any[] = [];
  const playbookTaskLinks: { tenantId: number; playbookId: number; taskId: number }[] = [];

  // Create tasks for first 15 accounts
  for (let i = 0; i < Math.min(15, accountsData.length); i++) {
    const account = accountsData[i];
    const tm = tms.find(t => t.name === account.assignedTm);
    
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 14) + 1);
    
    const taskTypes: ("call" | "email" | "visit")[] = ["call", "email", "visit"];
    const taskType = taskTypes[Math.floor(Math.random() * 3)];
    
    const gapCategory = categories[Math.floor(Math.random() * categories.length)];
    let script = "";
    let title = "";
    
    if (gapCategory.name.includes("Water")) {
      script = taskType === "email" ? taskScripts.waterHeater.email : taskScripts.waterHeater.call;
      title = `${taskType === "call" ? "Call" : taskType === "email" ? "Email" : "Visit"}: Introduce Water Heater Line`;
    } else if (gapCategory.name.includes("Control")) {
      script = taskType === "email" ? taskScripts.controls.email : taskScripts.controls.call;
      title = `${taskType === "call" ? "Call" : taskType === "email" ? "Email" : "Visit"}: Q1 Thermostat Promotion`;
    } else {
      script = taskScripts.pvf.call;
      title = `${taskType === "call" ? "Call" : taskType === "email" ? "Email" : "Visit"}: ${gapCategory.name} Expansion`;
    }

    const statuses = ["pending", "pending", "pending", "in_progress", "completed"];
    const status = statuses[Math.floor(Math.random() * 5)];
    
    tasksToCreate.push({
      tenantId,
      accountId: account.id,
      assignedTm: account.assignedTm,
      assignedTmId: tm?.id,
      taskType,
      title,
      description: `High-opportunity account with gap in ${gapCategory.name} category`,
      script: script.replace(/\[Account Name\]/g, account.name).replace(/\[Contact\]/g, "Contact Name").replace(/\[Your Name\]/g, account.assignedTm || "Rep"),
      gapCategories: [gapCategory.name],
      status,
      dueDate,
      completedAt: status === "completed" ? new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
      outcome: status === "completed" ? "Positive response - scheduled follow-up meeting" : null,
    });
  }

  const createdTasks = await db.insert(tasks).values(tasksToCreate).returning();
  console.log(`Created ${createdTasks.length} tasks`);

  // Link tasks to playbooks
  for (let i = 0; i < createdTasks.length; i++) {
    const playbook = playbooksData[i % playbooksData.length];
    playbookTaskLinks.push({
      tenantId,
      playbookId: playbook.id,
      taskId: createdTasks[i].id,
    });
  }

  await db.insert(playbookTasks).values(playbookTaskLinks);
  console.log("Linked tasks to playbooks");

  // Seed program accounts (enrolled) - select high-scoring accounts
  const enrolledAccountIds = accountsData.slice(0, 8).map(a => a.id);
  const baselineStart = new Date();
  baselineStart.setFullYear(baselineStart.getFullYear() - 1);
  const baselineEnd = new Date();
  baselineEnd.setMonth(baselineEnd.getMonth() - 1);

  const programAccountsData = await db.insert(programAccounts).values(
    enrolledAccountIds.map((accountId, idx) => {
      const baselineRevenue = 80000 + Math.floor(Math.random() * 150000);
      const enrolledDate = new Date();
      enrolledDate.setMonth(enrolledDate.getMonth() - Math.floor(Math.random() * 6) - 1);
      
      return {
        tenantId,
        accountId,
        enrolledBy: "Graham",
        baselineStart,
        baselineEnd,
        baselineRevenue: String(baselineRevenue),
        shareRate: "0.15",
        status: idx < 6 ? "active" : "graduated",
        targetPenetration: String(75 + Math.floor(Math.random() * 15)),
        targetIncrementalRevenue: String(Math.floor(baselineRevenue * 0.3)),
        targetDurationMonths: 90,
        graduationCriteria: "any",
        graduatedAt: idx >= 6 ? new Date() : null,
        graduationNotes: idx >= 6 ? "Successfully met revenue growth targets" : null,
      };
    })
  ).returning();

  console.log(`Created ${programAccountsData.length} enrolled program accounts`);

  // Seed revenue snapshots showing growth over time
  for (const pa of programAccountsData) {
    const baselineRevenue = parseFloat(pa.baselineRevenue);
    const growthRate = 1.02 + Math.random() * 0.03; // 2-5% monthly growth
    
    for (let i = 6; i >= 0; i--) {
      const monthsGrowth = Math.pow(growthRate, 6 - i);
      const periodRevenue = (baselineRevenue / 12) * monthsGrowth;
      const baselineMonthly = baselineRevenue / 12;
      const incrementalRevenue = periodRevenue - baselineMonthly;
      
      const periodStart = new Date();
      periodStart.setMonth(periodStart.getMonth() - (i + 1));
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() - i);
      
      await db.insert(programRevenueSnapshots).values({
        programAccountId: pa.id,
        periodStart,
        periodEnd,
        periodRevenue: String(Math.floor(periodRevenue)),
        baselineComparison: String(Math.floor(baselineMonthly)),
        incrementalRevenue: String(Math.floor(Math.max(0, incrementalRevenue))),
        feeAmount: String(Math.floor(Math.max(0, incrementalRevenue * 0.15))),
      });
    }
  }

  console.log("Created revenue snapshots");

  // Seed rev-share tiers
  await db.insert(revShareTiers).values([
    { tenantId, minRevenue: "0", maxRevenue: "50000", shareRate: "15", displayOrder: 1, isActive: true },
    { tenantId, minRevenue: "50000", maxRevenue: "150000", shareRate: "12", displayOrder: 2, isActive: true },
    { tenantId, minRevenue: "150000", maxRevenue: null, shareRate: "10", displayOrder: 3, isActive: true },
  ]);

  console.log("Created rev-share tiers");

  // Seed data uploads history
  await db.insert(dataUploads).values([
    { tenantId, uploadType: "accounts", fileName: "accounts_2024.csv", rowCount: 487, status: "completed", uploadedBy: "Graham" },
    { tenantId, uploadType: "orders", fileName: "orders_q4_2023.csv", rowCount: 15234, status: "completed", uploadedBy: "Graham" },
    { tenantId, uploadType: "orders", fileName: "orders_q1_2024.csv", rowCount: 12891, status: "completed", uploadedBy: "Graham" },
    { tenantId, uploadType: "products", fileName: "product_catalog.csv", rowCount: 2341, status: "completed", uploadedBy: "Graham" },
    { tenantId, uploadType: "categories", fileName: "categories.csv", rowCount: 156, status: "completed", uploadedBy: "Graham" },
  ]);

  console.log("Created data uploads");

  // Seed settings
  await db.insert(settings).values([
    { tenantId, key: "companyName", value: "Mark Supply" },
    { tenantId, key: "appTitle", value: "AI VP Dashboard" },
  ]);

  console.log("Created settings");

  // Seed subscription plans
  await db.delete(subscriptionPlans);
  await db.insert(subscriptionPlans).values([
    {
      name: "Starter",
      slug: "starter",
      stripeMonthlyPriceId: null,
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
      limits: { accounts: -1, users: -1 },
      isActive: true,
      displayOrder: 3,
    },
  ]);

  console.log("Created subscription plans");
  console.log("\n✅ Seeding complete! Database populated with comprehensive demo data.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
