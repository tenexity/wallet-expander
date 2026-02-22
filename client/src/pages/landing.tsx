import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { SubscriptionPlan } from "@shared/schema";
import walletExpanderLogo from "@assets/WalletExpander_logo_1769615587162.png";
import heroConstructionWide from "@assets/hero-construction-wide.png";
import {
  TrendingUp,
  Target,
  Users,
  BarChart3,
  Zap,
  Shield,
  CheckCircle,
  ArrowRight,
  Play,
  DollarSign,
  PieChart,
  FileText,
  Mail,
  Building2,
  ChevronRight,
  Check,
  UserCheck,
  ClipboardList,
  Loader2,
  Crown,
  GraduationCap,
  Trophy,
  Sparkles,
} from "lucide-react";

import {
  MockupDashboard,
  MockupEnrollment,
  MockupGapAnalysis,
  MockupICPBuilder,
  MockupRevenue,
  MockupPlaybooks,
  MockupGraduationSuccess,
  MockupDailyBriefing,
  MockupAskAnything,
  MockupEmailIntelligence,
  MockupCRMIntelligence,
} from "@/components/feature-mockups";

import Tenexity_Official_Logo_BW_Cirlce from "@assets/Tenexity Official Logo BW Cirlce.png";

const showcaseFeatures = [
  {
    id: "enrollment",
    badge: "Smart Account Discovery",
    title: "Find Your Highest-Potential Accounts Instantly",
    description: "Our AI analyzes your entire customer base to surface the accounts with the greatest growth potential. Stop guessing which customers deserve more attention, let data reveal your hidden revenue goldmines so your team can focus where it matters most.",
    MockupComponent: MockupEnrollment,
    benefits: [
      "AI identifies accounts with the biggest wallet share opportunity",
      "Prioritize based on growth potential, not just current spend",
      "Focus your best reps on the accounts most likely to grow",
      "Turn data into a strategic advantage for account selection",
    ],
  },
  {
    id: "dashboard",
    badge: "Growth Pipeline",
    title: "Every Enrolled Account Gets a Customized Growth Plan",
    description: "When you enroll an account, you're making a commitment, and so are we. Each enrolled account receives a personalized action plan designed to grow their wallet share. Track progress, celebrate wins, and watch your accounts graduate to higher revenue tiers.",
    MockupComponent: MockupDashboard,
    benefits: [
      "Personalized growth roadmap for every enrolled account",
      "Clear milestones and graduation targets",
      "Real-time progress tracking from enrollment to graduation",
      "Structured follow-up drives consistent results",
    ],
  },
  {
    id: "daily-briefing",
    badge: "Agentic Daily Briefing",
    title: "Your AI Rep Starts Every Day With a Plan",
    description: "Every weekday morning, each territory manager receives a personalized briefing generated overnight by your AI agent. It surfaces which enrolled accounts need attention today, what buying signals were detected in recent emails, and which accounts are quietly trending at-risk — before it becomes a problem.",
    MockupComponent: MockupDailyBriefing,
    benefits: [
      "Personalized morning email to every rep, zero effort required",
      "AI prioritizes the 2-3 accounts that need action today",
      "Buying signals and competitor mentions surface automatically",
      "At-risk accounts flagged before they churn, not after",
    ],
  },
  {
    id: "gap-analysis",
    badge: "Revenue Opportunity Mapping",
    title: "See Exactly Where Each Account Can Grow",
    description: "AI maps every enrolled account's purchases against their full potential. Instantly visualize which product categories are under-penetrated and quantify the exact dollar opportunity in each gap, so your team knows precisely where to focus conversations.",
    MockupComponent: MockupGapAnalysis,
    benefits: [
      "Visualize untapped potential in every account",
      "Quantified dollar amounts for each growth opportunity",
      "Category-level insights power targeted conversations",
      "AI prioritizes the highest-value gaps to pursue first",
    ],
  },
  {
    id: "ask-anything",
    badge: "Ask Anything Intelligence",
    title: "Ask Your Portfolio Any Question, Get an Answer in Seconds",
    description: "No more waiting for weekly reports or digging through spreadsheets. Type any question — \"Which accounts haven't ordered in 90 days?\" or \"Who is my highest-risk account this week?\" — and your AI agent answers instantly by analyzing your entire account portfolio in real time.",
    MockupComponent: MockupAskAnything,
    benefits: [
      "Natural language Q&A across your entire account portfolio",
      "Ask about individual accounts, segments, or the full program",
      "Answers streamed in real time, no waiting for reports",
      "Every query logged for pattern analysis and team learning",
    ],
  },
  {
    id: "icp-builder",
    badge: "Success Pattern Recognition",
    title: "Learn from Your Best to Grow the Rest",
    description: "AI studies your top-performing accounts to understand what success looks like in each segment. These patterns become the benchmark for growth, showing exactly how to guide underperforming accounts toward their full potential.",
    MockupComponent: MockupICPBuilder,
    benefits: [
      "AI discovers what your best customers have in common",
      "Segment-specific success patterns you can replicate",
      "Data-driven targets based on real customer behavior",
      "Continuous learning as your customer base evolves",
    ],
  },
  {
    id: "revenue",
    badge: "Growth Results Tracking",
    title: "Measure the Revenue Impact of Every Relationship",
    description: "Track incremental revenue growth from enrollment through graduation. See exactly how much each account has grown, celebrate Territory Manager wins, and prove the ROI of relationship-driven selling with transparent, real-time reporting.",
    MockupComponent: MockupRevenue,
    benefits: [
      "Track revenue lift from day one of enrollment",
      "Celebrate milestones as accounts hit growth targets",
      "Attribute results directly to relationship actions",
      "Executive dashboards prove program ROI instantly",
    ],
  },
  {
    id: "playbooks",
    badge: "AI-Powered Action Plans",
    title: "Customized Playbooks That Empower Your Sales Team",
    description: "AI generates personalized action plans for each enrolled account, complete with talking points, call scripts, and email templates tailored to their specific opportunities. Your team brings the relationship expertise; AI provides the perfect preparation.",
    MockupComponent: MockupPlaybooks,
    benefits: [
      "Personalized scripts address each account's unique gaps",
      "AI prepares your team for high-impact conversations",
      "Human relationships enhanced by intelligent insights",
      "Every touchpoint drives toward measurable growth",
    ],
  },
  {
    id: "email-intelligence",
    badge: "Email Intelligence",
    title: "Every Email Your Team Sends Makes the AI Smarter",
    description: "When your rep logs a customer email, your AI agent reads it in seconds: extracting sentiment, identifying competitor mentions, detecting buying signals, and updating the account's risk profile. The next time that account appears in a briefing or playbook, the AI already knows what happened — and what to say next.",
    MockupComponent: MockupEmailIntelligence,
    benefits: [
      "AI reads every logged email for sentiment and buying signals",
      "Competitor mentions auto-flagged and tracked over time",
      "At-risk alerts fired to the rep when urgency is detected",
      "Each interaction makes playbooks more personalized",
    ],
  },
  {
    id: "crm-intelligence",
    badge: "Agentic CRM Intelligence",
    title: "Your CRM Fills Itself While Your Team Sells",
    description: "This is the breakthrough. While your reps focus on relationships, AI agents work behind the scenes — extracting contacts from email signatures, detecting order signals from conversations, and flagging competitive threats the moment they appear. Every email becomes actionable intelligence, automatically organized and ready for your team.",
    MockupComponent: MockupCRMIntelligence,
    featured: true,
    benefits: [
      "Competitor threats detected and escalated in real time with price gap analysis",
      "Order signals extracted from emails with dollar values and urgency scoring",
      "Decision-maker contacts auto-discovered and linked to accounts",
      "Zero manual data entry — your CRM evolves with every conversation",
    ],
  },
];


