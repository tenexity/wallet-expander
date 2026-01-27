import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SubscriptionPlan } from "@shared/schema";
import {
  CreditCard,
  Check,
  AlertCircle,
  ExternalLink,
  Loader2,
  Crown,
  Zap,
  Building2,
  Calendar,
  RefreshCw,
} from "lucide-react";

interface SubscriptionStatus {
  subscriptionStatus: string;
  planType: string;
  billingPeriodEnd: string | null;
  trialEndsAt: string | null;
  canceledAt: string | null;
  hasStripeCustomer: boolean;
  plan: SubscriptionPlan | null;
}

const planIcons: Record<string, typeof Crown> = {
  starter: Zap,
  professional: Crown,
  enterprise: Building2,
};

function getPlanIcon(slug: string) {
  return planIcons[slug] || Zap;
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "trialing":
      return "secondary";
    case "past_due":
    case "canceled":
    case "unpaid":
      return "destructive";
    default:
      return "outline";
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function Subscription() {
  const { toast } = useToast();
  const [location] = useLocation();

  const { data: subscription, isLoading: subscriptionLoading } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription"],
  });

  const { data: plans, isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription/plans"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ planSlug, billingCycle }: { planSlug: string; billingCycle: string }) => {
      const res = await apiRequest("POST", "/api/stripe/create-checkout-session", {
        planSlug,
        billingCycle,
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
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/create-portal-session");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Portal Error",
        description: error.message || "Failed to open billing portal",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast({
        title: "Subscription Activated",
        description: "Your subscription is now active. Thank you for subscribing!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      window.history.replaceState({}, "", "/subscription");
    } else if (params.get("canceled") === "true") {
      toast({
        title: "Checkout Canceled",
        description: "Your checkout was canceled. No charges were made.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/subscription");
    }
  }, [toast]);

  const isLoading = subscriptionLoading || plansLoading;
  const hasActiveSubscription = subscription?.subscriptionStatus === "active" || subscription?.subscriptionStatus === "trialing";
  const currentPlanSlug = subscription?.planType || "free";

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-subscription-title">
            Subscription & Billing
          </h1>
          <p className="text-muted-foreground">
            Manage your subscription plan and billing settings
          </p>
        </div>
        {subscription?.hasStripeCustomer && (
          <Button
            variant="outline"
            onClick={() => portalMutation.mutate()}
            disabled={portalMutation.isPending}
            data-testid="button-manage-billing"
          >
            {portalMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4" />
            )}
            Manage Billing
            <ExternalLink className="ml-2 h-3 w-3" />
          </Button>
        )}
      </div>

      {hasActiveSubscription && subscription?.plan && (
        <Card data-testid="card-current-plan">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = getPlanIcon(subscription.planType);
                  return <Icon className="h-6 w-6 text-primary" />;
                })()}
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {subscription.plan.name} Plan
                    <Badge variant={getStatusBadgeVariant(subscription.subscriptionStatus)}>
                      {subscription.subscriptionStatus}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Your current subscription plan
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Next Billing Date</p>
                  <p className="font-medium" data-testid="text-billing-date">
                    {formatDate(subscription.billingPeriodEnd)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Price</p>
                  <p className="font-medium" data-testid="text-plan-price">
                    ${subscription.plan.monthlyPrice}/mo
                  </p>
                </div>
              </div>
              {subscription.canceledAt && (
                <div className="flex items-center gap-3 p-3 rounded-md bg-destructive/10">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-sm text-muted-foreground">Cancels On</p>
                    <p className="font-medium text-destructive">
                      {formatDate(subscription.canceledAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {subscription.plan.features && (
              <>
                <Separator className="my-4" />
                <div>
                  <h4 className="text-sm font-medium mb-3">Plan Features</h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(subscription.plan.features as string[]).map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!hasActiveSubscription && (
        <Card className="border-primary/20 bg-primary/5" data-testid="card-no-subscription">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              No Active Subscription
            </CardTitle>
            <CardDescription>
              Choose a plan below to get started with all features
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans?.map((plan) => {
            const Icon = getPlanIcon(plan.slug);
            const isCurrentPlan = currentPlanSlug === plan.slug && hasActiveSubscription;
            const features = plan.features as string[] | null;

            return (
              <Card
                key={plan.id}
                className={isCurrentPlan ? "border-primary" : ""}
                data-testid={`card-plan-${plan.slug}`}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle>{plan.name}</CardTitle>
                    {isCurrentPlan && (
                      <Badge variant="secondary" className="ml-auto">Current</Badge>
                    )}
                  </div>
                  <CardDescription>
                    <span className="text-2xl font-bold text-foreground">
                      ${plan.monthlyPrice}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {features && (
                    <ul className="space-y-2">
                      {features.slice(0, 5).map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                      {features.length > 5 && (
                        <li className="text-sm text-muted-foreground">
                          +{features.length - 5} more features
                        </li>
                      )}
                    </ul>
                  )}
                </CardContent>
                <CardFooter>
                  {isCurrentPlan ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => checkoutMutation.mutate({ planSlug: plan.slug, billingCycle: "monthly" })}
                      disabled={checkoutMutation.isPending}
                      data-testid={`button-subscribe-${plan.slug}`}
                    >
                      {checkoutMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : hasActiveSubscription ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Switch to {plan.name}
                        </>
                      ) : (
                        <>Subscribe to {plan.name}</>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Annual billing available with 2 months free. Contact us for Enterprise pricing.
        </p>
      </div>
    </div>
  );
}
