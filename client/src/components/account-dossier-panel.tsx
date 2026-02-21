/**
 * AccountDossierPanel — Phase 4
 *
 * Slide-out drawer that opens when a rep clicks any account row/card.
 * Pulls from GET /api/agent/account-context/:accountId.
 *
 * Sections:
 *  - Header: name, segment, enrollment status, opportunity score
 *  - Gap Summary: top 3 category gaps with progress bars
 *  - Active Playbook: priority action, call script, email composer trigger
 *  - Task Checklist: completion + outcome micro-prompt
 *  - Recent Interactions timeline
 *  - Active Projects
 *  - Competitor Intel
 *  - Similar Graduated Accounts (proof points)
 *  - Rep Notes
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    TrendingUp, TrendingDown, Minus, Phone, Mail, Building2,
    CheckCircle, Circle, AlertTriangle, Zap, Users, ClipboardList,
    Sparkles, Clock, Target
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EmailComposerModal } from "./email-composer-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AccountContext {
    account: {
        id: number;
        name: string;
        segment: string | null;
        region: string | null;
        assignedTm: string | null;
        enrollmentStatus: string | null;
        walletShareDirection: string | null;
    };
    metrics: {
        last12mRevenue: string | null;
        last3mRevenue: string | null;
        opportunityScore: string | null;
        walletSharePercentage: string | null;
        daysSinceLastOrder: number | null;
        categoryPenetration: string | null;
    } | null;
    contacts: Array<{ name: string; role: string | null; email: string | null; isPrimary: boolean | null }>;
    categorySpend: Array<{ categoryId: number; categoryName: string | null; spendAmount: string; gapPct: string | null; gapDollars: string | null }>;
    recentInteractions: Array<{
        interactionType: string; subject: string | null; sentiment: string | null;
        urgency: string | null; interactionDate: string | null; buyingSignal: string | null;
    }>;
    activePlaybook: {
        playbookType: string; priorityAction: string | null; urgencyLevel: string | null;
        aiGeneratedContent: any;
    } | null;
    projects: Array<{ name: string; projectType: string | null; status: string | null; estimatedValue: string | null }>;
    competitors: Array<{ name: string; estimatedSpendPct: string | null }>;
    similarGraduatedAccounts: Array<{ accountIdB: number; accountBName: string | null; similarityScore: string; sharedSegment: string | null; accountBGraduationRevenue: string | null }>;
    applicableLearnings: Array<{ learning: string; evidenceCount: number | null; successRate: string | null }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const enrollmentColors: Record<string, string> = {
    discovered: "bg-slate-100 text-slate-700",
    enrolled: "bg-blue-100 text-blue-700",
    graduated: "bg-green-100 text-green-700",
    at_risk: "bg-red-100 text-red-700",
};

const sentimentColors: Record<string, string> = {
    positive: "text-green-600",
    neutral: "text-slate-500",
    negative: "text-red-600",
    at_risk_signal: "text-red-700 font-semibold",
    competitor_mention: "text-amber-600",
};

const urgencyColors: Record<string, string> = {
    immediate: "bg-red-100 text-red-700",
    this_week: "bg-amber-100 text-amber-700",
    this_month: "bg-blue-100 text-blue-700",
    monitor: "bg-slate-100 text-slate-600",
};

function fmt(val: string | null | undefined): string {
    if (!val) return "—";
    const n = parseFloat(val);
    return isNaN(n) ? val : n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n.toFixed(0)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AccountDossierPanelProps {
    accountId: number | null;
    onClose: () => void;
}

export function AccountDossierPanel({ accountId, onClose }: AccountDossierPanelProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [emailComposerOpen, setEmailComposerOpen] = useState(false);
    const [callScriptOpen, setCallScriptOpen] = useState(false);
    const [repNote, setRepNote] = useState("");
    const [activeTab, setActiveTab] = useState<"playbook" | "intel" | "context">("playbook");

    const { data: ctx, isLoading } = useQuery<AccountContext>({
        queryKey: [`/api/agent/account-context/${accountId}`],
        enabled: !!accountId,
    });

    const generatePlaybookMutation = useMutation({
        mutationFn: () => apiRequest("POST", "/api/agent/generate-playbook", { accountId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/agent/account-context/${accountId}`] });
            toast({ title: "Playbook generated!", description: "New playbook is ready." });
        },
        onError: () => toast({ title: "Error", description: "Failed to generate playbook.", variant: "destructive" }),
    });

    const saveNoteMutation = useMutation({
        mutationFn: () => apiRequest("POST", "/api/agent/interactions", {
            accountId,
            interactionType: "rep_note",
            source: "rep_entered",
            body: repNote,
        }),
        onSuccess: () => {
            setRepNote("");
            queryClient.invalidateQueries({ queryKey: [`/api/agent/account-context/${accountId}`] });
            toast({ title: "Note saved." });
        },
    });

    const tabs = [
        { id: "playbook", label: "Playbook", icon: Zap },
        { id: "intel", label: "Intel", icon: AlertTriangle },
        { id: "context", label: "Context", icon: Users },
    ] as const;

    return (
        <>
            <Sheet open={!!accountId} onOpenChange={(o) => !o && onClose()}>
                <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col" side="right">
                    {isLoading || !ctx ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
                    ) : (
                        <>
                            {/* ── Header ─────────────────────────── */}
                            <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <SheetTitle className="text-xl font-bold truncate">{ctx.account.name}</SheetTitle>
                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                            {ctx.account.segment && (
                                                <Badge variant="outline" className="text-xs">{ctx.account.segment}</Badge>
                                            )}
                                            {ctx.account.region && (
                                                <Badge variant="outline" className="text-xs">{ctx.account.region}</Badge>
                                            )}
                                            {ctx.account.enrollmentStatus && (
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${enrollmentColors[ctx.account.enrollmentStatus] ?? "bg-slate-100 text-slate-700"}`}>
                                                    {ctx.account.enrollmentStatus.replace(/_/g, " ")}
                                                </span>
                                            )}
                                            {ctx.account.walletShareDirection === "growing" && <TrendingUp className="h-4 w-4 text-green-500" />}
                                            {ctx.account.walletShareDirection === "declining" && <TrendingDown className="h-4 w-4 text-red-500" />}
                                            {ctx.account.walletShareDirection === "stable" && <Minus className="h-4 w-4 text-slate-400" />}
                                        </div>
                                    </div>
                                    {ctx.metrics?.opportunityScore && (
                                        <div className="text-center shrink-0">
                                            <div className="text-2xl font-bold text-primary">{Math.round(parseFloat(ctx.metrics.opportunityScore))}</div>
                                            <div className="text-xs text-muted-foreground">Opp. Score</div>
                                        </div>
                                    )}
                                </div>

                                {/* KPI strip */}
                                <div className="grid grid-cols-3 gap-3 mt-4">
                                    <div className="bg-white dark:bg-card rounded-lg p-2.5 border text-center">
                                        <div className="text-base font-bold">{fmt(ctx.metrics?.last12mRevenue)}</div>
                                        <div className="text-xs text-muted-foreground">12m Rev</div>
                                    </div>
                                    <div className="bg-white dark:bg-card rounded-lg p-2.5 border text-center">
                                        <div className="text-base font-bold">{ctx.metrics?.walletSharePercentage ? `${Math.round(parseFloat(ctx.metrics.walletSharePercentage))}%` : "—"}</div>
                                        <div className="text-xs text-muted-foreground">Wallet Share</div>
                                    </div>
                                    <div className="bg-white dark:bg-card rounded-lg p-2.5 border text-center">
                                        <div className="text-base font-bold">{ctx.metrics?.daysSinceLastOrder ?? "—"}</div>
                                        <div className="text-xs text-muted-foreground">Days Since Order</div>
                                    </div>
                                </div>
                            </SheetHeader>

                            {/* ── Tab bar ────────────────────────── */}
                            <div className="flex border-b px-6">
                                {tabs.map(({ id, label, icon: Icon }) => (
                                    <button
                                        key={id}
                                        onClick={() => setActiveTab(id)}
                                        className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors
                      ${activeTab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* ── Scrollable body ─────────────────── */}
                            <ScrollArea className="flex-1">
                                <div className="px-6 py-4 space-y-6">

                                    {/* ── PLAYBOOK TAB ─────────────── */}
                                    {activeTab === "playbook" && (
                                        <>
                                            {ctx.activePlaybook ? (
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Active Playbook</h3>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgencyColors[ctx.activePlaybook.urgencyLevel ?? "monitor"]}`}>
                                                            {ctx.activePlaybook.urgencyLevel?.replace(/_/g, " ") ?? "monitor"}
                                                        </span>
                                                    </div>

                                                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                                                        <div className="flex items-start gap-2">
                                                            <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                                            <p className="font-semibold text-sm">{ctx.activePlaybook.priorityAction}</p>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-1 ml-6">
                                                            {ctx.activePlaybook.playbookType.replace(/_/g, " ")}
                                                        </p>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            className="flex-1"
                                                            onClick={() => setEmailComposerOpen(true)}
                                                        >
                                                            <Mail className="h-3.5 w-3.5 mr-1.5" />
                                                            Send Email
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex-1"
                                                            onClick={() => setCallScriptOpen(true)}
                                                        >
                                                            <Phone className="h-3.5 w-3.5 mr-1.5" />
                                                            View Call Script
                                                        </Button>
                                                    </div>

                                                    {ctx.activePlaybook.aiGeneratedContent?.talking_points?.length > 0 && (
                                                        <div>
                                                            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Talking Points</h4>
                                                            <ul className="space-y-1.5">
                                                                {ctx.activePlaybook.aiGeneratedContent.talking_points.map((pt: string, i: number) => (
                                                                    <li key={i} className="flex items-start gap-2 text-sm">
                                                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                                                                        {pt}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8">
                                                    <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                                                    <p className="text-sm text-muted-foreground mb-4">No active playbook yet.</p>
                                                    <Button
                                                        onClick={() => generatePlaybookMutation.mutate()}
                                                        disabled={generatePlaybookMutation.isPending}
                                                        size="sm"
                                                    >
                                                        {generatePlaybookMutation.isPending ? "Generating..." : "Generate Playbook"}
                                                    </Button>
                                                </div>
                                            )}

                                            <Separator />

                                            {/* Category gaps */}
                                            {ctx.categorySpend.length > 0 && (
                                                <div>
                                                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Top Category Gaps</h3>
                                                    <div className="space-y-3">
                                                        {ctx.categorySpend.slice(0, 4).map((s) => {
                                                            const gap = parseFloat(s.gapPct ?? "0");
                                                            return (
                                                                <div key={s.categoryId}>
                                                                    <div className="flex justify-between text-sm mb-1">
                                                                        <span className="font-medium">{s.categoryName ?? `Category ${s.categoryId}`}</span>
                                                                        <span className="text-muted-foreground">{s.gapPct ? `${gap.toFixed(0)}% gap` : "—"} · {fmt(s.gapDollars)}</span>
                                                                    </div>
                                                                    <Progress value={Math.min(Math.abs(gap), 100)} className="h-1.5" />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            <Separator />

                                            {/* Rep note */}
                                            <div>
                                                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">Add Note</h3>
                                                <Textarea
                                                    placeholder="What did you discuss? Any signals or next steps..."
                                                    value={repNote}
                                                    onChange={(e) => setRepNote(e.target.value)}
                                                    className="text-sm resize-none"
                                                    rows={3}
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="mt-2"
                                                    disabled={!repNote.trim() || saveNoteMutation.isPending}
                                                    onClick={() => saveNoteMutation.mutate()}
                                                >
                                                    Save Note
                                                </Button>
                                            </div>
                                        </>
                                    )}

                                    {/* ── INTEL TAB ─────────────────── */}
                                    {activeTab === "intel" && (
                                        <>
                                            {/* Recent interactions */}
                                            {ctx.recentInteractions.length > 0 ? (
                                                <div>
                                                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Recent Interactions</h3>
                                                    <div className="space-y-3">
                                                        {ctx.recentInteractions.map((interaction, i) => (
                                                            <div key={i} className="flex gap-3">
                                                                <div className="flex flex-col items-center">
                                                                    <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                                                        {interaction.interactionType === "email" ? <Mail className="h-3 w-3" /> :
                                                                            interaction.interactionType === "call" ? <Phone className="h-3 w-3" /> :
                                                                                <ClipboardList className="h-3 w-3" />}
                                                                    </div>
                                                                    {i < ctx.recentInteractions.length - 1 && (
                                                                        <div className="w-px flex-1 bg-border mt-1" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 pb-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-medium">{interaction.interactionType.replace(/_/g, " ")}</span>
                                                                        {interaction.sentiment && (
                                                                            <span className={`text-xs ${sentimentColors[interaction.sentiment] ?? "text-muted-foreground"}`}>
                                                                                · {interaction.sentiment.replace(/_/g, " ")}
                                                                            </span>
                                                                        )}
                                                                        <span className="text-xs text-muted-foreground ml-auto">
                                                                            {interaction.interactionDate ? new Date(interaction.interactionDate).toLocaleDateString() : ""}
                                                                        </span>
                                                                    </div>
                                                                    {interaction.subject && <p className="text-sm mt-0.5">{interaction.subject}</p>}
                                                                    {interaction.buyingSignal && (
                                                                        <p className="text-xs text-green-600 mt-1">🟢 Buying signal: {interaction.buyingSignal}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground text-center py-6">No interactions logged yet.</p>
                                            )}

                                            <Separator />

                                            {/* Competitors */}
                                            {ctx.competitors.length > 0 && (
                                                <div>
                                                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">Competitor Intel</h3>
                                                    <div className="space-y-2">
                                                        {ctx.competitors.map((c, i) => (
                                                            <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
                                                                <span className="font-medium">{c.name}</span>
                                                                {c.estimatedSpendPct && (
                                                                    <span className="text-muted-foreground text-xs">~{c.estimatedSpendPct}% est. spend</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* ── CONTEXT TAB ───────────────── */}
                                    {activeTab === "context" && (
                                        <>
                                            {/* Contacts */}
                                            {ctx.contacts.length > 0 && (
                                                <div>
                                                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Key Contacts</h3>
                                                    <div className="space-y-2">
                                                        {ctx.contacts.map((c, i) => (
                                                            <div key={i} className="flex items-center gap-3 p-2 rounded-lg border">
                                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                                                    {c.name.charAt(0)}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-medium">{c.name}</span>
                                                                        {c.isPrimary && <Badge variant="secondary" className="text-xs py-0">Primary</Badge>}
                                                                    </div>
                                                                    <span className="text-xs text-muted-foreground">{c.role ?? "Unknown role"}</span>
                                                                </div>
                                                                {c.email && (
                                                                    <a href={`mailto:${c.email}`} className="shrink-0">
                                                                        <Mail className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <Separator />

                                            {/* Projects */}
                                            {ctx.projects.length > 0 && (
                                                <div>
                                                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">Active Projects</h3>
                                                    <div className="space-y-2">
                                                        {ctx.projects.map((p, i) => (
                                                            <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg border">
                                                                <div>
                                                                    <span className="font-medium">{p.name}</span>
                                                                    <span className="text-muted-foreground text-xs ml-2">· {p.projectType?.replace(/_/g, " ")}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-xs font-medium">{fmt(p.estimatedValue)}</div>
                                                                    <div className="text-xs text-muted-foreground">{p.status}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <Separator />

                                            {/* Similar graduated accounts */}
                                            {ctx.similarGraduatedAccounts.length > 0 && (
                                                <div>
                                                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
                                                        Similar Accounts That Graduated
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground mb-2">Use as proof points in your pitch:</p>
                                                    <div className="space-y-2">
                                                        {ctx.similarGraduatedAccounts.map((s, i) => (
                                                            <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
                                                                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                                                <div>
                                                                    <span className="font-medium">{s.accountBName ?? `Account #${s.accountIdB}`}</span>
                                                                    <span className="text-muted-foreground text-xs ml-2">
                                                                        {s.sharedSegment} · graduated at {fmt(s.accountBGraduationRevenue)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </ScrollArea>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* Email composer modal */}
            {ctx?.activePlaybook && (
                <EmailComposerModal
                    open={emailComposerOpen}
                    onClose={() => setEmailComposerOpen(false)}
                    accountId={accountId!}
                    accountName={ctx.account.name}
                    emailSubject={ctx.activePlaybook.aiGeneratedContent?.email_subject ?? ""}
                    emailDraft={ctx.activePlaybook.aiGeneratedContent?.email_draft ?? ""}
                    personalizationNotes={ctx.activePlaybook.aiGeneratedContent?.personalization_notes ?? ""}
                />
            )}

            {/* Call script dialog */}
            <Dialog open={callScriptOpen} onOpenChange={setCallScriptOpen}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Call Script — {ctx?.account.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {ctx?.activePlaybook?.aiGeneratedContent?.call_script ? (
                            <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/30 rounded-lg p-4 border">
                                {ctx.activePlaybook.aiGeneratedContent.call_script}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No call script available for this playbook.</p>
                        )}
                        {(ctx?.activePlaybook?.aiGeneratedContent?.talking_points?.length ?? 0) > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Key Talking Points</h4>
                                <ul className="space-y-1.5">
                                    {ctx?.activePlaybook?.aiGeneratedContent?.talking_points?.map((pt: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                            <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                                            {pt}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
