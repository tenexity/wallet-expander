import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  Building2,
  MapPin,
  DollarSign,
  Calendar,
  HardHat,
  Layers,
  ArrowRight,
  Loader2,
  FolderKanban,
  Clock,
  Ruler,
  Users,
  Swords,
} from "lucide-react";
import { Link } from "wouter";
import type { Project } from "@shared/schema";

interface AccountBasic {
  id: number;
  name: string;
}

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  identified: { label: "Identified", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  bidding: { label: "Bidding", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  awarded: { label: "Awarded", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  in_progress: { label: "In Progress", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  lost: { label: "Lost", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

const TYPE_CONFIG: Record<string, string> = {
  new_construction: "New Construction",
  renovation: "Renovation",
  retrofit: "Retrofit",
  maintenance: "Maintenance",
  tenant_improvement: "Tenant Improvement",
  unknown: "Unknown",
};

function formatCurrency(value: string | number | null): string {
  if (!value) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

function formatDate(d: string | Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function CRMProjects() {
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/crm/projects"],
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

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.location || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.generalContractor || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (accountMap[p.accountId || 0] || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStage = stageFilter === "all" || p.stage === stageFilter;
      const matchesType = typeFilter === "all" || p.projectType === typeFilter;
      return matchesSearch && matchesStage && matchesType;
    });
  }, [projects, searchQuery, stageFilter, typeFilter, accountMap]);

  const stats = useMemo(() => {
    if (!projects) return { total: 0, totalValue: 0, active: 0, bidding: 0 };
    const activeStages = ["identified", "bidding", "awarded", "in_progress"];
    return {
      total: projects.length,
      totalValue: projects.reduce((sum, p) => sum + (p.estimatedValue ? parseFloat(p.estimatedValue as string) : 0), 0),
      active: projects.filter(p => activeStages.includes(p.stage || "")).length,
      bidding: projects.filter(p => p.stage === "bidding").length,
    };
  }, [projects]);

  const stages = ["all", "identified", "bidding", "awarded", "in_progress", "completed", "lost"];
  const types = ["all", "new_construction", "renovation", "retrofit", "maintenance", "tenant_improvement"];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-crm-projects">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Pipeline</h1>
          <p className="text-muted-foreground">
            Construction projects detected from email intelligence and customer correspondence
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="stat-total-projects">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
                <FolderKanban className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-pipeline-value">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
                <p className="text-xs text-muted-foreground">Pipeline Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-active-projects">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
                <HardHat className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Active Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-bidding-projects">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.bidding}</p>
                <p className="text-xs text-muted-foreground">In Bidding</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg">All Projects</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, location, GC, account..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-projects"
                />
              </div>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-stage-filter">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map(s => (
                    <SelectItem key={s} value={s}>{s === "all" ? "All Stages" : STAGE_CONFIG[s]?.label || s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[170px]" data-testid="select-type-filter">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  {types.map(t => (
                    <SelectItem key={t} value={t}>{t === "all" ? "All Types" : TYPE_CONFIG[t] || t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProjects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects found"
              description={projects?.length ? "Try adjusting your filters" : "Connect your email inbox in Settings to auto-detect construction projects from customer correspondence"}
            />
          ) : (
            <div className="space-y-3">
              {filteredProjects.map((project) => {
                const accountName = accountMap[project.accountId || 0];
                const categories = (project.productCategories as string[] | null) || [];
                const competitors = (project.competitorsInvolved as string[] | null) || [];
                const stageConfig = STAGE_CONFIG[project.stage || "identified"] || STAGE_CONFIG.identified;
                const hasBidDeadline = project.bidDeadline && new Date(project.bidDeadline) > new Date();
                const bidDeadlineSoon = project.bidDeadline && new Date(project.bidDeadline).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 && new Date(project.bidDeadline) > new Date();

                return (
                  <div
                    key={project.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50 ${bidDeadlineSoon ? "border-amber-300 dark:border-amber-700" : ""}`}
                    onClick={() => setSelectedProject(project)}
                    data-testid={`card-project-${project.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium" data-testid={`text-project-name-${project.id}`}>{project.name}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${stageConfig.color}`} data-testid={`badge-stage-${project.stage || "identified"}-${project.id}`}>
                            {stageConfig.label}
                          </span>
                          {project.projectType && project.projectType !== "unknown" && (
                            <Badge variant="outline" className="text-xs" data-testid={`badge-type-${project.projectType}-${project.id}`}>{TYPE_CONFIG[project.projectType] || project.projectType}</Badge>
                          )}
                          {bidDeadlineSoon && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0" data-testid={`badge-bid-deadline-soon-${project.id}`}>
                              Bid deadline soon
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1.5 flex-wrap">
                          {project.location && (
                            <span className="inline-flex items-center gap-1" data-testid={`text-location-${project.id}`}>
                              <MapPin className="h-3 w-3" />
                              {project.location}
                            </span>
                          )}
                          {project.generalContractor && (
                            <span className="inline-flex items-center gap-1" data-testid={`text-general-contractor-${project.id}`}>
                              <HardHat className="h-3 w-3" />
                              {project.generalContractor}
                            </span>
                          )}
                          {accountName && (
                            <Link
                              href={`/accounts?account=${project.accountId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary hover:underline inline-flex items-center gap-1"
                              data-testid={`link-account-${project.accountId}`}
                            >
                              <Building2 className="h-3 w-3" />
                              {accountName}
                            </Link>
                          )}
                        </div>
                        {categories.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap" data-testid={`categories-${project.id}`}>
                            <Layers className="h-3 w-3 text-muted-foreground shrink-0" />
                            {categories.slice(0, 4).map((cat, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0" data-testid={`badge-category-${cat}-${project.id}`}>{cat}</Badge>
                            ))}
                            {categories.length > 4 && (
                              <span className="text-xs text-muted-foreground" data-testid={`text-more-categories-${project.id}`}>+{categories.length - 4} more</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {project.estimatedValue && (
                          <p className="font-semibold text-lg" data-testid={`text-estimated-value-${project.id}`}>{formatCurrency(project.estimatedValue)}</p>
                        )}
                        {hasBidDeadline && (
                          <p className="text-xs text-muted-foreground mt-1" data-testid={`text-bid-deadline-${project.id}`}>
                            Bid by {formatDate(project.bidDeadline)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <DialogContent className="max-w-lg" data-testid={`dialog-project-details-${selectedProject?.id || ""}`}>
          <DialogHeader>
            <DialogTitle data-testid={`dialog-title-${selectedProject?.id || ""}`}>{selectedProject?.name}</DialogTitle>
            <DialogDescription>Project details and intelligence</DialogDescription>
          </DialogHeader>
          {selectedProject && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${(STAGE_CONFIG[selectedProject.stage || "identified"] || STAGE_CONFIG.identified).color}`} data-testid={`badge-stage-detail-${selectedProject.stage || "identified"}`}>
                  {(STAGE_CONFIG[selectedProject.stage || "identified"] || STAGE_CONFIG.identified).label}
                </span>
                {selectedProject.projectType && selectedProject.projectType !== "unknown" && (
                  <Badge variant="outline" data-testid={`badge-type-detail-${selectedProject.projectType}`}>{TYPE_CONFIG[selectedProject.projectType] || selectedProject.projectType}</Badge>
                )}
                <Badge variant="outline" className="text-xs" data-testid={`badge-source-${selectedProject.source || "manual"}`}>
                  Source: {selectedProject.source === "email_sync" ? "Email Intelligence" : "Manual"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedProject.estimatedValue && (
                  <div data-testid="field-estimated-value">
                    <p className="text-muted-foreground text-xs">Estimated Value</p>
                    <p className="font-semibold text-lg" data-testid={`text-estimated-value-detail-${selectedProject.id}`}>{formatCurrency(selectedProject.estimatedValue)}</p>
                  </div>
                )}
                {selectedProject.location && (
                  <div data-testid="field-location">
                    <p className="text-muted-foreground text-xs">Location</p>
                    <p className="font-medium flex items-center gap-1" data-testid={`text-location-detail-${selectedProject.id}`}><MapPin className="h-3 w-3" />{selectedProject.location}</p>
                  </div>
                )}
                {selectedProject.generalContractor && (
                  <div data-testid="field-general-contractor">
                    <p className="text-muted-foreground text-xs">General Contractor</p>
                    <p className="font-medium" data-testid={`text-gc-detail-${selectedProject.id}`}>{selectedProject.generalContractor}</p>
                  </div>
                )}
                {selectedProject.accountId && accountMap[selectedProject.accountId] && (
                  <div data-testid="field-account">
                    <p className="text-muted-foreground text-xs">Account</p>
                    <Link href={`/accounts?account=${selectedProject.accountId}`} className="font-medium text-primary hover:underline inline-flex items-center gap-1" data-testid={`link-account-detail-${selectedProject.accountId}`}>
                      <Building2 className="h-3 w-3" />
                      {accountMap[selectedProject.accountId]}
                    </Link>
                  </div>
                )}
                {selectedProject.bidDeadline && (
                  <div data-testid="field-bid-deadline">
                    <p className="text-muted-foreground text-xs">Bid Deadline</p>
                    <p className="font-medium flex items-center gap-1" data-testid={`text-bid-deadline-detail-${selectedProject.id}`}><Calendar className="h-3 w-3" />{formatDate(selectedProject.bidDeadline)}</p>
                  </div>
                )}
                {selectedProject.startDate && (
                  <div data-testid="field-start-date">
                    <p className="text-muted-foreground text-xs">Start Date</p>
                    <p className="font-medium" data-testid={`text-start-date-${selectedProject.id}`}>{formatDate(selectedProject.startDate)}</p>
                  </div>
                )}
                {selectedProject.unitCount && (
                  <div data-testid="field-units">
                    <p className="text-muted-foreground text-xs">Units</p>
                    <p className="font-medium" data-testid={`text-units-${selectedProject.id}`}>{selectedProject.unitCount}</p>
                  </div>
                )}
                {selectedProject.squareFootage && (
                  <div data-testid="field-square-footage">
                    <p className="text-muted-foreground text-xs">Square Footage</p>
                    <p className="font-medium" data-testid={`text-square-footage-${selectedProject.id}`}>{selectedProject.squareFootage.toLocaleString()} sq ft</p>
                  </div>
                )}
              </div>

              {((selectedProject.productCategories as string[] | null) || []).length > 0 && (
                <div data-testid="section-product-categories">
                  <p className="text-muted-foreground text-xs mb-1.5">Product Categories Needed</p>
                  <div className="flex flex-wrap gap-1.5">
                    {((selectedProject.productCategories as string[]) || []).map((cat, i) => (
                      <Badge key={i} variant="secondary" data-testid={`badge-category-detail-${cat}`}>{cat}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {((selectedProject.competitorsInvolved as string[] | null) || []).length > 0 && (
                <div data-testid="section-competitors">
                  <p className="text-muted-foreground text-xs mb-1.5">Competitors Involved</p>
                  <div className="flex flex-wrap gap-1.5">
                    {((selectedProject.competitorsInvolved as string[]) || []).map((comp, i) => (
                      <Badge key={i} variant="destructive" className="text-xs" data-testid={`badge-competitor-${comp}`}>{comp}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedProject.notes && (
                <div data-testid="section-notes">
                  <p className="text-muted-foreground text-xs mb-1">Notes</p>
                  <p className="text-sm bg-muted/50 p-3 rounded-md" data-testid={`text-notes-${selectedProject.id}`}>{selectedProject.notes}</p>
                </div>
              )}

              {selectedProject.accountId && (
                <div className="pt-2 border-t">
                  <Link href={`/playbooks?account=${selectedProject.accountId}`}>
                    <Button variant="outline" size="sm" className="w-full" data-testid={`button-generate-playbook-${selectedProject.accountId}`}>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Generate Playbook for this Account
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
