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
} from "lucide-react";

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

export default function ICPBuilder() {
  const [selectedProfile, setSelectedProfile] = useState<SegmentProfile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const { toast } = useToast();

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

  // Mock data for demonstration
  const mockProfiles: SegmentProfile[] = [
    {
      id: 1,
      segment: "HVAC",
      name: "Full-Scope HVAC Contractor",
      description: "HVAC contractors who purchase a complete range of equipment and supplies",
      minAnnualRevenue: 50000,
      status: "approved",
      accountCount: 156,
      approvedBy: "Mark Minnich",
      approvedAt: "2024-01-10",
      categories: [
        { id: 1, categoryName: "HVAC Equipment", expectedPct: 40, importance: 1, isRequired: true, notes: "" },
        { id: 2, categoryName: "Refrigerant & Supplies", expectedPct: 18, importance: 1, isRequired: true, notes: "" },
        { id: 3, categoryName: "Ductwork & Fittings", expectedPct: 12, importance: 1, isRequired: false, notes: "" },
        { id: 4, categoryName: "Controls & Thermostats", expectedPct: 8, importance: 1.5, isRequired: false, notes: "Growing category" },
        { id: 5, categoryName: "Water Heaters", expectedPct: 8, importance: 2, isRequired: false, notes: "Strategic priority" },
        { id: 6, categoryName: "Tools & Safety", expectedPct: 4, importance: 0.5, isRequired: false, notes: "Low margin" },
        { id: 7, categoryName: "Pipe & Fittings", expectedPct: 10, importance: 1, isRequired: false, notes: "" },
      ],
    },
    {
      id: 2,
      segment: "Plumbing",
      name: "Full-Scope Plumbing Contractor",
      description: "Plumbing contractors purchasing across major categories",
      minAnnualRevenue: 40000,
      status: "approved",
      accountCount: 198,
      approvedBy: "Mark Minnich",
      approvedAt: "2024-01-12",
      categories: [
        { id: 8, categoryName: "Pipe & Fittings", expectedPct: 35, importance: 1, isRequired: true, notes: "" },
        { id: 9, categoryName: "PVF", expectedPct: 20, importance: 1, isRequired: true, notes: "" },
        { id: 10, categoryName: "Water Heaters", expectedPct: 15, importance: 2, isRequired: false, notes: "Strategic priority" },
        { id: 11, categoryName: "Fixtures", expectedPct: 12, importance: 1, isRequired: false, notes: "" },
        { id: 12, categoryName: "Tools & Safety", expectedPct: 8, importance: 0.5, isRequired: false, notes: "" },
        { id: 13, categoryName: "Drainage", expectedPct: 10, importance: 1, isRequired: false, notes: "" },
      ],
    },
    {
      id: 3,
      segment: "Mechanical",
      name: "Full-Scope Mechanical Contractor",
      description: "Mechanical contractors with diverse purchasing needs",
      minAnnualRevenue: 60000,
      status: "draft",
      accountCount: 89,
      categories: [
        { id: 14, categoryName: "HVAC Equipment", expectedPct: 30, importance: 1, isRequired: true, notes: "" },
        { id: 15, categoryName: "Pipe & Fittings", expectedPct: 25, importance: 1, isRequired: true, notes: "" },
        { id: 16, categoryName: "Controls", expectedPct: 15, importance: 1.5, isRequired: false, notes: "" },
        { id: 17, categoryName: "Water Heaters", expectedPct: 10, importance: 2, isRequired: false, notes: "Strategic priority" },
        { id: 18, categoryName: "Ductwork", expectedPct: 12, importance: 1, isRequired: false, notes: "" },
        { id: 19, categoryName: "Tools", expectedPct: 8, importance: 0.5, isRequired: false, notes: "" },
      ],
    },
  ];

  const displayProfiles = profiles || mockProfiles;

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
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
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
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
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
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
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Analysis
              </CardTitle>
              <CardDescription>
                Generate suggested profiles from Class A customer data
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
    </div>
  );
}
