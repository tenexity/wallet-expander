import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/kpi-card";
import { DataTable } from "@/components/data-table";
import { ScoreBadge } from "@/components/score-badge";
import { ProgressRing } from "@/components/progress-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTooltip } from "@/components/info-tooltip";
import {
  DollarSign,
  Users,
  Target,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Focus,
  Phone,
  Mail,
  MapPin,
  Clock,
  ChevronRight,
  CheckCircle2,
  Circle,
  Upload,
  Sparkles,
  GripVertical,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Columns,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link, useLocation } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
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

interface DailyFocusData {
  todayCount: number;
  overdueCount: number;
  tasks: Array<{
    id: number;
    accountId: number;
    accountName: string;
    assignedTm: string;
    taskType: "call" | "email" | "visit";
    title: string;
    description: string;
    status: string;
    dueDate: string;
    isOverdue: boolean;
    gapCategories: string[];
  }>;
}

const taskTypeIcons = {
  call: Phone,
  email: Mail,
  visit: MapPin,
};

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

const STORAGE_KEY = "dashboard_block_order";
const BLOCK_WIDTHS_KEY = "dashboard_block_widths";
const COLLAPSED_BLOCKS_KEY = "dashboard_collapsed_blocks";

const DEFAULT_BLOCK_ORDER = [
  "daily-focus",
  "top-opportunities",
  "segment-breakdown",
  "recent-tasks",
  "icp-profiles",
  "revenue-chart",
];

type BlockWidth = 1 | 2 | 3;

const DEFAULT_BLOCK_WIDTHS: Record<string, BlockWidth> = {
  "daily-focus": 3,
  "top-opportunities": 2,
  "segment-breakdown": 1,
  "recent-tasks": 1,
  "icp-profiles": 1,
  "revenue-chart": 3,
};

