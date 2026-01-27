import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { SubscriptionPlan } from "@shared/schema";
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
} from "lucide-react";

import screenshotDashboard from "@/assets/images/screenshot-dashboard.png";
import screenshotEnrollment from "@/assets/images/screenshot-enrollment.png";
import screenshotGapAnalysis from "@/assets/images/screenshot-gap-analysis.png";
import screenshotIcpBuilder from "@/assets/images/screenshot-icp-builder.png";
import screenshotRevenue from "@/assets/images/screenshot-revenue.png";
import screenshotPlaybooks from "@/assets/images/screenshot-playbooks.png";

const showcaseFeatures = [
  {
    id: "enrollment",
    badge: "Controlled Enrollment",
    title: "Target the Right Accounts for Predictable Results",
    description: "Take control of your revenue recovery by strategically selecting and enrolling high-potential accounts. Our scoring system identifies which accounts have the greatest opportunity, so your team focuses efforts where they'll have the biggest impact.",
    image: screenshotEnrollment,
    imageAlt: "Account enrollment selection interface showing opportunity scores",
    benefits: [
      "Score accounts by opportunity size and close potential",
      "Enroll accounts strategically based on capacity",
      "Create a predictable pipeline of target accounts",
      "Avoid overwhelming your team with unfocused outreach",
    ],
  },
  {
    id: "dashboard",
    badge: "Pipeline Visibility",
    title: "Track Every Enrolled Account's Progress",
    description: "Your dashboard shows exactly where each enrolled account stands in the revenue recovery journey. Monitor progress, identify accounts that need attention, and celebrate wins as accounts hit their targets and graduate.",
    image: screenshotDashboard,
    imageAlt: "Dashboard showing enrolled accounts pipeline with progress indicators",
    benefits: [
      "Real-time visibility into all enrolled accounts",
      "Progress indicators show journey to graduation",
      "Quick identification of accounts needing attention",
      "Celebrate wins as accounts graduate successfully",
    ],
  },
  {
    id: "gap-analysis",
    badge: "AI-Powered Insights",
    title: "Pinpoint Exactly Where You're Leaving Money on the Table",
    description: "Our AI compares each account's purchasing patterns against their segment's Ideal Customer Profile. Instantly see which product categories are underperforming and quantify the revenue opportunity in each gap.",
    image: screenshotGapAnalysis,
    imageAlt: "Gap analysis showing category penetration compared to benchmarks",
    benefits: [
      "Visual comparison against segment benchmarks",
      "Category-by-category gap identification",
      "Quantified revenue opportunity per gap",
      "Prioritized recommendations for where to focus",
    ],
  },
  {
    id: "icp-builder",
    badge: "Segment Intelligence",
    title: "Know What Great Looks Like for Each Segment",
    description: "Build and refine Ideal Customer Profiles based on AI analysis of your best-performing accounts. Understand what top accounts in each segment purchase, so you can guide others to the same success.",
    image: screenshotIcpBuilder,
    imageAlt: "ICP Builder showing segment profiles and purchase patterns",
    benefits: [
      "AI-generated profiles from your best accounts",
      "Segment-specific purchase patterns revealed",
      "Data-driven benchmarks for gap scoring",
      "Continuous refinement as you gather more data",
    ],
  },
  {
    id: "revenue",
    badge: "Results Tracking",
    title: "Measure Incremental Revenue from Every Enrolled Account",
    description: "Track the incremental revenue generated from each enrolled account from enrollment through graduation. Set clear goals, monitor progress, and prove ROI with transparent reporting that ties efforts to results.",
    image: screenshotRevenue,
    imageAlt: "Revenue tracking dashboard showing graduation progress",
    benefits: [
      "Baseline vs. current revenue comparison",
      "Graduation goals with progress tracking",
      "Clear attribution of incremental revenue",
      "ROI reporting for leadership visibility",
    ],
  },
  {
    id: "playbooks",
    badge: "Structured Follow-Up",
    title: "Methodical Outreach That Drives Consistent Results",
    description: "AI generates personalized playbooks for each enrolled account with specific tasks, call scripts, and email templates. Your team executes with precision, ensuring no opportunity falls through the cracks.",
    image: screenshotPlaybooks,
    imageAlt: "AI-generated playbook with tasks and scripts",
    benefits: [
      "AI-personalized scripts for each account's gaps",
      "Structured task sequences with due dates",
      "Email templates ready to customize and send",
      "Automatic task assignment to Territory Managers",
    ],
  },
];


