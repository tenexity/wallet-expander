import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  ShoppingCart,
  Swords,
  AlertTriangle,
  DollarSign,
  Building2,
  Clock,
  ArrowRight,
  Loader2,
  Zap,
  Shield,
  TrendingUp,
  Package,
  CheckCircle,
  XCircle,
  Tag,
} from "lucide-react";
import { Link } from "wouter";
import { Textarea } from "@/components/ui/textarea";
import type { OrderSignal, CompetitorMention } from "@shared/schema";

interface AccountBasic {
  id: number;
  name: string;
}

const URGENCY_CONFIG: Record<string, { label: string; color: string; priority: number }> = {
  immediate: { label: "Immediate", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", priority: 5 },
  this_week: { label: "This Week", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300", priority: 4 },
  this_month: { label: "This Month", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", priority: 3 },
  next_quarter: { label: "Next Quarter", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", priority: 2 },
  exploring: { label: "Exploring", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", priority: 1 },
  normal: { label: "Normal", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", priority: 1 },
};

const SIGNAL_TYPE_CONFIG: Record<string, { label: string; icon: typeof ShoppingCart }> = {
  quote_request: { label: "Quote Request", icon: DollarSign },
  reorder: { label: "Reorder", icon: Package },
  pricing_inquiry: { label: "Pricing Inquiry", icon: Tag },
  product_inquiry: { label: "Product Inquiry", icon: Search },
  purchase_intent: { label: "Purchase Intent", icon: ShoppingCart },
  delivery_request: { label: "Delivery Request", icon: TrendingUp },
};

const THREAT_CONFIG: Record<string, { label: string; color: string; priority: number }> = {
  critical: { label: "Critical", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-800", priority: 4 },
  high: { label: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 border-orange-200 dark:border-orange-800", priority: 3 },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800", priority: 2 },
  low: { label: "Low", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700", priority: 1 },
};

const MENTION_TYPE_LABELS: Record<string, string> = {
  quote: "Competitor Quote",
  pricing: "Price Comparison",
  product_comparison: "Product Comparison",
  switch_threat: "Switch Threat",
  positive_mention: "Positive Mention",
  negative_mention: "Negative Mention",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  contacted: { label: "Contacted", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  quoted: { label: "Quoted", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  won: { label: "Won", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  lost: { label: "Lost", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

function formatCurrency(value: string | number | null): string {
  if (!value) return "";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "";
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

function formatDate(d: string | Date | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTimeAgo(date: string | Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export default function CRMSignals() {
  const [activeTab, setActiveTab] = useState("signals");
  const [searchQuery, setSearchQuery] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [threatFilter, setThreatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSignal, setSelectedSignal] = useState<OrderSignal | null>(null);
  const [selectedMention, setSelectedMention] = useState<CompetitorMention | null>(null);
  const [updateStatusTo, setUpdateStatusTo] = useState("");
  const { toast } = useToast();

  const { data: orderSignalsData, isLoading: loadingSignals } = useQuery<OrderSignal[]>({
    queryKey: ["/api/crm/order-signals"],
  });

  const { data: competitorMentionsData, isLoading: loadingMentions } = useQuery<CompetitorMention[]>({
    queryKey: ["/api/crm/competitor-mentions"],
  });

  const { data: accountsList } = useQuery<AccountBasic[]>({
    queryKey: ["/api/accounts"],
  });

  const accountMap = useMemo(() => {
    const map: Record<number, string> = {};
    if (accountsList) {
      accountsList.forEach((a: any) => { map[a.id] = a.name; });
    }
    return map;
  }, [accountsList]);

  const updateSignalStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/crm/order-signals/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/order-signals"] });
      toast({ title: "Signal updated", description: "Status has been updated." });
      setSelectedSignal(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update signal.", variant: "destructive" });
    },
  });

  const markMentionRespondedMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("PATCH", `/api/crm/competitor-mentions/${id}`, { respondedAt: new Date().toISOString() });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/competitor-mentions"] });
      toast({ title: "Marked as responded", description: "Competitor mention has been marked as addressed." });
      setSelectedMention(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update.", variant: "destructive" });
    },
  });

  const filteredSignals = useMemo(() => {
    if (!orderSignalsData) return [];
    return orderSignalsData
      .filter((s) => {
        const matchesSearch =
          (s.productCategory || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.productDetails || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (accountMap[s.accountId || 0] || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesUrgency = urgencyFilter === "all" || s.urgency === urgencyFilter;
        const matchesStatus = statusFilter === "all" || s.status === statusFilter;
        return matchesSearch && matchesUrgency && matchesStatus;
      })
      .sort((a, b) => (URGENCY_CONFIG[b.urgency || "normal"]?.priority || 0) - (URGENCY_CONFIG[a.urgency || "normal"]?.priority || 0));
  }, [orderSignalsData, searchQuery, urgencyFilter, statusFilter, accountMap]);

  const filteredMentions = useMemo(() => {
    if (!competitorMentionsData) return [];
    return competitorMentionsData
      .filter((m) => {
        const matchesSearch =
          m.competitorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.productCategory || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.details || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (accountMap[m.accountId || 0] || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesThreat = threatFilter === "all" || m.threatLevel === threatFilter;
        return matchesSearch && matchesThreat;
      })
      .sort((a, b) => (THREAT_CONFIG[b.threatLevel || "medium"]?.priority || 0) - (THREAT_CONFIG[a.threatLevel || "medium"]?.priority || 0));
  }, [competitorMentionsData, searchQuery, threatFilter, accountMap]);

  const signalStats = useMemo(() => {
    if (!orderSignalsData) return { total: 0, urgent: 0, newCount: 0, totalValue: 0 };
    return {
      total: orderSignalsData.length,
      urgent: orderSignalsData.filter(s => s.urgency === "immediate" || s.urgency === "this_week").length,
      newCount: orderSignalsData.filter(s => s.status === "new").length,
      totalValue: orderSignalsData.reduce((sum, s) => sum + (s.estimatedValue ? parseFloat(s.estimatedValue as string) : 0), 0),
    };
  }, [orderSignalsData]);

  const threatStats = useMemo(() => {
    if (!competitorMentionsData) return { total: 0, critical: 0, needsResponse: 0, unresponded: 0 };
    return {
      total: competitorMentionsData.length,
      critical: competitorMentionsData.filter(m => m.threatLevel === "critical" || m.threatLevel === "high").length,
      needsResponse: competitorMentionsData.filter(m => m.responseNeeded && !m.respondedAt).length,
      unresponded: competitorMentionsData.filter(m => !m.respondedAt).length,
    };
  }, [competitorMentionsData]);

  const isLoading = loadingSignals || loadingMentions;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-crm-signals">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Signals & Threats</h1>
          <p className="text-muted-foreground">
            Order signals and competitive intelligence extracted from email conversations
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-signals-threats">
          <TabsTrigger value="signals" className="gap-2" data-testid="tab-signals">
            <Zap className="h-4 w-4" />
            Order Signals
            {signalStats.newCount > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0" data-testid="badge-new-signals-count">{signalStats.newCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="threats" className="gap-2" data-testid="tab-threats">
            <Swords className="h-4 w-4" />
            Competitor Threats
            {threatStats.needsResponse > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0" data-testid="badge-needs-response-count">{threatStats.needsResponse}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="signals" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card data-testid="stat-total-signals">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
                    <Zap className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{signalStats.total}</p>
                    <p className="text-xs text-muted-foreground">Total Signals</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-urgent-signals">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{signalStats.urgent}</p>
                    <p className="text-xs text-muted-foreground">Urgent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-new-signals">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
                    <ShoppingCart className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{signalStats.newCount}</p>
                    <p className="text-xs text-muted-foreground">New / Unactioned</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-signal-value">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(signalStats.totalValue) || "$0"}</p>
                    <p className="text-xs text-muted-foreground">Est. Value</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="text-lg">Order Signals</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search product, account..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-signals"
                    />
                  </div>
                  <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                    <SelectTrigger className="w-[150px]" data-testid="select-urgency-filter" aria-label="Filter by urgency">
                      <SelectValue placeholder="All Urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Urgency</SelectItem>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="this_week">This Week</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="next_quarter">Next Quarter</SelectItem>
                      <SelectItem value="exploring">Exploring</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px]" data-testid="select-status-filter" aria-label="Filter by status">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="quoted">Quoted</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredSignals.length === 0 ? (
                <EmptyState
                  icon={Zap}
                  title="No order signals found"
                  description={orderSignalsData?.length ? "Try adjusting your filters" : "Connect your email inbox in Settings to detect purchase signals from customer emails"}
                />
              ) : (
                <div className="space-y-2">
                  {filteredSignals.map((signal) => {
                    const accountName = accountMap[signal.accountId || 0];
                    const urgencyConfig = URGENCY_CONFIG[signal.urgency || "normal"] || URGENCY_CONFIG.normal;
                    const statusConfig = STATUS_CONFIG[signal.status || "new"] || STATUS_CONFIG.new;
                    const signalTypeConfig = SIGNAL_TYPE_CONFIG[signal.signalType] || { label: signal.signalType, icon: Zap };
                    const SignalIcon = signalTypeConfig.icon;

                    return (
                      <div
                        key={signal.id}
                        className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50 ${signal.urgency === "immediate" ? "border-red-300 dark:border-red-700" : ""}`}
                        onClick={() => setSelectedSignal(signal)}
                        data-testid={`card-signal-${signal.id}`}
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                            <SignalIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium" data-testid={`text-signal-type-${signal.id}`}>{signalTypeConfig.label}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${urgencyConfig.color}`} data-testid={`badge-urgency-${signal.urgency}-${signal.id}`}>
                                {urgencyConfig.label}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${statusConfig.color}`} data-testid={`badge-status-${signal.status}-${signal.id}`}>
                                {statusConfig.label}
                              </span>
                              {signal.competitorPriceMentioned && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0" data-testid={`badge-competitor-pricing-${signal.id}`}>
                                  Competitor pricing
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5 flex-wrap">
                              {signal.productCategory && (
                                <span className="inline-flex items-center gap-1" data-testid={`text-product-category-${signal.id}`}>
                                  <Package className="h-3 w-3" />
                                  {signal.productCategory}
                                </span>
                              )}
                              {signal.productDetails && (
                                <span className="truncate max-w-[200px]" data-testid={`text-product-details-${signal.id}`}>{signal.productDetails}</span>
                              )}
                              {accountName && (
                                <Link
                                  href={`/accounts?account=${signal.accountId}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-primary hover:underline inline-flex items-center gap-1"
                                  data-testid={`link-account-${signal.accountId}`}
                                >
                                  <Building2 className="h-3 w-3" />
                                  {accountName}
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {signal.estimatedValue && (
                            <span className="font-semibold" data-testid={`text-estimated-value-${signal.id}`}>{formatCurrency(signal.estimatedValue)}</span>
                          )}
                          <span className="text-xs text-muted-foreground" data-testid={`text-created-time-${signal.id}`}>{formatTimeAgo(signal.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="threats" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card data-testid="stat-total-threats">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
                    <Swords className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{threatStats.total}</p>
                    <p className="text-xs text-muted-foreground">Total Mentions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-critical-threats">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{threatStats.critical}</p>
                    <p className="text-xs text-muted-foreground">High / Critical</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-needs-response">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
                    <Shield className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{threatStats.needsResponse}</p>
                    <p className="text-xs text-muted-foreground">Needs Response</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-unresponded">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
                    <Clock className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{threatStats.unresponded}</p>
                    <p className="text-xs text-muted-foreground">Unaddressed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="text-lg">Competitor Intelligence</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search competitor, product, account..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-threats"
                    />
                  </div>
                  <Select value={threatFilter} onValueChange={setThreatFilter}>
                    <SelectTrigger className="w-[150px]" data-testid="select-threat-filter" aria-label="Filter by threat level">
                      <SelectValue placeholder="All Threats" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Threat Levels</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredMentions.length === 0 ? (
                <EmptyState
                  icon={Swords}
                  title="No competitor mentions found"
                  description={competitorMentionsData?.length ? "Try adjusting your filters" : "Connect your email inbox in Settings to detect competitor intelligence from customer correspondence"}
                />
              ) : (
                <div className="space-y-2">
                  {filteredMentions.map((mention) => {
                    const accountName = accountMap[mention.accountId || 0];
                    const threatConfig = THREAT_CONFIG[mention.threatLevel || "medium"] || THREAT_CONFIG.medium;
                    const isResponded = !!mention.respondedAt;

                    return (
                      <div
                        key={mention.id}
                        className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50 ${mention.threatLevel === "critical" ? "border-red-300 dark:border-red-700 bg-red-50/30 dark:bg-red-950/20" : ""} ${isResponded ? "opacity-60" : ""}`}
                        onClick={() => setSelectedMention(mention)}
                        data-testid={`card-threat-${mention.id}`}
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${mention.threatLevel === "critical" || mention.threatLevel === "high" ? "bg-red-100 dark:bg-red-950" : "bg-orange-100 dark:bg-orange-950"}`}>
                            <Swords className={`h-5 w-5 ${mention.threatLevel === "critical" || mention.threatLevel === "high" ? "text-red-600" : "text-orange-600"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium" data-testid={`text-competitor-name-${mention.id}`}>{mention.competitorName}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${threatConfig.color}`} data-testid={`badge-threat-level-${mention.threatLevel}-${mention.id}`}>
                                {threatConfig.label}
                              </span>
                              <Badge variant="outline" className="text-xs" data-testid={`badge-mention-type-${mention.mentionType}-${mention.id}`}>
                                {MENTION_TYPE_LABELS[mention.mentionType] || mention.mentionType}
                              </Badge>
                              {mention.responseNeeded && !isResponded && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0" data-testid={`badge-response-needed-${mention.id}`}>
                                  Response needed
                                </Badge>
                              )}
                              {isResponded && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-600 border-green-300" data-testid={`badge-responded-${mention.id}`}>
                                  Responded
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5 flex-wrap">
                              {mention.productCategory && (
                                <span className="inline-flex items-center gap-1" data-testid={`text-product-category-${mention.id}`}>
                                  <Package className="h-3 w-3" />
                                  {mention.productCategory}
                                </span>
                              )}
                              {mention.details && (
                                <span className="truncate max-w-[300px]" data-testid={`text-threat-details-${mention.id}`}>{mention.details}</span>
                              )}
                              {accountName && (
                                <Link
                                  href={`/accounts?account=${mention.accountId}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-primary hover:underline inline-flex items-center gap-1"
                                  data-testid={`link-account-${mention.accountId}`}
                                >
                                  <Building2 className="h-3 w-3" />
                                  {accountName}
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {(mention.competitorPrice || mention.ourPrice) && (
                            <div className="text-right text-sm">
                              {mention.competitorPrice && <div className="text-red-600" data-testid={`text-competitor-price-${mention.id}`}>Them: {mention.competitorPrice}</div>}
                              {mention.ourPrice && <div className="text-green-600" data-testid={`text-our-price-${mention.id}`}>Us: {mention.ourPrice}</div>}
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground" data-testid={`text-created-time-${mention.id}`}>{formatTimeAgo(mention.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedSignal} onOpenChange={(open) => !open && setSelectedSignal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Signal Details</DialogTitle>
            <DialogDescription>Review and take action on this purchase signal</DialogDescription>
          </DialogHeader>
          {selectedSignal && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${(URGENCY_CONFIG[selectedSignal.urgency || "normal"] || URGENCY_CONFIG.normal).color}`} data-testid={`badge-urgency-${selectedSignal.urgency}-dialog`}>
                  {(URGENCY_CONFIG[selectedSignal.urgency || "normal"] || URGENCY_CONFIG.normal).label}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${(STATUS_CONFIG[selectedSignal.status || "new"] || STATUS_CONFIG.new).color}`} data-testid={`badge-status-${selectedSignal.status}-dialog`}>
                  {(STATUS_CONFIG[selectedSignal.status || "new"] || STATUS_CONFIG.new).label}
                </span>
                {selectedSignal.competitorPriceMentioned && (
                  <Badge variant="destructive" className="text-xs" data-testid="badge-competitor-pricing-mentioned">Competitor pricing mentioned</Badge>
                )}
                {selectedSignal.pricingMentioned && (
                  <Badge variant="outline" className="text-xs" data-testid="badge-pricing-discussed">Pricing discussed</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Signal Type</p>
                  <p className="font-medium" data-testid="text-signal-type">{SIGNAL_TYPE_CONFIG[selectedSignal.signalType]?.label || selectedSignal.signalType}</p>
                </div>
                {selectedSignal.productCategory && (
                  <div>
                    <p className="text-muted-foreground text-xs">Product Category</p>
                    <p className="font-medium" data-testid="text-product-category">{selectedSignal.productCategory}</p>
                  </div>
                )}
                {selectedSignal.productDetails && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Product Details</p>
                    <p className="font-medium" data-testid="text-product-details">{selectedSignal.productDetails}</p>
                  </div>
                )}
                {selectedSignal.estimatedQuantity && (
                  <div>
                    <p className="text-muted-foreground text-xs">Estimated Quantity</p>
                    <p className="font-medium" data-testid="text-estimated-quantity">{selectedSignal.estimatedQuantity}</p>
                  </div>
                )}
                {selectedSignal.estimatedValue && (
                  <div>
                    <p className="text-muted-foreground text-xs">Estimated Value</p>
                    <p className="font-semibold text-lg" data-testid="text-estimated-value">{formatCurrency(selectedSignal.estimatedValue)}</p>
                  </div>
                )}
                {selectedSignal.requestedDeliveryDate && (
                  <div>
                    <p className="text-muted-foreground text-xs">Requested Delivery</p>
                    <p className="font-medium" data-testid="text-requested-delivery">{formatDate(selectedSignal.requestedDeliveryDate)}</p>
                  </div>
                )}
                {selectedSignal.accountId && accountMap[selectedSignal.accountId] && (
                  <div>
                    <p className="text-muted-foreground text-xs">Account</p>
                    <Link href={`/accounts?account=${selectedSignal.accountId}`} className="font-medium text-primary hover:underline inline-flex items-center gap-1" data-testid={`link-account-${selectedSignal.accountId}`}>
                      <Building2 className="h-3 w-3" />
                      {accountMap[selectedSignal.accountId]}
                    </Link>
                  </div>
                )}
              </div>

              {selectedSignal.notes && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Notes</p>
                  <p className="text-sm bg-muted/50 p-3 rounded-md" data-testid="text-signal-notes">{selectedSignal.notes}</p>
                </div>
              )}

              <div className="pt-2 border-t">
                <p className="text-muted-foreground text-xs mb-2" data-testid="text-update-status-label">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {["contacted", "quoted", "won", "lost"].map((s) => (
                    <Button
                      key={s}
                      variant={selectedSignal.status === s ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateSignalStatusMutation.mutate({ id: selectedSignal.id, status: s })}
                      disabled={updateSignalStatusMutation.isPending}
                      data-testid={`button-status-${s}`}
                    >
                      {s === "won" && <CheckCircle className="h-3 w-3 mr-1" />}
                      {s === "lost" && <XCircle className="h-3 w-3 mr-1" />}
                      {STATUS_CONFIG[s]?.label || s}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedMention} onOpenChange={(open) => !open && setSelectedMention(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Competitor Intelligence</DialogTitle>
            <DialogDescription>Review and respond to this competitive threat</DialogDescription>
          </DialogHeader>
          {selectedMention && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${(THREAT_CONFIG[selectedMention.threatLevel || "medium"] || THREAT_CONFIG.medium).color}`} data-testid={`badge-threat-level-${selectedMention.threatLevel}-dialog`}>
                  {(THREAT_CONFIG[selectedMention.threatLevel || "medium"] || THREAT_CONFIG.medium).label} Threat
                </span>
                <Badge variant="outline" className="text-xs" data-testid={`badge-mention-type-${selectedMention.mentionType}-dialog`}>
                  {MENTION_TYPE_LABELS[selectedMention.mentionType] || selectedMention.mentionType}
                </Badge>
                {selectedMention.respondedAt ? (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-300" data-testid="badge-responded-dialog">
                    Responded {formatDate(selectedMention.respondedAt)}
                  </Badge>
                ) : selectedMention.responseNeeded ? (
                  <Badge variant="destructive" className="text-xs" data-testid="badge-response-needed-dialog">Response needed</Badge>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Competitor</p>
                  <p className="font-semibold text-lg" data-testid="text-competitor-name">{selectedMention.competitorName}</p>
                </div>
                {selectedMention.productCategory && (
                  <div>
                    <p className="text-muted-foreground text-xs">Product Category</p>
                    <p className="font-medium" data-testid="text-product-category">{selectedMention.productCategory}</p>
                  </div>
                )}
                {selectedMention.competitorPrice && (
                  <div>
                    <p className="text-muted-foreground text-xs">Competitor Price</p>
                    <p className="font-medium text-red-600" data-testid="text-competitor-price">{selectedMention.competitorPrice}</p>
                  </div>
                )}
                {selectedMention.ourPrice && (
                  <div>
                    <p className="text-muted-foreground text-xs">Our Price</p>
                    <p className="font-medium text-green-600" data-testid="text-our-price">{selectedMention.ourPrice}</p>
                  </div>
                )}
                {selectedMention.accountId && accountMap[selectedMention.accountId] && (
                  <div>
                    <p className="text-muted-foreground text-xs">Account</p>
                    <Link href={`/accounts?account=${selectedMention.accountId}`} className="font-medium text-primary hover:underline inline-flex items-center gap-1" data-testid={`link-account-${selectedMention.accountId}`}>
                      <Building2 className="h-3 w-3" />
                      {accountMap[selectedMention.accountId]}
                    </Link>
                  </div>
                )}
              </div>

              {selectedMention.details && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Details</p>
                  <p className="text-sm bg-muted/50 p-3 rounded-md" data-testid="text-threat-details">{selectedMention.details}</p>
                </div>
              )}

              {!selectedMention.respondedAt && (
                <div className="pt-2 border-t">
                  <Button
                    onClick={() => markMentionRespondedMutation.mutate(selectedMention.id)}
                    disabled={markMentionRespondedMutation.isPending}
                    className="w-full"
                    data-testid="button-mark-responded"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Responded
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
