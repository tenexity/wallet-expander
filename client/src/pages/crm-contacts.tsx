import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  UserPlus,
  Phone,
  Mail,
  Building2,
  Crown,
  Shield,
  Eye,
  Briefcase,
  Clock,
  ExternalLink,
  Users,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Contact } from "@shared/schema";

interface AccountBasic {
  id: number;
  name: string;
}

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Crown; color: string }> = {
  decision_maker: { label: "Decision Maker", icon: Crown, color: "text-amber-600 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800" },
  owner: { label: "Owner", icon: Crown, color: "text-amber-600 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800" },
  purchaser: { label: "Purchaser", icon: Briefcase, color: "text-blue-600 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" },
  project_manager: { label: "Project Manager", icon: Briefcase, color: "text-purple-600 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800" },
  estimator: { label: "Estimator", icon: Briefcase, color: "text-green-600 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" },
  influencer: { label: "Influencer", icon: Eye, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800" },
  gatekeeper: { label: "Gatekeeper", icon: Shield, color: "text-orange-600 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800" },
  unknown: { label: "Unknown", icon: Users, color: "text-gray-600 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700" },
};

function RoleBadge({ role, contactId }: { role: string | null; contactId?: number }) {
  const config = ROLE_CONFIG[role || "unknown"] || ROLE_CONFIG.unknown;
  const Icon = config.icon;
  const testId = contactId ? `badge-role-${contactId}` : "badge-role";
  return (
    <span 
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${config.color}`}
      data-testid={testId}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function formatTimeAgo(date: string | Date | null): string {
  if (!date) return "Never";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export default function CRMContacts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const { toast } = useToast();

  const { data: contacts, isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/crm/contacts"],
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

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter((c) => {
      const fullName = `${c.firstName} ${c.lastName || ""}`.toLowerCase();
      const matchesSearch =
        fullName.includes(searchQuery.toLowerCase()) ||
        (c.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (accountMap[c.accountId || 0] || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || c.role === roleFilter;
      const matchesSource = sourceFilter === "all" || c.source === sourceFilter;
      return matchesSearch && matchesRole && matchesSource;
    });
  }, [contacts, searchQuery, roleFilter, sourceFilter, accountMap]);

  const stats = useMemo(() => {
    if (!contacts) return { total: 0, decisionMakers: 0, recentlyContacted: 0, noContact30: 0 };
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      total: contacts.length,
      decisionMakers: contacts.filter(c => c.role === "decision_maker" || c.role === "owner").length,
      recentlyContacted: contacts.filter(c => c.lastContactedAt && new Date(c.lastContactedAt) > thirtyDaysAgo).length,
      noContact30: contacts.filter(c => !c.lastContactedAt || new Date(c.lastContactedAt) < thirtyDaysAgo).length,
    };
  }, [contacts]);

  const roles = ["all", "decision_maker", "owner", "purchaser", "project_manager", "estimator", "influencer", "gatekeeper", "unknown"];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-crm-contacts">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">
            People detected across your customer accounts from email intelligence
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="stat-card-total-contacts">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-contacts">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Contacts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-card-decision-makers">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
                <Crown className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-decision-makers">{stats.decisionMakers}</p>
                <p className="text-xs text-muted-foreground">Decision Makers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-card-recently-contacted">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-recently-contacted">{stats.recentlyContacted}</p>
                <p className="text-xs text-muted-foreground">Contacted (30d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-card-needs-outreach">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-needs-outreach">{stats.noContact30}</p>
                <p className="text-xs text-muted-foreground">Needs Outreach</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg">Contact Directory</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, title, account..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-contacts"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-role-filter">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.filter(r => r !== "all").map(r => (
                    <SelectItem key={r} value={r}>{ROLE_CONFIG[r]?.label || r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-source-filter">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="email_sync">Email Sync</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="csv_import">CSV Import</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredContacts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No contacts found"
              description={contacts?.length ? "Try adjusting your filters" : "Connect your email inbox in Settings to auto-detect contacts from customer correspondence"}
            />
          ) : (
            <div className="space-y-2">
              {filteredContacts.map((contact) => {
                const accountName = accountMap[contact.accountId || 0];
                const isStale = !contact.lastContactedAt || new Date(contact.lastContactedAt) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                const isKeyPerson = contact.role === "decision_maker" || contact.role === "owner";

                return (
                  <div
                    key={contact.id}
                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50 ${isKeyPerson && isStale ? "border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/20" : ""}`}
                    onClick={() => setSelectedContact(contact)}
                    data-testid={`card-contact-${contact.id}`}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                        <span className="text-sm font-semibold">
                          {contact.firstName?.[0]}{(contact.lastName || "")[0] || ""}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate" data-testid={`text-contact-name-${contact.id}`}>
                            {contact.firstName} {contact.lastName || ""}
                          </span>
                          <RoleBadge role={contact.role} contactId={contact.id} />
                          {isKeyPerson && isStale && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0" data-testid={`badge-outreach-needed-${contact.id}`}>
                                  Outreach needed
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                Decision maker hasn't been contacted in 30+ days
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                          {contact.title && <span className="truncate" data-testid={`text-contact-title-${contact.id}`}>{contact.title}</span>}
                          {contact.title && accountName && <span>·</span>}
                          {accountName && (
                            <Link
                              href={`/accounts?account=${contact.accountId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary hover:underline inline-flex items-center gap-1"
                              data-testid={`link-account-${contact.id}`}
                            >
                              <Building2 className="h-3 w-3" />
                              {accountName}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right text-sm text-muted-foreground hidden md:block" data-testid={`text-last-contacted-${contact.id}`}>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(contact.lastContactedAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {contact.email && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); window.open(`mailto:${contact.email}`); }}
                                data-testid={`button-email-${contact.id}`}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{contact.email}</TooltipContent>
                          </Tooltip>
                        )}
                        {contact.phone && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); window.open(`tel:${contact.phone}`); }}
                                data-testid={`button-phone-${contact.id}`}
                              >
                                <Phone className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{contact.phone}</TooltipContent>
                          </Tooltip>
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

      <Dialog open={!!selectedContact} onOpenChange={(open) => !open && setSelectedContact(null)}>
        <DialogContent className="max-w-lg" data-testid="dialog-contact-details">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3" data-testid={selectedContact ? `text-dialog-title-${selectedContact.id}` : undefined}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="text-sm font-semibold">
                  {selectedContact?.firstName?.[0]}{(selectedContact?.lastName || "")[0] || ""}
                </span>
              </div>
              {selectedContact?.firstName} {selectedContact?.lastName || ""}
            </DialogTitle>
            <DialogDescription>Contact details and intelligence</DialogDescription>
          </DialogHeader>
          {selectedContact && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <RoleBadge role={selectedContact.role} contactId={selectedContact.id} />
                {selectedContact.isPrimary && (
                  <Badge variant="default" data-testid={`badge-primary-contact-${selectedContact.id}`}>Primary Contact</Badge>
                )}
                <Badge variant="outline" className="text-xs" data-testid={`badge-source-${selectedContact.id}`}>
                  Source: {selectedContact.source === "email_sync" ? "Email Intelligence" : selectedContact.source === "csv_import" ? "CSV Import" : "Manual"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedContact.title && (
                  <div>
                    <p className="text-muted-foreground text-xs">Title</p>
                    <p className="font-medium" data-testid={`text-dialog-title-value-${selectedContact.id}`}>{selectedContact.title}</p>
                  </div>
                )}
                {selectedContact.department && (
                  <div>
                    <p className="text-muted-foreground text-xs">Department</p>
                    <p className="font-medium" data-testid={`text-dialog-department-${selectedContact.id}`}>{selectedContact.department}</p>
                  </div>
                )}
                {selectedContact.email && (
                  <div>
                    <p className="text-muted-foreground text-xs">Email</p>
                    <a href={`mailto:${selectedContact.email}`} className="font-medium text-primary hover:underline" data-testid={`link-dialog-email-${selectedContact.id}`}>
                      {selectedContact.email}
                    </a>
                  </div>
                )}
                {selectedContact.phone && (
                  <div>
                    <p className="text-muted-foreground text-xs">Phone</p>
                    <a href={`tel:${selectedContact.phone}`} className="font-medium text-primary hover:underline" data-testid={`link-dialog-phone-${selectedContact.id}`}>
                      {selectedContact.phone}
                    </a>
                  </div>
                )}
                {selectedContact.accountId && accountMap[selectedContact.accountId] && (
                  <div>
                    <p className="text-muted-foreground text-xs">Account</p>
                    <Link href={`/accounts?account=${selectedContact.accountId}`} className="font-medium text-primary hover:underline inline-flex items-center gap-1" data-testid={`link-dialog-account-${selectedContact.id}`}>
                      <Building2 className="h-3 w-3" />
                      {accountMap[selectedContact.accountId]}
                    </Link>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs">Last Contacted</p>
                  <p className="font-medium" data-testid={`text-dialog-last-contacted-${selectedContact.id}`}>{formatTimeAgo(selectedContact.lastContactedAt)}</p>
                </div>
              </div>

              {selectedContact.notes && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Notes</p>
                  <p className="text-sm bg-muted/50 p-3 rounded-md" data-testid={`text-dialog-notes-${selectedContact.id}`}>{selectedContact.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
