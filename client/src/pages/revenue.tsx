import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { ProgressRing } from "@/components/progress-ring";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  TrendingUp,
  DollarSign,
  Target,
  Users,
  Download,
  Plus,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  HelpCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  Tooltip as TooltipComponent,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";

interface EnrolledAccount {
  id: number;
  accountId: number;
  accountName: string;
  segment: string;
  enrolledAt: string;
  baselineRevenue: number;
  currentRevenue: number;
  incrementalRevenue: number;
  shareRate: number;
  feeAmount: number;
  status: "active" | "paused" | "graduated";
}

interface RevenueSnapshot {
  period: string;
  baselineRevenue: number;
  actualRevenue: number;
  incrementalRevenue: number;
  feeAmount: number;
}

interface Account {
  id: number;
  name: string;
  segment: string | null;
}

export default function Revenue() {
  const [periodFilter, setPeriodFilter] = useState<string>("12m");
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [shareRate, setShareRate] = useState<string>("15");
  const [baselinePeriod, setBaselinePeriod] = useState<string>("12m");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: enrolledAccounts, isLoading } = useQuery<EnrolledAccount[]>({
    queryKey: ["/api/program-accounts"],
  });

  const { data: allAccounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const enrolledAccountIds = new Set(enrolledAccounts?.map(a => a.accountId) || []);
  const availableAccounts = allAccounts?.filter(a => !enrolledAccountIds.has(a.id)) || [];

  // Mock data for demonstration
  const mockEnrolledAccounts: EnrolledAccount[] = [
    {
      id: 1,
      accountId: 1,
      accountName: "ABC Plumbing Co",
      segment: "Plumbing",
      enrolledAt: "2023-10-15",
      baselineRevenue: 110000,
      currentRevenue: 145000,
      incrementalRevenue: 35000,
      shareRate: 0.15,
      feeAmount: 5250,
      status: "active",
    },
    {
      id: 2,
      accountId: 2,
      accountName: "Elite HVAC Services",
      segment: "HVAC",
      enrolledAt: "2023-11-01",
      baselineRevenue: 195000,
      currentRevenue: 242000,
      incrementalRevenue: 47000,
      shareRate: 0.15,
      feeAmount: 7050,
      status: "active",
    },
    {
      id: 3,
      accountId: 5,
      accountName: "Climate Control Inc",
      segment: "HVAC",
      enrolledAt: "2023-09-20",
      baselineRevenue: 280000,
      currentRevenue: 348000,
      incrementalRevenue: 68000,
      shareRate: 0.15,
      feeAmount: 10200,
      status: "active",
    },
    {
      id: 4,
      accountId: 7,
      accountName: "Valley Mechanical",
      segment: "Mechanical",
      enrolledAt: "2023-12-01",
      baselineRevenue: 85000,
      currentRevenue: 98000,
      incrementalRevenue: 13000,
      shareRate: 0.15,
      feeAmount: 1950,
      status: "active",
    },
  ];

  const mockRevenueData: RevenueSnapshot[] = [
    { period: "Aug", baselineRevenue: 56000, actualRevenue: 58000, incrementalRevenue: 2000, feeAmount: 300 },
    { period: "Sep", baselineRevenue: 58000, actualRevenue: 65000, incrementalRevenue: 7000, feeAmount: 1050 },
    { period: "Oct", baselineRevenue: 55000, actualRevenue: 72000, incrementalRevenue: 17000, feeAmount: 2550 },
    { period: "Nov", baselineRevenue: 62000, actualRevenue: 85000, incrementalRevenue: 23000, feeAmount: 3450 },
    { period: "Dec", baselineRevenue: 48000, actualRevenue: 78000, incrementalRevenue: 30000, feeAmount: 4500 },
    { period: "Jan", baselineRevenue: 52000, actualRevenue: 94000, incrementalRevenue: 42000, feeAmount: 6300 },
  ];

  const displayAccounts = enrolledAccounts || mockEnrolledAccounts;

  const totalBaseline = displayAccounts.reduce((sum, a) => sum + a.baselineRevenue, 0);
  const totalCurrent = displayAccounts.reduce((sum, a) => sum + a.currentRevenue, 0);
  const totalIncremental = displayAccounts.reduce((sum, a) => sum + a.incrementalRevenue, 0);
  const totalFees = displayAccounts.reduce((sum, a) => sum + a.feeAmount, 0);
  const growthRate = ((totalCurrent - totalBaseline) / totalBaseline) * 100;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const columns = [
    {
      key: "accountName",
      header: "Account",
      cell: (row: EnrolledAccount) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.accountName}</span>
          <span className="text-xs text-muted-foreground">{row.segment}</span>
        </div>
      ),
    },
    {
      key: "enrolledAt",
      header: "Enrolled",
      cell: (row: EnrolledAccount) => (
        <span className="text-muted-foreground">
          {new Date(row.enrolledAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "baselineRevenue",
      header: "Baseline",
      cell: (row: EnrolledAccount) => (
        <span>{formatCurrency(row.baselineRevenue)}</span>
      ),
    },
    {
      key: "currentRevenue",
      header: "Current (12M)",
      cell: (row: EnrolledAccount) => (
        <span className="font-medium">{formatCurrency(row.currentRevenue)}</span>
      ),
    },
    {
      key: "incrementalRevenue",
      header: "Incremental",
      cell: (row: EnrolledAccount) => {
        const growth = ((row.currentRevenue - row.baselineRevenue) / row.baselineRevenue) * 100;
        return (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-chart-2">
              {formatCurrency(row.incrementalRevenue)}
            </span>
            <Badge variant="outline" className="text-chart-2 border-chart-2/30 bg-chart-2/10">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              {growth.toFixed(0)}%
            </Badge>
          </div>
        );
      },
    },
    {
      key: "feeAmount",
      header: "Fee (15%)",
      cell: (row: EnrolledAccount) => (
        <span className="font-medium text-primary">
          {formatCurrency(row.feeAmount)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: EnrolledAccount) => (
        <Badge variant={row.status === "active" ? "default" : "secondary"}>
          {row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6" data-testid="page-revenue">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue Tracking</h1>
          <p className="text-muted-foreground">
            Monitor program performance and calculate rev-share fees
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-32">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
              <SelectItem value="ytd">Year to date</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="button-export-revenue">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <TooltipComponent>
            <TooltipTrigger asChild>
              <Button onClick={() => setShowEnrollDialog(true)} data-testid="button-enroll-account">
                <Plus className="mr-2 h-4 w-4" />
                Enroll Account
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[250px]">
              Add an account to the revenue growth program to track incremental revenue and calculate rev-share fees (15% of revenue above baseline).
            </TooltipContent>
          </TooltipComponent>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{displayAccounts.length}</p>
                  <p className="text-xs text-muted-foreground">Enrolled Accounts</p>
                </div>
              </div>
              <TooltipComponent>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="tooltip-revenue-enrolled">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Accounts actively enrolled in the revenue growth program. Their incremental revenue above baseline is used to calculate your rev-share fees.</p>
                </TooltipContent>
              </TooltipComponent>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-chart-2/10">
                  <TrendingUp className="h-5 w-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(totalIncremental)}</p>
                  <p className="text-xs text-muted-foreground">Incremental Revenue</p>
                </div>
              </div>
              <TooltipComponent>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="tooltip-revenue-incremental">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Total revenue generated above baseline across all enrolled accounts. This represents the new wallet share captured through your sales efforts.</p>
                </TooltipContent>
              </TooltipComponent>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-chart-3/10">
                  <Percent className="h-5 w-5 text-chart-3" />
                </div>
                <div>
                  <p className="text-2xl font-bold">+{growthRate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">vs Baseline</p>
                </div>
              </div>
              <TooltipComponent>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="tooltip-revenue-growth">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Percentage growth of current revenue compared to the baseline period. Higher growth rates indicate successful wallet share capture.</p>
                </TooltipContent>
              </TooltipComponent>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-chart-1/10">
                  <DollarSign className="h-5 w-5 text-chart-1" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(totalFees)}</p>
                  <p className="text-xs text-muted-foreground">Total Fees Earned</p>
                </div>
              </div>
              <TooltipComponent>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="tooltip-revenue-fees">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Your total rev-share earnings calculated as 15% of incremental revenue. This is the fee earned for helping capture additional wallet share.</p>
                </TooltipContent>
              </TooltipComponent>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue Trend</CardTitle>
            <CardDescription>Baseline vs Actual revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockRevenueData}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tickFormatter={(value) => formatCurrency(value)}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value)]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="baselineRevenue"
                    name="Baseline"
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="actualRevenue"
                    name="Actual"
                    stroke="hsl(var(--chart-2))"
                    fill="url(#colorActual)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Fee Revenue</CardTitle>
            <CardDescription>Rev-share fees earned by month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tickFormatter={(value) => formatCurrency(value)}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Fee"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Bar
                    dataKey="feeAmount"
                    name="Fee"
                    fill="hsl(var(--chart-1))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Enrolled Accounts</CardTitle>
            <CardDescription>
              Track revenue performance by enrolled account
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {displayAccounts.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No enrolled accounts"
              description="Enroll accounts to start tracking revenue growth"
              action={{
                label: "Enroll Account",
                onClick: () => setShowEnrollDialog(true),
              }}
              testId="empty-enrolled"
            />
          ) : (
            <DataTable
              columns={columns}
              data={displayAccounts}
              isLoading={isLoading}
              testId="table-enrolled"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Program Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 rounded-md bg-muted/50">
              <p className="text-3xl font-bold">{formatCurrency(totalBaseline)}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Baseline</p>
            </div>
            <div className="text-center p-4 rounded-md bg-muted/50">
              <p className="text-3xl font-bold">{formatCurrency(totalCurrent)}</p>
              <p className="text-sm text-muted-foreground mt-1">Current Revenue</p>
            </div>
            <div className="text-center p-4 rounded-md bg-chart-2/10">
              <p className="text-3xl font-bold text-chart-2">
                {formatCurrency(totalIncremental)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Incremental Growth</p>
            </div>
            <div className="text-center p-4 rounded-md bg-chart-1/10">
              <p className="text-3xl font-bold text-chart-1">
                {formatCurrency(totalFees)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Your Fees (15%)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showEnrollDialog} onOpenChange={(open) => {
        setShowEnrollDialog(open);
        if (!open) {
          setSelectedAccountId("");
          setShareRate("15");
          setBaselinePeriod("12m");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enroll Account in Growth Program</DialogTitle>
            <DialogDescription>
              When you enroll an account, an AI-powered playbook will be automatically generated with targeted tasks based on identified opportunity gaps.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Account</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger data-testid="select-enroll-account">
                  <SelectValue placeholder="Choose an account" />
                </SelectTrigger>
                <SelectContent>
                  {availableAccounts.length === 0 ? (
                    <SelectItem value="_none" disabled>No accounts available</SelectItem>
                  ) : (
                    availableAccounts.map(account => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name} {account.segment && `(${account.segment})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rev-Share Rate (%)</Label>
              <Input 
                type="number" 
                value={shareRate} 
                onChange={(e) => setShareRate(e.target.value)}
                data-testid="input-share-rate"
              />
            </div>
            <div className="space-y-2">
              <Label>Baseline Period</Label>
              <Select value={baselinePeriod} onValueChange={setBaselinePeriod}>
                <SelectTrigger data-testid="select-baseline-period">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6m">Last 6 months</SelectItem>
                  <SelectItem value="12m">Last 12 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-primary">AI Playbook Auto-Generation</p>
                  <p className="text-muted-foreground mt-1">
                    A personalized growth playbook with sales tasks, call scripts, and email templates will be created automatically for this account.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnrollDialog(false)} disabled={isEnrolling}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (!selectedAccountId) {
                  toast({ title: "Select an account", description: "Please select an account to enroll", variant: "destructive" });
                  return;
                }
                
                setIsEnrolling(true);
                try {
                  const months = baselinePeriod === "6m" ? 6 : 12;
                  const baselineStart = new Date();
                  baselineStart.setMonth(baselineStart.getMonth() - months);
                  const baselineEnd = new Date();
                  
                  const response = await apiRequest("POST", "/api/program-accounts", {
                    accountId: parseInt(selectedAccountId),
                    baselineStart: baselineStart.toISOString(),
                    baselineEnd: baselineEnd.toISOString(),
                    baselineRevenue: "100000",
                    shareRate: (parseFloat(shareRate) / 100).toString(),
                    status: "active",
                  });
                  
                  const data = await response.json();
                  
                  queryClient.invalidateQueries({ queryKey: ["/api/program-accounts"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/playbooks"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
                  
                  setShowEnrollDialog(false);
                  
                  if (data.playbook) {
                    toast({
                      title: "Account enrolled with playbook",
                      description: `Created ${data.playbook.tasksGenerated} AI-generated tasks. View the playbook now?`,
                      action: (
                        <Button size="sm" variant="outline" onClick={() => navigate("/playbooks")}>
                          View Playbook
                        </Button>
                      ),
                    });
                  } else {
                    toast({
                      title: "Account enrolled",
                      description: "The account has been enrolled in the growth program.",
                    });
                  }
                } catch (error) {
                  console.error("Enrollment error:", error);
                  toast({
                    title: "Enrollment failed",
                    description: "Failed to enroll account. Please try again.",
                    variant: "destructive",
                  });
                } finally {
                  setIsEnrolling(false);
                }
              }}
              disabled={isEnrolling || !selectedAccountId}
              data-testid="button-confirm-enroll"
            >
              {isEnrolling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enrolling...
                </>
              ) : (
                <>
                  <Target className="mr-2 h-4 w-4" />
                  Enroll & Generate Playbook
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
