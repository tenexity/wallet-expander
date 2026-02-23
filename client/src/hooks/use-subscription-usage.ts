import { useQuery } from "@tanstack/react-query";

type FeatureKey = "playbooks" | "icps" | "enrolled_accounts" | "users";

interface FeatureUsage {
  current: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
}

interface SubscriptionUsage {
  planType: string;
  subscriptionStatus: string;
  features: Record<FeatureKey, FeatureUsage>;
  users: FeatureUsage;
  credits: {
    used: number;
    remaining: number;
    total: number;
    unlimited: boolean;
    percentUsed: number;
  };
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  professional: "Professional",
  scale: "Scale",
  enterprise: "Enterprise",
};

export function useSubscriptionUsage() {
  const { data, isLoading, isError } = useQuery<SubscriptionUsage>({
    queryKey: ["/api/subscription/usage"],
  });

  const canCreate = (feature: FeatureKey): boolean => {
    if (!data) return true;
    const usage = data.features[feature];
    if (!usage) return true;
    if (usage.unlimited) return true;
    return usage.remaining > 0;
  };

  const getFeatureUsage = (feature: FeatureKey): FeatureUsage => {
    if (!data) return { current: 0, limit: 0, remaining: 0, unlimited: true };
    return data.features[feature] || { current: 0, limit: 0, remaining: 0, unlimited: true };
  };

  const isLowCredits = (): boolean => {
    if (!data) return false;
    if (data.credits.unlimited) return false;
    return data.credits.percentUsed > 80;
  };

  const planLabel = (): string => {
    if (!data) return "Free";
    return PLAN_LABELS[data.planType] || data.planType.charAt(0).toUpperCase() + data.planType.slice(1);
  };

  return {
    data,
    isLoading,
    isError,
    canCreate,
    getFeatureUsage,
    isLowCredits,
    planLabel,
  };
}