const stats = [
  { value: "23%", label: "Average Revenue Increase" },
  { value: "47%", label: "Faster Account Analysis" },
  { value: "3.2x", label: "ROI in First Year" },
  { value: "89%", label: "Customer Retention" },
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
    document.title = "Wallet Share Expander - Recover Lost Revenue from Existing Customers";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "AI-powered sales intelligence tool that identifies wallet share leakage, prioritizes opportunities, and generates actionable playbooks to recover lost revenue from existing customers.");
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = "AI-powered sales intelligence tool that identifies wallet share leakage, prioritizes opportunities, and generates actionable playbooks to recover lost revenue from existing customers.";
      document.head.appendChild(meta);
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:title");
      meta.content = "Wallet Share Expander - AI-Powered Sales Intelligence";
      document.head.appendChild(meta);
    }

    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogDescription) {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:description");
      meta.content = "Identify wallet share leakage and recover lost revenue from existing customers with AI-powered analysis and actionable sales playbooks.";
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
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">Wallet Share Expander</span>
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

      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6" data-testid="badge-hero">
              AI-Powered Sales Intelligence
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6" data-testid="text-hero-headline">
              Recover Lost Revenue from{" "}
              <span className="text-primary">Existing Customers</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto" data-testid="text-hero-description">
              Identify wallet share leakage, prioritize high-value opportunities,
              and generate actionable sales playbooks with AI-powered analysis.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button
                size="lg"
                onClick={() => scrollToSection("pricing")}
                data-testid="button-hero-demo"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => scrollToSection("features")}
                data-testid="button-hero-learn"
              >
                <Play className="mr-2 h-4 w-4" />
                See How It Works
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t">
              {stats.map((stat, index) => (
                <div key={index} className="text-center" data-testid={`stat-${index}`}>
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-1" data-testid={`stat-value-${index}`}>
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground" data-testid={`stat-label-${index}`}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-6" data-testid="card-step-analyze">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <PieChart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Analyze</h3>
              <p className="text-sm text-muted-foreground">
                AI analyzes purchasing patterns against segment ICPs to find gaps
              </p>
            </Card>
            <Card className="text-center p-6" data-testid="card-step-prioritize">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Prioritize</h3>
              <p className="text-sm text-muted-foreground">
                Score and rank accounts by opportunity size and close potential
              </p>
            </Card>
            <Card className="text-center p-6" data-testid="card-step-execute">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Execute</h3>
              <p className="text-sm text-muted-foreground">
                Generate playbooks and track revenue recovery progress
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4" data-testid="badge-features">
              Platform Features
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-features-title">
              A Complete System for Predictable Revenue Recovery
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Control your pipeline with strategic account enrollment. Track every enrolled account from targeting through graduation. 
              Drive consistent results with methodical, AI-powered follow-up.
            </p>
          </div>

          <div className="space-y-24">
            {showcaseFeatures.map((feature, index) => {
              const isEven = index % 2 === 0;
              return (
                <div
                  key={feature.id}
                  className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 lg:gap-16 items-center`}
                  data-testid={`feature-showcase-${feature.id}`}
                >
                  <div className="w-full lg:w-1/2">
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/5 rounded-lg blur-sm opacity-75 group-hover:opacity-100 transition duration-300" />
                      <div className="relative rounded-lg overflow-hidden shadow-xl border border-border/50 bg-card">
                        <img
                          src={feature.image}
                          alt={feature.imageAlt}
                          className="w-full h-auto"
                          data-testid={`image-${feature.id}`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="w-full lg:w-1/2 space-y-6">
                    <Badge variant="outline" className="text-xs font-medium" data-testid={`badge-${feature.id}`}>
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
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                            <Check className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-sm text-muted-foreground">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 bg-muted/30">
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
                Start with a free trial. Upgrade anytime to unlock more features and scale your revenue recovery.
              </p>

              <div className="inline-flex items-center gap-2 p-1 rounded-lg bg-muted" data-testid="billing-toggle">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    billingCycle === "monthly"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                  data-testid="button-monthly-billing"
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle("yearly")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    billingCycle === "yearly"
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
              <div className="grid md:grid-cols-3 gap-6">
                {plans.map((plan) => {
                  const priceRaw = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
                  const price = parseFloat(priceRaw || "0");
                  const isPopular = plan.slug === "professional";
                  const features = Array.isArray(plan.features) ? plan.features : [];
                  const planDescriptions: Record<string, string> = {
                    starter: "For small teams getting started",
                    professional: "For growing sales teams",
                    enterprise: "For large organizations",
                  };

                  return (
                    <Card
                      key={plan.id}
                      className={`relative p-6 flex flex-col ${
                        isPopular ? "border-primary shadow-lg" : ""
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
                          <span className="text-4xl font-bold" data-testid={`text-plan-price-${plan.slug}`}>
                            ${Math.round(price / 100)}
                          </span>
                          <span className="text-muted-foreground">
                            /{billingCycle === "yearly" ? "year" : "month"}
                          </span>
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
                        ) : (
                          <>Get Started</>
                        )}
                      </Button>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="p-6" data-testid="card-plan-starter">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-2">Starter</h3>
                    <p className="text-sm text-muted-foreground mb-4">For small teams getting started</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">${billingCycle === "yearly" ? 468 : 49}</span>
                      <span className="text-muted-foreground">/{billingCycle === "yearly" ? "year" : "month"}</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Up to 100 accounts</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Basic gap analysis</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Email support</span>
                    </li>
                  </ul>
                  <a href="/api/login">
                    <Button variant="outline" className="w-full" data-testid="button-select-plan-starter-fallback">
                      Get Started
                    </Button>
                  </a>
                </Card>

                <Card className="p-6 border-primary shadow-lg relative" data-testid="card-plan-professional">
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Crown className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-2">Professional</h3>
                    <p className="text-sm text-muted-foreground mb-4">For growing sales teams</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">${billingCycle === "yearly" ? 1908 : 199}</span>
                      <span className="text-muted-foreground">/{billingCycle === "yearly" ? "year" : "month"}</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Up to 500 accounts</span>
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
                    <Button className="w-full" data-testid="button-select-plan-professional-fallback">
                      Get Started
                    </Button>
                  </a>
                </Card>

                <Card className="p-6" data-testid="card-plan-enterprise">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-2">Enterprise</h3>
                    <p className="text-sm text-muted-foreground mb-4">For large organizations</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">${billingCycle === "yearly" ? 4788 : 499}</span>
                      <span className="text-muted-foreground">/{billingCycle === "yearly" ? "year" : "month"}</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Unlimited accounts</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Custom integrations</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span>Dedicated support</span>
                    </li>
                  </ul>
                  <a href="/api/login">
                    <Button variant="outline" className="w-full" data-testid="button-select-plan-enterprise-fallback">
                      Get Started
                    </Button>
                  </a>
                </Card>
              </div>
            )}

            <p className="text-center text-sm text-muted-foreground mt-8" data-testid="text-trial-info">
              All plans include a 14-day free trial. No credit card required to start.
            </p>
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
                  Built for Sales Teams Who Want Results
                </h2>
                <p className="text-muted-foreground mb-6">
                  Wallet Share Expander was designed by sales leaders who
                  understand the challenge of growing existing accounts. Our AI
                  does the heavy lifting so your team can focus on selling.
                </p>

                <ul className="space-y-4">
                  <li className="flex items-start gap-3" data-testid="benefit-security">
                    <Shield className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium">Enterprise-Grade Security</h4>
                      <p className="text-sm text-muted-foreground">
                        SOC 2 compliant with encrypted data at rest and in transit
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3" data-testid="benefit-implementation">
                    <Zap className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium">Quick Implementation</h4>
                      <p className="text-sm text-muted-foreground">
                        Upload your data and start seeing insights in under an hour
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3" data-testid="benefit-support">
                    <Users className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium">Dedicated Support</h4>
                      <p className="text-sm text-muted-foreground">
                        Customer success team to help you maximize ROI
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <Card className="p-8 bg-primary/5 border-primary/20" data-testid="card-testimonial">
                <blockquote className="text-lg italic mb-4" data-testid="text-testimonial-quote">
                  "Wallet Share Expander helped us identify over $2M in missed
                  opportunities within our existing customer base. The AI-generated
                  playbooks made it easy for our reps to have meaningful
                  conversations."
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
                  Get Started Today
                </Badge>
                <h2 className="text-2xl font-bold mb-2" data-testid="text-signup-title">
                  Start Your Free Trial
                </h2>
                <p className="text-muted-foreground mb-6">
                  Sign up in seconds and start recovering lost revenue immediately.
                  No credit card required for your 14-day free trial.
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
