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
 *  - Attribution footer
 */

import { useState, useEffect, useRef } from "react";
import { Search, X, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Scope = "portfolio" | "account" | "program";

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
        .replace(/\*\*(.+?)\*\*/g, (_, content) => `<strong class="font-semibold text-foreground">${content}</strong>`)
        .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded bg-muted text-xs font-mono">$1</code>');
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
    accountId?: number; // pass when on an account-specific page
}

export function AskAnythingBar({ defaultScope = "portfolio", accountId }: AskAnythingBarProps) {
    const [scope, setScope] = useState<Scope>(defaultScope);
    const [question, setQuestion] = useState("");
    const [streaming, setStreaming] = useState(false);
    const [response, setResponse] = useState("");
    const [open, setOpen] = useState(false);
    const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0]);
    const responseRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Cycle placeholder text
    useEffect(() => {
        let idx = 0;
        const interval = setInterval(() => {
            idx = (idx + 1) % PLACEHOLDERS.length;
            setPlaceholder(PLACEHOLDERS[idx]);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    // Auto-scroll response
    useEffect(() => {
        if (responseRef.current) {
            responseRef.current.scrollTop = responseRef.current.scrollHeight;
        }
    }, [response]);

    async function handleAsk() {
        if (!question.trim() || streaming) return;
        setResponse("");
        setOpen(true);
        setStreaming(true);

        const params = new URLSearchParams({
            question: question.trim(),
            scope,
            ...(scope === "account" && accountId ? { scopeId: String(accountId) } : {}),
        });

        try {
            const es = new EventSource(`/api/agent/ask-anything?${params.toString()}`);

            es.onmessage = (e) => {
                if (e.data === "[DONE]") {
                    es.close();
                    setStreaming(false);
                    return;
                }
                try {
                    const { text } = JSON.parse(e.data);
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

    const scopeLabels: Record<Scope, string> = {
        portfolio: "Portfolio",
        account: "Account",
        program: "Program",
    };

    return (
        <div className="relative flex-1 max-w-2xl" id="ask-anything-bar">
            {/* Input row */}
            <div className={`flex items-center gap-1 rounded-xl border bg-background shadow-sm transition-all
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

            {/* Response overlay */}
            {open && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border bg-background shadow-xl overflow-hidden">
                    {/* Response question echo */}
                    <div className="px-4 pt-3 pb-2 border-b bg-muted/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                                <span className="text-xs font-medium text-muted-foreground">{question}</span>
                                <span className="text-xs text-muted-foreground/60">· {scopeLabels[scope]}</span>
                            </div>
                            <button
                                onClick={() => { setOpen(false); setResponse(""); }}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Streaming response */}
                    <div
                        ref={responseRef}
                        className="px-4 py-3 text-sm text-foreground leading-relaxed max-h-80 overflow-y-auto"
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
