import { useState, useEffect, useCallback, DragEvent } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Upload,
  Sparkles,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  Move,
  Maximize2,
  RectangleHorizontal,
  RectangleVertical,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import "react-grid-layout/css/styles.css";

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

const LAYOUT_STORAGE_KEY = "dashboard_grid_layout";
const COLLAPSED_BLOCKS_KEY = "dashboard_collapsed_blocks";
const LAYOUT_LOCKED_KEY = "dashboard_layout_locked";

const GRID_COLS = 12;
const ROW_HEIGHT = 80;

type WidthPreset = 3 | 4 | 6 | 8 | 9 | 12;
type HeightPreset = 'compact' | 'standard' | 'tall' | 'auto';

const WIDTH_OPTIONS: { value: WidthPreset; label: string; icon: string }[] = [
  { value: 3, label: 'Quarter', icon: '▢' },
  { value: 4, label: 'Third', icon: '▢▢' },
  { value: 6, label: 'Half', icon: '▢▢▢' },
  { value: 8, label: 'Two-thirds', icon: '▢▢▢▢' },
  { value: 9, label: '3/4', icon: '▢▢▢▢▢' },
  { value: 12, label: 'Full', icon: '▢▢▢▢▢▢' },
];

const HEIGHT_OPTIONS: { value: HeightPreset; label: string; pixels: string }[] = [
  { value: 'compact', label: 'Compact', pixels: '180px' },
  { value: 'standard', label: 'Standard', pixels: '300px' },
  { value: 'tall', label: 'Tall', pixels: '420px' },
  { value: 'auto', label: 'Auto', pixels: 'auto' },
];

