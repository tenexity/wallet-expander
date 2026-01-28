import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Building2,
  Users,
  FileText,
  Target,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Edit2,
  Search,
  CreditCard,
  HelpCircle,
  Pencil,
} from "lucide-react";
import type { Tenant, SubscriptionPlan } from "@shared/schema";

interface TenantWithMetrics extends Tenant {
  ownerEmail?: string;
  accountCount: number;
  enrolledCount: number;
  playbookCount: number;
  icpCount: number;
  userCount: number;
}

interface SubscriptionPlanConfig {
  id: number;
  name: string;
  slug: string;
  stripeMonthlyPriceId: string | null;
  stripeYearlyPriceId: string | null;
  monthlyPrice: string;
  yearlyPrice: string;
}

interface TenantUsageResponse {
  tenants: TenantWithMetrics[];
  totalTenants: number;
}

export default function AppAdmin() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof TenantWithMetrics>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedTenant, setSelectedTenant] = useState<TenantWithMetrics | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: tenantsData, isLoading: tenantsLoading, refetch: refetchTenants } = useQuery<TenantUsageResponse>({
    queryKey: ["/api/app-admin/tenants"],
  });

  const { data: plans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription/plans"],
  });

  const updateTenantMutation = useMutation({
    mutationFn: async (data: { tenantId: number; planType: string; subscriptionStatus: string }) => {
      return apiRequest("PATCH", `/api/app-admin/tenants/${data.tenantId}`, { 
        planType: data.planType, 
        subscriptionStatus: data.subscriptionStatus 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-admin/tenants"] });
      setEditDialogOpen(false);
      toast({
        title: "Tenant Updated",
        description: "Subscription settings have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const tenants = tenantsData?.tenants || [];
  
  const filteredTenants = tenants.filter((tenant) =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tenant.ownerEmail && tenant.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedTenants = [...filteredTenants].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  const handleSort = (field: keyof TenantWithMetrics) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: keyof TenantWithMetrics }) => {
    if (field !== sortField) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    );
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case "active":
        return "default";
      case "trialing":
        return "secondary";
      case "past_due":
        return "destructive";
      case "canceled":
        return "outline";
      default:
        return "outline";
    }
  };

  const getPlanBadgeVariant = (planType: string | null) => {
    switch (planType) {
      case "enterprise":
        return "default";
      case "scale":
        return "default";
      case "growth":
        return "secondary";
      default:
        return "outline";
    }
  };

  const totalAccounts = tenants.reduce((sum, t) => sum + t.accountCount, 0);
  const totalEnrolled = tenants.reduce((sum, t) => sum + t.enrolledCount, 0);
  const totalPlaybooks = tenants.reduce((sum, t) => sum + t.playbookCount, 0);
  const totalICPs = tenants.reduce((sum, t) => sum + t.icpCount, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-app-admin-title">
          Platform Administration
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage tenants, subscriptions, and Stripe configuration
        </p>
      </div>

      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tenants" data-testid="tab-tenants">
            <Building2 className="mr-2 h-4 w-4" />
            Tenants
          </TabsTrigger>
          <TabsTrigger value="stripe" data-testid="tab-stripe">
            <CreditCard className="mr-2 h-4 w-4" />
            Stripe Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="space-y-6">
          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              onClick={() => refetchTenants()}
              disabled={tenantsLoading}
              data-testid="button-refresh-tenants"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${tenantsLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Tenants</p>
              <p className="text-2xl font-bold" data-testid="text-total-tenants">
                {tenantsData?.totalTenants ?? 0}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Accounts</p>
              <p className="text-2xl font-bold" data-testid="text-total-accounts">
                {totalAccounts}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-green-500/10">
              <FileText className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Playbooks</p>
              <p className="text-2xl font-bold" data-testid="text-total-playbooks">
                {totalPlaybooks}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-purple-500/10">
              <Target className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total ICPs</p>
              <p className="text-2xl font-bold" data-testid="text-total-icps">
                {totalICPs}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tenants by name, slug, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-tenants"
            />
          </div>
        </div>

        {tenantsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("name")}
                    data-testid="header-name"
                  >
                    <div className="flex items-center">
                      Tenant
                      <SortIcon field="name" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("planType")}
                    data-testid="header-plan"
                  >
                    <div className="flex items-center">
                      Plan
                      <SortIcon field="planType" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("subscriptionStatus")}
                    data-testid="header-status"
                  >
                    <div className="flex items-center">
                      Status
                      <SortIcon field="subscriptionStatus" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-right"
                    onClick={() => handleSort("accountCount")}
                    data-testid="header-accounts"
                  >
                    <div className="flex items-center justify-end">
                      Accounts
                      <SortIcon field="accountCount" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-right"
                    onClick={() => handleSort("enrolledCount")}
                    data-testid="header-enrolled"
                  >
                    <div className="flex items-center justify-end">
                      Enrolled
                      <SortIcon field="enrolledCount" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-right"
                    onClick={() => handleSort("playbookCount")}
                    data-testid="header-playbooks"
                  >
                    <div className="flex items-center justify-end">
                      Playbooks
                      <SortIcon field="playbookCount" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-right"
                    onClick={() => handleSort("icpCount")}
                    data-testid="header-icps"
                  >
                    <div className="flex items-center justify-end">
                      ICPs
                      <SortIcon field="icpCount" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      {searchTerm ? "No tenants match your search" : "No tenants found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTenants.map((tenant) => (
                    <TableRow key={tenant.id} data-testid={`row-tenant-${tenant.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{tenant.name}</p>
                          <p className="text-sm text-muted-foreground">{tenant.ownerEmail || tenant.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPlanBadgeVariant(tenant.planType)}>
                          {tenant.planType || "free"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(tenant.subscriptionStatus)}>
                          {tenant.subscriptionStatus || "none"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {tenant.accountCount}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {tenant.enrolledCount}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {tenant.playbookCount}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {tenant.icpCount}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setEditDialogOpen(true);
                          }}
                          data-testid={`button-edit-tenant-${tenant.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Tenant Subscription</DialogTitle>
                <DialogDescription>
                  Update subscription settings for {selectedTenant?.name}
                </DialogDescription>
              </DialogHeader>
              {selectedTenant && (
                <TenantEditForm
                  tenant={selectedTenant}
                  plans={plans || []}
                  onSubmit={(data) =>
                    updateTenantMutation.mutate({
                      tenantId: selectedTenant.id,
                      ...data,
                    })
                  }
                  isPending={updateTenantMutation.isPending}
                />
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="stripe" className="space-y-6">
          <StripeConfigManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TenantEditForm({
  tenant,
  plans,
  onSubmit,
  isPending,
}: {
  tenant: TenantWithMetrics;
  plans: SubscriptionPlan[];
  onSubmit: (data: { planType: string; subscriptionStatus: string }) => void;
  isPending: boolean;
}) {
  const [planType, setPlanType] = useState(tenant.planType || "free");
  const [subscriptionStatus, setSubscriptionStatus] = useState(
    tenant.subscriptionStatus || "none"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ planType, subscriptionStatus });
  };

  const planSlugs = ["free", ...plans.map((p) => p.slug)];
  const statuses = ["none", "trialing", "active", "past_due", "canceled", "unpaid"];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="planType">Subscription Plan</Label>
        <Select value={planType} onValueChange={setPlanType}>
          <SelectTrigger id="planType" data-testid="select-plan-type">
            <SelectValue placeholder="Select plan" />
          </SelectTrigger>
          <SelectContent>
            {planSlugs.map((slug) => (
              <SelectItem key={slug} value={slug}>
                {slug.charAt(0).toUpperCase() + slug.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subscriptionStatus">Subscription Status</Label>
        <Select value={subscriptionStatus} onValueChange={setSubscriptionStatus}>
          <SelectTrigger id="subscriptionStatus" data-testid="select-status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="pt-4 border-t">
        <h4 className="font-medium mb-2">Current Usage</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Accounts:</span>
            <span className="font-mono">{tenant.accountCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Enrolled:</span>
            <span className="font-mono">{tenant.enrolledCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Playbooks:</span>
            <span className="font-mono">{tenant.playbookCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ICPs:</span>
            <span className="font-mono">{tenant.icpCount}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isPending} data-testid="button-save-tenant">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}

interface StripeDebugInfo {
  mode: string;
  isConfigured: boolean;
  appSlug: string;
  baseUrl: string;
  whitelistedPriceIds: string[];
  webhookConfigured: boolean;
  configuredPlans: { slug: string; stripeMonthlyPriceId: string | null; stripeYearlyPriceId: string | null }[];
  environment: {
    hasSecretKey: boolean;
    hasWebhookSecret: boolean;
    hasPriceIds: boolean;
    hasAppSlug: boolean;
    hasBaseUrl: boolean;
  };
}

function StripeConfigManager() {
  const { toast } = useToast();
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanConfig | null>(null);
  const [monthlyPriceId, setMonthlyPriceId] = useState("");
  const [yearlyPriceId, setYearlyPriceId] = useState("");

  const { data: plans = [], isLoading } = useQuery<SubscriptionPlanConfig[]>({
    queryKey: ["/api/subscription/plans"],
  });

  const { data: debugInfo, isLoading: isDebugLoading, refetch: refetchDebug } = useQuery<StripeDebugInfo>({
    queryKey: ["/api/stripe/debug"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, stripeMonthlyPriceId, stripeYearlyPriceId }: { id: number; stripeMonthlyPriceId: string; stripeYearlyPriceId: string }) => {
      const res = await apiRequest("PATCH", `/api/subscription/plans/${id}`, {
        stripeMonthlyPriceId,
        stripeYearlyPriceId,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Stripe price IDs updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/plans"] });
      setEditingPlan(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (plan: SubscriptionPlanConfig) => {
    setEditingPlan(plan);
    setMonthlyPriceId(plan.stripeMonthlyPriceId || "");
    setYearlyPriceId(plan.stripeYearlyPriceId || "");
  };

  const handleSave = () => {
    if (!editingPlan) return;
    updateMutation.mutate({
      id: editingPlan.id,
      stripeMonthlyPriceId: monthlyPriceId,
      stripeYearlyPriceId: yearlyPriceId,
    });
  };

  const webhookUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/api/stripe/webhook`
    : "/api/stripe/webhook";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stripe Configuration</CardTitle>
          <CardDescription>
            Configure Stripe price IDs for subscription plans. You must create products and prices in your Stripe Dashboard first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-md p-4 space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Webhook Configuration
            </h4>
            <p className="text-sm text-muted-foreground">
              Add this webhook URL to your Stripe Dashboard under Developers &gt; Webhooks:
            </p>
            <div className="flex items-center gap-2">
              <Input 
                value={webhookUrl}
                readOnly
                className="font-mono text-sm bg-background"
                data-testid="input-webhook-url"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                  toast({ title: "Copied", description: "Webhook URL copied to clipboard" });
                }}
                data-testid="button-copy-webhook"
              >
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Events to enable: checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.paid, invoice.payment_failed
            </p>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-4">Subscription Plans</h4>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Monthly Price</TableHead>
                    <TableHead>Monthly Price ID</TableHead>
                    <TableHead>Yearly Price</TableHead>
                    <TableHead>Yearly Price ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id} data-testid={`row-plan-${plan.slug}`}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>${plan.monthlyPrice}/mo</TableCell>
                      <TableCell>
                        {plan.stripeMonthlyPriceId ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            {plan.stripeMonthlyPriceId}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Not configured</Badge>
                        )}
                      </TableCell>
                      <TableCell>${plan.yearlyPrice}/yr</TableCell>
                      <TableCell>
                        {plan.stripeYearlyPriceId ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            {plan.stripeYearlyPriceId}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Not configured</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(plan)}
                          data-testid={`button-edit-plan-${plan.slug}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Stripe Debug Info</CardTitle>
            <CardDescription>
              Environment status and configuration details (no secrets exposed)
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchDebug()}
            disabled={isDebugLoading}
            data-testid="button-refresh-debug"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isDebugLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isDebugLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : debugInfo ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-muted/50 rounded-md">
                  <div className="text-sm text-muted-foreground">Mode</div>
                  <div className="font-medium flex items-center gap-2">
                    <Badge variant={debugInfo.mode === "test" ? "secondary" : "default"}>
                      {debugInfo.mode.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-md">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="font-medium">
                    <Badge variant={debugInfo.isConfigured ? "default" : "destructive"}>
                      {debugInfo.isConfigured ? "Configured" : "Not Configured"}
                    </Badge>
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-md">
                  <div className="text-sm text-muted-foreground">Webhook</div>
                  <div className="font-medium">
                    <Badge variant={debugInfo.webhookConfigured ? "default" : "destructive"}>
                      {debugInfo.webhookConfigured ? "Configured" : "Not Configured"}
                    </Badge>
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-md">
                  <div className="text-sm text-muted-foreground">App Slug</div>
                  <div className="font-mono text-sm truncate">{debugInfo.appSlug || "—"}</div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Environment Variables</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {Object.entries(debugInfo.environment).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <div className={`h-2 w-2 rounded-full ${value ? "bg-green-500" : "bg-red-500"}`} />
                      <span className="text-muted-foreground">
                        {key.replace(/^has/, "").replace(/([A-Z])/g, " $1").trim()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Base URL</h4>
                <Input value={debugInfo.baseUrl} readOnly className="font-mono text-sm bg-muted/50" />
              </div>

              {debugInfo.whitelistedPriceIds.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Whitelisted Price IDs</h4>
                    <div className="flex flex-wrap gap-2">
                      {debugInfo.whitelistedPriceIds.map((priceId) => (
                        <Badge key={priceId} variant="outline" className="font-mono text-xs">
                          {priceId}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Unable to load debug information</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stripe Price IDs</DialogTitle>
            <DialogDescription>
              Enter the Stripe Price IDs for {editingPlan?.name}. Get these from your Stripe Dashboard under Products.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="monthly-price-id">Monthly Price ID</Label>
              <Input
                id="monthly-price-id"
                value={monthlyPriceId}
                onChange={(e) => setMonthlyPriceId(e.target.value)}
                placeholder="price_1234567890..."
                className="font-mono"
                data-testid="input-monthly-price-id"
              />
              <p className="text-xs text-muted-foreground">
                Price: ${editingPlan?.monthlyPrice}/month
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearly-price-id">Yearly Price ID</Label>
              <Input
                id="yearly-price-id"
                value={yearlyPriceId}
                onChange={(e) => setYearlyPriceId(e.target.value)}
                placeholder="price_0987654321..."
                className="font-mono"
                data-testid="input-yearly-price-id"
              />
              <p className="text-xs text-muted-foreground">
                Price: ${editingPlan?.yearlyPrice}/year
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingPlan(null)}
              data-testid="button-cancel-price"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              data-testid="button-save-price"
            >
              {updateMutation.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
