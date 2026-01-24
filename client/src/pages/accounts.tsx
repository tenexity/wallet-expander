import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import { ScoreBadge } from "@/components/score-badge";
import { ProgressRing } from "@/components/progress-ring";
import { EmptyState } from "@/components/empty-state";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  Users,
  Download,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Target,
  AlertTriangle,
  HelpCircle,
  ArrowUpDown,
  Settings,
  ExternalLink,
  Sparkles,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

export default function Accounts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("default");
  const [selectedAccount, setSelectedAccount] = useState<AccountWithMetrics | null>(null);
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  const [taskType, setTaskType] = useState<string>("call");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const searchParams = useSearch();
  const { toast } = useToast();

  const { data: accounts, isLoading } = useQuery<AccountWithMetrics[]>({
    queryKey: ["/api/accounts"],
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: {
      accountId: number;
      taskType: string;
      title: string;
      description: string;
      assignedTm: string;
      dueDate: string;
      status: string;
    }) => {
      const response = await apiRequest("POST", "/api/tasks", taskData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task created",
        description: "The task has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-focus"] });
      setShowCreateTaskDialog(false);
      resetTaskForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetTaskForm = () => {
    setTaskType("call");
    setTaskTitle("");
    setTaskDescription("");
    setTaskDueDate("");
  };

  const handleCreateTask = () => {
    if (!selectedAccount || !taskTitle.trim()) return;
    
    createTaskMutation.mutate({
      accountId: selectedAccount.id,
      taskType: taskType,
      title: taskTitle,
      description: taskDescription,
      assignedTm: selectedAccount.assignedTm,
      dueDate: taskDueDate || new Date().toISOString(),
      status: "pending",
    });
  };

  interface ScoringWeights {
    gapSizeWeight: number;
    revenuePotentialWeight: number;
    categoryCountWeight: number;
  }

  const { data: scoringWeights } = useQuery<ScoringWeights>({
    queryKey: ["/api/scoring-weights"],
  });

  const weights = scoringWeights || {
    gapSizeWeight: 40,
    revenuePotentialWeight: 30,
    categoryCountWeight: 30,
  };

  // Mock data for demonstration
  const mockAccounts: AccountWithMetrics[] = [
    {
      id: 1,
      name: "ABC Plumbing Co",
      segment: "Plumbing",
      region: "Northeast",
      assignedTm: "John Smith",
      status: "active",
      last12mRevenue: 125000,
      categoryPenetration: 45,
      opportunityScore: 87,
      gapCategories: [
        { name: "Water Heaters", gapPct: 35, estimatedValue: 18000 },
        { name: "Tools & Safety", gapPct: 28, estimatedValue: 12000 },
        { name: "PVF", gapPct: 15, estimatedValue: 8000 },
      ],
      enrolled: true,
    },
    {
      id: 2,
      name: "Elite HVAC Services",
      segment: "HVAC",
      region: "Southeast",
      assignedTm: "Sarah Johnson",
      status: "active",
      last12mRevenue: 210000,
      categoryPenetration: 52,
      opportunityScore: 82,
      gapCategories: [
        { name: "Controls & Thermostats", gapPct: 25, estimatedValue: 15000 },
        { name: "Pipe & Fittings", gapPct: 20, estimatedValue: 12000 },
      ],
      enrolled: true,
    },
    {
      id: 3,
      name: "Metro Mechanical",
      segment: "Mechanical",
      region: "Midwest",
      assignedTm: "Mike Wilson",
      status: "active",
      last12mRevenue: 175000,
      categoryPenetration: 38,
      opportunityScore: 76,
      gapCategories: [
        { name: "Water Heaters", gapPct: 40, estimatedValue: 22000 },
        { name: "Ductwork", gapPct: 18, estimatedValue: 10000 },
      ],
      enrolled: false,
    },
    {
      id: 4,
      name: "Premier Plumbing",
      segment: "Plumbing",
      region: "Northeast",
      assignedTm: "John Smith",
      status: "active",
      last12mRevenue: 98000,
      categoryPenetration: 55,
      opportunityScore: 71,
      gapCategories: [
        { name: "PVF", gapPct: 22, estimatedValue: 8000 },
        { name: "Tools", gapPct: 18, estimatedValue: 6000 },
      ],
      enrolled: false,
    },
    {
      id: 5,
      name: "Climate Control Inc",
      segment: "HVAC",
      region: "West",
      assignedTm: "Lisa Brown",
      status: "active",
      last12mRevenue: 320000,
      categoryPenetration: 68,
      opportunityScore: 68,
      gapCategories: [
        { name: "Refrigerant & Supplies", gapPct: 15, estimatedValue: 12000 },
      ],
      enrolled: true,
    },
    {
      id: 6,
      name: "Superior Heating",
      segment: "HVAC",
      region: "Midwest",
      assignedTm: "Mike Wilson",
      status: "active",
      last12mRevenue: 145000,
      categoryPenetration: 42,
      opportunityScore: 79,
      gapCategories: [
        { name: "Controls", gapPct: 30, estimatedValue: 14000 },
        { name: "Water Heaters", gapPct: 25, estimatedValue: 11000 },
      ],
      enrolled: false,
    },
  ];

  const displayAccounts = accounts || mockAccounts;
  const segments = Array.from(new Set(displayAccounts.map((a) => a.segment)));
  const regions = Array.from(new Set(displayAccounts.map((a) => a.region)));

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const accountId = params.get("account");
    if (accountId && displayAccounts.length > 0) {
      const account = displayAccounts.find((a) => a.id === parseInt(accountId));
      if (account) {
        setSelectedAccount(account);
      }
    }
  }, [searchParams, displayAccounts]);

  const getRevenueImpact = (account: AccountWithMetrics) => {
    return account.gapCategories.reduce((sum, gap) => sum + gap.estimatedValue, 0);
  };

  const filteredAndSortedAccounts = useMemo(() => {
    let result = displayAccounts.filter((account) => {
      const matchesSearch =
        account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.assignedTm.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSegment = segmentFilter === "all" || account.segment === segmentFilter;
      const matchesRegion = regionFilter === "all" || account.region === regionFilter;
      return matchesSearch && matchesSegment && matchesRegion;
    });

    if (sortBy === "revenue-impact") {
      result = [...result].sort((a, b) => getRevenueImpact(b) - getRevenueImpact(a));
    } else if (sortBy === "opportunity-score") {
      result = [...result].sort((a, b) => b.opportunityScore - a.opportunityScore);
    } else if (sortBy === "revenue") {
      result = [...result].sort((a, b) => b.last12mRevenue - a.last12mRevenue);
    } else if (sortBy === "penetration-low") {
      result = [...result].sort((a, b) => a.categoryPenetration - b.categoryPenetration);
    }

    return result;
  }, [displayAccounts, searchQuery, segmentFilter, regionFilter, sortBy]);

  const filteredAccounts = filteredAndSortedAccounts;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const columns = [
    {
      key: "name",
      header: "Account",
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
      header: "Segment",
      cell: (row: AccountWithMetrics) => (
        <Badge variant="outline">{row.segment}</Badge>
      ),
    },
    {
      key: "region",
      header: "Region",
      cell: (row: AccountWithMetrics) => (
        <span className="text-muted-foreground">{row.region}</span>
      ),
    },
    {
      key: "last12mRevenue",
      header: "Revenue (12M)",
      cell: (row: AccountWithMetrics) => (
        <span className="font-semibold">{formatCurrency(row.last12mRevenue)}</span>
      ),
    },
    {
      key: "categoryPenetration",
      header: "Penetration",
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
      header: "Opportunity",
      cell: (row: AccountWithMetrics) => (
        <ScoreBadge score={row.opportunityScore} testId={`score-${row.id}`} />
      ),
    },
    {
      key: "enrolled",
      header: "Status",
      cell: (row: AccountWithMetrics) => (
        <Badge variant={row.enrolled ? "default" : "secondary"}>
          {row.enrolled ? "Enrolled" : "Not Enrolled"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row: AccountWithMetrics) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedAccount(row)}
          data-testid={`button-view-${row.id}`}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const totalOpportunity = filteredAccounts.reduce(
    (sum, acc) => sum + acc.gapCategories.reduce((s, g) => s + g.estimatedValue, 0),
    0
  );

  return (
    <div className="p-6 space-y-6" data-testid="page-accounts">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Account Insights</h1>
          <p className="text-muted-foreground">
            View and analyze wallet share opportunities by account
          </p>
        </div>
        <Button variant="outline" data-testid="button-export-accounts">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredAccounts.length}</p>
                  <p className="text-xs text-muted-foreground">Total Accounts</p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="tooltip-accounts-total">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Number of customer accounts matching your current filter criteria. Use filters to narrow down by segment or region.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-chart-2/10">
                  <Target className="h-5 w-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {filteredAccounts.filter((a) => a.enrolled).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Enrolled</p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="tooltip-accounts-enrolled">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Accounts currently enrolled in the revenue growth program. Enrolled accounts are tracked for incremental revenue to calculate rev-share fees.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-chart-3/10">
                  <AlertTriangle className="h-5 w-5 text-chart-3" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {filteredAccounts.filter((a) => a.opportunityScore >= 70).length}
                  </p>
                  <p className="text-xs text-muted-foreground">High Priority</p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="tooltip-accounts-high-priority">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Accounts with opportunity scores of 70+ have significant category gaps compared to their ICP profile. These are prime targets for outreach.</p>
                </TooltipContent>
              </Tooltip>
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
                  <p className="text-2xl font-bold">{formatCurrency(totalOpportunity)}</p>
                  <p className="text-xs text-muted-foreground">Est. Opportunity</p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="tooltip-accounts-opportunity">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Total estimated revenue opportunity across all filtered accounts based on their category gaps and potential wallet share capture.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search accounts or TMs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-accounts"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-44" data-testid="select-sort">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Order</SelectItem>
                  <SelectItem value="revenue-impact">Revenue Impact (High to Low)</SelectItem>
                  <SelectItem value="opportunity-score">Opportunity Score</SelectItem>
                  <SelectItem value="revenue">Current Revenue</SelectItem>
                  <SelectItem value="penetration-low">Lowest Penetration</SelectItem>
                </SelectContent>
              </Select>
              <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                <SelectTrigger className="w-36" data-testid="select-segment">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Segments</SelectItem>
                  {segments.map((segment) => (
                    <SelectItem key={segment} value={segment}>
                      {segment}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-36" data-testid="select-region">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regions.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAccounts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No accounts found"
              description="Try adjusting your filters or upload account data"
              testId="empty-accounts"
            />
          ) : (
            <DataTable
              columns={columns}
              data={filteredAccounts}
              isLoading={isLoading}
              testId="table-accounts"
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedAccount} onOpenChange={() => setSelectedAccount(null)}>
        <DialogContent className="sm:max-w-2xl">
          {selectedAccount && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedAccount.name}
                  <Badge variant={selectedAccount.enrolled ? "default" : "secondary"}>
                    {selectedAccount.enrolled ? "Enrolled" : "Not Enrolled"}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Segment</p>
                    <p className="font-medium">{selectedAccount.segment}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Region</p>
                    <p className="font-medium">{selectedAccount.region}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Assigned TM</p>
                    <p className="font-medium">{selectedAccount.assignedTm}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue (12M)</p>
                    <p className="font-medium">
                      {formatCurrency(selectedAccount.last12mRevenue)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">Category Penetration</p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="tooltip-category-penetration">
                                <HelpCircle className="h-3 w-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs" side="top">
                              <p className="text-sm font-medium mb-2">How Category Penetration is Calculated</p>
                              <div className="text-xs space-y-2">
                                <p>Category Penetration measures how many of the ICP (Ideal Customer Profile) categories this account is actively purchasing from.</p>
                                <div className="bg-muted/50 p-2 rounded">
                                  <p className="font-medium">Formula:</p>
                                  <p className="font-mono text-xs">(Categories with purchases / Total ICP categories) x 100</p>
                                </div>
                                <p>A higher percentage means the account is buying across more expected categories. A lower percentage indicates opportunities to expand their product mix.</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-2xl font-bold">
                          {selectedAccount.categoryPenetration}%
                        </p>
                      </div>
                      <ProgressRing
                        value={selectedAccount.categoryPenetration}
                        size={60}
                        strokeWidth={6}
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">Opportunity Score</p>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="tooltip-opportunity-score">
                                <HelpCircle className="h-3 w-3" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" side="top">
                              <p className="text-sm font-medium mb-2">How Opportunity Score is Calculated</p>
                              <div className="text-xs space-y-2">
                                <p>The Opportunity Score is a weighted composite that identifies accounts with the highest potential for wallet share capture.</p>
                                <div className="bg-muted/50 p-2 rounded space-y-1">
                                  <p className="font-medium">Current Weighting:</p>
                                  <div className="grid grid-cols-2 gap-1">
                                    <span>Gap Size (% below ICP):</span>
                                    <span className="font-semibold">{weights.gapSizeWeight}%</span>
                                    <span>Revenue Potential:</span>
                                    <span className="font-semibold">{weights.revenuePotentialWeight}%</span>
                                    <span>Category Count:</span>
                                    <span className="font-semibold">{weights.categoryCountWeight}%</span>
                                  </div>
                                </div>
                                <p>Higher scores indicate greater opportunity for incremental revenue if enrolled.</p>
                                <Link href="/scoring-settings" className="flex items-center gap-1 text-primary hover:underline mt-2" data-testid="link-scoring-settings">
                                  <Settings className="h-3 w-3" />
                                  Adjust weighting in Scoring Settings
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <p className="text-2xl font-bold">
                          {selectedAccount.opportunityScore}
                        </p>
                      </div>
                      <ScoreBadge
                        score={selectedAccount.opportunityScore}
                        size="default"
                      />
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3">Gap Categories</h3>
                  <div className="space-y-3">
                    {selectedAccount.gapCategories.map((gap) => (
                      <div
                        key={gap.name}
                        className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-chart-5" />
                          <span className="font-medium">{gap.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-chart-5">
                              -{gap.gapPct}%
                            </p>
                            <p className="text-xs text-muted-foreground">gap</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-chart-2">
                              {formatCurrency(gap.estimatedValue)}
                            </p>
                            <p className="text-xs text-muted-foreground">opportunity</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        className="flex-1" 
                        onClick={() => setShowCreateTaskDialog(true)}
                        data-testid="button-create-task"
                      >
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Create Task
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs" side="top">
                      <p className="text-sm font-medium mb-1">Create a Follow-up Task</p>
                      <p className="text-xs">Schedule a call, email, or visit for this account to track your outreach activities and follow up on sales opportunities.</p>
                    </TooltipContent>
                  </Tooltip>
                  {selectedAccount.opportunityScore >= 70 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button variant="default" asChild data-testid="button-generate-playbook">
                            <Link href={`/playbooks?segment=${selectedAccount.segment}`}>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Generate Playbook
                            </Link>
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs" side="top">
                        <p className="text-sm font-medium mb-1">High-Value Opportunity</p>
                        <p className="text-xs">This account has a high opportunity score ({selectedAccount.opportunityScore}). Generate a playbook to create AI-powered call scripts and emails targeting their gap categories.</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {!selectedAccount.enrolled && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" data-testid="button-enroll-account">
                          <Target className="mr-2 h-4 w-4" />
                          Enroll in Program
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs" side="top">
                        <p className="text-sm font-medium mb-1">What does enrollment do?</p>
                        <ul className="text-xs space-y-1 list-disc list-inside">
                          <li>Adds this account to the revenue growth program</li>
                          <li>Tracks incremental revenue from targeted categories</li>
                          <li>Calculates rev-share fees based on captured wallet share</li>
                          <li>Enables performance monitoring on the Revenue tab</li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
