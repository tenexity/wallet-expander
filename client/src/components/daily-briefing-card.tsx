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

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, AlertTriangle, Zap, Sparkles, RefreshCw, ExternalLink, X, Eye } from "lucide-react";
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
    showAdminControls?: boolean;
}

export function DailyBriefingCard({ onAccountClick, showAdminControls = false }: DailyBriefingCardProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [atRiskExpanded, setAtRiskExpanded] = useState(false);
    const [fullBriefingExpanded, setFullBriefingExpanded] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        if (!showAdminControls) {
            const dismissedDate = localStorage.getItem("daily-briefing-dismissed");
            const today = new Date().toDateString();
            if (dismissedDate === today) {
                setIsDismissed(true);
            }
        }
    }, [showAdminControls]);

    const handleDismiss = () => {
        if (showAdminControls) return;
        const today = new Date().toDateString();
        localStorage.setItem("daily-briefing-dismissed", today);
        setIsDismissed(true);
    };

    const { data: agentState, isLoading } = useQuery<AgentStateRow>({
        queryKey: ["/api/agent/state/daily-briefing"],
        retry: false,
    });

    const triggerBriefingMutation = useMutation({
        mutationFn: () => apiRequest("POST", "/api/agent/daily-briefing", {}),
        onSuccess: () => {
            toast({
                title: "Briefing Triggered!",
                description: "The AI is now scanning your accounts and drafting actions. This takes about 30 seconds. The card will update automatically.",
            });
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ["/api/agent/state/daily-briefing"] });
            }, 10000); // Wait 10s before first refresh to show progress
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ["/api/agent/state/daily-briefing"] });
            }, 25000); // Secondary refresh to capture completion
        },
        onError: () => toast({ title: "Error", description: "Failed to trigger briefing.", variant: "destructive" }),
    });

    if (isLoading) {
        return (
            <div className="rounded-xl border bg-card animate-pulse h-32 mb-6" />
        );
    }

    if (!isMounted || isDismissed) return null;

    // No state yet = no briefing run
    if (!agentState?.lastRunSummary && !agentState?.currentFocus) {
        if (!showAdminControls) return null; // Rep doesn't see empty state if no briefing ran

        return (
            <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-5 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm">Daily Action Plan</p>
                            <p className="text-xs text-muted-foreground">Analyzes your territory, identifies missing revenue, and drafts action plans every morning at 7:00 AM.</p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => triggerBriefingMutation.mutate()}
                        disabled={triggerBriefingMutation.isPending}
                    >
                        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${triggerBriefingMutation.isPending ? "animate-spin" : ""}`} />
                        {triggerBriefingMutation.isPending ? "Drafting..." : "Sync Latest Data"}
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
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">Daily Action Plan</span>
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider h-4 px-1.5 bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">Automated</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Scheduled at 7:00 AM EST · Scans your territory for new gaps and signals</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {showAdminControls && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => triggerBriefingMutation.mutate()}
                            disabled={triggerBriefingMutation.isPending}
                        >
                            <RefreshCw className={`h-3 w-3 mr-1 ${triggerBriefingMutation.isPending ? "animate-spin" : ""}`} />
                            {triggerBriefingMutation.isPending ? "Syncing..." : "Sync Latest Data"}
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={handleDismiss}
                    >
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>
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

                {/* View Full Briefing expandable */}
                {agentState?.lastRunSummary && (
                    <div>
                        <button
                            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                            onClick={() => setFullBriefingExpanded(!fullBriefingExpanded)}
                            data-testid="view-full-briefing"
                        >
                            <Eye className="h-3 w-3" />
                            {fullBriefingExpanded ? "Hide Full Briefing" : "View Full Briefing"}
                            {fullBriefingExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                        {fullBriefingExpanded && (
                            <div className="mt-3 p-3 rounded-lg bg-white dark:bg-card border text-sm space-y-3">
                                {agentState.lastRunSummary && (
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Analysis Summary</p>
                                        <p className="text-sm leading-relaxed">{agentState.lastRunSummary}</p>
                                    </div>
                                )}
                                {priorityItems.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">All Priority Actions ({priorityItems.length})</p>
                                        <div className="space-y-1.5">
                                            {priorityItems.map((item: any, i: number) => (
                                                <div key={i} className="text-xs flex items-start gap-2">
                                                    <span className="font-medium shrink-0">{item.account_name}:</span>
                                                    <span className="text-muted-foreground">{item.action} — {item.why}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {lastRun && (
                                    <p className="text-[10px] text-muted-foreground">Last updated: {lastRun.toLocaleString()}</p>
                                )}
                            </div>
                        )}
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
                                    <div
                                        key={i}
                                        className={`flex items-center gap-2 text-xs ${item.account_id ? "cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 rounded px-1 py-0.5 -mx-1 transition-colors" : ""}`}
                                        onClick={() => item.account_id && onAccountClick?.(item.account_id)}
                                        data-testid={`at-risk-account-${item.account_id ?? i}`}
                                    >
                                        <span className="font-medium text-red-800 dark:text-red-300">{item.account_name ?? item}</span>
                                        {item.signal && <span className="text-red-600 dark:text-red-400">· {item.signal}</span>}
                                        {item.account_id && <ExternalLink className="h-3 w-3 text-red-400 ml-auto shrink-0" />}
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