const HEIGHT_CLASSES: Record<HeightPreset, string> = {
  compact: 'h-[180px]',
  standard: 'h-[300px]',
  tall: 'h-[420px]',
  auto: 'h-auto min-h-[180px]',
};

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: WidthPreset;
  h: number;
  heightPreset: HeightPreset;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: "daily-focus", x: 0, y: 0, w: 12, h: 4, heightPreset: 'standard', minW: 6, minH: 3 },
  { i: "top-opportunities", x: 0, y: 4, w: 6, h: 5, heightPreset: 'tall', minW: 4, minH: 4 },
  { i: "segment-breakdown", x: 6, y: 4, w: 6, h: 5, heightPreset: 'standard', minW: 3, minH: 4 },
  { i: "recent-tasks", x: 0, y: 9, w: 4, h: 5, heightPreset: 'tall', minW: 3, minH: 4 },
  { i: "icp-profiles", x: 4, y: 9, w: 8, h: 5, heightPreset: 'standard', minW: 3, minH: 4 },
  { i: "revenue-chart", x: 0, y: 14, w: 12, h: 5, heightPreset: 'tall', minW: 4, minH: 4 },
];

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
  const [layout, setLayout] = useState<LayoutItem[]>(DEFAULT_LAYOUT);
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set());
  const [isLayoutLocked, setIsLayoutLocked] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (savedLayout) {
      try {
        const parsed = JSON.parse(savedLayout);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_LAYOUT.length) {
          const migratedLayout = parsed.map((item: LayoutItem, index: number) => ({
            ...item,
            heightPreset: item.heightPreset ?? DEFAULT_LAYOUT[index]?.heightPreset ?? 'standard',
          }));
          setLayout(migratedLayout);
          if (parsed.some((item: LayoutItem) => !item.heightPreset)) {
            localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(migratedLayout));
          }
        }
      } catch (e) {
        console.error("Failed to parse saved layout");
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

    const savedLocked = localStorage.getItem(LAYOUT_LOCKED_KEY);
    if (savedLocked) {
      setIsLayoutLocked(savedLocked === "true");
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

  const saveLayout = useCallback((newLayout: LayoutItem[]) => {
    setLayout(newLayout);
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(newLayout));
  }, []);

  const handleDragStart = (e: DragEvent<HTMLDivElement>, blockId: string) => {
    if (isLayoutLocked) {
      e.preventDefault();
      return;
    }
    setDraggedId(blockId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", blockId);
    // Set a ghost image for visual feedback
    const target = e.currentTarget.closest('[data-testid^="grid-block-"]') as HTMLElement;
    if (target) {
      e.dataTransfer.setDragImage(target, 50, 50);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>, blockId: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== blockId) {
      setDragOverId(blockId);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    // Only clear if leaving the actual element, not children
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!e.currentTarget.contains(relatedTarget)) {
      setDragOverId(null);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData("text/plain");
    
    if (!sourceId || sourceId === targetId || isLayoutLocked) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    setLayout(prevLayout => {
      const newLayout = [...prevLayout];
      const draggedIndex = newLayout.findIndex(item => item.i === sourceId);
      const targetIndex = newLayout.findIndex(item => item.i === targetId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [draggedItem] = newLayout.splice(draggedIndex, 1);
        newLayout.splice(targetIndex, 0, draggedItem);
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(newLayout));
        return newLayout;
      }
      return prevLayout;
    });
    
    setDraggedId(null);
    setDragOverId(null);
  };

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT);
    setCollapsedBlocks(new Set());
    setIsLayoutLocked(false);
    localStorage.removeItem(LAYOUT_STORAGE_KEY);
    localStorage.removeItem(COLLAPSED_BLOCKS_KEY);
    localStorage.removeItem(LAYOUT_LOCKED_KEY);
  };

  const toggleLayoutLock = () => {
    const newLocked = !isLayoutLocked;
    setIsLayoutLocked(newLocked);
    localStorage.setItem(LAYOUT_LOCKED_KEY, String(newLocked));
  };

  const updateBlockSize = (blockId: string, width?: WidthPreset, height?: HeightPreset) => {
    setLayout(prevLayout => {
      const newLayout = prevLayout.map(item => {
        if (item.i === blockId) {
          return {
            ...item,
            w: width ?? item.w,
            heightPreset: height ?? item.heightPreset,
          };
        }
        return item;
      });
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(newLayout));
      return newLayout;
    });
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

  const mockStats: DashboardStats = {
    totalAccounts: 487,
    enrolledAccounts: 142,
    totalRevenue: 8540000,
    incrementalRevenue: 1240000,
    topOpportunities: [
      {
        id: 1,
        name: "ABC Plumbing Co",
        segment: "HVAC",
        opportunityScore: 92,
        estimatedValue: 45000,
        gapCategories: ["Ductwork", "Controls", "Insulation"],
      },
      {
        id: 2,
        name: "Elite HVAC Services",
        segment: "HVAC",
        opportunityScore: 88,
        estimatedValue: 38000,
        gapCategories: ["Copper Fittings", "Valves"],
      },
      {
        id: 3,
        name: "Metro Mechanical",
        segment: "Mechanical",
        opportunityScore: 85,
        estimatedValue: 52000,
        gapCategories: ["Pumps", "Motors", "Bearings"],
      },
      {
        id: 4,
        name: "Premier Plumbing",
        segment: "Plumbing",
        opportunityScore: 78,
        estimatedValue: 31000,
        gapCategories: ["Fixtures", "Water Heaters"],
      },
      {
        id: 5,
        name: "Quality Climate Control",
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

  const renderBlockHeader = (blockId: string, title: string, subtitle?: string, tooltipContent?: string, actions?: React.ReactNode) => {
    const isCollapsed = collapsedBlocks.has(blockId);
    const currentBlock = layout.find(item => item.i === blockId);
    const currentWidth = currentBlock?.w ?? 6;
    const currentHeight = currentBlock?.heightPreset ?? 'standard';
    
    return (
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{title}</CardTitle>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {subtitle}
              </p>
            )}
          </div>
          {tooltipContent && (
            <InfoTooltip
              content={tooltipContent}
              testId={`tooltip-${blockId}`}
            />
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {actions}
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
          {!isLayoutLocked && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    data-testid={`resize-${blockId}`}
                  >
                    <Maximize2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <RectangleHorizontal className="h-4 w-4" />
                        <span>Width</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {WIDTH_OPTIONS.map((option) => (
                          <Button
                            key={option.value}
                            variant={currentWidth === option.value ? "default" : "outline"}
                            size="sm"
                            className="text-xs px-2 h-7"
                            onClick={() => updateBlockSize(blockId, option.value, undefined)}
                            data-testid={`width-${blockId}-${option.value}`}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <RectangleVertical className="h-4 w-4" />
                        <span>Height</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {HEIGHT_OPTIONS.map((option) => (
                          <Button
                            key={option.value}
                            variant={currentHeight === option.value ? "default" : "outline"}
                            size="sm"
                            className="text-xs px-2 h-7"
                            onClick={() => updateBlockSize(blockId, undefined, option.value)}
                            data-testid={`height-${blockId}-${option.value}`}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <div 
                className="drag-handle cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded" 
                data-testid={`drag-handle-${blockId}`}
                draggable
                onDragStart={(e) => handleDragStart(e, blockId)}
                onDragEnd={handleDragEnd}
              >
                <Move className="h-4 w-4 text-muted-foreground" />
              </div>
            </>
          )}
        </div>
      </CardHeader>
    );
  };

  const renderBlock = (blockId: string) => {
    const isCollapsed = collapsedBlocks.has(blockId);
    
    switch (blockId) {
      case "daily-focus":
        return (
          <Card className="h-full flex flex-col border-primary/20 bg-primary/5 overflow-hidden" data-testid="card-daily-focus">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                  <Focus className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg">Daily Focus</CardTitle>
                  <p className="text-sm text-muted-foreground truncate">
                    Tasks requiring your attention today
                  </p>
                </div>
                <InfoTooltip
                  content="Your prioritized action list showing tasks due today and any overdue items from yesterday. Complete these first to stay on track with your sales goals."
                  testId="tooltip-daily-focus"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
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
                {!isCollapsed && (
                  <Button variant="outline" size="sm" asChild data-testid="button-view-all-tasks">
                    <Link href="/playbooks">
                      View All Tasks
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                )}
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
                {!isLayoutLocked && (
                  <>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          data-testid={`resize-${blockId}`}
                        >
                          <Maximize2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3" align="end">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <RectangleHorizontal className="h-4 w-4" />
                              <span>Width</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {WIDTH_OPTIONS.map((option) => (
                                <Button
                                  key={option.value}
                                  variant={(layout.find(item => item.i === blockId)?.w ?? 12) === option.value ? "default" : "outline"}
                                  size="sm"
                                  className="text-xs px-2 h-7"
                                  onClick={() => updateBlockSize(blockId, option.value, undefined)}
                                  data-testid={`width-${blockId}-${option.value}`}
                                >
                                  {option.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <RectangleVertical className="h-4 w-4" />
                              <span>Height</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {HEIGHT_OPTIONS.map((option) => (
                                <Button
                                  key={option.value}
                                  variant={(layout.find(item => item.i === blockId)?.heightPreset ?? 'standard') === option.value ? "default" : "outline"}
                                  size="sm"
                                  className="text-xs px-2 h-7"
                                  onClick={() => updateBlockSize(blockId, undefined, option.value)}
                                  data-testid={`height-${blockId}-${option.value}`}
                                >
                                  {option.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <div 
                      className="drag-handle cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded" 
                      data-testid={`drag-handle-${blockId}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, blockId)}
                      onDragEnd={handleDragEnd}
                    >
                      <Move className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </>
                )}
              </div>
            </CardHeader>
            {!isCollapsed && (
              <CardContent className="flex-1 overflow-y-auto overflow-x-hidden">
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
          <Card className="h-full flex flex-col overflow-hidden">
            {renderBlockHeader(
              blockId,
              "Top Opportunities",
              "Accounts with highest wallet share leakage",
              "Accounts ranked by opportunity score based on their category gaps vs ICP expectations. Higher scores indicate more potential revenue to capture from wallet share leakage.",
              !isCollapsed && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/accounts">View All</Link>
                </Button>
              )
            )}
            {!isCollapsed && (
              <CardContent className="flex-1 overflow-y-auto overflow-x-auto">
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
          <Card className="h-full flex flex-col overflow-hidden">
            {renderBlockHeader(
              blockId,
              "Segment Breakdown",
              "Accounts by contractor type",
              "Distribution of your accounts across customer segments (HVAC, Plumbing, Mechanical). Each segment has its own ICP profile defining expected category mix."
            )}
            {!isCollapsed && (
              <CardContent className="flex-1 overflow-y-auto overflow-x-hidden">
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
          <Card className="h-full flex flex-col overflow-hidden">
            {renderBlockHeader(
              blockId,
              "Recent Tasks",
              "Upcoming TM actions",
              "AI-generated sales tasks for Territory Managers including calls, emails, and site visits. Each task includes personalized scripts and talking points based on account gaps.",
              !isCollapsed && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/playbooks">View All</Link>
                </Button>
              )
            )}
            {!isCollapsed && (
              <CardContent className="flex-1 overflow-y-auto overflow-x-auto">
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
          <Card className="h-full flex flex-col overflow-hidden">
            {renderBlockHeader(
              blockId,
              "ICP Profiles",
              "Segment profile status",
              "Ideal Customer Profiles (ICPs) define expected category mix for each segment based on Class A customer data. Use AI analysis to refine profiles and approve them for scoring.",
              !isCollapsed && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/icp-builder">Manage</Link>
                </Button>
              )
            )}
            {!isCollapsed && (
              <CardContent className="flex-1 overflow-y-auto overflow-x-hidden">
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
          <Card className="h-full flex flex-col overflow-hidden">
            {renderBlockHeader(
              blockId,
              "Revenue by Segment",
              undefined,
              "Total revenue contribution by customer segment. Compare segment performance to identify growth opportunities and track the impact of wallet share capture efforts."
            )}
            {!isCollapsed && (
              <CardContent className="flex-1 overflow-y-auto overflow-x-auto">
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={isLayoutLocked ? "default" : "outline"} 
                size="sm" 
                onClick={toggleLayoutLock}
                data-testid="button-toggle-lock"
              >
                {isLayoutLocked ? (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Layout Locked
                  </>
                ) : (
                  <>
                    <Unlock className="mr-2 h-4 w-4" />
                    Edit Layout
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isLayoutLocked ? "Unlock to edit dashboard layout" : "Lock layout to prevent changes"}</p>
            </TooltipContent>
          </Tooltip>
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

      {!isLayoutLocked && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-dashed">
          <Move className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Drag blocks to reorder. Click the resize icon to adjust width and height. Lock when done.
          </span>
        </div>
      )}

      <div id="dashboard-grid-container" className="grid grid-cols-12 gap-4 w-full">
        {layout.map((item) => {
          const isBeingDragged = draggedId === item.i;
          const isDragOver = dragOverId === item.i && draggedId !== item.i;
          const isCollapsed = collapsedBlocks.has(item.i);
          const heightClass = isCollapsed ? 'h-auto' : HEIGHT_CLASSES[item.heightPreset];
          
          const getWidthClasses = (w: WidthPreset) => {
            switch (w) {
              case 3: return "col-span-12 sm:col-span-6 lg:col-span-3";
              case 4: return "col-span-12 sm:col-span-6 lg:col-span-4";
              case 6: return "col-span-12 md:col-span-6";
              case 8: return "col-span-12 lg:col-span-8";
              case 9: return "col-span-12 lg:col-span-9";
              case 12: return "col-span-12";
              default: return "col-span-12 md:col-span-6";
            }
          };
          
          return (
            <div
              key={item.i}
              data-testid={`grid-block-${item.i}`}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, item.i)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, item.i)}
              className={`
                ${getWidthClasses(item.w)}
                ${heightClass}
                transition-all duration-200 ease-in-out
                ${isBeingDragged ? "opacity-50 scale-95" : ""}
                ${isDragOver ? "ring-2 ring-primary ring-offset-2" : ""}
              `}
            >
              {renderBlock(item.i)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
