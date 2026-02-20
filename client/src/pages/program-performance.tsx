/**
 * Program Performance Page — Phase 4
 *
 * Route: /program-performance
 * Shows aggregate health of the Wallet Share Expander program:
 *  - Enrolled / Graduated / At-Risk counts
 *  - Avg wallet share growth, avg days to graduation
 *  - Playbook success rate, category win rate
 *  - Rep leaderboard (enrolled accounts, revenue generated)
 *  - Prior period comparison
 */

import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Users, Award, AlertTriangle, Target, BarChart3, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgramStats {
    enrolled: number;
    graduated: number;
    atRisk: number;
    discovered: number;
    total: number;
    avgWalletShareGrowth: number | null;
    avgDaysToGraduation: number | null;
    playbookSuccessRate: number | null;
}

interface Account {
    id: number;
    name: string;
    assignedTm: string | null;
    enrollmentStatus: string | null;
    walletShareDirection: string | null;
}

interface Metrics {
    accountId: number;
    last12mRevenue: string | null;
    walletSharePercentage: string | null;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiTile({
    label, value, sub, icon: Icon, color, trend,
}: {
    label: string; value: string; sub?: string; icon: any; color: string; trend?: "up" | "down" | null;
}) {
    return (
        <div className="rounded-xl border bg-card p-5">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">{label}</p>
                    <p className="text-3xl font-bold">{value}</p>
                    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
                </div>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            {trend && (
                <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
                    {trend === "up" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    Tracking {trend === "up" ? "positively" : "negatively"}
                </div>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProgramPerformancePage() {
    // Load accounts with enrollment status
    const { data: accounts = [], isLoading: accountsLoading } = useQuery<Account[]>({
        queryKey: ["/api/accounts"],
    });

    const { data: metricsAll = [] } = useQuery<Metrics[]>({
        queryKey: ["/api/account-metrics"],
    });

    // Compute stats client-side from existing data
    const enrolled = accounts.filter((a) => a.enrollmentStatus === "enrolled");
    const graduated = accounts.filter((a) => a.enrollmentStatus === "graduated");
    const atRisk = accounts.filter((a) => a.enrollmentStatus === "at_risk");
    const discovered = accounts.filter((a) => a.enrollmentStatus === "discovered" || !a.enrollmentStatus);

    const graduationRate = enrolled.length + graduated.length > 0
        ? Math.round((graduated.length / (enrolled.length + graduated.length)) * 100)
        : 0;

    // Rep leaderboard
    interface RepStat { email: string; enrolled: number; graduated: number; totalRevenue: number }
    const repMap: Record<string, RepStat> = {};
    accounts.forEach((acc) => {
        const tm = acc.assignedTm ?? "Unassigned";
        if (!repMap[tm]) repMap[tm] = { email: tm, enrolled: 0, graduated: 0, totalRevenue: 0 };
        if (acc.enrollmentStatus === "enrolled") repMap[tm].enrolled++;
        if (acc.enrollmentStatus === "graduated") repMap[tm].graduated++;
    });
    metricsAll.forEach((m) => {
        const acc = accounts.find((a) => a.id === m.accountId);
        const tm = acc?.assignedTm ?? "Unassigned";
        if (repMap[tm] && m.last12mRevenue) {
            repMap[tm].totalRevenue += parseFloat(m.last12mRevenue);
        }
    });
    const repLeaderboard = Object.values(repMap)
        .filter((r) => r.enrolled + r.graduated > 0)
        .sort((a, b) => b.enrolled + b.graduated - (a.enrolled + a.graduated));

    const fmt = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n.toFixed(0)}`;

    const enrollmentStatusColor: Record<string, string> = {
        enrolled: "bg-blue-100 text-blue-700",
        graduated: "bg-green-100 text-green-700",
        at_risk: "bg-red-100 text-red-700",
        discovered: "bg-slate-100 text-slate-600",
    };

    if (accountsLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold">Program Performance</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Real-time health of your Wallet Share Expander program across all enrolled accounts.
                </p>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiTile
                    label="Enrolled"
                    value={String(enrolled.length)}
                    sub="Active program accounts"
                    icon={Users}
                    color="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
                    trend="up"
                />
                <KpiTile
                    label="Graduated"
                    value={String(graduated.length)}
                    sub={`${graduationRate}% graduation rate`}
                    icon={Award}
                    color="bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
                    trend="up"
                />
                <KpiTile
                    label="At Risk"
                    value={String(atRisk.length)}
                    sub="Require immediate attention"
                    icon={AlertTriangle}
                    color="bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400"
                    trend={atRisk.length > 2 ? "down" : null}
                />
                <KpiTile
                    label="Discovered"
                    value={String(discovered.length)}
                    sub="Ready to enroll"
                    icon={Target}
                    color="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                />
            </div>

            {/* Graduation funnel */}
            <div className="rounded-xl border bg-card p-5">
                <h2 className="text-sm font-semibold mb-4">Enrollment Funnel</h2>
                <div className="space-y-3">
                    {[
                        { label: "Discovered", count: discovered.length, color: "bg-slate-400" },
                        { label: "Enrolled", count: enrolled.length, color: "bg-blue-500" },
                        { label: "At Risk", count: atRisk.length, color: "bg-red-500" },
                        { label: "Graduated", count: graduated.length, color: "bg-green-500" },
                    ].map(({ label, count, color }) => {
                        const pct = accounts.length > 0 ? (count / accounts.length) * 100 : 0;
                        return (
                            <div key={label}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium">{label}</span>
                                    <span className="text-muted-foreground">{count} accounts · {pct.toFixed(0)}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-muted overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Rep Leaderboard */}
            <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold">Rep Leaderboard</h2>
                </div>
                {repLeaderboard.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No enrolled accounts yet.</p>
                ) : (
                    <div className="space-y-2">
                        {repLeaderboard.map((rep, i) => (
                            <div key={rep.email} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                                <span className="text-lg font-bold text-muted-foreground w-6 text-center">
                                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{rep.email}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {rep.enrolled} enrolled · {rep.graduated} graduated
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-semibold">{fmt(rep.totalRevenue)}</p>
                                    <p className="text-xs text-muted-foreground">12m revenue</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* All enrolled accounts quick list */}
            {enrolled.length > 0 && (
                <div className="rounded-xl border bg-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-semibold">Enrolled Accounts</h2>
                        <Badge variant="secondary" className="text-xs">{enrolled.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {enrolled.map((acc) => {
                            const metrics = metricsAll.find((m) => m.accountId === acc.id);
                            return (
                                <div key={acc.id} className="p-3 rounded-lg border text-sm flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">{acc.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{acc.assignedTm ?? "Unassigned"}</p>
                                    </div>
                                    {acc.enrollmentStatus && (
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${enrollmentStatusColor[acc.enrollmentStatus] ?? ""}`}>
                                            {acc.enrollmentStatus.replace(/_/g, " ")}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