const stats = [
  { value: "32%", label: "Avg. Wallet Share Increase*" },
  { value: "4.1x", label: "Typical ROI in First Year*" },
  { value: "94%", label: "Accounts Meet Growth Targets*" },
  { value: "Daily", label: "AI Briefings Sent to Every Rep" },
];

export default function Landing() {
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const { data: plans, isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription/plans"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ planSlug, cycle }: { planSlug: string; cycle: string }) => {
      const res = await apiRequest("POST", "/api/stripe/create-checkout-session", {
        planSlug,
        billingCycle: cycle,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Checkout Error",
        description: error.message || "Failed to start checkout. Please log in first.",
        variant: "destructive",
      });
    },
  });

  const handleSelectPlan = (planSlug: string) => {
    checkoutMutation.mutate({ planSlug, cycle: billingCycle });
  };

  useEffect(() => {
    document.title = "Wallet Share Expander - Grow Your Highest-Potential Accounts with AI-Enhanced Relationships";

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Find your highest-potential accounts and guarantee their growth with customized AI-powered playbooks. Enhance human relationships with intelligent insights that drive wallet share expansion.");
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = "Find your highest-potential accounts and guarantee their growth with customized AI-powered playbooks. Enhance human relationships with intelligent insights that drive wallet share expansion.";
      document.head.appendChild(meta);
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:title");
      meta.content = "Wallet Share Expander - Guaranteed Account Growth";
      document.head.appendChild(meta);
    }

    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogDescription) {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:description");
      meta.content = "Discover hidden revenue opportunities in your customer base. When you enroll an account, it's guaranteed to grow with customized AI playbooks that empower your sales team.";
      document.head.appendChild(meta);
    }

    const ogType = document.querySelector('meta[property="og:type"]');
    if (!ogType) {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:type");
      meta.content = "website";
      document.head.appendChild(meta);
    }

    return () => {
      document.title = "AI VP Dashboard";
    };
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2" data-testid="logo-brand">
            <img
              src={Tenexity_Official_Logo_BW_Cirlce}
              alt="Wallet Share Expander"
              className="h-10 w-auto"
            />
            <span className="text-xl font-bold">Wallet Share</span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => scrollToSection("features")}
              className="text-sm font-medium text-muted-foreground transition-colors"
              data-testid="nav-features"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="text-sm font-medium text-muted-foreground transition-colors"
              data-testid="nav-pricing"
            >
              Pricing
            </button>
            <a
              href="/api/login"
              className="text-sm font-medium text-muted-foreground transition-colors"
              data-testid="nav-signup"
            >
              Sign Up
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a href="/api/login">
              <Button variant="outline" size="sm" data-testid="button-login">
                Login
              </Button>
            </a>
            <a href="/api/login">
              <Button size="sm" data-testid="button-get-started">
                Get Started
              </Button>
            </a>
          </div>
        </div>
      </header>
      <section className="relative overflow-hidden min-h-[500px] md:min-h-[560px] lg:min-h-[620px]" data-testid="section-hero">
        <img
          src={heroConstructionWide}
          alt="Sales representative at a commercial construction site with strip mall and truck in background"
          className="absolute inset-0 w-full h-full object-cover object-[75%_center] md:object-[60%_center] lg:object-center"
          data-testid="img-hero-sales-rep"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 via-[55%] to-transparent dark:from-background dark:via-background/80 dark:via-[55%] dark:to-transparent md:via-background/90 md:via-[50%] lg:via-[45%]" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-background/10 dark:to-background/30" />

        <div className="relative z-10 container mx-auto px-4 py-12 md:py-16 lg:py-20 flex items-center min-h-[500px] md:min-h-[560px] lg:min-h-[620px]">
          <div className="max-w-[60%] sm:max-w-[55%] md:max-w-xl lg:max-w-2xl">
            <Badge variant="secondary" className="mb-6" data-testid="badge-hero">
              Agentic AI That Thinks, Plans, and Reminds
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 md:mb-6 leading-[1.1]" data-testid="text-hero-headline">
              Recover{" "}
              <span className="relative inline-block">
                <span className="relative z-10">Lost Revenue</span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 8C40 2 80 2 100 5C120 8 160 10 198 4" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.5" />
                  <path d="M2 10C50 3 90 3 110 6C130 9 170 8 198 6" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3" />
                </svg>
              </span>
              {" "}from Existing Customers
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-muted-foreground mb-6 md:mb-8 max-w-[95%] md:max-w-lg" data-testid="text-hero-description">
              Identify wallet share leakage and prioritize your highest-potential accounts.
              Let your AI agent monitor overnight, brief your reps each morning,
              and flag risk before you lose revenue.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4 mb-8 md:mb-10 max-w-[90%] sm:max-w-none">
              <Button
                size="lg"
                onClick={() => scrollToSection("pricing")}
                data-testid="button-hero-demo"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="bg-background/60 backdrop-blur-sm"
                onClick={() => scrollToSection("features")}
                data-testid="button-hero-learn"
              >
                <Play className="mr-2 h-4 w-4 fill-current" />
                See How It Works
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pt-6 border-t border-border/50">
              {stats.map((stat, index) => (
                <div key={index} data-testid={`stat-${index}`}>
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-1" data-testid={`stat-value-${index}`}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground" data-testid={`stat-label-${index}`}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/60 mt-4" data-testid="text-stats-disclaimer">
              *Results based on enrolled accounts following recommended engagement practices
            </p>
          </div>
        </div>
      </section>
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="text-center p-6" data-testid="card-step-analyze">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Discover</h3>
              <p className="text-sm text-muted-foreground">
                AI surfaces your highest-potential accounts with hidden wallet share opportunity
              </p>
            </Card>
            <Card className="text-center p-6" data-testid="card-step-prioritize">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <UserCheck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Enroll</h3>
              <p className="text-sm text-muted-foreground">
                Commit accounts to growth with personalized playbooks and action plans
              </p>
            </Card>
            <Card className="text-center p-6 border-primary/30 bg-primary/5" data-testid="card-step-monitor">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Agent Monitors</h3>
              <p className="text-sm text-muted-foreground">
                Your AI runs overnight reviews, sends morning briefings, and surfaces risk — automatically
              </p>
            </Card>
            <Card className="text-center p-6" data-testid="card-step-execute">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Graduate</h3>
              <p className="text-sm text-muted-foreground">
                Watch accounts grow and hit revenue targets with structured support
              </p>
            </Card>
          </div>
        </div>
      </section>
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4" data-testid="badge-features">
              How It Works
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-features-title">
              A Proven System for Account Growth
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Discover your highest-potential accounts, enroll them with customized growth plans, and empower your team with
              AI-generated action playbooks. Human relationships drive the results, AI ensures nothing falls through the cracks.
            </p>
          </div>

          <div className="space-y-24">
            {showcaseFeatures.map((feature, index) => {
              const isEven = index % 2 === 0;
              const isFeatured = 'featured' in feature && feature.featured;
              return (
                <div key={feature.id}>
                  {isFeatured && (
                    <div className="text-center mb-12" data-testid="crm-intelligence-header">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-600/10 via-primary/10 to-red-600/10 dark:from-red-500/15 dark:via-primary/15 dark:to-red-500/15 border border-red-500/20 dark:border-red-400/20 mb-4">
                        <Sparkles className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-sm font-semibold text-red-700 dark:text-red-300">The Competitive Edge That Changes Everything</span>
                        <Sparkles className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </div>
                    </div>
                  )}
                  <div
                    className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 lg:gap-16 items-center ${isFeatured ? 'relative rounded-2xl p-8 lg:p-12 border-2 border-red-500/20 dark:border-red-400/20 bg-gradient-to-br from-red-50/50 via-background to-primary/5 dark:from-red-950/20 dark:via-background dark:to-primary/10' : ''}`}
                    data-testid={`feature-showcase-${feature.id}`}
                  >
                    {isFeatured && (
                      <div className="absolute -top-px left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-red-600 via-primary to-red-600" />
                    )}
                    <div className="w-full lg:w-1/2">
                      <div className="relative group" data-testid={`mockup-${feature.id}`}>
                        <div className={`absolute -inset-1 rounded-lg blur-sm opacity-75 group-hover:opacity-100 transition duration-300 ${isFeatured ? 'bg-gradient-to-r from-red-500/30 via-primary/20 to-red-500/30' : 'bg-gradient-to-r from-primary/20 to-primary/5'}`} />
                        <div className={`relative rounded-lg overflow-hidden shadow-xl border ${isFeatured ? 'border-red-500/30 dark:border-red-400/30 shadow-red-500/10' : 'border-border/50'}`}>
                          <feature.MockupComponent />
                        </div>
                      </div>
                    </div>

                    <div className="w-full lg:w-1/2 space-y-6">
                      <Badge
                        variant={isFeatured ? "default" : "outline"}
                        className={`text-xs font-medium ${isFeatured ? 'bg-red-600 dark:bg-red-700 text-white border-red-600 dark:border-red-700' : ''}`}
                        data-testid={`badge-${feature.id}`}
                      >
                        {feature.badge}
                      </Badge>
                      <h3 className="text-2xl md:text-3xl font-bold leading-tight" data-testid={`title-${feature.id}`}>
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground text-lg leading-relaxed" data-testid={`description-${feature.id}`}>
                        {feature.description}
                      </p>
                      <ul className="space-y-3">
                        {feature.benefits.map((benefit, benefitIndex) => (
                          <li
                            key={benefitIndex}
                            className="flex items-start gap-3"
                            data-testid={`benefit-${feature.id}-${benefitIndex}`}
                          >
                            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${isFeatured ? 'bg-red-600/10 dark:bg-red-500/20' : 'bg-primary/10'}`}>
                              <Check className={`w-3 h-3 ${isFeatured ? 'text-red-600 dark:text-red-400' : 'text-primary'}`} />
                            </div>
                            <span className="text-sm text-muted-foreground">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <section id="growth-guarantee" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4" data-testid="badge-guarantee">
                The Growth Guarantee
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-guarantee-title">
                Enrolled Accounts Are <span className="text-primary">Guaranteed to Grow</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">When you enroll an account, you're not hoping for results, you're activating a proven system designed to drive additional revenue through AI-powered personalization and human relationships.</p>
            </div>

            <div className="grid md:grid-cols-4 gap-6 mb-12">
              <Card className="p-6 text-center relative" data-testid="card-guarantee-step-1">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                  1
                </div>
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">AI Finds Potential</h4>
                <p className="text-sm text-muted-foreground">
                  Surface accounts with the highest wallet share growth opportunity
                </p>
              </Card>

              <Card className="p-6 text-center relative" data-testid="card-guarantee-step-2">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                  2
                </div>
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <UserCheck className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">You Enroll</h4>
                <p className="text-sm text-muted-foreground">
                  Commit to growing the account with a customized action plan
                </p>
              </Card>

              <Card className="p-6 text-center relative" data-testid="card-guarantee-step-3">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                  3
                </div>
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <ClipboardList className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">AI Personalizes</h4>
                <p className="text-sm text-muted-foreground">
                  Custom playbook with scripts and actions tailored to their gaps
                </p>
              </Card>

              <Card className="p-6 text-center relative" data-testid="card-guarantee-step-4">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                  4
                </div>
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Revenue Grows</h4>
                <p className="text-sm text-muted-foreground">
                  Track incremental revenue as the account hits growth milestones
                </p>
              </Card>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="p-6 border-primary/20 bg-primary/5" data-testid="card-guarantee-stat-1">
                <div className="text-3xl font-bold text-primary mb-2">94%</div>
                <div className="font-semibold mb-1">Graduation Rate</div>
                <p className="text-sm text-muted-foreground">
                  Of enrolled accounts achieve their revenue growth targets
                </p>
              </Card>
              <Card className="p-6 border-primary/20 bg-primary/5" data-testid="card-guarantee-stat-2">
                <div className="text-3xl font-bold text-primary mb-2">32%</div>
                <div className="font-semibold mb-1">Average Growth</div>
                <p className="text-sm text-muted-foreground">
                  Wallet share increase for enrolled accounts
                </p>
              </Card>
              <Card className="p-6 border-primary/20 bg-primary/5" data-testid="card-guarantee-stat-3">
                <div className="text-3xl font-bold text-primary mb-2">90 Days</div>
                <div className="font-semibold mb-1">Time to Results</div>
                <p className="text-sm text-muted-foreground">
                  Average time for enrolled accounts to show measurable growth
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>
      {/* Graduation Visibility Section */}
      <section id="graduation-visibility" className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4" data-testid="badge-graduation-visibility">
                Measure What Matters
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-graduation-visibility-title">
                Complete Visibility Into <span className="text-primary">Wallet Share Capture</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Graduated accounts provide a clear picture of your wallet share expansion success.
                Track every account from enrollment to graduation and see exactly how much value you've captured.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <Card className="p-6" data-testid="card-visibility-tracking">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2">Enrollment to Graduation Tracking</h4>
                    <p className="text-muted-foreground mb-4">
                      Track the complete journey of every enrolled account. See revenue at enrollment,
                      growth milestones hit, and final revenue at graduation.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-primary" />
                        Baseline revenue vs. graduation revenue delta
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-primary" />
                        Days from enrollment to graduation
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-primary" />
                        ICP category success rate
                      </li>
                    </ul>
                  </div>
                </div>
              </Card>

              <Card className="p-6" data-testid="card-visibility-profitability">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-chart-1/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-chart-1" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2">Profitability from Existing Accounts</h4>
                    <p className="text-muted-foreground mb-4">See how much additional revenue you're generating from accounts you already have. No customer acquisition cost, pure wallet share expansion.</p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-primary" />
                        Cumulative revenue growth across all graduates
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-primary" />
                        Average revenue lift per account
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-primary" />
                        Category penetration improvements
                      </li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6 border-chart-2/30 bg-chart-2/5" data-testid="card-visibility-alumni">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-chart-2/20 flex items-center justify-center flex-shrink-0">
                  <Trophy className="h-8 w-8 text-chart-2" />
                </div>
                <div className="text-center md:text-left flex-1">
                  <h4 className="text-xl font-semibold mb-2 text-chart-2">Alumni Section: Your Success Scoreboard</h4>
                  <p className="text-muted-foreground">Every graduated account moves to your Alumni section, a permanent record of success. See which accounts you've grown, how much revenue you captured, and what categories you successfully expanded into. It's proof that your wallet share expansion strategy works.</p>
                </div>
                <div className="text-center md:text-right flex-shrink-0">
                  <div className="text-4xl font-bold text-chart-2">100%</div>
                  <div className="text-sm text-muted-foreground">Visibility</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>
      {/* Agent Loop Overnight Section */}
      <section id="agent-loop" className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4" data-testid="badge-agent-loop">
                Autonomous Agent Loop
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-agent-loop-title">
                Your AI Never Sleeps —{" "}
                <span className="text-primary">Even When Your Team Does</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Six automated jobs run on a schedule so your team always comes in prepared,
                and nothing ever falls through the cracks.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-10">
              {[
                {
                  time: "Weekdays 7:00am",
                  job: "Daily Briefing",
                  description: "Personalized morning email to each rep with today's priority accounts and overnight signals",
                  icon: Mail,
                  color: "text-blue-500",
                  bg: "bg-blue-500/10",
                },
                {
                  time: "Mondays 6:00am",
                  job: "Weekly Account Review",
                  description: "Auto-assesses graduation readiness and risk level for every enrolled account",
                  icon: BarChart3,
                  color: "text-primary",
                  bg: "bg-primary/10",
                },
                {
                  time: "Sundays 2:00am",
                  job: "Similarity Refresh",
                  description: "Finds accounts similar to your top graduates so reps can enroll look-alikes",
                  icon: Users,
                  color: "text-violet-500",
                  bg: "bg-violet-500/10",
                },
                {
                  time: "1st of Month 3:00am",
                  job: "Learning Synthesis",
                  description: "Reads 90 days of playbook outcomes and distills new cross-account patterns",
                  icon: Sparkles,
                  color: "text-amber-500",
                  bg: "bg-amber-500/10",
                },
                {
                  time: "Every 4 Hours",
                  job: "CRM Sync",
                  description: "Pushes enrollment, graduation, and at-risk events to your CRM automatically",
                  icon: Shield,
                  color: "text-green-500",
                  bg: "bg-green-500/10",
                },
                {
                  time: "Real-time",
                  job: "Email Intelligence",
                  description: "Analyzes every logged email for signals, sentiment, and competitor mentions",
                  icon: Zap,
                  color: "text-orange-500",
                  bg: "bg-orange-500/10",
                },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <Card key={i} className="p-5" data-testid={`card-agent-loop-${i}`}>
                    <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center mb-3`}>
                      <Icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">{item.time}</div>
                    <h4 className="font-semibold text-sm mb-2">{item.job}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  </Card>
                );
              })}
            </div>

            <div className="text-center">
              <Button size="lg" onClick={() => scrollToSection("pricing")} data-testid="button-agent-loop-cta">
                See It In Action
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
      {/* Graduation Success Proof Section */}
      <section id="graduation-proof" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4" data-testid="badge-proof">
                See the Results
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-proof-title">
                Enroll, Work with AI, <span className="text-primary">Graduate to Huge Returns</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                This is what success looks like. Every enrolled account has a clear path from enrollment to graduation,
                with full visibility into baseline revenue, growth achieved, and ICP category success.
              </p>
            </div>

            {/* Workflow Steps */}
            <div className="grid grid-cols-4 gap-4 mb-12">
              <div className="text-center" data-testid="workflow-step-enroll">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 relative">
                  <UserCheck className="h-6 w-6 text-primary" />
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 hidden md:block">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <p className="font-semibold text-sm">1. Enroll Account</p>
                <p className="text-xs text-muted-foreground">Commit to growth</p>
              </div>
              <div className="text-center" data-testid="workflow-step-playbooks">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 relative">
                  <Zap className="h-6 w-6 text-primary" />
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 hidden md:block">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <p className="font-semibold text-sm">2. AI Playbooks</p>
                <p className="text-xs text-muted-foreground">Personalized actions</p>
              </div>
              <div className="text-center" data-testid="workflow-step-graduate">
                <div className="mx-auto w-12 h-12 rounded-full bg-chart-2/10 flex items-center justify-center mb-3 relative">
                  <GraduationCap className="h-6 w-6 text-chart-2" />
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 hidden md:block">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <p className="font-semibold text-sm">3. Graduate</p>
                <p className="text-xs text-muted-foreground">Hit revenue targets</p>
              </div>
              <div className="text-center" data-testid="workflow-step-returns">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="font-semibold text-sm">4. Capture Returns</p>
                <p className="text-xs text-muted-foreground">Measurable growth</p>
              </div>
            </div>

            {/* Graduation Success Mockup */}
            <div className="relative group" data-testid="mockup-graduation-success">
              <div className="absolute -inset-2 bg-gradient-to-r from-chart-2/20 via-primary/10 to-green-500/20 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition duration-300" />
              <div className="relative rounded-xl overflow-hidden shadow-2xl border border-border/50">
                <MockupGraduationSuccess />
              </div>
            </div>

            <div className="mt-10 text-center">
              <p className="text-muted-foreground mb-6">
                Every graduated account tells a story: where they started, how they grew, and the value you captured.
                <br className="hidden md:block" />
                No guesswork, no assumptions, just measurable wallet share expansion.
              </p>
              <Button size="lg" onClick={() => scrollToSection("pricing")} data-testid="button-proof-cta">
                Start Growing Wallet Share
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4" data-testid="badge-pricing">
                Simple Pricing
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-pricing-title">
                Choose the Plan That Fits Your Needs
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Start with a free trial. Upgrade anytime to unlock more features and grow wallet share at scale.
              </p>

              <div className="inline-flex items-center gap-2 p-1 rounded-lg bg-muted" data-testid="billing-toggle">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${billingCycle === "monthly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                    }`}
                  data-testid="button-monthly-billing"
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle("yearly")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${billingCycle === "yearly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                    }`}
                  data-testid="button-yearly-billing"
                >
                  Yearly
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Save 20%
                  </Badge>
                </button>
              </div>
            </div>

            {plansLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : plans && plans.length > 0 ? (
              <div className="grid md:grid-cols-4 gap-6">
                {plans.map((plan) => {
                  const priceRaw = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
                  const price = parseFloat(priceRaw || "0");
                  const isPopular = plan.slug === "scale";
                  const isEnterprise = plan.slug === "enterprise";
                  const isFree = plan.slug === "starter";
                  const features = Array.isArray(plan.features) ? plan.features : [];
                  const planDescriptions: Record<string, string> = {
                    starter: "Try it free with one account",
                    growth: "For focused account development",
                    scale: "For growing sales teams",
                    enterprise: "Full service solution",
                  };

                  return (
                    <Card
                      key={plan.slug}
                      className={`relative p-6 flex flex-col ${isPopular ? "border-primary shadow-lg" : ""
                        }`}
                      data-testid={`card-plan-${plan.slug}`}
                    >
                      {isPopular && (
                        <Badge
                          className="absolute -top-3 left-1/2 -translate-x-1/2"
                          data-testid="badge-popular"
                        >
                          <Crown className="w-3 h-3 mr-1" />
                          Most Popular
                        </Badge>
                      )}

                      <div className="text-center mb-6">
                        <h3 className="text-xl font-bold mb-2" data-testid={`text-plan-name-${plan.slug}`}>
                          {plan.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4" data-testid={`text-plan-desc-${plan.slug}`}>
                          {planDescriptions[plan.slug] || "Flexible plan for your needs"}
                        </p>
                        <div className="flex items-baseline justify-center gap-1">
                          {isEnterprise ? (
                            <span className="text-4xl font-bold" data-testid={`text-plan-price-${plan.slug}`}>
                              Custom
                            </span>
                          ) : isFree ? (
                            <span className="text-4xl font-bold" data-testid={`text-plan-price-${plan.slug}`}>
                              Free
                            </span>
                          ) : (
                            <>
                              <span className="text-4xl font-bold" data-testid={`text-plan-price-${plan.slug}`}>
                                ${billingCycle === "yearly" ? Math.round(price / 12) : Math.round(price)}
                              </span>
                              <span className="text-muted-foreground">/mo</span>
                              {billingCycle === "yearly" && (
                                <span className="block text-sm text-muted-foreground mt-1">(billed yearly)</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <ul className="space-y-3 flex-1 mb-6">
                        {features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>{String(feature)}</span>
                          </li>
                        ))}
                      </ul>

                      {isEnterprise ? (
                        <a href="mailto:sales@tenexity.com?subject=Enterprise%20Plan%20Inquiry">
                          <Button
                            className="w-full"
                            variant="outline"
                            data-testid={`button-select-plan-${plan.slug}`}
                          >
                            Contact Sales
                          </Button>
                        </a>
                      ) : (
                        <Button
                          className="w-full"
                          variant={isPopular ? "default" : "outline"}
                          onClick={() => handleSelectPlan(plan.slug)}
                          disabled={checkoutMutation.isPending}
                          data-testid={`button-select-plan-${plan.slug}`}
                        >
                          {checkoutMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Loading...
                            </>
                          ) : isFree ? (
                            <>Get Started Free</>
                          ) : (
                            <>Get Started</>
                          )}
                        </Button>
                      )}
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="grid md:grid-cols-4 gap-6">
                <Card className="p-6" data-testid="card-plan-starter">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-2">Starter</h3>
                    <p className="text-sm text-muted-foreground mb-4">Try it free with one account</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">Free</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>1 enrolled account</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>1 AI-powered playbook</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>1 ICP profile</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Upload unlimited accounts</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Full gap analysis</span>
                    </li>
                  </ul>
                  <a href="/api/login">
                    <Button variant="outline" className="w-full" data-testid="button-select-plan-starter-fallback">
                      Get Started Free
                    </Button>
                  </a>
                </Card>

                <Card className="p-6" data-testid="card-plan-growth">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-2">Growth</h3>
                    <p className="text-sm text-muted-foreground mb-4">For focused account development</p>
                    <div className="text-center">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold">${billingCycle === "yearly" ? 240 : 300}</span>
                        <span className="text-muted-foreground">/mo</span>
                      </div>
                      {billingCycle === "yearly" && (
                        <span className="block text-sm text-muted-foreground mt-1">(billed yearly)</span>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>5 enrolled accounts</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Unlimited AI playbooks</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>3 ICP profiles</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Upload unlimited accounts</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Full gap analysis</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Email support</span>
                    </li>
                  </ul>
                  <a href="/api/login">
                    <Button variant="outline" className="w-full" data-testid="button-select-plan-growth-fallback">
                      Get Started
                    </Button>
                  </a>
                </Card>

                <Card className="p-6 border-primary shadow-lg relative" data-testid="card-plan-scale">
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Crown className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-2">Scale</h3>
                    <p className="text-sm text-muted-foreground mb-4">For growing sales teams</p>
                    <div className="text-center">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold">${billingCycle === "yearly" ? 600 : 750}</span>
                        <span className="text-muted-foreground">/mo</span>
                      </div>
                      {billingCycle === "yearly" && (
                        <span className="block text-sm text-muted-foreground mt-1">(billed yearly)</span>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>15 enrolled accounts</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Unlimited AI playbooks</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Unlimited ICP profiles</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Upload unlimited accounts</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Full gap analysis</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>AI-powered playbooks</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Priority support</span>
                    </li>
                  </ul>
                  <a href="/api/login">
                    <Button className="w-full" data-testid="button-select-plan-scale-fallback">
                      Get Started
                    </Button>
                  </a>
                </Card>

                <Card className="p-6" data-testid="card-plan-enterprise">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-2">Enterprise</h3>
                    <p className="text-sm text-muted-foreground mb-4">Full service solution</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">Custom</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Unlimited enrolled accounts</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Weekly account review calls</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Fractional VP of Sales services</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Custom AI training for your team</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Dedicated support</span>
                    </li>
                  </ul>
                  <a href="mailto:sales@tenexity.com?subject=Enterprise%20Plan%20Inquiry">
                    <Button variant="outline" className="w-full" data-testid="button-select-plan-enterprise-fallback">
                      Contact Sales
                    </Button>
                  </a>
                </Card>
              </div>
            )}

            <p className="text-center text-sm text-muted-foreground mt-8" data-testid="text-trial-info">
              Start free with one account. No credit card required. Upgrade anytime as you grow.
            </p>

            <div className="mt-12 max-w-3xl mx-auto">
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2" data-testid="text-graduation-title">
                      Graduate Accounts, Control Your Costs
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed" data-testid="text-graduation-description">
                      You're always in control of your subscription. When an enrolled account reaches your target revenue
                      level or hits its ICP potential, simply graduate it from the program. This frees up a slot for a
                      new account to enroll, letting you continuously work on your highest-potential opportunities without
                      increasing costs. We track every graduated account so you can see your total success: how many
                      accounts have grown, the revenue increase from enrollment to graduation, and the cumulative value
                      you've captured. It's a built-in scoreboard for your wallet share expansion efforts.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <Badge variant="secondary" className="mb-4" data-testid="badge-why-us">
                  Why Choose Us
                </Badge>
                <h2 className="text-3xl font-bold mb-4" data-testid="text-why-title">
                  AI That Enhances, Not Replaces, Human Relationships
                </h2>
                <p className="text-muted-foreground mb-6">Your sales team builds relationships. We give them the insights, preparation, and confidence to make every conversation count. AI does the analysis, your people close the deals.</p>

                <ul className="space-y-4">
                  <li className="flex items-start gap-3" data-testid="benefit-security">
                    <Users className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium">Relationship-First Approach</h4>
                      <p className="text-sm text-muted-foreground">
                        AI prepares your team—humans build the trust that closes deals
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3" data-testid="benefit-implementation">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium">Proven Growth System</h4>
                      <p className="text-sm text-muted-foreground">
                        Every enrolled account receives a customized plan designed to drive results
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3" data-testid="benefit-support">
                    <Shield className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium">Enterprise Security</h4>
                      <p className="text-sm text-muted-foreground">
                        SOC 2 compliant with dedicated customer success support
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <Card className="p-8 bg-primary/5 border-primary/20" data-testid="card-testimonial">
                <blockquote className="text-lg italic mb-4" data-testid="text-testimonial-quote">
                  "We enrolled 50 accounts in the first month and every single one
                  has grown. The AI playbooks give our reps exactly what they need to
                  have confident, value-driven conversations. It's like giving each
                  rep a personal sales strategist."
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium" data-testid="text-testimonial-author">Sarah Johnson</div>
                    <div className="text-sm text-muted-foreground" data-testid="text-testimonial-role">
                      VP of Sales, Industrial Supply Co.
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>
      <section id="signup" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto">
            <Card className="p-8" data-testid="card-signup">
              <div className="text-center">
                <Badge variant="secondary" className="mb-4" data-testid="badge-signup">
                  Start Growing Today
                </Badge>
                <h2 className="text-2xl font-bold mb-2" data-testid="text-signup-title">
                  Discover Your Highest-Potential Accounts
                </h2>
                <p className="text-muted-foreground mb-6">
                  See which accounts have the biggest growth opportunity.
                  Start enrolling and watch them grow with proven playbook strategies.
                </p>

                <div className="space-y-4">
                  <a href="/api/login">
                    <Button size="lg" className="w-full" data-testid="button-signup-login">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Create Free Account
                    </Button>
                  </a>

                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <a
                      href="/api/login"
                      className="text-primary font-medium"
                      data-testid="link-login"
                    >
                      Log in
                    </a>
                  </p>

                  <div className="flex items-center justify-center gap-6 pt-4 border-t text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      <span>14-day free trial</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      <span>No credit card</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Cancel anytime</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2" data-testid="footer-logo">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <TrendingUp className="h-4 w-4" />
              </div>
              <span className="font-semibold">Wallet Share Expander</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="transition-colors" data-testid="link-privacy">
                Privacy Policy
              </a>
              <a href="#" className="transition-colors" data-testid="link-terms">
                Terms of Service
              </a>
              <a href="#" className="transition-colors" data-testid="link-contact">
                Contact
              </a>
            </div>

            <div className="text-sm text-muted-foreground" data-testid="text-powered-by">
              Powered by Tenexity
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
