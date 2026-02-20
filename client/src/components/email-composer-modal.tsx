/**
 * EmailComposerModal — Phase 4
 *
 * Modal triggered from AccountDossierPanel's "Send Email" button.
 * Pre-populated with email_subject + email_draft from the active playbook.
 * On send: calls Resend via /api/agent/send-email, creates an agent_interactions row.
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Send, Copy, Lightbulb, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EmailComposerModalProps {
    open: boolean;
    onClose: () => void;
    accountId: number;
    accountName: string;
    emailSubject: string;
    emailDraft: string;
    personalizationNotes?: string;
}

export function EmailComposerModal({
    open,
    onClose,
    accountId,
    accountName,
    emailSubject,
    emailDraft,
    personalizationNotes,
}: EmailComposerModalProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [subject, setSubject] = useState(emailSubject);
    const [body, setBody] = useState(emailDraft);
    const [copied, setCopied] = useState(false);
    const [followUpDate, setFollowUpDate] = useState("");

    const sendMutation = useMutation({
        mutationFn: async () => {
            // 1. Create an interaction row (this also triggers email-intelligence automatically)
            await apiRequest("POST", "/api/agent/interactions", {
                accountId,
                interactionType: "email",
                source: "rep_entered",
                subject,
                body,
                followUpDate: followUpDate || null,
            });
        },
        onSuccess: () => {
            toast({ title: "Email logged!", description: "Interaction recorded. Don't forget to send in your email client." });
            queryClient.invalidateQueries({ queryKey: [`/api/agent/account-context/${accountId}`] });
            onClose();
        },
        onError: () => toast({ title: "Error", description: "Failed to log email.", variant: "destructive" }),
    });

    function handleCopy() {
        navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Copied to clipboard!" });
    }

    // Auto-reload subject/body when modal opens with new content
    const handleOpenChange = (o: boolean) => {
        if (o) {
            setSubject(emailSubject);
            setBody(emailDraft);
            setFollowUpDate("");
        }
        if (!o) onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" id="email-composer-modal">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="h-4 w-4 text-primary" />
                        Email Composer
                        <Badge variant="outline" className="ml-1 text-xs font-normal">{accountName}</Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Personalization notes */}
                    {personalizationNotes && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                            <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Personalization Notes</p>
                                <p className="text-xs text-amber-800 dark:text-amber-300 italic leading-relaxed">{personalizationNotes}</p>
                            </div>
                        </div>
                    )}

                    {/* Subject */}
                    <div className="space-y-1.5">
                        <Label htmlFor="email-subject" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Subject
                        </Label>
                        <Input
                            id="email-subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Email subject..."
                            className="text-sm"
                        />
                    </div>

                    {/* Body */}
                    <div className="space-y-1.5">
                        <Label htmlFor="email-body" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Email Body
                        </Label>
                        <Textarea
                            id="email-body"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={12}
                            className="text-sm font-mono resize-none leading-relaxed"
                            placeholder="Email body..."
                        />
                    </div>

                    {/* Follow-up reminder */}
                    <div className="space-y-1.5">
                        <Label htmlFor="follow-up-date" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Follow-up Reminder (optional)
                        </Label>
                        <Input
                            id="follow-up-date"
                            type="date"
                            value={followUpDate}
                            onChange={(e) => setFollowUpDate(e.target.value)}
                            className="text-sm w-48"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={handleCopy} className="mr-auto">
                        {copied ? (
                            <><CheckCircle className="h-3.5 w-3.5 mr-1.5 text-green-500" />Copied!</>
                        ) : (
                            <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy to Clipboard</>
                        )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                    <Button
                        size="sm"
                        onClick={() => sendMutation.mutate()}
                        disabled={sendMutation.isPending || !subject.trim() || !body.trim()}
                        className="gap-1.5"
                    >
                        <Send className="h-3.5 w-3.5" />
                        {sendMutation.isPending ? "Logging..." : "Log & Confirm Sent"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
