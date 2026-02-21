/**
 * AskAnythingBar — Phase 4
 *
 * Persistent bar that lives in the dashboard header (and optionally other pages).
 * Connects to GET /api/agent/ask-anything via Server-Sent Events (SSE).
 *
 * Features:
 *  - Cycling placeholder text
 *  - Scope selector: Account / Portfolio / Program
 *  - SSE streaming from gpt-4o
 *  - Response rendered in an overlay panel below the bar
 *  - Markdown rendering with clickable in-app navigation links
 *  - Chat history persisted in localStorage with dropdown access
 *  - Attribution footer
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { X, Sparkles, ChevronDown, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Scope = "portfolio" | "account" | "program";

interface ChatEntry {
    id: string;
    question: string;
    response: string;
    scope: Scope;
    timestamp: number;
}

const HISTORY_KEY = "ask-anything-history";
const MAX_HISTORY = 20;

function loadHistory(): ChatEntry[] {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveHistory(entries: ChatEntry[]) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
}

function renderMarkdown(raw: string): string {
    const lastNewline = raw.lastIndexOf("\n");
    const safeText = lastNewline === -1 ? raw : raw.substring(0, lastNewline);
    const trailingPartial = lastNewline === -1 ? "" : raw.substring(lastNewline + 1);

    const escaped = safeText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const lines = escaped.split("\n");
    const htmlLines: string[] = [];
    let inList = false;
    let listType: "ul" | "ol" | null = null;

    const closeList = () => {
        if (inList && listType) {
            htmlLines.push(`</${listType}>`);
            inList = false;
            listType = null;
        }
    };

    for (const line of lines) {
        const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
        if (headerMatch) {
            closeList();
            const level = headerMatch[1].length;
            const sizes = ["text-base font-semibold", "text-sm font-semibold", "text-sm font-medium"];
            htmlLines.push(`<p class="${sizes[level - 1]} mt-3 mb-1 text-foreground">${applyInline(headerMatch[2])}</p>`);
            continue;
        }

        const ulMatch = line.match(/^[\s]*[-•]\s+(.+)$/);
        if (ulMatch) {
            if (!inList || listType !== "ul") {
                closeList();
                htmlLines.push(`<ul class="my-1 ml-4 space-y-0.5">`);
                inList = true;
                listType = "ul";
            }
            htmlLines.push(`<li class="flex gap-1.5 items-start"><span class="text-muted-foreground mt-1.5 shrink-0">•</span><span>${applyInline(ulMatch[1])}</span></li>`);
            continue;
        }

        const olMatch = line.match(/^[\s]*(\d+)[.)]\s+(.+)$/);
        if (olMatch) {
            if (!inList || listType !== "ol") {
                closeList();
                htmlLines.push(`<ol class="my-1 ml-4 space-y-0.5">`);
                inList = true;
                listType = "ol";
            }
            htmlLines.push(`<li class="flex gap-1.5 items-start"><span class="font-medium text-muted-foreground shrink-0">${olMatch[1]}.</span><span>${applyInline(olMatch[2])}</span></li>`);
            continue;
        }

        closeList();

        if (line.trim() === "") {
            htmlLines.push(`<div class="h-2"></div>`);
        } else {
            htmlLines.push(`<p class="my-0.5">${applyInline(line)}</p>`);
        }
    }
    closeList();

    if (trailingPartial.trim()) {
        const escapedTrailing = trailingPartial
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        htmlLines.push(`<p class="my-0.5">${escapedTrailing}</p>`);
    }

    return htmlLines.join("");
}

function applyInline(text: string): string {
    return text
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer" data-app-link="true">$1</a>')
        .replace(/\*\*(.+?)\*\*/g, (_, content) => `<strong class="font-semibold text-foreground">${content}</strong>`)
        .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded bg-muted text-xs font-mono">$1</code>');
}

function formatTimeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

const PLACEHOLDERS = [
    "Which accounts haven't ordered in 30+ days?",
    "Who are my best opportunities for copper fittings?",
    "Summarize at-risk signals from this week's emails",
    "Which enrolled accounts are closest to graduation?",
    "What's driving the decline in HVAC revenue?",
    "Show me accounts where a project-based play would work",
];

