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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Loader2,
  Crown,
  Building2,
  Shield,
  Briefcase,
  Eye,
  Clock,
  Swords,
  Zap,
  Package,
  FolderKanban,
  Contact,
} from "lucide-react";
import type { Contact as ContactType, Project, OrderSignal, CompetitorMention } from "@shared/schema";
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

const ROLE_LABELS: Record<string, string> = {
  decision_maker: "Decision Maker",
  owner: "Owner",
  purchaser: "Purchaser",
  project_manager: "Project Mgr",
  estimator: "Estimator",
  influencer: "Influencer",
  gatekeeper: "Gatekeeper",
  unknown: "Unknown",
};

function AccountContactsTab({ accountId }: { accountId: number }) {
  const { data: contacts, isLoading } = useQuery<ContactType[]>({
    queryKey: [`/api/crm/contacts?accountId=${accountId}`],
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!contacts?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Contact className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No contacts found for this account</p>
        <p className="text-xs mt-1">Connect your email inbox in Settings to auto-detect contacts</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-2" data-testid="section-account-contacts">
      {contacts.map((c) => {
        const isKeyPerson = c.role === "decision_maker" || c.role === "owner";
        return (
          <div key={c.id} className="flex items-center justify-between p-3 rounded-md border" data-testid={`account-contact-${c.id}`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                <span className="text-xs font-semibold" data-testid={`text-contact-initials-${c.id}`}>{c.firstName?.[0]}{(c.lastName || "")[0]}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate" data-testid={`text-contact-name-${c.id}`}>{c.firstName} {c.lastName || ""}</span>
                  {isKeyPerson && <Crown className="h-3 w-3 text-amber-500 shrink-0" data-testid={`badge-key-person-${c.id}`} />}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {c.title && <span data-testid={`text-contact-title-${c.id}`}>{c.title}</span>}
                  {c.title && c.role && <span> · </span>}
                  {c.role && <span data-testid={`text-contact-role-${c.id}`}>{ROLE_LABELS[c.role] || c.role}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {c.email && (
                <Button variant="ghost" size="icon" onClick={() => window.open(`mailto:${c.email}`)} data-testid={`button-email-contact-${c.id}`}>
                  <Mail className="h-4 w-4" />
                </Button>
              )}
              {c.phone && (
                <Button variant="ghost" size="icon" onClick={() => window.open(`tel:${c.phone}`)} data-testid={`button-phone-contact-${c.id}`}>
                  <Phone className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
      <Link href="/crm/contacts">
        <Button variant="link" size="sm" className="w-full mt-2" data-testid="link-view-all-contacts">
          View all contacts <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </Link>
    </div>
  );
}

function AccountProjectsTab({ accountId }: { accountId: number }) {
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: [`/api/crm/projects?accountId=${accountId}`],
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!projects?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FolderKanban className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No projects found for this account</p>
        <p className="text-xs mt-1">Projects are detected automatically from email conversations</p>
      </div>
    );
  }

  const STAGE_COLORS: Record<string, string> = {
    identified: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    bidding: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    awarded: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    in_progress: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    lost: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  const STAGE_LABELS: Record<string, string> = {
    identified: "Identified", bidding: "Bidding", awarded: "Awarded",
    in_progress: "In Progress", completed: "Completed", lost: "Lost",
  };

  return (
    <div className="space-y-2 pt-2" data-testid="section-account-projects">
      {projects.map((p) => {
        const categories = (p.productCategories as string[] | null) || [];
        return (
          <div key={p.id} className="p-3 rounded-md border" data-testid={`account-project-${p.id}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-sm truncate" data-testid={`text-project-name-${p.id}`}>{p.name}</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${STAGE_COLORS[p.stage || "identified"] || STAGE_COLORS.identified}`} data-testid={`badge-project-stage-${p.id}`}>
                  {STAGE_LABELS[p.stage || "identified"] || p.stage}
                </span>
              </div>
              {p.estimatedValue && (
                <span className="font-semibold text-sm shrink-0" data-testid={`text-project-value-${p.id}`}>
                  ${parseFloat(p.estimatedValue as string).toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              {p.location && <span className="inline-flex items-center gap-1" data-testid={`text-project-location-${p.id}`}><MapPin className="h-3 w-3" />{p.location}</span>}
              {p.generalContractor && <span data-testid={`text-project-gc-${p.id}`}>{p.generalContractor}</span>}
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2" data-testid={`section-project-categories-${p.id}`}>
                {categories.slice(0, 3).map((cat, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0" data-testid={`badge-category-${cat}-${p.id}`}>{cat}</Badge>
                ))}
                {categories.length > 3 && <span className="text-[10px] text-muted-foreground">+{categories.length - 3}</span>}
              </div>
            )}
          </div>
        );
      })}
      <Link href="/crm/projects">
        <Button variant="link" size="sm" className="w-full mt-2" data-testid="link-view-all-projects">
          View all projects <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </Link>
    </div>
  );
}

function AccountActivityTab({ accountId }: { accountId: number }) {
  const { data: signals, isLoading: loadingSignals } = useQuery<OrderSignal[]>({
    queryKey: [`/api/crm/order-signals?accountId=${accountId}`],
  });

  const { data: threats, isLoading: loadingThreats } = useQuery<CompetitorMention[]>({
    queryKey: [`/api/crm/competitor-mentions?accountId=${accountId}`],
  });

  const isLoading = loadingSignals || loadingThreats;
  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const hasData = (signals?.length || 0) > 0 || (threats?.length || 0) > 0;

  if (!hasData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No activity signals for this account</p>
        <p className="text-xs mt-1">Order signals and competitor mentions appear here when detected from emails</p>
      </div>
    );
  }

  const URGENCY_COLORS: Record<string, string> = {
    immediate: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    this_week: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    this_month: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    next_quarter: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    exploring: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    normal: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };

  const THREAT_COLORS: Record<string, string> = {
    critical: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <div className="space-y-4 pt-2" data-testid="section-account-activity">
      {(signals?.length || 0) > 0 && (
        <div data-testid="section-order-signals">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5" data-testid="heading-order-signals">
            <Zap className="h-3 w-3" /> Order Signals ({signals!.length})
          </h4>
          <div className="space-y-2">
            {signals!.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2.5 rounded-md border text-sm" data-testid={`account-signal-${s.id}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate" data-testid={`text-signal-category-${s.id}`}>{s.productCategory || s.signalType}</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${URGENCY_COLORS[s.urgency || "normal"]}`} data-testid={`badge-signal-urgency-${s.id}`}>
                    {s.urgency || "normal"}
                  </span>
                  {s.competitorPriceMentioned && (
                    <Badge variant="destructive" className="text-[10px] px-1 py-0" data-testid={`badge-competitor-pricing-${s.id}`}>Competitor $</Badge>
                  )}
                </div>
                {s.estimatedValue && (
                  <span className="font-medium shrink-0 ml-2" data-testid={`text-signal-value-${s.id}`}>${parseFloat(s.estimatedValue as string).toLocaleString()}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {(threats?.length || 0) > 0 && (
        <div data-testid="section-competitor-threats">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5" data-testid="heading-competitor-threats">
            <Swords className="h-3 w-3" /> Competitor Threats ({threats!.length})
          </h4>
          <div className="space-y-2">
            {threats!.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between p-2.5 rounded-md border text-sm" data-testid={`account-threat-${t.id}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <Swords className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate" data-testid={`text-threat-competitor-${t.id}`}>{t.competitorName}</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${THREAT_COLORS[t.threatLevel || "medium"]}`} data-testid={`badge-threat-level-${t.id}`}>
                    {t.threatLevel || "medium"}
                  </span>
                  {t.productCategory && <span className="text-xs text-muted-foreground truncate" data-testid={`text-threat-category-${t.id}`}>{t.productCategory}</span>}
                </div>
                {(t.competitorPrice || t.ourPrice) && (
                  <div className="text-right text-xs shrink-0 ml-2">
                    {t.competitorPrice && <div className="text-red-600" data-testid={`text-competitor-price-${t.id}`}>Them: {t.competitorPrice}</div>}
                    {t.ourPrice && <div className="text-green-600" data-testid={`text-our-price-${t.id}`}>Us: {t.ourPrice}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Link href="/crm/signals">
        <Button variant="link" size="sm" className="w-full" data-testid="link-view-all-signals">
          View all signals & threats <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </Link>
    </div>
  );
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

  const [isEnrolling, setIsEnrolling] = useState(false);

  const handleEnrollAccount = async () => {
    if (!selectedAccount) return;
    
    setIsEnrolling(true);
    try {
      const response = await apiRequest("POST", `/api/accounts/${selectedAccount.id}/enroll`, {});
      const data = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrolled-accounts"] });
      
      toast({
        title: "Account enrolled",
        description: `${selectedAccount.name} is now enrolled in the growth program`,
      });

      if (data.playbook) {
        queryClient.invalidateQueries({ queryKey: ["/api/playbooks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        toast({
          title: "Playbook generated",
          description: `AI-powered playbook created with ${data.playbook.taskCount || 0} personalized tasks`,
        });
      }
      
      setSelectedAccount(null);
    } catch (error: any) {
      console.error("Enrollment error:", error);
      
      const errorMessage = error.message || "";
      const isLimitExceeded = errorMessage.includes("FEATURE_LIMIT_EXCEEDED") || errorMessage.includes("limit");
      const isUpgradeRequired = errorMessage.includes("upgrade") || errorMessage.includes("Upgrade");
      
      if (isLimitExceeded || isUpgradeRequired) {
        toast({
          title: "Upgrade Required",
          description: "You've reached your plan limit. Visit the Subscription page to upgrade and enroll more accounts.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Enrollment failed",
          description: "Please try again",
          variant: "destructive",
        });
      }
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleCreateTask = () => {
    if (!selectedAccount) {
      toast({
        title: "Error",
        description: "No account selected.",
        variant: "destructive",
      });
      return;
    }
    if (!taskTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a task title.",
        variant: "destructive",
      });
      return;
    }
    
    // Convert date string to ISO timestamp or use tomorrow's date as default
    const dueDateTimestamp = taskDueDate 
      ? new Date(taskDueDate).toISOString()
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    createTaskMutation.mutate({
      accountId: selectedAccount.id,
      taskType: taskType,
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      assignedTm: selectedAccount.assignedTm,
      dueDate: dueDateTimestamp,
      status: "pending",
    });
  };

  const openCreateTaskDialog = () => {
    if (!selectedAccount) return;
    setShowCreateTaskDialog(true);
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
    const accountId = params.get("account") || params.get("highlight");
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
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
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

              <Tabs defaultValue="overview" data-testid="account-detail-tabs">
                <TabsList className="w-full" data-testid="account-tabs-list">
                  <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                  <TabsTrigger value="contacts" data-testid="tab-contacts">Contacts</TabsTrigger>
                  <TabsTrigger value="projects" data-testid="tab-projects">Projects</TabsTrigger>
                  <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <div className="space-y-6 pt-2">
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
                                    <Link href="/settings" data-testid="link-settings">
                                      <Button variant="ghost" size="sm" className="gap-1">
                                        <Settings className="h-3 w-3" />
                                        Adjust weights in Settings
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
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
                            onClick={openCreateTaskDialog}
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
                            <Button 
                              variant="outline" 
                              data-testid="button-enroll-account"
                              onClick={handleEnrollAccount}
                              disabled={isEnrolling}
                            >
                              {isEnrolling ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Enrolling...
                                </>
                              ) : (
                                <>
                                  <Target className="mr-2 h-4 w-4" />
                                  Enroll in Program
                                </>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs" side="top">
                            <p className="text-sm font-medium mb-1">What does enrollment do?</p>
                            <ul className="text-xs space-y-1 list-disc list-inside">
                              <li>Adds this account to the revenue growth program</li>
                              <li>Tracks incremental revenue from targeted categories</li>
                              <li>Calculates rev-share fees based on captured wallet share</li>
                              <li>Enables performance monitoring on the Revenue tab</li>
                              <li>Automatically generates an AI-powered sales playbook</li>
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="contacts">
                  <AccountContactsTab accountId={selectedAccount.id} />
                </TabsContent>

                <TabsContent value="projects">
                  <AccountProjectsTab accountId={selectedAccount.id} />
                </TabsContent>

                <TabsContent value="activity">
                  <AccountActivityTab accountId={selectedAccount.id} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={showCreateTaskDialog} onOpenChange={(open) => {
        setShowCreateTaskDialog(open);
        if (!open) resetTaskForm();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Task for {selectedAccount?.name}</DialogTitle>
            <DialogDescription>
              Schedule a follow-up activity for this account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-type">Task Type</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger data-testid="select-task-type">
                  <SelectValue placeholder="Select task type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">
                    <span className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Call
                    </span>
                  </SelectItem>
                  <SelectItem value="email">
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </span>
                  </SelectItem>
                  <SelectItem value="visit">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Site Visit
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                placeholder="e.g., Follow up on water heater quote"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                data-testid="input-task-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Description (optional)</Label>
              <Textarea
                id="task-description"
                placeholder="Add any notes or context for this task..."
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                rows={3}
                data-testid="input-task-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due Date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                data-testid="input-task-due-date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateTaskDialog(false);
                resetTaskForm();
              }}
              data-testid="button-cancel-task"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTask}
              disabled={!taskTitle.trim() || createTaskMutation.isPending}
              data-testid="button-save-task"
            >
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
