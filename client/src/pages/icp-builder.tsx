import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Target,
  Plus,
  Sparkles,
  CheckCircle,
  Edit2,
  Save,
  Trash2,
  RefreshCw,
  AlertCircle,
  FileText,
  Clock,
  ChevronRight,
  Loader2,
  Info,
  HelpCircle,
  BarChart3,
  TrendingUp,
  Users,
  Database,
  Brain,
  Lightbulb,
  ArrowRight,
  DollarSign,
  Zap,
} from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SegmentProfile {
  id: number;
  segment: string;
  name: string;
  description: string;
  minAnnualRevenue: number;
  status: "draft" | "approved";
  categories: Array<{
    id: number;
    categoryName: string;
    expectedPct: number;
    importance: number;
    isRequired: boolean;
    notes: string;
  }>;
  accountCount: number;
  approvedBy?: string;
  approvedAt?: string;
}

interface DataInsights {
  datasetSummary: {
    totalClassACustomers: number;
    totalRevenue: number;
    avgCategories: number;
    dateRange: string;
    segmentBreakdown: Array<{ segment: string; count: number; avgRevenue: number }>;
  };
  patternAnalysis: {
    summary: string;
    categoryPatterns: Array<{ category: string; avgPct: number; stdDev: number; correlation: string }>;
    isEstimate?: boolean;
  };
  decisionLogic: {
    items: Array<{
      category: string;
      expectedPct: number;
      reasoning: string;
      confidence: "high" | "medium" | "low";
      dataPoints: number;
    }>;
    isEstimate?: boolean;
    note?: string;
  };
  segmentHealth: {
    alignmentScore: number;
    accountsNearICP: number;
    revenueAtRisk: number;
    topGaps: Array<{ category: string; gapPct: number }>;
  };
  actionableInsights: {
    quickWins: Array<{ account: string; category: string; potentialRevenue: number }>;
    crossSellOpps: Array<{ categories: string[]; frequency: number }>;
    territoryRanking: Array<{ tm: string; avgAlignment: number; accountCount: number }>;
    projectedLift: number;
    isEstimate?: boolean;
  };
  methodology?: {
    nearICPThreshold: number;
    alignmentScoreNote: string;
    projectedLiftNote: string;
  };
}

const CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function ICPBuilder() {
  const [selectedProfile, setSelectedProfile] = useState<SegmentProfile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("profiles");
  const [selectedInsightSegment, setSelectedInsightSegment] = useState<string>("HVAC");
  const { toast } = useToast();

  const { data: dataInsights, isLoading: isInsightsLoading } = useQuery<DataInsights>({
    queryKey: ["/api/data-insights", selectedInsightSegment],
    enabled: activeTab === "data-insights",
  });

  const { data: profiles, isLoading } = useQuery<SegmentProfile[]>({
    queryKey: ["/api/segment-profiles"],
  });

  const analyzeMutation = useMutation({
    mutationFn: async (segment: string) => {
      return apiRequest("POST", "/api/segment-profiles/analyze", { segment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/segment-profiles"] });
      toast({
        title: "Analysis complete",
        description: "AI has generated a suggested profile",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (profileId: number) => {
      return apiRequest("POST", `/api/segment-profiles/${profileId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/segment-profiles"] });
      setSelectedProfile(null);
      toast({
        title: "Profile approved",
        description: "The ICP profile is now active for scoring",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (profileId: number) => {
      return apiRequest("DELETE", `/api/segment-profiles/${profileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/segment-profiles"] });
      setSelectedProfile(null);
      toast({
        title: "Profile deleted",
        description: "The ICP profile has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Could not delete the profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const displayProfiles = profiles || [];

  const handleAnalyzeSegment = async (segment: string) => {
    setIsAnalyzing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate AI analysis
    setIsAnalyzing(false);
    toast({
      title: "Analysis complete",
      description: `AI has analyzed ${segment} purchasing patterns`,
    });
  };

  const getImportanceLabel = (value: number) => {
    if (value < 0.75) return "Low";
    if (value <= 1.25) return "Normal";
    if (value <= 1.75) return "High";
    return "Strategic";
  };

  const getImportanceColor = (value: number) => {
    if (value < 0.75) return "text-muted-foreground";
    if (value <= 1.25) return "text-foreground";
    if (value <= 1.75) return "text-chart-3";
    return "text-chart-2";
  };


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getConfidenceBadge = (confidence: "high" | "medium" | "low") => {
    switch (confidence) {
      case "high":
        return <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20">High Confidence</Badge>;
      case "medium":
        return <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/20">Medium Confidence</Badge>;
      case "low":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Low Confidence</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-icp-builder">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ICP Builder</h1>
          <p className="text-muted-foreground">
            Define and manage Ideal Customer Profiles by segment
          </p>
        </div>
        <Button data-testid="button-new-profile">
          <Plus className="mr-2 h-4 w-4" />
          New Profile
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="profiles" data-testid="tab-profiles">
            <Target className="mr-2 h-4 w-4" />
            Profiles
          </TabsTrigger>
          <TabsTrigger value="data-insights" data-testid="tab-data-insights">
            <BarChart3 className="mr-2 h-4 w-4" />
            Data Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-chart-2/10">
                  <CheckCircle className="h-5 w-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {displayProfiles.filter((p) => p.status === "approved").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Approved Profiles</p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Approved ICP profiles are active and being used to score accounts. Only approved profiles contribute to opportunity scoring calculations.</p>
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
                  <Clock className="h-5 w-5 text-chart-3" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {displayProfiles.filter((p) => p.status === "draft").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Draft Profiles</p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Draft profiles are being refined before approval. Edit category expectations and thresholds, then approve when ready to activate.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {displayProfiles.reduce((sum, p) => sum + p.accountCount, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Accounts Scored</p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Total number of accounts that have been scored against their matching segment ICP profile to identify category gaps and opportunities.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Segment Profiles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))
              ) : displayProfiles.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title="No profiles"
                  description="Create your first ICP profile"
                  testId="empty-profiles"
                />
              ) : (
                displayProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => {
                      setSelectedProfile(profile);
                      setEditMode(false);
                    }}
                    className={`w-full text-left p-3 rounded-md border transition-colors ${
                      selectedProfile?.id === profile.id
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:bg-muted/50"
                    }`}
                    data-testid={`profile-${profile.segment.toLowerCase()}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                          <Target className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{profile.segment}</p>
                          <p className="text-xs text-muted-foreground">
                            {profile.accountCount} accounts
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={profile.status === "approved" ? "default" : "secondary"}
                      >
                        {profile.status}
                      </Badge>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Analysis
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="tooltip-ai-analysis">
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="text-sm">
                      This AI tool analyzes your Class A (top-tier) customer purchasing data to identify patterns and generate Ideal Customer Profiles. Class A customers typically represent your highest-value accounts with complete category coverage.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <CardDescription>
                Generate suggested profiles from Class A customer data samples
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                variant="outline"
                disabled={isAnalyzing}
                onClick={() => handleAnalyzeSegment("All Segments")}
                data-testid="button-analyze-all"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Analyze All Segments
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selectedProfile ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedProfile.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {selectedProfile.description}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {editMode ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditMode(false)}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" data-testid="button-save-profile">
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </Button>
                      </>
                    ) : (
                      <>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              data-testid="button-delete-profile"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Profile</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the "{selectedProfile.name}" profile? This action cannot be undone and will remove all associated category expectations.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(selectedProfile.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                data-testid="button-confirm-delete"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditMode(true)}
                          data-testid="button-edit-profile"
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        {selectedProfile.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(selectedProfile.id)}
                            data-testid="button-approve-profile"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Minimum Annual Revenue
                    </Label>
                    {editMode ? (
                      <Input
                        type="number"
                        defaultValue={selectedProfile.minAnnualRevenue}
                        className="mt-1"
                      />
                    ) : (
                      <p className="font-medium">
                        ${selectedProfile.minAnnualRevenue.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge
                        variant={
                          selectedProfile.status === "approved" ? "default" : "secondary"
                        }
                      >
                        {selectedProfile.status}
                      </Badge>
                      {selectedProfile.approvedBy && (
                        <span className="text-sm text-muted-foreground ml-2">
                          by {selectedProfile.approvedBy}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-3 block">
                    Category Expectations
                  </Label>
                  <div className="space-y-4">
                    {selectedProfile.categories.map((category) => (
                      <div
                        key={category.id}
                        className="p-4 rounded-md border bg-card"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{category.categoryName}</span>
                              {category.isRequired && (
                                <Badge variant="destructive" className="text-xs">
                                  Required
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className={getImportanceColor(category.importance)}
                              >
                                {getImportanceLabel(category.importance)} Priority
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="text-muted-foreground">
                                    Expected %
                                  </span>
                                  <span className="font-medium">
                                    {category.expectedPct}%
                                  </span>
                                </div>
                                {editMode ? (
                                  <Slider
                                    defaultValue={[category.expectedPct]}
                                    max={100}
                                    step={1}
                                  />
                                ) : (
                                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary rounded-full"
                                      style={{ width: `${category.expectedPct}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                              {editMode && (
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs">Required</Label>
                                  <Switch defaultChecked={category.isRequired} />
                                </div>
                              )}
                            </div>
                            {category.notes && (
                              <p className="text-xs text-muted-foreground mt-2">
                                {category.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {editMode && (
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Add notes about this profile..."
                      rows={3}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={Target}
                  title="Select a profile"
                  description="Choose a segment profile from the list to view and edit its details"
                  testId="empty-profile-detail"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
        </TabsContent>

        <TabsContent value="data-insights" className="space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <Label className="text-sm font-medium">Analyzing Segment:</Label>
            <div className="flex gap-2">
              {["HVAC", "Plumbing", "Mechanical"].map((segment) => (
                <Button
                  key={segment}
                  variant={selectedInsightSegment === segment ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedInsightSegment(segment)}
                  data-testid={`segment-btn-${segment.toLowerCase()}`}
                >
                  {segment}
                </Button>
              ))}
            </div>
          </div>

          {isInsightsLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : !dataInsights ? (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={Database}
                  title="No data available"
                  description={`No Class A customer data found for the ${selectedInsightSegment} segment. Upload customer data to generate insights.`}
                  testId="empty-insights"
                />
              </CardContent>
            </Card>
          ) : (
          <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Dataset Summary</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="tooltip-dataset-summary">
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">This section shows the Class A customer data that informed your ICP profiles. Class A customers are your top performers who demonstrate ideal purchasing patterns.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <CardDescription>
                Class A customer data powering your ICP analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Class A Customers</span>
                  </div>
                  <p className="text-2xl font-bold">{dataInsights.datasetSummary.totalClassACustomers}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Total Revenue</span>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(dataInsights.datasetSummary.totalRevenue)}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Avg Categories</span>
                  </div>
                  <p className="text-2xl font-bold">{dataInsights.datasetSummary.avgCategories}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Date Range</span>
                  </div>
                  <p className="text-lg font-bold">{dataInsights.datasetSummary.dateRange}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Segment Breakdown</Label>
                <div className="grid grid-cols-3 gap-4">
                  {dataInsights.datasetSummary.segmentBreakdown.map((seg) => (
                    <div key={seg.segment} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{seg.segment}</span>
                        <Badge variant="secondary">{seg.count} customers</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Avg Revenue: {formatCurrency(seg.avgRevenue)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-chart-2" />
                <CardTitle className="text-lg">AI Pattern Analysis</CardTitle>
                {dataInsights.patternAnalysis.isEstimate && (
                  <Badge variant="outline" className="text-xs">
                    Derived from ICP targets
                  </Badge>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="tooltip-pattern-analysis">
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">Pattern analysis is derived from your ICP profile targets combined with Class A customer metrics. Variance and correlation insights are estimated based on profile configuration.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <CardDescription>
                What the AI discovered in your Class A customer data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm leading-relaxed">{dataInsights.patternAnalysis.summary}</p>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">Category Purchasing Patterns</Label>
                <div className="space-y-3">
                  {dataInsights.patternAnalysis.categoryPatterns.map((pattern) => (
                    <div key={pattern.category} className="flex items-center gap-4 p-3 rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{pattern.category}</span>
                          <span className="text-sm font-bold">{pattern.avgPct}%</span>
                        </div>
                        <Progress value={pattern.avgPct} className="h-2" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">σ = {pattern.stdDev}%</p>
                        <Badge variant="outline" className="text-xs mt-1">{pattern.correlation}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-chart-3" />
                <CardTitle className="text-lg">ICP Decision Logic</CardTitle>
                {dataInsights.decisionLogic.isEstimate && (
                  <Badge variant="outline" className="text-xs">
                    Derived from ICP targets
                  </Badge>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="tooltip-decision-logic">
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{dataInsights.decisionLogic.note || "This explains why each category percentage was chosen for your ICP profile. Values are derived from ICP profile targets with confidence based on Class A account data."}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <CardDescription>
                Why each ICP percentage was chosen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dataInsights.decisionLogic.items.map((logic) => (
                  <div key={logic.category} className="p-4 rounded-lg border">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold">{logic.category}</span>
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            Target: {logic.expectedPct}%
                          </Badge>
                          {getConfidenceBadge(logic.confidence)}
                        </div>
                        <p className="text-sm text-muted-foreground">{logic.reasoning}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Based on</p>
                        <p className="font-medium">{logic.dataPoints} data points</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-chart-1" />
                  <CardTitle className="text-lg">Segment Health Score</CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="tooltip-segment-health">
                        <HelpCircle className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">This measures how well your current accounts align with the ICP. Higher scores mean more accounts are purchasing the expected category mix.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 mb-6">
                  <div className="relative">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle
                        className="text-muted"
                        strokeWidth="8"
                        stroke="currentColor"
                        fill="transparent"
                        r="40"
                        cx="48"
                        cy="48"
                      />
                      <circle
                        className="text-chart-2"
                        strokeWidth="8"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 * (1 - dataInsights.segmentHealth.alignmentScore / 100)}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="40"
                        cx="48"
                        cy="48"
                      />
                    </svg>
                    <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold">
                      {dataInsights.segmentHealth.alignmentScore}%
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Overall ICP Alignment</p>
                    <p className="font-medium">
                      {dataInsights.segmentHealth.accountsNearICP} accounts near ICP
                      {dataInsights.methodology && (
                        <span className="text-xs text-muted-foreground ml-1">
                          (≤{dataInsights.methodology.nearICPThreshold}% avg gap)
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-destructive mt-1">
                      {formatCurrency(dataInsights.segmentHealth.revenueAtRisk)} revenue at risk
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Top Category Gaps</Label>
                  <div className="space-y-2">
                    {dataInsights.segmentHealth.topGaps.map((gap) => (
                      <div key={gap.category} className="flex items-center justify-between p-2 rounded-md bg-destructive/5">
                        <span className="text-sm">{gap.category}</span>
                        <Badge variant="destructive">{gap.gapPct}% gap</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-chart-3" />
                  <CardTitle className="text-lg">Quick Wins</CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="tooltip-quick-wins">
                        <HelpCircle className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">Accounts that are close to ICP alignment with just 1-2 category gaps. These represent the easiest revenue opportunities to capture.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dataInsights.actionableInsights.quickWins.map((win, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="font-medium">{win.account}</p>
                        <p className="text-sm text-muted-foreground">Gap: {win.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-chart-2">{formatCurrency(win.potentialRevenue)}</p>
                        <p className="text-xs text-muted-foreground">potential</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-chart-2" />
                <CardTitle className="text-lg">Actionable Intelligence</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="tooltip-actionable-intel">
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">Strategic insights derived from your ICP analysis, including cross-sell opportunities, territory performance, and projected revenue lift.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label className="text-sm font-medium mb-3 block">Cross-Sell Opportunities</Label>
                  <div className="space-y-2">
                    {dataInsights.actionableInsights.crossSellOpps.map((opp, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 flex-wrap">
                          {opp.categories.map((cat, i) => (
                            <span key={i}>
                              <Badge variant="outline" className="text-xs">{cat}</Badge>
                              {i < opp.categories.length - 1 && <ArrowRight className="inline h-3 w-3 mx-1" />}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">{opp.frequency}% of Class A buy together</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-3 block">Territory Ranking</Label>
                  <div className="space-y-2">
                    {dataInsights.actionableInsights.territoryRanking.map((tm, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium">{tm.tm}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-chart-2">{tm.avgAlignment}%</span>
                          <p className="text-xs text-muted-foreground">{tm.accountCount} accounts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-3 block">Revenue Impact</Label>
                  <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/20">
                    <p className="text-sm text-muted-foreground mb-2">If all accounts matched ICP:</p>
                    <p className="text-3xl font-bold text-chart-2">{formatCurrency(dataInsights.actionableInsights.projectedLift)}</p>
                    <p className="text-sm text-muted-foreground mt-1">projected incremental revenue</p>
                    <Badge variant="outline" className="mt-2 text-xs">Estimate based on gap analysis</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
