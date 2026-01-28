import { useState, useEffect, useCallback, DragEvent, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
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
  GraduationCap,
  Trophy,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Settings2,
  Columns,
  Eye,
  EyeOff,
  CreditCard,
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
  topOpportunities: AccountWithMetrics[];
  recentTasks: Array<{
    id: number;
    accountId: number;
    playbookId: number | null;
    accountName: string;
    taskType: string;
    title: string;
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

interface AccountWithMetrics {
  id: number;
  name: string;
  segment: string;
  region: string;
  assignedTm: string;
  status: string;
  last12mRevenue: number;
  categoryPenetration: number;
  opportunityScore: number;
  gapCategories: Array<{
    name: string;
    gapPct: number;
    estimatedValue: number;
  }>;
  enrolled: boolean;
}

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
  status: "active" | "paused" | "graduated";
}

type OpportunitySortKey = "opportunityScore" | "name" | "segment" | "region" | "last12mRevenue" | "categoryPenetration" | "enrolled";
type SortDirection = "asc" | "desc";

const OPPORTUNITY_COLUMNS_STORAGE_KEY = "dashboard_opportunity_columns";

const ALL_OPPORTUNITY_COLUMNS = [
  { key: "name", label: "Account", default: true },
  { key: "segment", label: "Segment", default: true },
  { key: "region", label: "Region", default: false },
  { key: "last12mRevenue", label: "Revenue (12M)", default: false },
  { key: "categoryPenetration", label: "Penetration", default: false },
  { key: "opportunityScore", label: "Score", default: true },
  { key: "enrolled", label: "Status", default: true },
] as const;

interface GraduationReadyData {
  count: number;
  accounts: Array<{
    programAccountId: number;
    accountId: number;
    accountName: string;
    enrolledAt: string;
    objectivesMet: { penetration: boolean; revenue: boolean; duration: boolean };
  }>;
}

interface GraduationAnalyticsData {
  totalGraduated: number;
  cumulativeRevenueGrowth: number; // Sum of incremental revenue across all graduated accounts
  avgDaysToGraduation: number;
  avgRevenueGrowth: number; // Average incremental revenue per account
  avgIcpCategorySuccessRate: number; // % of ICP gaps filled
  graduatedAccounts: Array<{
    id: number;
    accountId: number;
    accountName: string;
    segment: string | null;
    enrolledAt: string;
    graduatedAt: string | null;
    baselineRevenue: number;
    graduationRevenue: number; // Cumulative revenue during enrollment
    revenueGrowth: number; // Incremental revenue = graduationRevenue - proRatedBaseline
    enrollmentDurationDays: number | null;
    icpCategoriesAtEnrollment: number | null; // ICP gaps at enrollment
    icpCategoriesAchieved: number | null; // ICP gaps filled
    icpSuccessRate: number; // % of gaps filled
    graduationPenetration: number | null;
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
  
  // Opportunity table sorting state (default: score descending)
  const [opportunitySortKey, setOpportunitySortKey] = useState<OpportunitySortKey>("opportunityScore");
  const [opportunitySortDir, setOpportunitySortDir] = useState<SortDirection>("desc");
  
  // Column visibility state for opportunity table
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    // Initialize with defaults first (SSR-safe)
    return new Set(
      ALL_OPPORTUNITY_COLUMNS.filter((col) => col.default).map((col) => col.key)
    );
  });
  
  // Load saved column visibility from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(OPPORTUNITY_COLUMNS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setVisibleColumns(new Set(parsed));
        }
      } catch (e) {
        console.error("Failed to parse saved column visibility");
      }
    }
  }, []);

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

  const { data: graduationReady } = useQuery<GraduationReadyData>({
    queryKey: ["/api/program-accounts/graduation-ready"],
  });

  const { data: graduationAnalytics } = useQuery<GraduationAnalyticsData>({
    queryKey: ["/api/program-accounts/graduation-analytics"],
  });

  // Fetch enrolled accounts for revenue by segment
  const { data: enrolledAccounts } = useQuery<EnrolledAccount[]>({
    queryKey: ["/api/program-accounts"],
  });

  // Fetch all accounts for Top Opportunities (same data as Accounts page)
  const { data: allAccounts, isLoading: isAccountsLoading, isError: isAccountsError, error: accountsError } = useQuery<AccountWithMetrics[]>({
    queryKey: ["/api/accounts"],
  });

  // Check if accounts error is due to subscription requirement (402 status)
  const isSubscriptionRequired = isAccountsError && accountsError?.message?.includes("402");

  // Toggle column visibility
  const toggleColumnVisibility = useCallback((columnKey: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        // Don't allow hiding all columns - keep at least one
        if (newSet.size > 1) {
          newSet.delete(columnKey);
        }
      } else {
        newSet.add(columnKey);
      }
      localStorage.setItem(OPPORTUNITY_COLUMNS_STORAGE_KEY, JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  }, []);

  // Handle sort column click
  const handleSortClick = useCallback((key: OpportunitySortKey) => {
    if (opportunitySortKey === key) {
      setOpportunitySortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setOpportunitySortKey(key);
      setOpportunitySortDir(key === "opportunityScore" ? "desc" : "asc");
    }
  }, [opportunitySortKey]);

  // Sorted accounts for Top Opportunities (top 10 from /api/accounts - same as Accounts page)
  const sortedTopOpportunities = useMemo(() => {
    const accounts = allAccounts || [];
    if (accounts.length === 0) return [];
    
    // First sort all accounts by the selected column
    const sorted = [...accounts].sort((a, b) => {
      let comparison = 0;
      switch (opportunitySortKey) {
        case "opportunityScore":
          comparison = a.opportunityScore - b.opportunityScore;
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "segment":
          comparison = a.segment.localeCompare(b.segment);
          break;
        case "region":
          comparison = (a.region || "").localeCompare(b.region || "");
          break;
        case "last12mRevenue":
          comparison = a.last12mRevenue - b.last12mRevenue;
          break;
        case "categoryPenetration":
          comparison = a.categoryPenetration - b.categoryPenetration;
          break;
        case "enrolled":
          comparison = (a.enrolled ? 1 : 0) - (b.enrolled ? 1 : 0);
          break;
        default:
          comparison = 0;
      }
      return opportunitySortDir === "asc" ? comparison : -comparison;
    });
    
    // Return top 10 accounts
    return sorted.slice(0, 10);
  }, [allAccounts, opportunitySortKey, opportunitySortDir]);

  // Revenue by segment from enrolled accounts
  const revenueBySegment = useMemo(() => {
    if (!enrolledAccounts || enrolledAccounts.length === 0) return null;
    
    const segmentMap = new Map<string, { segment: string; revenue: number; count: number }>();
    
    enrolledAccounts.forEach(account => {
      const existing = segmentMap.get(account.segment);
      if (existing) {
        existing.revenue += account.currentRevenue;
        existing.count += 1;
      } else {
        segmentMap.set(account.segment, {
          segment: account.segment,
          revenue: account.currentRevenue,
          count: 1,
        });
      }
    });
    
    return Array.from(segmentMap.values());
  }, [enrolledAccounts]);

  const handleTaskClick = (taskOrId: number | DashboardStats["recentTasks"][0]) => {
    if (typeof taskOrId === "number") {
      navigate(`/playbooks?task=${taskOrId}`);
    } else {
      const task = taskOrId;
      if (task.playbookId) {
        navigate(`/playbooks?playbook=${task.playbookId}&task=${task.id}`);
      } else {
        navigate(`/playbooks?task=${task.id}`);
      }
    }
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

  // Render sortable header with icon
  const renderSortableHeader = (key: OpportunitySortKey, label: string) => (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors text-left"
      onClick={() => handleSortClick(key)}
      data-testid={`sort-${key}`}
    >
      {label}
      {opportunitySortKey === key ? (
        opportunitySortDir === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </button>
  );

  // Build columns based on visibility
  const opportunityColumns = useMemo(() => {
    const allColumns = [
      {
        key: "name",
        header: renderSortableHeader("name", "Account"),
        cell: (row: AccountWithMetrics) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">{row.name}</span>
              <span className="text-xs text-muted-foreground">{row.assignedTm}</span>
            </div>
          </div>
        ),
      },
      {
        key: "segment",
        header: renderSortableHeader("segment", "Segment"),
        cell: (row: AccountWithMetrics) => (
          <Badge variant="outline">{row.segment}</Badge>
        ),
      },
      {
        key: "region",
        header: renderSortableHeader("region", "Region"),
        cell: (row: AccountWithMetrics) => (
          <span className="text-muted-foreground">{row.region}</span>
        ),
      },
      {
        key: "last12mRevenue",
        header: renderSortableHeader("last12mRevenue", "Revenue (12M)"),
        cell: (row: AccountWithMetrics) => (
          <span className="font-semibold">{formatCurrency(row.last12mRevenue)}</span>
        ),
      },
      {
        key: "categoryPenetration",
        header: renderSortableHeader("categoryPenetration", "Penetration"),
        cell: (row: AccountWithMetrics) => (
          <ProgressRing
            value={row.categoryPenetration}
            size={36}
            strokeWidth={4}
            testId={`penetration-${row.id}`}
          />
        ),
      },
      {
        key: "opportunityScore",
        header: renderSortableHeader("opportunityScore", "Score"),
        cell: (row: AccountWithMetrics) => (
          <ScoreBadge score={row.opportunityScore} testId={`score-${row.id}`} />
        ),
      },
      {
        key: "enrolled",
        header: renderSortableHeader("enrolled", "Status"),
        cell: (row: AccountWithMetrics) => (
          <Badge variant={row.enrolled ? "default" : "secondary"}>
            {row.enrolled ? "Enrolled" : "Not Enrolled"}
          </Badge>
        ),
      },
    ];
    
    return allColumns.filter(col => visibleColumns.has(col.key));
  }, [visibleColumns, opportunitySortKey, opportunitySortDir]);

  const taskColumns = [
    {
      key: "title",
      header: "Task",
      cell: (row: DashboardStats["recentTasks"][0]) => (
        <div className="flex flex-col">
          <span className="font-medium truncate max-w-[200px]">{row.title}</span>
          <span className="text-xs text-muted-foreground">{row.accountName}</span>
        </div>
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
        region: "Northeast",
        assignedTm: "John Smith",
        status: "active",
        last12mRevenue: 125000,
        categoryPenetration: 65,
        opportunityScore: 92,
        gapCategories: [
          { name: "Ductwork", gapPct: 25, estimatedValue: 15000 },
          { name: "Controls", gapPct: 20, estimatedValue: 12000 },
          { name: "Insulation", gapPct: 18, estimatedValue: 18000 },
        ],
        enrolled: false,
      },
      {
        id: 2,
        name: "Elite HVAC Services",
        segment: "HVAC",
        region: "Southwest",
        assignedTm: "Sarah Johnson",
        status: "active",
        last12mRevenue: 98000,
        categoryPenetration: 72,
        opportunityScore: 88,
        gapCategories: [
          { name: "Copper Fittings", gapPct: 22, estimatedValue: 20000 },
          { name: "Valves", gapPct: 18, estimatedValue: 18000 },
        ],
        enrolled: true,
      },
      {
        id: 3,
        name: "Metro Mechanical",
        segment: "Mechanical",
        region: "Midwest",
        assignedTm: "Mike Williams",
        status: "active",
        last12mRevenue: 185000,
        categoryPenetration: 58,
        opportunityScore: 85,
        gapCategories: [
          { name: "Pumps", gapPct: 30, estimatedValue: 25000 },
          { name: "Motors", gapPct: 22, estimatedValue: 17000 },
          { name: "Bearings", gapPct: 15, estimatedValue: 10000 },
        ],
        enrolled: false,
      },
      {
        id: 4,
        name: "Premier Plumbing",
        segment: "Plumbing",
        region: "Southeast",
        assignedTm: "Lisa Brown",
        status: "active",
        last12mRevenue: 76000,
        categoryPenetration: 80,
        opportunityScore: 78,
        gapCategories: [
          { name: "Fixtures", gapPct: 15, estimatedValue: 18000 },
          { name: "Water Heaters", gapPct: 12, estimatedValue: 13000 },
        ],
        enrolled: true,
      },
      {
        id: 5,
        name: "Quality Climate Control",
        segment: "HVAC",
        region: "West",
        assignedTm: "Tom Davis",
        status: "active",
        last12mRevenue: 62000,
        categoryPenetration: 88,
        opportunityScore: 68,
        gapCategories: [
          { name: "Refrigerant", gapPct: 10, estimatedValue: 25000 },
        ],
        enrolled: false,
      },
    ],
    recentTasks: [
      { id: 1, accountId: 1, playbookId: 1, accountName: "ABC Plumbing", taskType: "Call", title: "Follow up on product demo", status: "pending", dueDate: "Today" },
      { id: 2, accountId: 2, playbookId: 1, accountName: "Elite HVAC", taskType: "Email", title: "Send pricing proposal", status: "in_progress", dueDate: "Tomorrow" },
      { id: 3, accountId: 3, playbookId: 2, accountName: "Metro Mechanical", taskType: "Visit", title: "Site visit for assessment", status: "completed", dueDate: "Jan 20" },
      { id: 4, accountId: 4, playbookId: null, accountName: "Premier Plumbing", taskType: "Call", title: "Quarterly review call", status: "pending", dueDate: "Jan 25" },
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
              `Top 10 accounts by ${ALL_OPPORTUNITY_COLUMNS.find(c => c.key === opportunitySortKey)?.label || "Score"}`,
              "Accounts ranked by opportunity score based on their category gaps vs ICP expectations. Higher scores indicate more potential revenue to capture from wallet share leakage. Click column headers to sort.",
              !isCollapsed && (
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-columns-visibility">
                        <Columns className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Show Columns</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {ALL_OPPORTUNITY_COLUMNS.map((col) => (
                        <DropdownMenuCheckboxItem
                          key={col.key}
                          checked={visibleColumns.has(col.key)}
                          onCheckedChange={() => toggleColumnVisibility(col.key)}
                          data-testid={`toggle-column-${col.key}`}
                        >
                          {col.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="ghost" size="sm" asChild data-testid="button-view-all-opportunities">
                    <Link href="/accounts">View All</Link>
                  </Button>
                </div>
              )
            )}
            {!isCollapsed && (
              <CardContent className="flex-1 overflow-y-auto overflow-x-auto">
                {isAccountsLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : sortedTopOpportunities.length > 0 ? (
                  <DataTable
                    columns={opportunityColumns}
                    data={sortedTopOpportunities}
                    testId="table-opportunities"
                    onRowClick={(row: AccountWithMetrics) => navigate(`/accounts?account=${row.id}`)}
                  />
                ) : isSubscriptionRequired ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center" data-testid="subscription-required-message">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
                      <CreditCard className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-medium">Subscription Required</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Upgrade your plan to unlock Top Opportunities
                    </p>
                    <Button size="sm" className="mt-3" asChild>
                      <Link href="/subscription">View Plans</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                      <Users className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium">No accounts found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload account data to see opportunities
                    </p>
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link href="/data-uploads">Upload Data</Link>
                    </Button>
                  </div>
                )}
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
                {displayStats.recentTasks.length > 0 ? (
                  <DataTable
                    columns={taskColumns}
                    data={displayStats.recentTasks}
                    testId="table-tasks"
                    onRowClick={handleTaskClick}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                      <Sparkles className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium">No tasks yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Generate a playbook to create tasks
                    </p>
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link href="/playbooks">Generate Playbook</Link>
                    </Button>
                  </div>
                )}
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
        // Use revenue data from enrolled accounts if available, otherwise fall back to dashboard stats
        const chartData = revenueBySegment || displayStats.segmentBreakdown;
        return (
          <Card className="h-full flex flex-col overflow-hidden">
            {renderBlockHeader(
              blockId,
              "Revenue by Segment",
              revenueBySegment ? "From enrolled accounts" : "All accounts",
              "Revenue contribution by customer segment from enrolled accounts. This data is connected to Revenue Tracking. Enroll more accounts to see more detailed segment breakdown.",
              !isCollapsed && (
                <Button variant="ghost" size="sm" asChild data-testid="button-view-revenue">
                  <Link href="/revenue">View Details</Link>
                </Button>
              )
            )}
            {!isCollapsed && (
              <CardContent className="flex-1 overflow-y-auto overflow-x-auto">
                {chartData && chartData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
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
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                      <DollarSign className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium">No revenue data</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Enroll accounts to track revenue by segment
                    </p>
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link href="/revenue">Go to Revenue Tracking</Link>
                    </Button>
                  </div>
                )}
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                data-testid="button-layout-menu"
              >
                {isLayoutLocked ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <Unlock className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={isLayoutLocked}
                onCheckedChange={toggleLayoutLock}
                data-testid="toggle-layout-lock"
              >
                <Lock className="mr-2 h-4 w-4" />
                Lock Layout
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={resetLayout}
                data-testid="button-reset-layout"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Layout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

      {/* Graduation Ready Quick Access */}
      {graduationReady && graduationReady.count > 0 && (
        <Link href="/revenue">
          <Card className="border-chart-2/30 bg-chart-2/5 hover-elevate cursor-pointer" data-testid="card-graduation-ready">
            <CardContent className="py-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-chart-2/20">
                    <GraduationCap className="h-4 w-4 text-chart-2" />
                  </div>
                  <div>
                    <p className="font-medium text-chart-2">
                      {graduationReady.count} Account{graduationReady.count > 1 ? "s" : ""} Ready to Graduate
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Click to review and graduate successful accounts
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {graduationReady.accounts.slice(0, 2).map(acc => (
                    <Badge key={acc.programAccountId} variant="outline" className="bg-background">
                      <Trophy className="h-3 w-3 mr-1 text-chart-2" />
                      {acc.accountName}
                    </Badge>
                  ))}
                  {graduationReady.count > 2 && (
                    <Badge variant="outline" className="bg-background">
                      +{graduationReady.count - 2} more
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Graduation Success Block - Shows when there are graduated accounts */}
      {graduationAnalytics && graduationAnalytics.totalGraduated > 0 && (
        <Card className="border-chart-3/30 bg-chart-3/5" data-testid="card-graduation-success">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-chart-3/20">
                  <Trophy className="h-4 w-4 text-chart-3" />
                </div>
                <div>
                  <CardTitle className="text-lg">Graduation Success</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Wallet share captured from graduated accounts
                  </p>
                </div>
              </div>
              <Link href="/revenue">
                <Button variant="outline" size="sm" data-testid="button-view-graduates">
                  View All Graduates
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-background/50">
                <p className="text-2xl font-bold text-chart-3" data-testid="stat-graduated-count">
                  {graduationAnalytics.totalGraduated}
                </p>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-muted-foreground">Accounts Graduated</p>
                  <InfoTooltip 
                    content="Total number of accounts that have successfully completed the program and met their graduation objectives."
                    testId="tooltip-graduated-count"
                  />
                </div>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <p className="text-2xl font-bold text-chart-1" data-testid="stat-revenue-growth">
                  {formatCurrency(graduationAnalytics.cumulativeRevenueGrowth)}
                </p>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-muted-foreground">Incremental Revenue</p>
                  <InfoTooltip 
                    content="Sum of incremental revenue across all graduated accounts. Calculated as: Graduation Revenue - Pro-rated Baseline. The baseline is adjusted to match enrollment duration for fair comparison."
                    testId="tooltip-incremental-revenue"
                  />
                </div>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <p className="text-2xl font-bold" data-testid="stat-avg-days">
                  {graduationAnalytics.avgDaysToGraduation}
                </p>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-muted-foreground">Avg Days to Graduate</p>
                  <InfoTooltip 
                    content="Average number of days from enrollment to graduation across all graduated accounts. Calculated as: Total enrollment days / Number of graduated accounts."
                    testId="tooltip-avg-days"
                  />
                </div>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <p className="text-2xl font-bold text-chart-2" data-testid="stat-icp-success">
                  {graduationAnalytics.avgIcpCategorySuccessRate}%
                </p>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-muted-foreground">Avg ICP Category Success</p>
                  <InfoTooltip 
                    content="Average percentage of ICP category gaps filled at graduation. Calculated as: (Categories Achieved / Categories Missing at Enrollment) × 100, averaged across all graduated accounts with ICP data."
                    testId="tooltip-icp-success"
                  />
                </div>
              </div>
            </div>
            
            {/* Recent Graduates with Revenue Details */}
            {graduationAnalytics.graduatedAccounts.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Recent Graduates</p>
                <div className="space-y-2">
                  {graduationAnalytics.graduatedAccounts.slice(0, 5).map((account) => (
                    <Card 
                      key={account.id}
                      className="p-3"
                      data-testid={`card-graduate-${account.id}`}
                    >
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-chart-3/20" data-testid={`icon-graduate-${account.id}`}>
                            <Trophy className="h-4 w-4 text-chart-3" />
                          </div>
                          <div>
                            <p className="font-medium" data-testid={`text-graduate-name-${account.id}`}>{account.accountName}</p>
                            <p className="text-xs text-muted-foreground" data-testid={`text-graduate-info-${account.id}`}>
                              {account.segment || "No segment"} 
                              {account.enrollmentDurationDays && ` · ${account.enrollmentDurationDays} days enrolled`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right flex-wrap">
                          <div>
                            <p className="text-xs text-muted-foreground">Baseline</p>
                            <p className="text-sm font-medium" data-testid={`text-baseline-${account.id}`}>{formatCurrency(account.baselineRevenue)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">At Graduation</p>
                            <p className="text-sm font-medium" data-testid={`text-graduation-revenue-${account.id}`}>{formatCurrency(account.graduationRevenue)}</p>
                          </div>
                          <div className="min-w-[80px]">
                            <p className="text-xs text-muted-foreground">Growth</p>
                            <p className={`text-sm font-bold ${account.revenueGrowth > 0 ? 'text-chart-1' : 'text-muted-foreground'}`} data-testid={`text-growth-${account.id}`}>
                              {account.revenueGrowth > 0 ? '+' : ''}{formatCurrency(account.revenueGrowth)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {graduationAnalytics.graduatedAccounts.length > 5 && (
                    <Link href="/revenue">
                      <Button variant="ghost" size="sm" className="w-full" data-testid="button-more-graduates">
                        View {graduationAnalytics.graduatedAccounts.length - 5} more graduates
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
