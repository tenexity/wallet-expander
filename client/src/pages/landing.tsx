import { useEffect } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
} from "lucide-react";

const demoFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  company: z.string().min(2, "Company name must be at least 2 characters"),
});

type DemoFormValues = z.infer<typeof demoFormSchema>;

const features = [
  {
    icon: Target,
    title: "AI-Powered Gap Analysis",
    description:
      "Automatically identify wallet share leakage by analyzing purchasing patterns against Ideal Customer Profiles for each market segment.",
  },
  {
    icon: BarChart3,
    title: "Opportunity Scoring",
    description:
      "Prioritize accounts with intelligent scoring based on category gaps, revenue potential, and historical purchase behavior.",
  },
  {
    icon: Users,
    title: "ICP Builder",
    description:
      "Build and refine Ideal Customer Profiles by segment using AI analysis of your best-performing accounts.",
  },
  {
    icon: FileText,
    title: "Sales Playbooks",
    description:
      "Generate personalized call scripts, email templates, and action plans tailored to each account's specific gaps.",
  },
  {
    icon: DollarSign,
    title: "Revenue Tracking",
    description:
      "Track incremental revenue from enrolled accounts, monitor progress toward graduation goals, and calculate ROI.",
  },
  {
    icon: Zap,
    title: "Task Automation",
    description:
      "Automatically generate and assign tasks to Territory Managers with email notifications and progress tracking.",
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

  const form = useForm<DemoFormValues>({
    resolver: zodResolver(demoFormSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
    },
  });

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

  const onSubmit = async (data: DemoFormValues) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: "Demo Request Received",
      description: `Thanks ${data.name}! We'll contact you at ${data.email} within 24 hours.`,
    });

    form.reset();
  };

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
            <button
              onClick={() => scrollToSection("signup")}
              className="text-sm font-medium text-muted-foreground transition-colors"
              data-testid="nav-demo"
            >
              Get Demo
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/">
              <Button variant="outline" size="sm" data-testid="button-login">
                Login
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => scrollToSection("signup")}
              data-testid="button-get-started"
            >
              Get Started
            </Button>
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
                onClick={() => scrollToSection("signup")}
                data-testid="button-hero-demo"
              >
                Request a Demo
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
              Features
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-features-title">
              Everything You Need to Expand Wallet Share
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful AI-driven tools designed for Territory Managers and Sales
              Leaders to identify and capture revenue opportunities.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="hover-elevate transition-all duration-300"
                data-testid={`card-feature-${index}`}
              >
                <CardHeader>
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-3">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4" data-testid="badge-pricing">
              Fee-for-Success Pricing
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-pricing-title">
              We Only Win When You Win
            </h2>
            <p className="text-lg text-muted-foreground mb-12">
              Our success-based pricing model aligns our objectives with yours.
              No monthly fees eating into your budget—you only pay when you recover revenue.
            </p>

            <Card className="p-8 md:p-12 text-center" data-testid="card-pricing-success">
              <div className="mb-8">
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-5xl md:text-6xl font-bold text-primary" data-testid="text-success-fee">15%</span>
                  <span className="text-xl text-muted-foreground">success fee</span>
                </div>
                <p className="text-muted-foreground" data-testid="text-fee-description">
                  of incremental revenue recovered from enrolled accounts
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="p-4 rounded-md bg-muted/50" data-testid="pricing-benefit-risk">
                  <Shield className="h-6 w-6 text-primary mx-auto mb-2" />
                  <h4 className="font-medium mb-1">Zero Risk</h4>
                  <p className="text-sm text-muted-foreground">
                    No revenue recovered means no fees owed
                  </p>
                </div>
                <div className="p-4 rounded-md bg-muted/50" data-testid="pricing-benefit-aligned">
                  <Target className="h-6 w-6 text-primary mx-auto mb-2" />
                  <h4 className="font-medium mb-1">Aligned Incentives</h4>
                  <p className="text-sm text-muted-foreground">
                    We're motivated to maximize your results
                  </p>
                </div>
                <div className="p-4 rounded-md bg-muted/50" data-testid="pricing-benefit-volume">
                  <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
                  <h4 className="font-medium mb-1">Volume Discounts</h4>
                  <p className="text-sm text-muted-foreground">
                    Success fee declines as you grow
                  </p>
                </div>
              </div>

              <Button
                size="lg"
                onClick={() => scrollToSection("signup")}
                className="mb-8"
                data-testid="button-pricing-demo"
              >
                Request a Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="border-t pt-6 space-y-2 text-xs text-muted-foreground" data-testid="pricing-fine-print">
                <p data-testid="text-setup-fee">
                  One-time setup fee of $1,200 covers onboarding, data integration, and initial AI training.
                </p>
                <p data-testid="text-volume-discount">
                  Success fee starts at 15% and declines based on volume thresholds.
                </p>
                <p data-testid="text-hybrid-option">
                  Hybrid pricing available: reduced monthly subscription + lower success fee. Contact us for details.
                </p>
              </div>
            </Card>
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
              <div className="text-center mb-8">
                <Badge variant="secondary" className="mb-4" data-testid="badge-signup">
                  Get Started
                </Badge>
                <h2 className="text-2xl font-bold mb-2" data-testid="text-signup-title">Request a Demo</h2>
                <p className="text-muted-foreground">
                  See how Wallet Share Expander can help your team recover lost
                  revenue. Fill out the form and we'll be in touch within 24 hours.
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John Smith"
                            data-testid="input-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="john@company.com"
                            data-testid="input-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Acme Corporation"
                            data-testid="input-company"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={form.formState.isSubmitting}
                    data-testid="button-submit-demo"
                  >
                    {form.formState.isSubmitting ? (
                      "Submitting..."
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Request Demo
                      </>
                    )}
                  </Button>
                </form>
              </Form>
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
