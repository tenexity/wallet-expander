import { useState, useRef, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TerritoryManager } from "@shared/schema";
import {
  Settings,
  Database,
  Brain,
  Mail,
  Shield,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Sliders,
  FileText,
  Users,
  Plus,
  Pencil,
  Trash2,
  Upload,
  X,
  Image,
  Target,
  DollarSign,
  Layers,
  RotateCcw,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  BookOpen,
  TrendingUp,
  Calendar,
  Clock,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Setting {
  key: string;
  value: string | null;
}

interface ScoringWeights {
  id: number;
  name: string;
  gapSizeWeight: number;
  revenuePotentialWeight: number;
  categoryCountWeight: number;
  description: string;
  isActive: boolean;
}

const DEFAULT_WEIGHTS = {
  gapSizeWeight: 40,
  revenuePotentialWeight: 30,
  categoryCountWeight: 30,
};

const territoryManagerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  territories: z.string(),
  isActive: z.boolean().default(true),
});

type TerritoryManagerFormValues = z.infer<typeof territoryManagerFormSchema>;

interface CustomCategory {
  id: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

interface RevenueSnapshot {
  period: string;
  baselineRevenue: number;
  actualRevenue: number;
  incrementalRevenue: number;
  feeAmount: number;
}

interface EnrolledAccountSummary {
  id: number;
  accountName: string;
  incrementalRevenue: number;
  feeAmount: number;
  status: string;
}

interface RevShareTier {
  id: number;
  minRevenue: string;
  maxRevenue: string | null;
  shareRate: string;
  displayOrder: number | null;
  isActive: boolean | null;
}

interface FeeCalculation {
  incrementalRevenue: number;
  totalFee: number;
  effectiveRate: number;
  breakdown: Array<{ tier: string; rate: number; revenueInTier: number; fee: number }>;
}

function RevenueTrackingManager() {
  const { toast } = useToast();
  const [isAddTierOpen, setIsAddTierOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<RevShareTier | null>(null);
  const [newTierMin, setNewTierMin] = useState("");
  const [newTierMax, setNewTierMax] = useState("");
  const [newTierRate, setNewTierRate] = useState("");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const { data: enrolledAccounts } = useQuery<EnrolledAccountSummary[]>({
    queryKey: ["/api/program-accounts"],
  });

  const { data: tiers = [], isLoading: tiersLoading } = useQuery<RevShareTier[]>({
    queryKey: ["/api/rev-share-tiers"],
  });

  // Calculate tiered fee for a given revenue amount
  // Uses proper tier boundary calculation: revenueInTier = max(0, min(revenue, maxRev) - minRev)
  const calculateTieredFee = (revenue: number): { totalFee: number; breakdown: Array<{ tier: string; rate: number; revenueInTier: number; fee: number }> } => {
    if (revenue <= 0) {
      return { totalFee: 0, breakdown: [] };
    }
    
    if (tiers.length === 0) {
      // Default to 15% if no tiers
      const fee = revenue * 0.15;
      return { 
        totalFee: fee, 
        breakdown: [{ tier: "$0+", rate: 15, revenueInTier: revenue, fee }] 
      };
    }

    const activeTiers = tiers
      .filter(t => t.isActive)
      .sort((a, b) => parseFloat(a.minRevenue) - parseFloat(b.minRevenue));

    if (activeTiers.length === 0) {
      const fee = revenue * 0.15;
      return { 
        totalFee: fee, 
        breakdown: [{ tier: "$0+", rate: 15, revenueInTier: revenue, fee }] 
      };
    }

    let totalFee = 0;
    const breakdown: Array<{ tier: string; rate: number; revenueInTier: number; fee: number }> = [];

    for (const tier of activeTiers) {
      const minRev = parseFloat(tier.minRevenue);
      const maxRev = tier.maxRevenue ? parseFloat(tier.maxRevenue) : Infinity;
      const rate = parseFloat(tier.shareRate);

      // Skip tiers where revenue hasn't reached the minimum threshold
      if (revenue <= minRev) continue;

      // Calculate how much revenue falls into this tier's range
      // revenueInTier = max(0, min(revenue, maxRev) - minRev)
      const cappedRevenue = Math.min(revenue, maxRev);
      const revenueInTier = Math.max(0, cappedRevenue - minRev);

      if (revenueInTier > 0) {
        const fee = revenueInTier * (rate / 100);
        totalFee += fee;
        breakdown.push({
          tier: `${formatCurrency(minRev)} - ${maxRev === Infinity ? "Unlimited" : formatCurrency(maxRev)}`,
          rate,
          revenueInTier,
          fee,
        });
      }
    }

    return { totalFee, breakdown };
  };

  const activeAccounts = enrolledAccounts?.filter(a => a.status === "active") || [];
  const totalIncremental = activeAccounts.reduce((sum, a) => sum + (a.incrementalRevenue || 0), 0);

  const { data: feeCalculation } = useQuery<FeeCalculation>({
    queryKey: ["/api/rev-share-tiers/calculate", totalIncremental],
    queryFn: async () => {
      const res = await fetch("/api/rev-share-tiers/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incrementalRevenue: totalIncremental }),
      });
      if (!res.ok) throw new Error("Failed to calculate fees");
      return res.json();
    },
    enabled: totalIncremental >= 0,
  });

  const createTierMutation = useMutation({
    mutationFn: async (data: { minRevenue: string; maxRevenue: string | null; shareRate: string }) => {
      const res = await apiRequest("POST", "/api/rev-share-tiers", {
        ...data,
        displayOrder: tiers.length,
        isActive: true,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rev-share-tiers"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          query.queryKey[0] === "/api/rev-share-tiers/calculate" 
      });
      setIsAddTierOpen(false);
      setNewTierMin("");
      setNewTierMax("");
      setNewTierRate("");
      toast({ title: "Tier created", description: "New pricing tier has been added." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create tier", variant: "destructive" });
    },
  });

  const updateTierMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; minRevenue?: string; maxRevenue?: string | null; shareRate?: string }) => {
      const res = await apiRequest("PUT", `/api/rev-share-tiers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rev-share-tiers"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          query.queryKey[0] === "/api/rev-share-tiers/calculate" 
      });
      setEditingTier(null);
      toast({ title: "Tier updated", description: "Pricing tier has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update tier", variant: "destructive" });
    },
  });

  const deleteTierMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/rev-share-tiers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rev-share-tiers"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          query.queryKey[0] === "/api/rev-share-tiers/calculate" 
      });
      toast({ title: "Tier deleted", description: "Pricing tier has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete tier", variant: "destructive" });
    },
  });

  const seedDefaultMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/rev-share-tiers/seed-default");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rev-share-tiers"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          query.queryKey[0] === "/api/rev-share-tiers/calculate" 
      });
      toast({ title: "Default tier created", description: "A 15% flat rate tier has been added." });
    },
  });

  const handleAddTier = () => {
    if (!newTierMin || !newTierRate) {
      toast({ title: "Error", description: "Min revenue and rate are required", variant: "destructive" });
      return;
    }
    const minVal = parseFloat(newTierMin);
    const maxVal = newTierMax ? parseFloat(newTierMax) : null;
    const rateVal = parseFloat(newTierRate);
    
    if (isNaN(minVal) || minVal < 0) {
      toast({ title: "Error", description: "Minimum revenue must be a non-negative number", variant: "destructive" });
      return;
    }
    if (maxVal !== null && maxVal <= minVal) {
      toast({ title: "Error", description: "Maximum revenue must be greater than minimum", variant: "destructive" });
      return;
    }
    if (isNaN(rateVal) || rateVal < 0 || rateVal > 100) {
      toast({ title: "Error", description: "Rate must be between 0 and 100", variant: "destructive" });
      return;
    }
    
    createTierMutation.mutate({
      minRevenue: newTierMin,
      maxRevenue: newTierMax || null,
      shareRate: newTierRate,
    });
  };

  const handleUpdateTier = () => {
    if (!editingTier) return;
    
    const minVal = parseFloat(editingTier.minRevenue);
    const maxVal = editingTier.maxRevenue ? parseFloat(editingTier.maxRevenue) : null;
    const rateVal = parseFloat(editingTier.shareRate);
    
    if (isNaN(minVal) || minVal < 0) {
      toast({ title: "Error", description: "Minimum revenue must be a non-negative number", variant: "destructive" });
      return;
    }
    if (maxVal !== null && maxVal <= minVal) {
      toast({ title: "Error", description: "Maximum revenue must be greater than minimum", variant: "destructive" });
      return;
    }
    if (isNaN(rateVal) || rateVal < 0 || rateVal > 100) {
      toast({ title: "Error", description: "Rate must be between 0 and 100", variant: "destructive" });
      return;
    }
    
    updateTierMutation.mutate({
      id: editingTier.id,
      minRevenue: editingTier.minRevenue,
      maxRevenue: editingTier.maxRevenue,
      shareRate: editingTier.shareRate,
    });
  };

  const totalFees = feeCalculation?.totalFee || 0;
  const effectiveRate = feeCalculation?.effectiveRate || 15;
  
  const today = new Date();
  const nextBillingDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const daysUntilBilling = Math.ceil((nextBillingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const mockRevenueData: RevenueSnapshot[] = [
    { period: "Aug", baselineRevenue: 56000, actualRevenue: 58000, incrementalRevenue: 2000, feeAmount: 300 },
    { period: "Sep", baselineRevenue: 58000, actualRevenue: 65000, incrementalRevenue: 7000, feeAmount: 1050 },
    { period: "Oct", baselineRevenue: 55000, actualRevenue: 72000, incrementalRevenue: 17000, feeAmount: 2550 },
    { period: "Nov", baselineRevenue: 62000, actualRevenue: 85000, incrementalRevenue: 23000, feeAmount: 3450 },
    { period: "Dec", baselineRevenue: 48000, actualRevenue: 78000, incrementalRevenue: 30000, feeAmount: 4500 },
    { period: "Jan", baselineRevenue: 52000, actualRevenue: 94000, incrementalRevenue: 42000, feeAmount: 6300 },
  ];

  return (
    <div className="space-y-6">
      {/* Tiered Pricing Configuration */}
      <Card data-testid="card-tiered-pricing">
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Rev-Share Tiers
            </CardTitle>
            <CardDescription>
              Configure volume-based pricing tiers for calculating fees
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsAddTierOpen(true)} data-testid="button-add-tier">
            <Plus className="h-4 w-4 mr-2" />
            Add Tier
          </Button>
        </CardHeader>
        <CardContent>
          {tiersLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tiers.length === 0 ? (
            <div className="text-center py-8">
              <Layers className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground mb-4">No pricing tiers defined yet.</p>
              <Button variant="outline" onClick={() => seedDefaultMutation.mutate()} data-testid="button-seed-default">
                Create Default 15% Tier
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Revenue Range</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers
                  .filter(t => t.isActive)
                  .sort((a, b) => parseFloat(a.minRevenue) - parseFloat(b.minRevenue))
                  .map((tier) => (
                    <TableRow key={tier.id} data-testid={`row-tier-${tier.id}`}>
                      <TableCell>
                        {formatCurrency(parseFloat(tier.minRevenue))} - {tier.maxRevenue ? formatCurrency(parseFloat(tier.maxRevenue)) : "Unlimited"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {parseFloat(tier.shareRate)}%
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingTier(tier)}
                            data-testid={`button-edit-tier-${tier.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTierMutation.mutate(tier.id)}
                            data-testid={`button-delete-tier-${tier.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5" data-testid="card-billing-cycle">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Next Billing Cycle
          </CardTitle>
          <CardDescription>
            Amount owed to Tenexity at the next billing date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Billing Date
              </div>
              <p className="text-2xl font-bold" data-testid="text-billing-date">
                {nextBillingDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <p className="text-sm text-muted-foreground" data-testid="text-days-remaining">
                {daysUntilBilling} days remaining
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Total Incremental Revenue
              </div>
              <p className="text-2xl font-bold text-chart-2" data-testid="text-current-incremental">
                {formatCurrency(totalIncremental)}
              </p>
              <p className="text-sm text-muted-foreground">
                Revenue above baseline
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Amount Due to Tenexity
              </div>
              <p className="text-2xl font-bold text-primary" data-testid="text-amount-due">
                {formatCurrency(totalFees)}
              </p>
              <p className="text-sm text-muted-foreground">
                Calculated using tiered pricing
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fee Breakdown by Tier */}
      {feeCalculation && feeCalculation.breakdown.length > 0 && (
        <Card data-testid="card-tier-breakdown">
          <CardHeader>
            <CardTitle className="text-base">Fee Calculation Breakdown</CardTitle>
            <CardDescription>How your total fee is calculated across pricing tiers</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier Range</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Revenue in Tier</TableHead>
                  <TableHead className="text-center">Calculation</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeCalculation.breakdown.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.tier}</TableCell>
                    <TableCell className="text-right">{item.rate}%</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.revenueInTier)}</TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {formatCurrency(item.revenueInTier)} × {item.rate}%
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">{formatCurrency(item.fee)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={3} className="font-bold">Total Fee</TableCell>
                  <TableCell className="text-center font-bold text-muted-foreground">Sum of all tiers</TableCell>
                  <TableCell className="text-right font-bold text-primary">{formatCurrency(totalFees)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-fees-summary">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Fees Summary
            </CardTitle>
            <CardDescription>
              Cumulative fees owed to Tenexity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">Total Incremental Revenue</p>
                <p className="text-sm text-muted-foreground">
                  From {activeAccounts.length} active enrolled accounts
                </p>
              </div>
              <p className="text-xl font-bold text-chart-2" data-testid="text-total-incremental">
                {formatCurrency(totalIncremental)}
              </p>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">Pricing Tiers</p>
                <p className="text-sm text-muted-foreground">
                  {tiers.filter(t => t.isActive).length} active tier{tiers.filter(t => t.isActive).length !== 1 ? "s" : ""} configured
                </p>
              </div>
              <p className="text-xl font-bold" data-testid="text-revshare-rate">
                {tiers.filter(t => t.isActive).length > 0 
                  ? `${tiers.filter(t => t.isActive).map(t => `${parseFloat(t.shareRate)}%`).join(", ")}`
                  : "15% default"
                }
              </p>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">Total Fees Owed</p>
                <p className="text-sm text-muted-foreground">
                  Cumulative amount to Tenexity
                </p>
              </div>
              <p className="text-2xl font-bold text-primary" data-testid="text-total-fees">
                {formatCurrency(totalFees)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-monthly-fees">
          <CardHeader>
            <CardTitle className="text-base">Monthly Fee Revenue</CardTitle>
            <CardDescription>Rev-share fees by month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tickFormatter={(value) => formatCurrency(value)}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <RechartsTooltip
                    formatter={(value: number) => [formatCurrency(value), "Fee"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Bar
                    dataKey="feeAmount"
                    name="Fee"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-fee-breakdown">
        <CardHeader>
          <CardTitle className="text-base">Fee Breakdown by Tier</CardTitle>
          <CardDescription>
            Revenue share organized by pricing tier with account details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>No enrolled accounts yet.</p>
              <p className="text-sm">Enroll accounts from the Revenue Tracking page to see fee breakdowns.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {(() => {
                // Build tier-grouped data structure
                const tierData: Record<string, {
                  tierName: string;
                  rate: number;
                  totalRevenue: number;
                  totalFee: number;
                  accounts: Array<{ name: string; revenue: number; fee: number }>;
                }> = {};

                // Collect all account contributions by tier
                activeAccounts.forEach((account) => {
                  const accountRevenue = account.incrementalRevenue || 0;
                  const accountCalc = calculateTieredFee(accountRevenue);
                  
                  accountCalc.breakdown.forEach((item) => {
                    if (!tierData[item.tier]) {
                      tierData[item.tier] = {
                        tierName: item.tier,
                        rate: item.rate,
                        totalRevenue: 0,
                        totalFee: 0,
                        accounts: [],
                      };
                    }
                    tierData[item.tier].totalRevenue += item.revenueInTier;
                    tierData[item.tier].totalFee += item.fee;
                    tierData[item.tier].accounts.push({
                      name: account.accountName || `Account ${account.id}`,
                      revenue: item.revenueInTier,
                      fee: item.fee,
                    });
                  });
                });

                // Sort tiers by their revenue range (parse first number from tier name)
                const sortedTiers = Object.values(tierData).sort((a, b) => {
                  const aMin = parseFloat(a.tierName.replace(/[^0-9.]/g, '')) || 0;
                  const bMin = parseFloat(b.tierName.replace(/[^0-9.]/g, '')) || 0;
                  return aMin - bMin;
                });

                const grandTotalFee = sortedTiers.reduce((sum, tier) => sum + tier.totalFee, 0);

                return (
                  <>
                    {sortedTiers.map((tier, tierIdx) => (
                      <div key={tierIdx} className="border rounded-md" data-testid={`tier-breakdown-${tierIdx}`}>
                        {/* Tier Header with Total */}
                        <div className="flex items-center justify-between p-4 bg-muted/30">
                          <div>
                            <h4 className="font-semibold">{tier.tierName}</h4>
                            <p className="text-sm text-muted-foreground">@ {tier.rate}% rate</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">{formatCurrency(tier.totalFee)}</p>
                            <p className="text-xs text-muted-foreground">from {formatCurrency(tier.totalRevenue)} revenue</p>
                          </div>
                        </div>
                        {/* Indented Account List */}
                        <div className="px-4 py-2 space-y-1">
                          {tier.accounts
                            .sort((a, b) => b.fee - a.fee) // Sort by fee descending
                            .map((acc, accIdx) => (
                            <div 
                              key={accIdx} 
                              className="flex items-center justify-between py-1.5 pl-4 border-l-2 border-muted-foreground/20"
                              data-testid={`tier-${tierIdx}-account-${accIdx}`}
                            >
                              <span className="text-sm">{acc.name}</span>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-muted-foreground">{formatCurrency(acc.revenue)}</span>
                                <span className="font-medium text-primary w-20 text-right">{formatCurrency(acc.fee)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {/* Grand Total */}
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold">Grand Total</p>
                          <p className="text-sm text-muted-foreground">
                            Sum of all tier fees
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            Total Revenue: <span className="font-medium text-chart-2">{formatCurrency(totalIncremental)}</span>
                          </p>
                          <p className="text-2xl font-bold text-primary">
                            {formatCurrency(grandTotalFee)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Tier Dialog */}
      <Dialog open={isAddTierOpen} onOpenChange={setIsAddTierOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Pricing Tier</DialogTitle>
            <DialogDescription>
              Define a new revenue tier with its share rate percentage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tier-min">Minimum Revenue ($)</Label>
                <Input
                  id="tier-min"
                  type="number"
                  value={newTierMin}
                  onChange={(e) => setNewTierMin(e.target.value)}
                  placeholder="0"
                  data-testid="input-tier-min"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tier-max">Maximum Revenue ($)</Label>
                <Input
                  id="tier-max"
                  type="number"
                  value={newTierMax}
                  onChange={(e) => setNewTierMax(e.target.value)}
                  placeholder="Leave empty for unlimited"
                  data-testid="input-tier-max"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tier-rate">Share Rate (%)</Label>
              <Input
                id="tier-rate"
                type="number"
                value={newTierRate}
                onChange={(e) => setNewTierRate(e.target.value)}
                placeholder="15"
                data-testid="input-tier-rate"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTierOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTier} disabled={createTierMutation.isPending} data-testid="button-save-tier">
              {createTierMutation.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Add Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tier Dialog */}
      <Dialog open={!!editingTier} onOpenChange={(open) => !open && setEditingTier(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pricing Tier</DialogTitle>
            <DialogDescription>
              Update this revenue tier's range and share rate.
            </DialogDescription>
          </DialogHeader>
          {editingTier && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-tier-min">Minimum Revenue ($)</Label>
                  <Input
                    id="edit-tier-min"
                    type="number"
                    value={editingTier.minRevenue}
                    onChange={(e) => setEditingTier({ ...editingTier, minRevenue: e.target.value })}
                    data-testid="input-edit-tier-min"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-tier-max">Maximum Revenue ($)</Label>
                  <Input
                    id="edit-tier-max"
                    type="number"
                    value={editingTier.maxRevenue || ""}
                    onChange={(e) => setEditingTier({ ...editingTier, maxRevenue: e.target.value || null })}
                    placeholder="Leave empty for unlimited"
                    data-testid="input-edit-tier-max"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tier-rate">Share Rate (%)</Label>
                <Input
                  id="edit-tier-rate"
                  type="number"
                  value={editingTier.shareRate}
                  onChange={(e) => setEditingTier({ ...editingTier, shareRate: e.target.value })}
                  data-testid="input-edit-tier-rate"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTier(null)}>Cancel</Button>
            <Button onClick={handleUpdateTier} disabled={updateTierMutation.isPending} data-testid="button-update-tier">
              {updateTierMutation.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface EmailSettings {
  enabled: boolean;
  fromEmail: string;
  fromName: string;
  notifyOnNewTask: boolean;
  notifyOnHighPriority: boolean;
  dailyDigest: boolean;
  isConfigured: boolean;
}

function EmailSettingsManager() {
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [hasEditedSender, setHasEditedSender] = useState(false);

  const { data: emailSettings, isLoading } = useQuery<EmailSettings>({
    queryKey: ["/api/email/settings"],
  });

  // Initialize local state when settings load
  useEffect(() => {
    if (emailSettings && !hasEditedSender) {
      setFromEmail(emailSettings.fromEmail || "");
      setFromName(emailSettings.fromName || "");
    }
  }, [emailSettings, hasEditedSender]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<EmailSettings>) => {
      const response = await apiRequest("PATCH", "/api/email/settings", settings);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/settings"] });
      toast({ title: "Email settings updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update settings", description: error.message, variant: "destructive" });
    },
  });

  const sendTestEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/email/test", { email });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Test email sent", description: "Check your inbox for the test email" });
      setTestEmail("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send test email", description: error.message, variant: "destructive" });
    },
  });

  const handleToggle = (key: keyof EmailSettings, value: boolean) => {
    updateSettingsMutation.mutate({ [key]: value });
  };

  const handleSendTestEmail = () => {
    if (!testEmail) {
      toast({ title: "Enter an email address", variant: "destructive" });
      return;
    }
    sendTestEmailMutation.mutate(testEmail);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Configuration
          </CardTitle>
          <CardDescription>
            Configure email notifications for task assignments and updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!emailSettings?.isConfigured && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Resend API Key Required</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  To enable email notifications, you need to add a RESEND_API_KEY secret. 
                  Get your API key from <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">resend.com</a> and add it to your project secrets.
                </p>
              </div>
            </div>
          )}

          {emailSettings?.isConfigured && (
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">Email Provider Connected</p>
                <p className="text-sm text-green-700 dark:text-green-300">Resend is configured and ready to send emails</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-enabled">Enable Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Turn on to send email notifications</p>
              </div>
              <Switch
                id="email-enabled"
                checked={emailSettings?.enabled || false}
                onCheckedChange={(checked) => handleToggle("enabled", checked)}
                disabled={!emailSettings?.isConfigured}
                data-testid="switch-email-enabled"
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Sender Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from-name">From Name</Label>
                  <Input
                    id="from-name"
                    value={fromName}
                    onChange={(e) => {
                      setFromName(e.target.value);
                      setHasEditedSender(true);
                    }}
                    placeholder="AI VP Dashboard"
                    data-testid="input-from-name"
                  />
                  <p className="text-xs text-muted-foreground">Display name for sent emails</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-email">From Email</Label>
                  <Input
                    id="from-email"
                    type="email"
                    value={fromEmail}
                    onChange={(e) => {
                      setFromEmail(e.target.value);
                      setHasEditedSender(true);
                    }}
                    placeholder="notifications@yourdomain.com"
                    data-testid="input-from-email"
                  />
                  <p className="text-xs text-muted-foreground">Must be a verified domain in Resend</p>
                </div>
              </div>
              {hasEditedSender && (
                <Button
                  onClick={() => {
                    updateSettingsMutation.mutate({ fromEmail, fromName });
                    setHasEditedSender(false);
                  }}
                  disabled={updateSettingsMutation.isPending}
                  size="sm"
                  data-testid="button-save-sender"
                >
                  {updateSettingsMutation.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                  Save Sender Settings
                </Button>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Notification Types</h4>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notify-new-task">New Task Assignments</Label>
                  <p className="text-sm text-muted-foreground">Notify TMs when tasks are assigned to them</p>
                </div>
                <Switch
                  id="notify-new-task"
                  checked={emailSettings?.notifyOnNewTask || false}
                  onCheckedChange={(checked) => handleToggle("notifyOnNewTask", checked)}
                  disabled={!emailSettings?.enabled}
                  data-testid="switch-notify-new-task"
                />
              </div>

              <div className="flex items-center justify-between opacity-60">
                <div>
                  <Label htmlFor="notify-high-priority" className="flex items-center gap-2">
                    High Priority Alerts
                    <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                  </Label>
                  <p className="text-sm text-muted-foreground">Send urgent notifications for high-priority tasks</p>
                </div>
                <Switch
                  id="notify-high-priority"
                  checked={emailSettings?.notifyOnHighPriority || false}
                  onCheckedChange={(checked) => handleToggle("notifyOnHighPriority", checked)}
                  disabled={true}
                  data-testid="switch-notify-high-priority"
                />
              </div>

              <div className="flex items-center justify-between opacity-60">
                <div>
                  <Label htmlFor="daily-digest" className="flex items-center gap-2">
                    Daily Digest
                    <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                  </Label>
                  <p className="text-sm text-muted-foreground">Send a daily summary of pending tasks</p>
                </div>
                <Switch
                  id="daily-digest"
                  checked={emailSettings?.dailyDigest || false}
                  onCheckedChange={(checked) => handleToggle("dailyDigest", checked)}
                  disabled={true}
                  data-testid="switch-daily-digest"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test Email</CardTitle>
          <CardDescription>
            Send a test email to verify your configuration is working
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter email address"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1"
              data-testid="input-test-email"
            />
            <Button 
              onClick={handleSendTestEmail}
              disabled={!emailSettings?.isConfigured || sendTestEmailMutation.isPending}
              data-testid="button-send-test-email"
            >
              {sendTestEmailMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Send Test
            </Button>
          </div>
          {!emailSettings?.isConfigured && (
            <p className="text-sm text-muted-foreground mt-2">
              Add your RESEND_API_KEY secret to enable test emails
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CategoriesManager() {
  const { toast } = useToast();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: categories = [], isLoading } = useQuery<CustomCategory[]>({
    queryKey: ["/api/custom-categories"],
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/custom-categories", {
        name,
        displayOrder: categories.length + 1,
        isActive: true,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-categories"] });
      setNewCategoryName("");
      setIsAddDialogOpen(false);
      toast({ title: "Category added", description: "New product category has been created." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create category", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name?: string; isActive?: boolean }) => {
      const response = await apiRequest("PUT", `/api/custom-categories/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-categories"] });
      setEditingCategory(null);
      toast({ title: "Category updated", description: "Product category has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update category", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/custom-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-categories"] });
      toast({ title: "Category deleted", description: "Product category has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete category", variant: "destructive" });
    },
  });

  const seedDefaultsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/custom-categories/seed-defaults");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-categories"] });
      toast({ title: "Categories seeded", description: "Default product categories have been added." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to seed default categories", variant: "destructive" });
    },
  });

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    createMutation.mutate(newCategoryName.trim());
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Product Categories</CardTitle>
            <CardDescription>
              Define the product categories used for ICP analysis and playbook generation.
              These categories are specific to your company's product catalog.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {categories.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => seedDefaultsMutation.mutate()}
                disabled={seedDefaultsMutation.isPending}
                data-testid="button-seed-categories"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${seedDefaultsMutation.isPending ? "animate-spin" : ""}`} />
                Load Defaults
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
              data-testid="button-add-category"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No categories configured</p>
            <p className="text-sm mt-1">Click "Load Defaults" to add standard categories or create your own.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id} data-testid={`category-row-${category.id}`}>
                  <TableCell>
                    {editingCategory?.id === category.id ? (
                      <Input
                        value={editingCategory.name}
                        onChange={(e) =>
                          setEditingCategory({ ...editingCategory, name: e.target.value })
                        }
                        className="max-w-xs"
                        data-testid={`input-edit-category-${category.id}`}
                      />
                    ) : (
                      <span className="font-medium">{category.name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={category.isActive ? "default" : "secondary"}>
                      {category.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {editingCategory?.id === category.id ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingCategory(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              updateMutation.mutate({
                                id: category.id,
                                name: editingCategory.name,
                              })
                            }
                            disabled={updateMutation.isPending}
                          >
                            Save
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingCategory(category)}
                            data-testid={`button-edit-category-${category.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              updateMutation.mutate({
                                id: category.id,
                                isActive: !category.isActive,
                              })
                            }
                            data-testid={`button-toggle-category-${category.id}`}
                          >
                            {category.isActive ? (
                              <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-chart-2" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(category.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-category-${category.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product Category</DialogTitle>
            <DialogDescription>
              Create a new product category for ICP analysis and playbook generation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input
                placeholder="e.g., Water Heaters, PVF, Controls"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                data-testid="input-new-category-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCategory}
              disabled={createMutation.isPending || !newCategoryName.trim()}
              data-testid="button-create-category"
            >
              {createMutation.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<TerritoryManager | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [companyName, setCompanyName] = useState("Mark Supply");
  const [appTitle, setAppTitle] = useState("AI VP Dashboard");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  const [gapSizeWeight, setGapSizeWeight] = useState(DEFAULT_WEIGHTS.gapSizeWeight);
  const [revenuePotentialWeight, setRevenuePotentialWeight] = useState(DEFAULT_WEIGHTS.revenuePotentialWeight);
  const [categoryCountWeight, setCategoryCountWeight] = useState(DEFAULT_WEIGHTS.categoryCountWeight);
  const [hasWeightChanges, setHasWeightChanges] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  const form = useForm<TerritoryManagerFormValues>({
    resolver: zodResolver(territoryManagerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      territories: "",
      isActive: true,
    },
  });

  const { data: settingsData } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settingsData) {
      const companyNameSetting = settingsData.find(s => s.key === "companyName");
      const appTitleSetting = settingsData.find(s => s.key === "appTitle");
      const companyLogoSetting = settingsData.find(s => s.key === "companyLogo");
      
      if (companyNameSetting?.value) setCompanyName(companyNameSetting.value);
      if (appTitleSetting?.value) setAppTitle(appTitleSetting.value);
      if (companyLogoSetting?.value) setCompanyLogo(companyLogoSetting.value);
    }
  }, [settingsData]);

  const { data: territoryManagers = [], isLoading: isLoadingManagers } = useQuery<TerritoryManager[]>({
    queryKey: ["/api/territory-managers"],
  });

  const { data: scoringWeights } = useQuery<ScoringWeights>({
    queryKey: ["/api/scoring-weights"],
  });

  useEffect(() => {
    if (scoringWeights) {
      setGapSizeWeight(scoringWeights.gapSizeWeight);
      setRevenuePotentialWeight(scoringWeights.revenuePotentialWeight);
      setCategoryCountWeight(scoringWeights.categoryCountWeight);
    }
  }, [scoringWeights]);

  const updateWeightsMutation = useMutation({
    mutationFn: async (weights: { gapSizeWeight: number; revenuePotentialWeight: number; categoryCountWeight: number }) => {
      return apiRequest("PUT", "/api/scoring-weights", weights);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scoring-weights"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setHasWeightChanges(false);
      toast({
        title: "Scoring weights updated",
        description: "The new weights will be applied to all account scores.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update weights",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const weightsTotal = gapSizeWeight + revenuePotentialWeight + categoryCountWeight;
  const isValidWeightsTotal = Math.abs(weightsTotal - 100) < 0.01;

  const handleWeightChange = (setter: (val: number) => void, value: number) => {
    setter(value);
    setHasWeightChanges(true);
  };

  const handleResetWeights = () => {
    setGapSizeWeight(DEFAULT_WEIGHTS.gapSizeWeight);
    setRevenuePotentialWeight(DEFAULT_WEIGHTS.revenuePotentialWeight);
    setCategoryCountWeight(DEFAULT_WEIGHTS.categoryCountWeight);
    setHasWeightChanges(true);
  };

  const handleSaveWeights = () => {
    if (!isValidWeightsTotal) {
      toast({
        title: "Invalid weights",
        description: "Weights must sum to 100%",
        variant: "destructive",
      });
      return;
    }
    updateWeightsMutation.mutate({
      gapSizeWeight,
      revenuePotentialWeight,
      categoryCountWeight,
    });
  };

  const saveSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      return apiRequest("PUT", `/api/settings/${key}`, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image smaller than 2MB", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setCompanyLogo(base64);
      try {
        await apiRequest("POST", "/api/settings/logo", { logo: base64 });
        queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
        toast({ title: "Logo uploaded", description: "Your company logo has been updated" });
      } catch {
        toast({ title: "Upload failed", description: "Failed to upload logo", variant: "destructive" });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    setCompanyLogo(null);
    try {
      await apiRequest("DELETE", "/api/settings/logo");
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Logo removed", description: "Your company logo has been removed" });
    } catch {
      toast({ title: "Error", description: "Failed to remove logo", variant: "destructive" });
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: TerritoryManagerFormValues) => {
      const territories = data.territories.split(",").map(t => t.trim()).filter(Boolean);
      return apiRequest("POST", "/api/territory-managers", { ...data, territories });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/territory-managers"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Territory Manager created" });
    },
    onError: () => {
      toast({ title: "Failed to create Territory Manager", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TerritoryManagerFormValues }) => {
      const territories = data.territories.split(",").map(t => t.trim()).filter(Boolean);
      return apiRequest("PUT", `/api/territory-managers/${id}`, { ...data, territories });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/territory-managers"] });
      setIsDialogOpen(false);
      setEditingManager(null);
      form.reset();
      toast({ title: "Territory Manager updated" });
    },
    onError: () => {
      toast({ title: "Failed to update Territory Manager", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/territory-managers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/territory-managers"] });
      toast({ title: "Territory Manager deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete Territory Manager", variant: "destructive" });
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        saveSettingMutation.mutateAsync({ key: "companyName", value: companyName }),
        saveSettingMutation.mutateAsync({ key: "appTitle", value: appTitle }),
      ]);
      toast({
        title: "Settings saved",
        description: "Your changes have been applied",
      });
    } catch {
      toast({
        title: "Save failed",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDialog = (manager?: TerritoryManager) => {
    if (manager) {
      setEditingManager(manager);
      form.reset({
        name: manager.name,
        email: manager.email,
        territories: manager.territories?.join(", ") || "",
        isActive: manager.isActive ?? true,
      });
    } else {
      setEditingManager(null);
      form.reset({
        name: "",
        email: "",
        territories: "",
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: TerritoryManagerFormValues) => {
    if (editingManager) {
      updateMutation.mutate({ id: editingManager.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this Territory Manager?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-settings">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure system settings and integrations
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-settings">
          {isSaving ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" data-testid="tab-general">
            <Settings className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="territory-managers" data-testid="tab-territory-managers">
            <Users className="mr-2 h-4 w-4" />
            Territory Managers
          </TabsTrigger>
          <TabsTrigger value="scoring" data-testid="tab-scoring">
            <Sliders className="mr-2 h-4 w-4" />
            Scoring
          </TabsTrigger>
          <TabsTrigger value="prompts" data-testid="tab-prompts">
            <Brain className="mr-2 h-4 w-4" />
            AI Prompts
          </TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">
            <Database className="mr-2 h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="categories" data-testid="tab-categories">
            <FileText className="mr-2 h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="revenue-tracking" data-testid="tab-revenue-tracking">
            <DollarSign className="mr-2 h-4 w-4" />
            Revenue Tracking
          </TabsTrigger>
          <TabsTrigger value="email" data-testid="tab-email">
            <Mail className="mr-2 h-4 w-4" />
            Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company Information</CardTitle>
              <CardDescription>
                Basic company and branding settings - these appear in the sidebar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input 
                    id="company-name" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your Company Name"
                    data-testid="input-company-name"
                  />
                  <p className="text-xs text-muted-foreground">Displays below the app title in the sidebar</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app-title">App Title</Label>
                  <Input 
                    id="app-title" 
                    value={appTitle}
                    onChange={(e) => setAppTitle(e.target.value)}
                    placeholder="AI VP Dashboard"
                    data-testid="input-app-title"
                  />
                  <p className="text-xs text-muted-foreground">The main title shown in the sidebar</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Company Logo</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload your company logo to replace the default icon in the sidebar. Recommended size: 80x80 pixels.
                </p>
                <div className="flex items-start gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 bg-muted/50">
                    {companyLogo ? (
                      <img 
                        src={companyLogo} 
                        alt="Company logo" 
                        className="h-full w-full object-cover rounded-md"
                      />
                    ) : (
                      <Image className="h-8 w-8 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      data-testid="input-logo-upload"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-upload-logo"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Logo
                    </Button>
                    {companyLogo && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleRemoveLogo}
                        className="text-destructive hover:text-destructive"
                        data-testid="button-remove-logo"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notifications</CardTitle>
              <CardDescription>
                Configure email and in-app notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive weekly summary reports
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Task Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Send reminders for upcoming tasks
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>ICP Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when AI generates new ICP suggestions
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Management</CardTitle>
              <CardDescription>
                Manage data retention and cleanup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Order History Retention</Label>
                <Select defaultValue="36">
                  <SelectTrigger>
                    <SelectValue placeholder="Select retention period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 months</SelectItem>
                    <SelectItem value="24">24 months</SelectItem>
                    <SelectItem value="36">36 months</SelectItem>
                    <SelectItem value="60">60 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-archive Completed Tasks</Label>
                  <p className="text-sm text-muted-foreground">
                    Archive tasks older than 90 days
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="territory-managers" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Territory Managers</CardTitle>
                <CardDescription>
                  Manage territory managers and their assigned regions
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenDialog()} data-testid="button-add-tm">
                <Plus className="mr-2 h-4 w-4" />
                Add TM
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingManagers ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : territoryManagers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No territory managers found. Click "Add TM" to create one.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Territories</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {territoryManagers.map((manager) => (
                      <TableRow key={manager.id} data-testid={`row-tm-${manager.id}`}>
                        <TableCell className="font-medium" data-testid={`text-tm-name-${manager.id}`}>
                          {manager.name}
                        </TableCell>
                        <TableCell data-testid={`text-tm-email-${manager.id}`}>
                          {manager.email}
                        </TableCell>
                        <TableCell data-testid={`text-tm-territories-${manager.id}`}>
                          <div className="flex flex-wrap gap-1">
                            {manager.territories?.map((territory, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {territory}
                              </Badge>
                            )) || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={manager.isActive ? "default" : "secondary"}>
                            {manager.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleOpenDialog(manager)}
                              data-testid={`button-edit-tm-${manager.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(manager.id)}
                              data-testid={`button-delete-tm-${manager.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scoring" className="space-y-6">
          <Card>
            <Collapsible open={isInstructionsOpen} onOpenChange={setIsInstructionsOpen}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover-elevate">
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      How Scoring Works
                    </div>
                    {isInstructionsOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">What is the Opportunity Score?</h4>
                    <p className="text-sm text-muted-foreground">
                      The Opportunity Score ranks accounts by their potential for wallet share capture. It combines three factors 
                      to identify which accounts should be prioritized for enrollment in the revenue recovery program.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">The Three Factors</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li><strong>Gap Size:</strong> How far the account falls below your ICP targets. Larger gaps = more room for growth.</li>
                      <li><strong>Revenue Potential:</strong> The account's current revenue and estimated upside. Bigger accounts offer bigger absolute gains.</li>
                      <li><strong>Category Count:</strong> Number of product categories with gaps. More gaps may indicate broader opportunity.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">How to Adjust Weights</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Use sliders or type values directly - weights must add up to exactly 100%</li>
                      <li>Higher weight = more influence on which accounts rank at the top</li>
                      <li>Changes apply immediately after saving and re-rank all accounts</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Suggested Strategies</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li><strong>Balanced (40/30/30):</strong> Default - considers all factors roughly equally</li>
                      <li><strong>Revenue-Focused (30/50/20):</strong> Prioritize accounts with highest dollar potential</li>
                      <li><strong>Gap-Focused (60/20/20):</strong> Target accounts with the most room for improvement</li>
                    </ul>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Opportunity Score Weights
                {hasWeightChanges && (
                  <Badge variant="outline" className="ml-2">Unsaved</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Adjust how each factor contributes to the opportunity score. Weights must total 100%.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-chart-5/10">
                      <Target className="h-4 w-4 text-chart-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Label className="font-medium">Gap Size</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 p-0" data-testid="tooltip-gap-size">
                              <HelpCircle className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">Measures how far below the ICP target each account is across categories.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-xs text-muted-foreground">Distance from ICP targets</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[gapSizeWeight]}
                      onValueChange={([val]) => handleWeightChange(setGapSizeWeight, val)}
                      max={100}
                      step={5}
                      className="w-32"
                      data-testid="slider-gap-size"
                    />
                    <Input
                      type="number"
                      value={gapSizeWeight}
                      onChange={(e) => handleWeightChange(setGapSizeWeight, parseInt(e.target.value) || 0)}
                      className="w-16 text-center"
                      min={0}
                      max={100}
                      data-testid="input-gap-size"
                    />
                    <span className="text-sm text-muted-foreground w-4">%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-chart-1/10">
                      <DollarSign className="h-4 w-4 text-chart-1" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Label className="font-medium">Revenue Potential</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 p-0" data-testid="tooltip-revenue-potential">
                              <HelpCircle className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">Based on account revenue and estimated opportunity value.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-xs text-muted-foreground">Potential for incremental revenue</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[revenuePotentialWeight]}
                      onValueChange={([val]) => handleWeightChange(setRevenuePotentialWeight, val)}
                      max={100}
                      step={5}
                      className="w-32"
                      data-testid="slider-revenue-potential"
                    />
                    <Input
                      type="number"
                      value={revenuePotentialWeight}
                      onChange={(e) => handleWeightChange(setRevenuePotentialWeight, parseInt(e.target.value) || 0)}
                      className="w-16 text-center"
                      min={0}
                      max={100}
                      data-testid="input-revenue-potential"
                    />
                    <span className="text-sm text-muted-foreground w-4">%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-chart-2/10">
                      <Layers className="h-4 w-4 text-chart-2" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Label className="font-medium">Category Count</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 p-0" data-testid="tooltip-category-count">
                              <HelpCircle className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">Number of categories where there's a gap opportunity.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-xs text-muted-foreground">Number of categories with gaps</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[categoryCountWeight]}
                      onValueChange={([val]) => handleWeightChange(setCategoryCountWeight, val)}
                      max={100}
                      step={5}
                      className="w-32"
                      data-testid="slider-category-count"
                    />
                    <Input
                      type="number"
                      value={categoryCountWeight}
                      onChange={(e) => handleWeightChange(setCategoryCountWeight, parseInt(e.target.value) || 0)}
                      className="w-16 text-center"
                      min={0}
                      max={100}
                      data-testid="input-category-count"
                    />
                    <span className="text-sm text-muted-foreground w-4">%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  {isValidWeightsTotal ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className={`font-medium ${isValidWeightsTotal ? 'text-green-600' : 'text-destructive'}`}>
                    Total: {weightsTotal}%
                  </span>
                  {!isValidWeightsTotal && (
                    <span className="text-sm text-destructive">(must equal 100%)</span>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSaveWeights}
                  disabled={!hasWeightChanges || !isValidWeightsTotal || updateWeightsMutation.isPending}
                  className="flex-1"
                  data-testid="button-save-weights"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateWeightsMutation.isPending ? "Saving..." : "Save Weights"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleResetWeights}
                  disabled={updateWeightsMutation.isPending}
                  data-testid="button-reset-weights"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Call Script Template
              </CardTitle>
              <CardDescription>
                Template used by AI to generate call scripts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={10}
                defaultValue={`Account: {account_name}
Segment: {segment}
Annual Revenue: {last_12m_revenue}
Gap Categories: {gap_categories_with_details}
Recommended Action: {recommended_action}

Generate a concise call script for a Territory Manager. Include:
1. Opening (reference recent orders or relationship)
2. Transition to gap category (natural, not salesy)
3. Specific product recommendation with 1-2 benefits
4. Suggested next step (quote, site visit, sample)

Keep it conversational—this is a relationship, not a cold call.`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Template
              </CardTitle>
              <CardDescription>
                Template used by AI to generate email drafts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={10}
                defaultValue={`Account: {account_name}
Contact Name: {contact_name}
Segment: {segment}
Gap Categories: {gap_categories_with_details}
Recent Orders: {recent_order_summary}

Generate a short email (3 paragraphs max) that:
1. References their business/recent activity
2. Introduces the gap category naturally (seasonal tie-in, project mention, etc.)
3. Offers a specific next step (call, quote, catalog)

Tone: Helpful, not pushy. This is a trusted supplier relationship.
Subject line: Keep it specific and under 50 characters.`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4" />
                ICP Analysis Prompt
              </CardTitle>
              <CardDescription>
                Prompt used for AI-powered segment analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={8}
                defaultValue={`Analyze the purchasing patterns of Class A {segment} customers.

Identify:
1. Which product categories typically appear together
2. Expected percentage breakdown by category
3. Which categories are required vs optional
4. Strategic priorities based on margin and growth potential

Output a structured profile with category expectations.`}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Provider
              </CardTitle>
              <CardDescription>
                OpenAI integration for AI-powered features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-md bg-chart-2/10 border border-chart-2/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-chart-2" />
                  <div>
                    <p className="font-medium">Connected</p>
                    <p className="text-sm text-muted-foreground">
                      Using Replit AI Integrations
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-chart-2 border-chart-2/30">
                  Active
                </Badge>
              </div>
              <div className="space-y-2">
                <Label>Default Model</Label>
                <Select defaultValue="gpt-5.1">
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-5.1">GPT-5.1 (Recommended)</SelectItem>
                    <SelectItem value="gpt-5">GPT-5</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Provider
              </CardTitle>
              <CardDescription>
                Configure email sending for task notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-md bg-muted border">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Not Connected</p>
                    <p className="text-sm text-muted-foreground">
                      Configure email provider for notifications
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                Database
              </CardTitle>
              <CardDescription>
                PostgreSQL database connection status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-md bg-chart-2/10 border border-chart-2/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-chart-2" />
                  <div>
                    <p className="font-medium">Connected</p>
                    <p className="text-sm text-muted-foreground">
                      PostgreSQL via Neon
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-chart-2 border-chart-2/30">
                  Healthy
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <CategoriesManager />
        </TabsContent>

        <TabsContent value="revenue-tracking" className="space-y-6">
          <RevenueTrackingManager />
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <EmailSettingsManager />
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingManager ? "Edit Territory Manager" : "Add Territory Manager"}
            </DialogTitle>
            <DialogDescription>
              {editingManager
                ? "Update the territory manager's information."
                : "Add a new territory manager to the system."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" data-testid="input-tm-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        data-testid="input-tm-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="territories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Territories</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Northeast, Southeast, Midwest"
                        data-testid="input-tm-territories"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Comma-separated list of territories/regions
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Active</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-tm-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel-tm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-tm"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingManager ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
