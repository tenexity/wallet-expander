import type { Express } from "express";
import { db } from "./db";
import { subscriptionPlans } from "@shared/schema";
import { eq } from "drizzle-orm";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatPrice(price: string | null): string {
  const num = parseFloat(price || "0");
  if (num === 0) return "Free";
  return "$" + num.toLocaleString();
}

export function registerSSRLandingRoute(app: Express) {
  app.get("/promo", async (_req, res) => {
    let plans: Array<{
      name: string;
      slug: string;
      monthlyPrice: string | null;
      features: unknown;
      limits: unknown;
    }> = [];

    try {
      plans = await db
        .select({
          name: subscriptionPlans.name,
          slug: subscriptionPlans.slug,
          monthlyPrice: subscriptionPlans.monthlyPrice,
          features: subscriptionPlans.features,
          limits: subscriptionPlans.limits,
        })
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.isActive, true))
        .orderBy(subscriptionPlans.displayOrder);
    } catch (e) {
      console.error("[ssr-landing] Failed to load plans:", e);
    }

    const planCards = plans
      .map((plan) => {
        const features = Array.isArray(plan.features) ? plan.features : [];
        const featureList = features
          .map((f) => `<li>✓ ${escapeHtml(String(f))}</li>`)
          .join("\n              ");

        const priceDisplay =
          plan.slug === "enterprise"
            ? "Custom"
            : formatPrice(plan.monthlyPrice);

        const priceLabel =
          plan.slug === "enterprise" || plan.slug === "starter"
            ? ""
            : "/mo";

        const descriptions: Record<string, string> = {
          starter: "Try it free with one account",
          growth: "For teams up to 5 users",
          scale: "For scaling sales organizations",
          enterprise: "Custom enterprise solution",
        };

        return `
          <div class="plan-card ${plan.slug === "scale" ? "plan-popular" : ""}">
            ${plan.slug === "scale" ? '<span class="popular-badge">Most Popular</span>' : ""}
            <h3>${escapeHtml(plan.name)}</h3>
            <p class="plan-desc">${escapeHtml(descriptions[plan.slug] || "")}</p>
            <div class="plan-price">${priceDisplay}<span class="plan-period">${priceLabel}</span></div>
            <ul class="plan-features">
              ${featureList}
            </ul>
            ${
              plan.slug === "enterprise"
                ? '<a href="mailto:sales@tenexity.com?subject=Enterprise%20Plan%20Inquiry" class="btn btn-outline">Contact Sales</a>'
                : '<a href="/api/login" class="btn">Get Started</a>'
            }
          </div>`;
      })
      .join("\n");

    const showcaseFeatures = [
      {
        badge: "Smart Account Discovery",
        title: "Find Your Highest-Potential Accounts Instantly",
        description:
          "Our AI analyzes your entire customer base to surface the accounts with the greatest growth potential. Stop guessing which customers deserve more attention, let data reveal your hidden revenue goldmines so your team can focus where it matters most.",
        benefits: [
          "AI identifies accounts with the biggest wallet share opportunity",
          "Prioritize based on growth potential, not just current spend",
          "Focus your best reps on the accounts most likely to grow",
          "Turn data into a strategic advantage for account selection",
        ],
      },
      {
        badge: "Growth Pipeline",
        title: "Every Enrolled Account Gets a Customized Growth Plan",
        description:
          "When you enroll an account, you're making a commitment, and so are we. Each enrolled account receives a personalized action plan designed to grow their wallet share. Track progress, celebrate wins, and watch your accounts graduate to higher revenue tiers.",
        benefits: [
          "Personalized growth roadmap for every enrolled account",
          "Clear milestones and graduation targets",
          "Real-time progress tracking from enrollment to graduation",
          "Structured follow-up drives consistent results",
        ],
      },
      {
        badge: "Agentic Daily Briefing",
        title: "Your AI Rep Starts Every Day With a Plan",
        description:
          "Every weekday morning, each territory manager receives a personalized briefing generated overnight by your AI agent. It surfaces which enrolled accounts need attention today, what buying signals were detected in recent emails, and which accounts are quietly trending at-risk — before it becomes a problem.",
        benefits: [
          "Personalized morning email to every rep, zero effort required",
          "AI prioritizes the 2-3 accounts that need action today",
          "Buying signals and competitor mentions surface automatically",
          "At-risk accounts flagged before they churn, not after",
        ],
      },
      {
        badge: "Revenue Opportunity Mapping",
        title: "See Exactly Where Each Account Can Grow",
        description:
          "AI maps every enrolled account's purchases against their full potential. Instantly visualize which product categories are under-penetrated and quantify the exact dollar opportunity in each gap, so your team knows precisely where to focus conversations.",
        benefits: [
          "Visualize untapped potential in every account",
          "Quantified dollar amounts for each growth opportunity",
          "Category-level insights power targeted conversations",
          "AI prioritizes the highest-value gaps to pursue first",
        ],
      },
      {
        badge: "Ask Anything Intelligence",
        title: "Ask Your Portfolio Any Question, Get an Answer in Seconds",
        description:
          'No more waiting for weekly reports or digging through spreadsheets. Type any question — "Which accounts haven\'t ordered in 90 days?" or "Who is my highest-risk account this week?" — and your AI agent answers instantly by analyzing your entire account portfolio in real time.',
        benefits: [
          "Natural language Q&A across your entire account portfolio",
          "Ask about individual accounts, segments, or the full program",
          "Answers streamed in real time, no waiting for reports",
          "Every query logged for pattern analysis and team learning",
        ],
      },
      {
        badge: "Success Pattern Recognition",
        title: "Learn from Your Best to Grow the Rest",
        description:
          "AI studies your top-performing accounts to understand what success looks like in each segment. These patterns become the benchmark for growth, showing exactly how to guide underperforming accounts toward their full potential.",
        benefits: [
          "AI discovers what your best customers have in common",
          "Segment-specific success patterns you can replicate",
          "Data-driven targets based on real customer behavior",
          "Continuous learning as your customer base evolves",
        ],
      },
      {
        badge: "Growth Results Tracking",
        title: "Measure the Revenue Impact of Every Relationship",
        description:
          "Track incremental revenue growth from enrollment through graduation. See exactly how much each account has grown, celebrate Territory Manager wins, and prove the ROI of relationship-driven selling with transparent, real-time reporting.",
        benefits: [
          "Track revenue lift from day one of enrollment",
          "Celebrate milestones as accounts hit growth targets",
          "Attribute results directly to relationship actions",
          "Executive dashboards prove program ROI instantly",
        ],
      },
      {
        badge: "AI-Powered Action Plans",
        title: "Customized Playbooks That Empower Your Sales Team",
        description:
          "AI generates personalized action plans for each enrolled account, complete with talking points, call scripts, and email templates tailored to their specific opportunities. Your team brings the relationship expertise; AI provides the perfect preparation.",
        benefits: [
          "Personalized scripts address each account's unique gaps",
          "AI prepares your team for high-impact conversations",
          "Human relationships enhanced by intelligent insights",
          "Every touchpoint drives toward measurable growth",
        ],
      },
      {
        badge: "Email Intelligence",
        title: "Every Email Your Team Sends Makes the AI Smarter",
        description:
          "When your rep logs a customer email, your AI agent reads it in seconds: extracting sentiment, identifying competitor mentions, detecting buying signals, and updating the account's risk profile. The next time that account appears in a briefing or playbook, the AI already knows what happened — and what to say next.",
        benefits: [
          "AI reads every logged email for sentiment and buying signals",
          "Competitor mentions auto-flagged and tracked over time",
          "At-risk alerts fired to the rep when urgency is detected",
          "Each interaction makes playbooks more personalized",
        ],
      },
      {
        badge: "Agentic CRM Intelligence",
        title: "Your CRM Fills Itself While Your Team Sells",
        description:
          "This is the breakthrough. While your reps focus on relationships, AI agents work behind the scenes — extracting contacts from email signatures, detecting order signals from conversations, and flagging competitive threats the moment they appear. Every email becomes actionable intelligence, automatically organized and ready for your team.",
        benefits: [
          "Competitor threats detected and escalated in real time with price gap analysis",
          "Order signals extracted from emails with dollar values and urgency scoring",
          "Decision-maker contacts auto-discovered and linked to accounts",
          "Zero manual data entry — your CRM evolves with every conversation",
        ],
      },
    ];

    const featuresHtml = showcaseFeatures
      .map(
        (feature) => `
        <div class="feature-block">
          <span class="feature-badge">${escapeHtml(feature.badge)}</span>
          <h3>${escapeHtml(feature.title)}</h3>
          <p>${escapeHtml(feature.description)}</p>
          <ul>
            ${feature.benefits.map((b) => `<li>✓ ${escapeHtml(b)}</li>`).join("\n            ")}
          </ul>
        </div>`
      )
      .join("\n");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wallet Share Expander - Grow Your Highest-Potential Accounts with AI-Enhanced Relationships</title>
  <meta name="description" content="Find your highest-potential accounts and guarantee their growth with customized AI-powered playbooks. Enhance human relationships with intelligent insights that drive wallet share expansion.">
  <meta property="og:title" content="Wallet Share Expander - Guaranteed Account Growth">
  <meta property="og:description" content="Discover hidden revenue opportunities in your customer base. When you enroll an account, it's guaranteed to grow with customized AI playbooks that empower your sales team.">
  <meta property="og:type" content="website">
  <meta name="robots" content="index, follow">
  <style>
    :root {
      --primary: #2563eb;
      --primary-light: #3b82f6;
      --bg: #ffffff;
      --bg-muted: #f8fafc;
      --text: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --card-bg: #ffffff;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: var(--text); background: var(--bg); line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
    h1, h2, h3, h4 { line-height: 1.2; }
    a { color: var(--primary); text-decoration: none; }

    /* Header */
    header { border-bottom: 1px solid var(--border); padding: 1rem 0; position: sticky; top: 0; background: var(--bg); z-index: 50; }
    header .container { display: flex; align-items: center; justify-content: space-between; }
    .logo { font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; }
    .logo-icon { width: 2rem; height: 2rem; background: var(--primary); border-radius: 0.375rem; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.875rem; }
    nav { display: flex; gap: 1.5rem; align-items: center; }
    nav a { color: var(--text-muted); font-size: 0.875rem; font-weight: 500; }
    .btn { display: inline-block; padding: 0.5rem 1.25rem; border-radius: 0.375rem; font-weight: 500; font-size: 0.875rem; text-align: center; cursor: pointer; transition: background 0.2s; }
    .btn { background: var(--primary); color: white; border: none; }
    .btn:hover { background: var(--primary-light); }
    .btn-outline { background: transparent; border: 1px solid var(--border); color: var(--text); }
    .btn-outline:hover { background: var(--bg-muted); }
    .btn-lg { padding: 0.75rem 2rem; font-size: 1rem; }

    /* Hero */
    .hero { padding: 4rem 0; background: linear-gradient(135deg, var(--bg) 0%, var(--bg-muted) 100%); }
    .hero h1 { font-size: 3rem; font-weight: 800; margin-bottom: 1.5rem; max-width: 700px; }
    .hero h1 span { color: var(--primary); }
    .hero p { font-size: 1.25rem; color: var(--text-muted); max-width: 600px; margin-bottom: 2rem; }
    .hero-badge { display: inline-block; background: var(--bg-muted); border: 1px solid var(--border); padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); margin-bottom: 1.5rem; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-top: 2.5rem; padding-top: 2rem; border-top: 1px solid var(--border); }
    .stat-value { font-size: 1.75rem; font-weight: 700; color: var(--primary); }
    .stat-label { font-size: 0.75rem; color: var(--text-muted); }

    /* Steps */
    .steps { padding: 4rem 0; background: var(--bg-muted); }
    .steps-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
    .step-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 0.5rem; padding: 1.5rem; text-align: center; }
    .step-card h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; }
    .step-card p { font-size: 0.875rem; color: var(--text-muted); }

    /* Features */
    .features { padding: 5rem 0; }
    .features .section-header { text-align: center; margin-bottom: 4rem; }
    .features .section-header h2 { font-size: 2rem; font-weight: 700; margin-bottom: 1rem; }
    .features .section-header p { font-size: 1.125rem; color: var(--text-muted); max-width: 800px; margin: 0 auto; }
    .feature-block { margin-bottom: 3rem; padding: 2rem; border: 1px solid var(--border); border-radius: 0.75rem; }
    .feature-badge { display: inline-block; background: var(--bg-muted); border: 1px solid var(--border); padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); margin-bottom: 1rem; }
    .feature-block h3 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.75rem; }
    .feature-block p { color: var(--text-muted); margin-bottom: 1rem; font-size: 1rem; }
    .feature-block ul { list-style: none; padding: 0; }
    .feature-block li { padding: 0.375rem 0; font-size: 0.875rem; color: var(--text-muted); }

    /* Pricing */
    .pricing { padding: 5rem 0; }
    .pricing .section-header { text-align: center; margin-bottom: 3rem; }
    .pricing .section-header h2 { font-size: 2rem; font-weight: 700; margin-bottom: 1rem; }
    .pricing .section-header p { font-size: 1.125rem; color: var(--text-muted); }
    .plans-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
    .plan-card { border: 1px solid var(--border); border-radius: 0.75rem; padding: 1.5rem; display: flex; flex-direction: column; position: relative; background: var(--card-bg); }
    .plan-popular { border-color: var(--primary); box-shadow: 0 4px 24px rgba(37, 99, 235, 0.15); }
    .popular-badge { position: absolute; top: -0.75rem; left: 50%; transform: translateX(-50%); background: var(--primary); color: white; padding: 0.2rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
    .plan-card h3 { font-size: 1.25rem; font-weight: 700; text-align: center; margin-bottom: 0.25rem; }
    .plan-desc { font-size: 0.875rem; color: var(--text-muted); text-align: center; margin-bottom: 1rem; }
    .plan-price { font-size: 2.25rem; font-weight: 700; text-align: center; margin-bottom: 1.5rem; }
    .plan-period { font-size: 1rem; font-weight: 400; color: var(--text-muted); }
    .plan-features { list-style: none; padding: 0; flex: 1; margin-bottom: 1.5rem; }
    .plan-features li { padding: 0.375rem 0; font-size: 0.875rem; }
    .plan-card .btn { width: 100%; text-align: center; }

    /* Guarantee */
    .guarantee { padding: 5rem 0; background: var(--bg-muted); }
    .guarantee .section-header { text-align: center; margin-bottom: 3rem; }
    .guarantee .section-header h2 { font-size: 2rem; font-weight: 700; margin-bottom: 1rem; }
    .guarantee .section-header h2 span { color: var(--primary); }
    .guarantee .section-header p { font-size: 1.125rem; color: var(--text-muted); max-width: 800px; margin: 0 auto; }
    .guarantee-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-top: 2rem; }
    .guarantee-stat { background: var(--card-bg); border: 1px solid var(--primary); border-radius: 0.5rem; padding: 1.5rem; opacity: 0.9; }
    .guarantee-stat .stat-value { font-size: 1.75rem; font-weight: 700; color: var(--primary); margin-bottom: 0.25rem; }
    .guarantee-stat .stat-title { font-weight: 600; margin-bottom: 0.25rem; }
    .guarantee-stat .stat-desc { font-size: 0.875rem; color: var(--text-muted); }

    /* Testimonial */
    .testimonial { padding: 5rem 0; }
    .testimonial-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center; max-width: 900px; margin: 0 auto; }
    .testimonial h2 { font-size: 2rem; font-weight: 700; margin-bottom: 1rem; }
    .testimonial blockquote { font-style: italic; font-size: 1.125rem; margin-bottom: 1rem; padding: 2rem; background: var(--bg-muted); border-radius: 0.75rem; border: 1px solid var(--border); }
    .testimonial .author { font-weight: 600; }
    .testimonial .role { font-size: 0.875rem; color: var(--text-muted); }
    .benefit-item { display: flex; gap: 0.75rem; margin-bottom: 1rem; }
    .benefit-item h4 { font-weight: 600; margin-bottom: 0.25rem; }
    .benefit-item p { font-size: 0.875rem; color: var(--text-muted); }

    /* CTA */
    .cta { padding: 5rem 0; background: var(--bg-muted); text-align: center; }
    .cta h2 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.75rem; }
    .cta p { color: var(--text-muted); margin-bottom: 1.5rem; max-width: 500px; margin-left: auto; margin-right: auto; }
    .cta-checks { display: flex; justify-content: center; gap: 2rem; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border); font-size: 0.875rem; color: var(--text-muted); }

    /* Footer */
    footer { padding: 3rem 0; border-top: 1px solid var(--border); }
    footer .container { display: flex; align-items: center; justify-content: space-between; }
    footer nav { display: flex; gap: 1.5rem; }
    footer nav a { font-size: 0.875rem; color: var(--text-muted); }
    .footer-powered { font-size: 0.875rem; color: var(--text-muted); }

    @media (max-width: 768px) {
      .hero h1 { font-size: 2rem; }
      .stats-grid, .steps-grid, .plans-grid, .guarantee-stats { grid-template-columns: 1fr 1fr; }
      .testimonial-grid { grid-template-columns: 1fr; }
      .cta-checks { flex-direction: column; gap: 0.5rem; align-items: center; }
      footer .container { flex-direction: column; gap: 1rem; text-align: center; }
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <div class="logo">
        <div class="logo-icon">W</div>
        <span>Wallet Share</span>
      </div>
      <nav>
        <a href="#features">Features</a>
        <a href="#pricing">Pricing</a>
        <a href="/api/login">Sign Up</a>
        <a href="/api/login" class="btn btn-outline">Login</a>
        <a href="/api/login" class="btn">Get Started</a>
      </nav>
    </div>
  </header>

  <section class="hero">
    <div class="container">
      <span class="hero-badge">Agentic AI That Thinks, Plans, and Reminds</span>
      <h1>Recover <span>Lost Revenue</span> from Existing Customers</h1>
      <p>Identify wallet share leakage and prioritize your highest-potential accounts. Let your AI agent monitor overnight, brief your reps each morning, and flag risk before you lose revenue.</p>
      <div>
        <a href="#pricing" class="btn btn-lg">Start Free Trial →</a>
        <a href="#features" class="btn btn-outline btn-lg" style="margin-left: 1rem;">See How It Works</a>
      </div>
      <div class="stats-grid">
        <div>
          <div class="stat-value">32%</div>
          <div class="stat-label">Avg. Wallet Share Increase*</div>
        </div>
        <div>
          <div class="stat-value">4.1x</div>
          <div class="stat-label">Typical ROI in First Year*</div>
        </div>
        <div>
          <div class="stat-value">94%</div>
          <div class="stat-label">Accounts Meet Growth Targets*</div>
        </div>
        <div>
          <div class="stat-value">Daily</div>
          <div class="stat-label">AI Briefings Sent to Every Rep</div>
        </div>
      </div>
      <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 1rem; opacity: 0.6;">*Results based on enrolled accounts following recommended engagement practices</p>
    </div>
  </section>

  <section class="steps">
    <div class="container">
      <div class="steps-grid">
        <div class="step-card">
          <h3>Discover</h3>
          <p>AI surfaces your highest-potential accounts with hidden wallet share opportunity</p>
        </div>
        <div class="step-card">
          <h3>Enroll</h3>
          <p>Commit accounts to growth with personalized playbooks and action plans</p>
        </div>
        <div class="step-card" style="border-color: var(--primary); background: rgba(37, 99, 235, 0.03);">
          <h3>Agent Monitors</h3>
          <p>Your AI runs overnight reviews, sends morning briefings, and surfaces risk — automatically</p>
        </div>
        <div class="step-card">
          <h3>Graduate</h3>
          <p>Watch accounts grow and hit revenue targets with structured support</p>
        </div>
      </div>
    </div>
  </section>

  <section id="features" class="features">
    <div class="container">
      <div class="section-header">
        <h2>A Proven System for Account Growth</h2>
        <p>Discover your highest-potential accounts, enroll them with customized growth plans, and empower your team with AI-generated action playbooks. Human relationships drive the results, AI ensures nothing falls through the cracks.</p>
      </div>
      ${featuresHtml}
    </div>
  </section>

  <section class="guarantee">
    <div class="container">
      <div class="section-header">
        <h2>Enrolled Accounts Are <span>Guaranteed to Grow</span></h2>
        <p>When you enroll an account, you're not hoping for results, you're activating a proven system designed to drive additional revenue through AI-powered personalization and human relationships.</p>
      </div>
      <div class="guarantee-stats">
        <div class="guarantee-stat">
          <div class="stat-value">94%</div>
          <div class="stat-title">Graduation Rate</div>
          <div class="stat-desc">Of enrolled accounts achieve their revenue growth targets</div>
        </div>
        <div class="guarantee-stat">
          <div class="stat-value">32%</div>
          <div class="stat-title">Average Growth</div>
          <div class="stat-desc">Wallet share increase for enrolled accounts</div>
        </div>
        <div class="guarantee-stat">
          <div class="stat-value">90 Days</div>
          <div class="stat-title">Time to Results</div>
          <div class="stat-desc">Average time for enrolled accounts to show measurable growth</div>
        </div>
      </div>
    </div>
  </section>

  <section id="pricing" class="pricing">
    <div class="container">
      <div class="section-header">
        <h2>Choose the Plan That Fits Your Needs</h2>
        <p>Start with a free trial. Upgrade anytime to unlock more features and grow wallet share at scale.</p>
      </div>
      <div class="plans-grid">
        ${planCards}
      </div>
      <p style="text-align: center; font-size: 0.875rem; color: var(--text-muted); margin-top: 2rem;">
        Start free with one account. No credit card required. Upgrade anytime as you grow.
      </p>
    </div>
  </section>

  <section class="testimonial">
    <div class="container">
      <div class="testimonial-grid">
        <div>
          <h2>AI That Enhances, Not Replaces, Human Relationships</h2>
          <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Your sales team builds relationships. We give them the insights, preparation, and confidence to make every conversation count.</p>
          <div class="benefit-item">
            <div>
              <h4>Relationship-First Approach</h4>
              <p>AI prepares your team—humans build the trust that closes deals</p>
            </div>
          </div>
          <div class="benefit-item">
            <div>
              <h4>Proven Growth System</h4>
              <p>Every enrolled account receives a customized plan designed to drive results</p>
            </div>
          </div>
          <div class="benefit-item">
            <div>
              <h4>Enterprise Security</h4>
              <p>SOC 2 compliant with dedicated customer success support</p>
            </div>
          </div>
        </div>
        <div>
          <blockquote>
            "We enrolled 50 accounts in the first month and every single one has grown. The AI playbooks give our reps exactly what they need to have confident, value-driven conversations. It's like giving each rep a personal sales strategist."
          </blockquote>
          <div class="author">Sarah Johnson</div>
          <div class="role">VP of Sales, Industrial Supply Co.</div>
        </div>
      </div>
    </div>
  </section>

  <section class="cta">
    <div class="container">
      <h2>Discover Your Highest-Potential Accounts</h2>
      <p>See which accounts have the biggest growth opportunity. Start enrolling and watch them grow with proven playbook strategies.</p>
      <a href="/api/login" class="btn btn-lg">Create Free Account →</a>
      <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 1rem;">
        Already have an account? <a href="/api/login">Log in</a>
      </p>
      <div class="cta-checks">
        <span>✓ 14-day free trial</span>
        <span>✓ No credit card</span>
        <span>✓ Cancel anytime</span>
      </div>
    </div>
  </section>

  <footer>
    <div class="container">
      <div class="logo">
        <div class="logo-icon">W</div>
        <span>Wallet Share Expander</span>
      </div>
      <nav>
        <a href="#">Privacy Policy</a>
        <a href="#">Terms of Service</a>
        <a href="#">Contact</a>
      </nav>
      <div class="footer-powered">Powered by Tenexity</div>
    </div>
  </footer>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  });
}
