import { useQuery } from "@tanstack/react-query";
import { Zap, Calendar, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CreditUsageData {
  billingPeriod: string;
  totalAllowance: number;
  creditsUsed: number;
  creditsRemaining: number;
  unlimited: boolean;
  percentUsed: number;
  actionBreakdown: Record<string, { count: number; creditsUsed: number; label: string }>;
  recentTransactions: Array<{
    id: number;
    tenantId: number;
    actionType: string;
    creditsUsed: number;
    metadata: unknown;
    billingPeriod: string;
    createdAt: string;
  }>;
  actionCosts: Record<string, number>;
}

function getStatusColor(percent: number): string {
  if (percent > 80) return "text-red-500";
  if (percent >= 50) return "text-yellow-500";
  return "text-green-500";
}

function getProgressColor(percent: number): string {
  if (percent > 80) return "[&>div]:bg-red-500";
  if (percent >= 50) return "[&>div]:bg-yellow-500";
  return "[&>div]:bg-green-500";
}

function formatBillingPeriod(period: string): string {
  const [year, month] = period.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CreditUsage() {
  const { data, isLoading } = useQuery<CreditUsageData>({
    queryKey: ["/api/credits/usage"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Unable to load credit usage data.</p>
      </div>
    );
  }

  const breakdownEntries = Object.entries(data.actionBreakdown);
  const costEntries = Object.entries(data.actionCosts);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Credit Usage</h1>
          <p className="text-sm text-muted-foreground">
            {formatBillingPeriod(data.billingPeriod)} billing period
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-credits-used">
              {data.unlimited ? "N/A" : data.creditsUsed}
            </div>
            {!data.unlimited && (
              <div className="mt-2 space-y-1">
                <Progress
                  value={data.percentUsed}
                  className={`h-2 ${getProgressColor(data.percentUsed)}`}
                />
                <p className={`text-xs ${getStatusColor(data.percentUsed)}`}>
                  {data.percentUsed}% of allowance used
                </p>
              </div>
            )}
            {data.unlimited && (
              <p className="text-xs text-muted-foreground mt-1">Enterprise plan</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Remaining</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-credits-remaining">
              {data.unlimited ? "Unlimited" : data.creditsRemaining}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.unlimited
                ? "No usage limits on your plan"
                : `out of ${data.totalAllowance} total`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billing Period</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-billing-period">
              {formatBillingPeriod(data.billingPeriod)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Credits reset each billing cycle
            </p>
          </CardContent>
        </Card>
      </div>

      {breakdownEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Usage Breakdown by Action
            </CardTitle>
            <CardDescription>How your credits are being consumed this period</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Credits Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdownEntries
                  .sort(([, a], [, b]) => b.creditsUsed - a.creditsUsed)
                  .map(([key, entry]) => (
                    <TableRow key={key}>
                      <TableCell className="font-medium">{entry.label}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{entry.count}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{entry.creditsUsed}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {costEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Action Cost Reference
            </CardTitle>
            <CardDescription>How many credits each AI action costs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {costEntries.map(([action, cost]) => (
                <div
                  key={action}
                  className="flex items-center justify-between gap-2 rounded-md border p-3"
                >
                  <span className="text-sm truncate">{action.replace(/_/g, " ")}</span>
                  <Badge variant="outline">{cost} cr</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.recentTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Transactions
            </CardTitle>
            <CardDescription>Your latest AI credit transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">
                      {tx.actionType.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">-{tx.creditsUsed}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatDate(tx.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
