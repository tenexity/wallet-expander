import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CreditUsageData {
  billingPeriod: string;
  totalAllowance: number;
  creditsUsed: number;
  creditsRemaining: number;
  unlimited: boolean;
  percentUsed: number;
  actionBreakdown: Record<string, { count: number; creditsUsed: number; label: string }>;
  recentTransactions: Array<unknown>;
  actionCosts: Record<string, number>;
}

function getColorClass(percent: number): string {
  if (percent > 80) return "text-red-500";
  if (percent >= 50) return "text-yellow-500";
  return "text-green-500";
}

function getProgressColor(percent: number): string {
  if (percent > 80) return "[&>div]:bg-red-500";
  if (percent >= 50) return "[&>div]:bg-yellow-500";
  return "[&>div]:bg-green-500";
}

export function CreditMeter() {
  const [, navigate] = useLocation();

  const { data, isLoading, isError } = useQuery<CreditUsageData>({
    queryKey: ["/api/credits/usage"],
  });

  if (isLoading) {
    return (
      <div className="px-1 py-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded shrink-0" />
          <Skeleton className="h-3 w-full group-data-[collapsible=icon]:hidden" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return null;
  }

  const tooltipText = data.unlimited
    ? "AI Credits: Unlimited"
    : `AI Credits: ${data.creditsUsed} / ${data.totalAllowance} used`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => navigate("/credits")}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover-elevate transition-colors text-left"
          data-testid="link-credit-meter"
        >
          <div className="relative shrink-0">
            <Zap className={`h-4 w-4 ${data.unlimited ? "text-green-500" : getColorClass(data.percentUsed)}`} />
            {!data.unlimited && data.percentUsed > 80 && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" data-testid="indicator-low-credits" />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-1 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-medium text-sidebar-foreground">AI Credits</span>
              {!data.unlimited && data.creditsRemaining === 0 ? (
                <span className="text-xs font-semibold text-red-500" data-testid="text-zero-credits">
                  0 remaining
                </span>
              ) : (
                <span className="text-xs text-sidebar-foreground/60">
                  {data.unlimited
                    ? "Unlimited"
                    : `${data.creditsUsed} / ${data.totalAllowance}`}
                </span>
              )}
            </div>
            {!data.unlimited && (
              <Progress
                value={data.percentUsed}
                className={`h-1.5 ${getProgressColor(data.percentUsed)}`}
              />
            )}
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
}
