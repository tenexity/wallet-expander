import { Link } from "wouter";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface UpgradePromptProps {
  feature: string;
  current: number;
  limit: number;
  planType: string;
}

export function UpgradePrompt({ feature, limit, planType }: UpgradePromptProps) {
  return (
    <Alert data-testid="alert-upgrade-prompt" className="border-amber-500/50 bg-amber-500/5">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertTitle data-testid="text-upgrade-title">Plan limit reached</AlertTitle>
      <AlertDescription>
        <p className="mb-3" data-testid="text-upgrade-message">
          You've reached the limit of {limit} {feature} on your {planType} plan.
        </p>
        <Button variant="default" size="sm" asChild data-testid="link-upgrade-plan">
          <Link href="/subscription">
            Upgrade your plan
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

interface UpgradePromptInlineProps {
  feature: string;
  limit: number;
  planType: string;
}

export function UpgradePromptInline({ feature, limit, planType }: UpgradePromptInlineProps) {
  return (
    <span className="text-sm text-muted-foreground" data-testid="text-upgrade-inline">
      Limit of {limit} {feature} reached on {planType} plan.{" "}
      <Link href="/subscription" className="text-primary underline underline-offset-4" data-testid="link-upgrade-inline">
        Upgrade your plan
      </Link>
    </span>
  );
}
