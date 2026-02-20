/**
 * DailyBriefingCard — Phase 4
 *
 * Placed at the top of dashboard.tsx.
 * Reads from GET /api/agent/state/daily-briefing for the latest run summary,
 * and GET /api/agent/learnings for seeded context.
 *
 * Shows:
 *  - Headline action (from latestBriefing)
 *  - 2-3 priority items with quick-action buttons (opens DossierPanel)
 *  - At-risk watch list warning banner (collapsible)
 *  - "View Full Briefing" link
 *  - Trigger button for admin to fire a new briefing
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, AlertTriangle, Zap, Sparkles, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AgentStateRow {
    lastRunAt: string | null;
    lastRunSummary: string | null;
    currentFocus: string | null;
    pendingActions: any;
    openQuestions: any;
}

interface BriefingRecord {
    id: number;
    briefingDate: string;
    headlineAction: string | null;
    priorityItems: Array<{ account_name: string; account_id: number; action: string; urgency: string; why: string }> | null;
    atRiskAccounts: Array<{ account_name: string; account_id: number; signal: string }> | null;
}

const urgencyBadge: Record<string, string> = {
    immediate: "bg-red-100 text-red-700 border-red-200",
    this_week: "bg-amber-100 text-amber-700 border-amber-200",
    this_month: "bg-blue-100 text-blue-700 border-blue-200",
};

interface DailyBriefingCardProps {
    onAccountClick?: (accountId: number) => void;
}

export function DailyBriefingCard({ onAccountClick }: DailyBriefingCardProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [atRiskExpanded, setAtRiskExpanded] = useState(false);

    const { data: agentState, isLoading } = useQuery<AgentStateRow>({
        queryKey: ["/api/agent/state/daily-briefing"],
        retry: false,
    });

    const triggerBriefingMutation = useMutation({
        mutationFn: () => apiRequest("POST", "/api/agent/daily-briefing", {}),
        onSuccess: () => {
            toast({ title: "Briefing triggered!", description: "Emails will be sent in a moment." });
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ["/api/agent/state/daily-briefing"] });
            }, 5000);
        },
        onError: () => toast({ title: "Error", description: "Failed to trigger briefing.", variant: "destructive" }),
    });

    if (isLoading) {
        return (
            <div className="rounded-xl border bg-card animate-pulse h-32 mb-6" />
        );
    }

    // No state yet = no briefing run
    if (!agentState?.lastRunSummary && !agentState?.currentFocus) {
        return (
            <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-5 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm">Revenue Intelligence Agent</p>
                            <p className="text-xs text-muted-foreground">No briefing has run yet. Trigger one to get started.</p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => triggerBriefingMutation.mutate()}
                        disabled={triggerBriefingMutation.isPending}
                    >
                        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${triggerBriefingMutation.isPending ? "animate-spin" : ""}`} />
                        Run Briefing
                    </Button>
                </div>
            </div>
        );
    }

    // Parse pending actions as priority items if available
    const priorityItems = Array.isArray(agentState?.pendingActions) ? agentState.pendingActions as any[] : [];
    const atRiskItems = Array.isArray(agentState?.openQuestions) ? agentState.openQuestions as any[] : [];
    const lastRun = agentState?.lastRunAt ? new Date(agentState.lastRunAt) : null;

    return (
        <div className="rounded-xl border bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-950/20 dark:to-background mb-6 overflow-hidden" id="daily-briefing-card">
            {/* Header bar */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-blue-100 dark:border-blue-900/30">
                <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                        <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div>
                        <span className="text-sm font-semibold">Daily Briefing</span>
                        {lastRun && (
                            <span className="text-xs text-muted-foreground ml-2">
                                · {lastRun.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                            </span>
                        )}
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => triggerBriefingMutation.mutate()}
                    disabled={triggerBriefingMutation.isPending}
                >
                    <RefreshCw className={`h-3 w-3 mr-1 ${triggerBriefingMutation.isPending ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            <div className="px-5 py-4 space-y-4">
                {/* Headline action */}
                {agentState?.currentFocus && (
                    <div className="flex items-start gap-2.5">
                        <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Today's Focus</p>
                            <p className="text-sm font-medium">{agentState.currentFocus}</p>
                        </div>
                    </div>
                )}

                {/* Last run summary */}
                {agentState?.lastRunSummary && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{agentState.lastRunSummary}</p>
                )}

                {/* Priority items */}
                {priorityItems.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priority Accounts</p>
                        {priorityItems.slice(0, 3).map((item: any, i: number) => (
                            <div
                                key={i}
                                className="flex items-center gap-3 p-2.5 rounded-lg border bg-white dark:bg-card hover:border-primary/40 cursor-pointer transition-colors"
                                onClick={() => item.account_id && onAccountClick?.(item.account_id)}
                            >
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${urgencyBadge[item.urgency] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                                    {item.urgency?.replace(/_/g, " ")}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium">{item.account_name}</span>
                                    <span className="text-xs text-muted-foreground ml-2">· {item.action}</span>
                                </div>
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            </div>
                        ))}
                    </div>
                )}

                {/* At-risk banner */}
                {atRiskItems.length > 0 && (
                    <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 overflow-hidden">
                        <button
                            className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                            onClick={() => setAtRiskExpanded(!atRiskExpanded)}
                        >
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                                <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                                    {atRiskItems.length} At-Risk {atRiskItems.length === 1 ? "Account" : "Accounts"}
                                </span>
                            </div>
                            {atRiskExpanded ? <ChevronUp className="h-3.5 w-3.5 text-red-500" /> : <ChevronDown className="h-3.5 w-3.5 text-red-500" />}
                        </button>
                        {atRiskExpanded && (
                            <div className="px-3 pb-3 space-y-1.5 border-t border-red-200 dark:border-red-900/50 pt-2">
                                {atRiskItems.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 text-xs">
                                        <span className="font-medium text-red-800 dark:text-red-300">{item.account_name ?? item}</span>
                                        {item.signal && <span className="text-red-600 dark:text-red-400">· {item.signal}</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
