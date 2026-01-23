import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/kpi-card";
import { DataTable } from "@/components/data-table";
import { ScoreBadge } from "@/components/score-badge";
import { ProgressRing } from "@/components/progress-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  Users,
  Target,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardStats {
  totalAccounts: number;
  enrolledAccounts: number;
  totalRevenue: number;
  incrementalRevenue: number;
  topOpportunities: Array<{
    id: number;
    name: string;
    segment: string;
    opportunityScore: number;
    estimatedValue: number;
    gapCategories: string[];
  }>;
  recentTasks: Array<{
    id: number;
    accountName: string;
    taskType: string;
    status: string;
    dueDate: string;
  }>;
  segmentBreakdown: Array<{
    segment: string;
    count: number;
    revenue: number;
  }>;
  icpProfiles: Array<{
    segment: string;
    status: string;
    accountCount: number;
  }>;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const opportunityColumns = [
    {
      key: "name",
      header: "Account",
      cell: (row: DashboardStats["topOpportunities"][0]) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{row.name}</span>
          <Badge variant="outline" className="w-fit text-xs">
            {row.segment}
          </Badge>
        </div>
      ),
    },
    {
      key: "opportunityScore",
      header: "Score",
      cell: (row: DashboardStats["topOpportunities"][0]) => (
        <ScoreBadge score={row.opportunityScore} testId={`score-${row.id}`} />
      ),
    },
    {
      key: "estimatedValue",
      header: "Est. Value",
      cell: (row: DashboardStats["topOpportunities"][0]) => (
        <span className="font-semibold text-chart-2">
          {formatCurrency(row.estimatedValue)}
        </span>
      ),
    },
    {
      key: "gapCategories",
      header: "Gap Categories",
      cell: (row: DashboardStats["topOpportunities"][0]) => (
        <div className="flex flex-wrap gap-1">
          {row.gapCategories.slice(0, 2).map((cat) => (
            <Badge key={cat} variant="secondary" className="text-xs">
              {cat}
            </Badge>
          ))}
          {row.gapCategories.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{row.gapCategories.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
  ];

  const taskColumns = [
    {
      key: "accountName",
      header: "Account",
      cell: (row: DashboardStats["recentTasks"][0]) => (
        <span className="font-medium">{row.accountName}</span>
      ),
    },
    {
      key: "taskType",
      header: "Type",
      cell: (row: DashboardStats["recentTasks"][0]) => (
        <Badge variant="outline">{row.taskType}</Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: DashboardStats["recentTasks"][0]) => {
        const statusColors: Record<string, string> = {
          pending: "bg-chart-3/10 text-chart-3 border-chart-3/20",
          in_progress: "bg-chart-1/10 text-chart-1 border-chart-1/20",
          completed: "bg-chart-2/10 text-chart-2 border-chart-2/20",
        };
        return (
          <Badge
            variant="outline"
            className={statusColors[row.status] || ""}
          >
            {row.status.replace("_", " ")}
          </Badge>
        );
      },
    },
    {
      key: "dueDate",
      header: "Due",
      cell: (row: DashboardStats["recentTasks"][0]) => (
        <span className="text-muted-foreground text-sm">{row.dueDate}</span>
      ),
    },
  ];

  // Mock data for demonstration
  const mockStats: DashboardStats = {
    totalAccounts: 487,
    enrolledAccounts: 124,
    totalRevenue: 8540000,
    incrementalRevenue: 342000,
    topOpportunities: [
      {
        id: 1,
        name: "ABC Plumbing Co",
        segment: "Plumbing",
        opportunityScore: 87,
        estimatedValue: 45000,
        gapCategories: ["Water Heaters", "Tools & Safety"],
      },
      {
        id: 2,
        name: "Elite HVAC Services",
        segment: "HVAC",
        opportunityScore: 82,
        estimatedValue: 38000,
        gapCategories: ["Controls", "Pipe & Fittings"],
      },
      {
        id: 3,
        name: "Metro Mechanical",
        segment: "Mechanical",
        opportunityScore: 76,
        estimatedValue: 32000,
        gapCategories: ["Water Heaters", "Ductwork"],
      },
      {
        id: 4,
        name: "Premier Plumbing",
        segment: "Plumbing",
        opportunityScore: 71,
        estimatedValue: 28000,
        gapCategories: ["PVF", "Tools"],
      },
      {
        id: 5,
        name: "Climate Control Inc",
        segment: "HVAC",
        opportunityScore: 68,
        estimatedValue: 25000,
        gapCategories: ["Refrigerant"],
      },
    ],
    recentTasks: [
      { id: 1, accountName: "ABC Plumbing", taskType: "Call", status: "pending", dueDate: "Today" },
      { id: 2, accountName: "Elite HVAC", taskType: "Email", status: "in_progress", dueDate: "Tomorrow" },
      { id: 3, accountName: "Metro Mechanical", taskType: "Visit", status: "completed", dueDate: "Jan 20" },
      { id: 4, accountName: "Premier Plumbing", taskType: "Call", status: "pending", dueDate: "Jan 25" },
    ],
    segmentBreakdown: [
      { segment: "HVAC", count: 156, revenue: 3200000 },
      { segment: "Plumbing", count: 198, revenue: 2800000 },
      { segment: "Mechanical", count: 89, revenue: 1700000 },
      { segment: "Other", count: 44, revenue: 840000 },
    ],
    icpProfiles: [
      { segment: "HVAC", status: "approved", accountCount: 156 },
      { segment: "Plumbing", status: "approved", accountCount: 198 },
      { segment: "Mechanical", status: "draft", accountCount: 89 },
      { segment: "Electrical", status: "draft", accountCount: 44 },
    ],
  };

  const displayStats = stats || mockStats;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor wallet share opportunities and track revenue growth
          </p>
        </div>
        <Button asChild data-testid="button-view-opportunities">
          <Link href="/accounts">
            View All Opportunities
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Accounts"
          value={displayStats.totalAccounts.toLocaleString()}
          icon={Users}
          trend={{ value: 12, label: "vs last month" }}
          testId="kpi-total-accounts"
        />
        <KPICard
          title="Enrolled Accounts"
          value={displayStats.enrolledAccounts.toLocaleString()}
          subtitle={`${((displayStats.enrolledAccounts / displayStats.totalAccounts) * 100).toFixed(0)}% of total`}
          icon={Target}
          trend={{ value: 8, label: "vs last month" }}
          testId="kpi-enrolled-accounts"
        />
        <KPICard
          title="Total Revenue (12M)"
          value={formatCurrency(displayStats.totalRevenue)}
          icon={DollarSign}
          trend={{ value: 15, label: "YoY" }}
          testId="kpi-total-revenue"
        />
        <KPICard
          title="Incremental Revenue"
          value={formatCurrency(displayStats.incrementalRevenue)}
          subtitle="From enrolled accounts"
          icon={TrendingUp}
          trend={{ value: 23, label: "vs baseline" }}
          testId="kpi-incremental-revenue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Top Opportunities</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Accounts with highest wallet share leakage
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/accounts">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={opportunityColumns}
              data={displayStats.topOpportunities}
              testId="table-opportunities"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Segment Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Accounts by contractor type
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={displayStats.segmentBreakdown}
                    dataKey="count"
                    nameKey="segment"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {displayStats.segmentBreakdown.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value, "Accounts"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {displayStats.segmentBreakdown.map((item, index) => (
                <div key={item.segment} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="text-sm">{item.segment}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Recent Tasks</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Upcoming TM actions
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/playbooks">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={taskColumns}
              data={displayStats.recentTasks}
              testId="table-tasks"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">ICP Profiles</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Segment profile status
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/icp-builder">Manage</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayStats.icpProfiles.map((profile) => (
                <div
                  key={profile.segment}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <ProgressRing
                      value={profile.status === "approved" ? 100 : 50}
                      size={40}
                      strokeWidth={4}
                    />
                    <div>
                      <span className="font-medium">{profile.segment}</span>
                      <p className="text-xs text-muted-foreground">
                        {profile.accountCount} accounts
                      </p>
                    </div>
                  </div>
                  <Badge variant={profile.status === "approved" ? "default" : "secondary"}>
                    {profile.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Revenue by Segment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayStats.segmentBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="segment"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value)}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