const BLOCK_LABELS: Record<string, string> = {
  "daily-focus": "Daily Focus",
  "top-opportunities": "Top Opportunities",
  "segment-breakdown": "Segment Breakdown",
  "recent-tasks": "Recent Tasks",
  "icp-profiles": "ICP Profiles",
  "revenue-chart": "Revenue Chart",
};

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [blockOrder, setBlockOrder] = useState<string[]>(DEFAULT_BLOCK_ORDER);
  const [blockWidths, setBlockWidths] = useState<Record<string, BlockWidth>>(DEFAULT_BLOCK_WIDTHS);
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set());
  
  // Load saved order, widths, and collapsed states from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_BLOCK_ORDER.length) {
          setBlockOrder(parsed);
        }
      } catch (e) {
        console.error("Failed to parse saved block order");
      }
    }
    
    const savedWidths = localStorage.getItem(BLOCK_WIDTHS_KEY);
    if (savedWidths) {
      try {
        const parsed = JSON.parse(savedWidths);
        setBlockWidths({ ...DEFAULT_BLOCK_WIDTHS, ...parsed });
      } catch (e) {
        console.error("Failed to parse saved block widths");
      }
    }
    
    const savedCollapsed = localStorage.getItem(COLLAPSED_BLOCKS_KEY);
    if (savedCollapsed) {
      try {
        const parsed = JSON.parse(savedCollapsed);
        if (Array.isArray(parsed)) {
          setCollapsedBlocks(new Set(parsed));
        }
      } catch (e) {
        console.error("Failed to parse saved collapsed blocks");
      }
    }
  }, []);

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: dailyFocus, isLoading: isDailyFocusLoading } = useQuery<DailyFocusData>({
    queryKey: ["/api/daily-focus"],
  });

  const handleOpportunityClick = (row: DashboardStats["topOpportunities"][0]) => {
    navigate(`/accounts?account=${row.id}`);
  };

  const handleTaskClick = (taskId: number) => {
    navigate(`/playbooks?task=${taskId}`);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(blockOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setBlockOrder(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  };

  const resetLayout = () => {
    setBlockOrder(DEFAULT_BLOCK_ORDER);
    setBlockWidths(DEFAULT_BLOCK_WIDTHS);
    setCollapsedBlocks(new Set());
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BLOCK_WIDTHS_KEY);
    localStorage.removeItem(COLLAPSED_BLOCKS_KEY);
  };

  const setBlockWidth = (blockId: string, width: BlockWidth) => {
    const newWidths = { ...blockWidths, [blockId]: width };
    setBlockWidths(newWidths);
    localStorage.setItem(BLOCK_WIDTHS_KEY, JSON.stringify(newWidths));
  };

  const toggleCollapsed = (blockId: string) => {
    const newCollapsed = new Set(collapsedBlocks);
    if (newCollapsed.has(blockId)) {
      newCollapsed.delete(blockId);
    } else {
      newCollapsed.add(blockId);
    }
    setCollapsedBlocks(newCollapsed);
    localStorage.setItem(COLLAPSED_BLOCKS_KEY, JSON.stringify(Array.from(newCollapsed)));
  };

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

  // Calculate workflow progress
  const workflowSteps = [
    {
      id: "data",
      label: "Upload Data",
      description: "Import accounts and order history",
      completed: displayStats.totalAccounts > 0,
      href: "/data-uploads",
      icon: Upload,
    },
    {
      id: "icp",
      label: "Approve ICP",
      description: "Define Ideal Customer Profiles",
      completed: displayStats.icpProfiles.some(p => p.status === "approved"),
      href: "/icp-builder",
      icon: Target,
    },
    {
      id: "playbooks",
      label: "Generate Playbook",
      description: "Create AI-powered sales tasks",
      completed: displayStats.recentTasks.length > 0,
      href: "/playbooks",
      icon: Sparkles,
    },
    {
      id: "revenue",
      label: "Track Revenue",
      description: "Enroll accounts for rev-share",
      completed: displayStats.enrolledAccounts > 0,
      href: "/revenue",
      icon: TrendingUp,
    },
  ];
  
  const completedSteps = workflowSteps.filter(s => s.completed).length;
  const allComplete = completedSteps === workflowSteps.length;

  // Block render functions
  const renderBlock = (blockId: string) => {
    switch (blockId) {
      case "daily-focus":
        return (
          <Card className="border-primary/20 bg-primary/5" data-testid="card-daily-focus">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Focus className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Daily Focus</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Tasks requiring your attention today
                  </p>
                </div>
                <InfoTooltip
                  content="Your prioritized action list showing tasks due today and any overdue items from yesterday. Complete these first to stay on track with your sales goals."
                  testId="tooltip-daily-focus"
                />
              </div>
              <div className="flex items-center gap-2">
                {dailyFocus && dailyFocus.overdueCount > 0 && (
                  <Badge variant="destructive" className="gap-1" data-testid="badge-overdue-count">
                    <AlertCircle className="h-3 w-3" />
                    {dailyFocus.overdueCount} overdue
                  </Badge>
                )}
                {dailyFocus && dailyFocus.todayCount > 0 && (
                  <Badge variant="secondary" data-testid="badge-today-count">
                    {dailyFocus.todayCount} due today
                  </Badge>
                )}
                {!collapsedBlocks.has("daily-focus") && (
                  <Button variant="outline" size="sm" asChild data-testid="button-view-all-tasks">
                    <Link href="/playbooks">
                      View All Tasks
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                )}
                {renderBlockControls("daily-focus")}
              </div>
            </CardHeader>
            {!collapsedBlocks.has("daily-focus") && (
            <CardContent>
              {isDailyFocusLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : dailyFocus && dailyFocus.tasks.length > 0 ? (
                <div className="space-y-2">
                  {dailyFocus.tasks.slice(0, 5).map((task) => {
                    const TaskIcon = taskTypeIcons[task.taskType] || Phone;
                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover-elevate cursor-pointer"
                        onClick={() => handleTaskClick(task.id)}
                        data-testid={`daily-focus-task-${task.id}`}
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-md ${
                          task.isOverdue ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                        }`}>
                          <TaskIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{task.title}</span>
                            {task.isOverdue && (
                              <Badge variant="destructive" className="text-xs">Overdue</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{task.accountName}</span>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    );
                  })}
                  {dailyFocus.tasks.length > 5 && (
                    <Button variant="ghost" className="w-full" asChild>
                      <Link href="/playbooks">
                        View {dailyFocus.tasks.length - 5} more tasks
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-chart-2/10 text-chart-2 mb-3">
                    <Target className="h-6 w-6" />
                  </div>
                  <p className="font-medium text-chart-2">All caught up!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    No tasks due today. Generate a playbook to create new tasks.
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link href="/playbooks">Go to Playbooks</Link>
                  </Button>
                </div>
              )}
            </CardContent>
            )}
          </Card>
        );

      case "top-opportunities":
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div className="flex items-start gap-2">
                <div>
                  <CardTitle className="text-base">Top Opportunities</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Accounts with highest wallet share leakage
                  </p>
                </div>
                <InfoTooltip
                  content="Accounts ranked by opportunity score based on their category gaps vs ICP expectations. Higher scores indicate more potential revenue to capture from wallet share leakage."
                  testId="tooltip-top-opportunities"
                />
              </div>
              <div className="flex items-center gap-2">
                {!collapsedBlocks.has("top-opportunities") && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/accounts">View All</Link>
                  </Button>
                )}
                {renderBlockControls("top-opportunities")}
              </div>
            </CardHeader>
            {!collapsedBlocks.has("top-opportunities") && (
            <CardContent>
              <DataTable
                columns={opportunityColumns}
                data={displayStats.topOpportunities}
                testId="table-opportunities"
                onRowClick={handleOpportunityClick}
              />
            </CardContent>
            )}
          </Card>
        );

      case "segment-breakdown":
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div className="flex items-start gap-2">
                <div>
                  <CardTitle className="text-base">Segment Breakdown</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Accounts by contractor type
                  </p>
                </div>
                <InfoTooltip
                  content="Distribution of your accounts across customer segments (HVAC, Plumbing, Mechanical). Each segment has its own ICP profile defining expected category mix."
                  testId="tooltip-segment-breakdown"
                />
              </div>
              {renderBlockControls("segment-breakdown")}
            </CardHeader>
            {!collapsedBlocks.has("segment-breakdown") && (
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
                    <RechartsTooltip
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
            )}
          </Card>
        );

      case "recent-tasks":
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div className="flex items-start gap-2">
                <div>
                  <CardTitle className="text-base">Recent Tasks</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upcoming TM actions
                  </p>
                </div>
                <InfoTooltip
                  content="AI-generated sales tasks for Territory Managers including calls, emails, and site visits. Each task includes personalized scripts and talking points based on account gaps."
                  testId="tooltip-recent-tasks"
                />
              </div>
              <div className="flex items-center gap-2">
                {!collapsedBlocks.has("recent-tasks") && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/playbooks">View All</Link>
                  </Button>
                )}
                {renderBlockControls("recent-tasks")}
              </div>
            </CardHeader>
            {!collapsedBlocks.has("recent-tasks") && (
            <CardContent>
              <DataTable
                columns={taskColumns}
                data={displayStats.recentTasks}
                testId="table-tasks"
              />
            </CardContent>
            )}
          </Card>
        );

      case "icp-profiles":
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div className="flex items-start gap-2">
                <div>
                  <CardTitle className="text-base">ICP Profiles</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Segment profile status
                  </p>
                </div>
                <InfoTooltip
                  content="Ideal Customer Profiles (ICPs) define expected category mix for each segment based on Class A customer data. Use AI analysis to refine profiles and approve them for scoring."
                  testId="tooltip-icp-profiles"
                />
              </div>
              <div className="flex items-center gap-2">
                {!collapsedBlocks.has("icp-profiles") && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/icp-builder">Manage</Link>
                  </Button>
                )}
                {renderBlockControls("icp-profiles")}
              </div>
            </CardHeader>
            {!collapsedBlocks.has("icp-profiles") && (
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
            )}
          </Card>
        );

      case "revenue-chart":
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Revenue by Segment
                </CardTitle>
                <InfoTooltip
                  content="Total revenue contribution by customer segment. Compare segment performance to identify growth opportunities and track the impact of wallet share capture efforts."
                  testId="tooltip-revenue-by-segment"
                />
              </div>
              {renderBlockControls("revenue-chart")}
            </CardHeader>
            {!collapsedBlocks.has("revenue-chart") && (
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
                    <RechartsTooltip
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
            )}
          </Card>
        );

      default:
        return null;
    }
  };

  // Get the grid layout for different block types
  const getBlockLayout = (blockId: string) => {
    const width = blockWidths[blockId] || 1;
    switch (width) {
      case 3:
        return "lg:col-span-3";
      case 2:
        return "lg:col-span-2";
      default:
        return "";
    }
  };

  const renderBlockControls = (blockId: string) => {
    const isCollapsed = collapsedBlocks.has(blockId);
    const currentWidth = blockWidths[blockId] || 1;

    return (
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  data-testid={`resize-${blockId}`}
                >
                  <Columns className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Resize block width</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={() => setBlockWidth(blockId, 1)}
              className={currentWidth === 1 ? "bg-accent" : ""}
              data-testid={`resize-${blockId}-1`}
            >
              <span className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  <div className="w-2 h-4 bg-foreground rounded-sm" />
                </div>
                1 Column
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setBlockWidth(blockId, 2)}
              className={currentWidth === 2 ? "bg-accent" : ""}
              data-testid={`resize-${blockId}-2`}
            >
              <span className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  <div className="w-2 h-4 bg-foreground rounded-sm" />
                  <div className="w-2 h-4 bg-foreground rounded-sm" />
                </div>
                2 Columns
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setBlockWidth(blockId, 3)}
              className={currentWidth === 3 ? "bg-accent" : ""}
              data-testid={`resize-${blockId}-3`}
            >
              <span className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  <div className="w-2 h-4 bg-foreground rounded-sm" />
                  <div className="w-2 h-4 bg-foreground rounded-sm" />
                  <div className="w-2 h-4 bg-foreground rounded-sm" />
                </div>
                3 Columns (Full Width)
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => toggleCollapsed(blockId)}
              data-testid={`collapse-${blockId}`}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{isCollapsed ? "Expand block" : "Collapse block"}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor wallet share opportunities and track revenue growth
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetLayout} data-testid="button-reset-layout">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Layout
          </Button>
          <Button asChild data-testid="button-view-opportunities">
            <Link href="/accounts">
              View All Opportunities
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Workflow Progress - Getting Started Guide */}
      {!allComplete && (
        <Card className="border-chart-1/20 bg-chart-1/5" data-testid="card-getting-started">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Getting Started</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {completedSteps}/{workflowSteps.length} complete
                </Badge>
              </div>
              <InfoTooltip
                content="Complete these steps to set up your sales intelligence workflow. Each step builds on the previous one to create a complete revenue growth system."
                testId="tooltip-getting-started"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {workflowSteps.map((step, index) => {
                const StepIcon = step.icon;
                const isNextStep = !step.completed && workflowSteps.slice(0, index).every(s => s.completed);
                
                return (
                  <div key={step.id} className="flex items-center gap-4 flex-1">
                    <Link href={step.href}>
                      <div 
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                          step.completed 
                            ? "bg-chart-2/10 border-chart-2/30" 
                            : isNextStep
                            ? "bg-primary/10 border-primary/30 hover-elevate"
                            : "bg-muted/50 border-muted"
                        }`}
                        data-testid={`step-${step.id}`}
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          step.completed 
                            ? "bg-chart-2 text-chart-2-foreground" 
                            : isNextStep
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {step.completed ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <StepIcon className="h-4 w-4" />
                          )}
                        </div>
                        <div className="hidden md:block">
                          <p className={`text-sm font-medium ${step.completed ? "text-chart-2" : ""}`}>
                            {step.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                    {index < workflowSteps.length - 1 && (
                      <div className={`hidden lg:block h-0.5 flex-1 ${
                        step.completed ? "bg-chart-2/50" : "bg-muted"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards - Not draggable */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Accounts"
          value={displayStats.totalAccounts.toLocaleString()}
          icon={Users}
          trend={{ value: 12, label: "vs last month" }}
          testId="kpi-total-accounts"
          tooltip="The total number of customer accounts in your database that can be analyzed for wallet share opportunities."
        />
        <KPICard
          title="Enrolled Accounts"
          value={displayStats.enrolledAccounts.toLocaleString()}
          subtitle={`${((displayStats.enrolledAccounts / displayStats.totalAccounts) * 100).toFixed(0)}% of total`}
          icon={Target}
          trend={{ value: 8, label: "vs last month" }}
          testId="kpi-enrolled-accounts"
          tooltip="Accounts actively participating in the revenue growth program. These accounts are being tracked for incremental revenue to calculate rev-share fees."
        />
        <KPICard
          title="Total Revenue (12M)"
          value={formatCurrency(displayStats.totalRevenue)}
          icon={DollarSign}
          trend={{ value: 15, label: "YoY" }}
          testId="kpi-total-revenue"
          tooltip="Cumulative revenue from all accounts over the last 12 months. This serves as the baseline for measuring growth and calculating opportunities."
        />
        <KPICard
          title="Incremental Revenue"
          value={formatCurrency(displayStats.incrementalRevenue)}
          subtitle="From enrolled accounts"
          icon={TrendingUp}
          trend={{ value: 23, label: "vs baseline" }}
          testId="kpi-incremental-revenue"
          tooltip="Additional revenue generated from enrolled accounts above their baseline. This is the basis for calculating rev-share fees (15% of incremental revenue)."
        />
      </div>

      {/* Draggable Dashboard Blocks */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard-blocks">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {blockOrder.map((blockId, index) => (
                <Draggable key={blockId} draggableId={blockId} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`${getBlockLayout(blockId)} ${
                        snapshot.isDragging ? "z-50" : ""
                      }`}
                    >
                      <div className="relative group">
                        <div
                          {...provided.dragHandleProps}
                          className="absolute -left-2 top-4 z-10 flex items-center justify-center h-8 w-8 rounded-md bg-background border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                          data-testid={`drag-handle-${blockId}`}
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className={snapshot.isDragging ? "ring-2 ring-primary rounded-lg" : ""}>
                          {renderBlock(blockId)}
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