interface AskAnythingBarProps {
    defaultScope?: Scope;
    accountId?: number;
}

export function AskAnythingBar({ defaultScope = "portfolio", accountId }: AskAnythingBarProps) {
    const [, navigate] = useLocation();
    const [scope, setScope] = useState<Scope>(defaultScope);
    const [question, setQuestion] = useState("");
    const [streaming, setStreaming] = useState(false);
    const [response, setResponse] = useState("");
    const [open, setOpen] = useState(false);
    const [displayedQuestion, setDisplayedQuestion] = useState("");
    const [displayedScope, setDisplayedScope] = useState<Scope>(defaultScope);
    const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0]);
    const [history, setHistory] = useState<ChatEntry[]>(loadHistory);
    const [historyOpen, setHistoryOpen] = useState(false);
    const responseRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const historyRef = useRef<HTMLDivElement>(null);
    const currentResponseRef = useRef("");

    const handleResponseClick = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const link = target.closest('a[data-app-link]') as HTMLAnchorElement | null;
        if (link) {
            e.preventDefault();
            const href = link.getAttribute("href");
            if (href && href.startsWith("/")) {
                navigate(href);
            }
        }
    }, [navigate]);

    useEffect(() => {
        let idx = 0;
        const interval = setInterval(() => {
            idx = (idx + 1) % PLACEHOLDERS.length;
            setPlaceholder(PLACEHOLDERS[idx]);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (responseRef.current) {
            responseRef.current.scrollTop = responseRef.current.scrollHeight;
        }
    }, [response]);

    useEffect(() => {
        if (!historyOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
                setHistoryOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [historyOpen]);

    async function handleAsk() {
        if (!question.trim() || streaming) return;
        const askedQuestion = question.trim();
        setDisplayedQuestion(askedQuestion);
        setDisplayedScope(scope);
        setResponse("");
        currentResponseRef.current = "";
        setOpen(true);
        setStreaming(true);
        setHistoryOpen(false);

        const params = new URLSearchParams({
            question: askedQuestion,
            scope,
            ...(scope === "account" && accountId ? { scopeId: String(accountId) } : {}),
        });

        try {
            const es = new EventSource(`/api/agent/ask-anything?${params.toString()}`);

            es.onmessage = (e) => {
                if (e.data === "[DONE]") {
                    es.close();
                    setStreaming(false);
                    const finalResponse = currentResponseRef.current;
                    if (finalResponse.trim()) {
                        const entry: ChatEntry = {
                            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                            question: askedQuestion,
                            response: finalResponse,
                            scope,
                            timestamp: Date.now(),
                        };
                        setHistory((prev) => {
                            const updated = [entry, ...prev].slice(0, MAX_HISTORY);
                            saveHistory(updated);
                            return updated;
                        });
                    }
                    return;
                }
                try {
                    const { text } = JSON.parse(e.data);
                    currentResponseRef.current += text;
                    setResponse((prev) => prev + text);
                } catch { }
            };

            es.onerror = () => {
                es.close();
                setStreaming(false);
            };
        } catch {
            setStreaming(false);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleAsk();
        }
        if (e.key === "Escape") {
            setOpen(false);
        }
    }

    function openHistoryEntry(entry: ChatEntry) {
        setDisplayedQuestion(entry.question);
        setDisplayedScope(entry.scope);
        setResponse(entry.response);
        setOpen(true);
        setHistoryOpen(false);
    }

    function clearHistory() {
        setHistory([]);
        localStorage.removeItem(HISTORY_KEY);
    }

    function deleteHistoryEntry(id: string) {
        setHistory((prev) => {
            const updated = prev.filter((e) => e.id !== id);
            saveHistory(updated);
            return updated;
        });
    }

    const scopeLabels: Record<Scope, string> = {
        portfolio: "Portfolio",
        account: "Account",
        program: "Program",
    };

    return (
        <div className="relative flex-1 max-w-2xl flex items-center gap-1" id="ask-anything-bar">
            {/* Input row */}
            <div className={`flex items-center gap-1 rounded-xl border bg-background shadow-sm transition-all flex-1
        ${open ? "ring-2 ring-primary/30" : "hover:border-primary/40"}`}>

                <Sparkles className="h-4 w-4 text-primary ml-3 shrink-0" />

                <Input
                    ref={inputRef}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="border-0 shadow-none focus-visible:ring-0 text-sm flex-1 bg-transparent"
                    disabled={streaming}
                    id="ask-anything-input"
                />

                {/* Scope picker */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/50 transition-colors shrink-0">
                            {scopeLabels[scope]}
                            <ChevronDown className="h-3 w-3" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-sm">
                        <DropdownMenuItem onClick={() => setScope("portfolio")}>Portfolio</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setScope("account")} disabled={!accountId}>Account</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setScope("program")}>Program</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button
                    size="sm"
                    className="m-1 h-7 px-3 text-xs shrink-0"
                    onClick={handleAsk}
                    disabled={!question.trim() || streaming}
                    id="ask-anything-submit"
                >
                    {streaming ? (
                        <span className="flex gap-1">
                            <span className="animate-bounce" style={{ animationDelay: "0ms" }}>·</span>
                            <span className="animate-bounce" style={{ animationDelay: "150ms" }}>·</span>
                            <span className="animate-bounce" style={{ animationDelay: "300ms" }}>·</span>
                        </span>
                    ) : (
                        "Ask"
                    )}
                </Button>
            </div>

            {/* History button */}
            <div className="relative" ref={historyRef}>
                <button
                    onClick={() => setHistoryOpen(!historyOpen)}
                    className={`flex items-center justify-center h-8 w-8 rounded-lg border transition-colors shrink-0
                        ${history.length > 0 ? "text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-background" : "text-muted-foreground/40 bg-background cursor-default"}`}
                    disabled={history.length === 0}
                    title="Recent questions"
                    data-testid="button-chat-history"
                >
                    <History className="h-4 w-4" />
                </button>

                {/* History dropdown */}
                {historyOpen && history.length > 0 && (
                    <div className="absolute top-full right-0 mt-1 z-50 w-80 rounded-xl border bg-background shadow-xl overflow-hidden">
                        <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Recent Questions</span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={clearHistory}
                                    className="text-xs text-muted-foreground hover:text-destructive transition-colors px-1.5 py-0.5 rounded hover:bg-muted/50"
                                    data-testid="button-clear-history"
                                >
                                    Clear all
                                </button>
                                <button
                                    onClick={() => setHistoryOpen(false)}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {history.map((entry) => (
                                <div
                                    key={entry.id}
                                    className="group flex items-start gap-2 px-3 py-2.5 hover:bg-muted/40 cursor-pointer border-b last:border-b-0 transition-colors"
                                    onClick={() => openHistoryEntry(entry)}
                                    data-testid={`history-entry-${entry.id}`}
                                >
                                    <Sparkles className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-foreground truncate">{entry.question}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {scopeLabels[entry.scope]} · {formatTimeAgo(entry.timestamp)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteHistoryEntry(entry.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-0.5"
                                        data-testid={`button-delete-history-${entry.id}`}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Response overlay */}
            {open && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border bg-background shadow-xl overflow-hidden">
                    {/* Response question echo */}
                    <div className="px-4 pt-3 pb-2 border-b bg-muted/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                                <span className="text-xs font-medium text-muted-foreground">{displayedQuestion}</span>
                                <span className="text-xs text-muted-foreground/60">· {scopeLabels[displayedScope]}</span>
                            </div>
                            <button
                                onClick={() => { setOpen(false); }}
                                className="text-muted-foreground hover:text-foreground"
                                data-testid="button-close-response"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Streaming response */}
                    <div
                        ref={responseRef}
                        className="px-4 py-3 text-sm text-foreground leading-relaxed max-h-80 overflow-y-auto"
                        onClick={handleResponseClick}
                    >
                        {response ? (
                            <div className="space-y-0" dangerouslySetInnerHTML={{ __html: renderMarkdown(response) }} />
                        ) : (
                            <span className="text-muted-foreground italic text-sm">
                                {streaming ? "Thinking..." : "Ask a question above to get started."}
                            </span>
                        )}
                        {streaming && (
                            <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse align-middle" />
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 border-t bg-muted/20 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Revenue Intelligence Agent · Wallet Share Expander</span>
                        <span className="text-xs text-muted-foreground">gpt-4o</span>
                    </div>
                </div>
            )}
        </div>
    );
}
