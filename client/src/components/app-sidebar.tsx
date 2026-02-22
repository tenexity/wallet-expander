import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Upload,
  Users,
  Target,
  ClipboardList,
  TrendingUp,
  Settings,
  LogOut,
  GitBranch,
  CreditCard,
  ShieldCheck,
  Trophy,
  FileSpreadsheet,
  HelpCircle,
  Database,
  BarChart4,
  Contact,
  FolderKanban,
  Zap,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import tenexityLogo from "@assets/Tenexity_Logo_final_1769263645437.png";
import appLogo from "/favicon2.png";

interface Setting {
  key: string;
  value: string | null;
}

const mainNavItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    tooltip: "Overview of KPIs, top opportunities, and your daily focus tasks",
  },
  {
    title: "Revenue Tracking",
    url: "/revenue",
    icon: TrendingUp,
    tooltip: "Track enrolled accounts, incremental revenue, and calculate rev-share fees",
  },
  {
    title: "Program Performance",
    url: "/program-performance",
    icon: BarChart4,
    tooltip: "Enrolled/graduated counts, rep leaderboard, and program health metrics",
    matchPattern: /^\/program-performance/,
  },
  {
    title: "Accounts",
    url: "/accounts",
    icon: Users,
    tooltip: "View all customer accounts with gap analysis and opportunity scores",
  },
  {
    title: "ICP Builder",
    url: "/icp-builder",
    icon: Target,
    tooltip: "Define Ideal Customer Profiles for each segment using AI analysis",
  },
  {
    title: "Playbooks",
    url: "/playbooks",
    icon: ClipboardList,
    tooltip: "Generate and manage AI-powered sales tasks with call scripts and emails",
  },
];

const intelligenceNavItems = [
  {
    title: "Contacts",
    url: "/crm/contacts",
    icon: Contact,
    tooltip: "Contact directory with roles, influence levels, and outreach tracking",
  },
  {
    title: "Projects",
    url: "/crm/projects",
    icon: FolderKanban,
    tooltip: "Construction project pipeline detected from email intelligence",
  },
  {
    title: "Signals & Threats",
    url: "/crm/signals",
    icon: Zap,
    tooltip: "Order signals and competitor intelligence from customer emails",
  },
];

const adminNavItems = [
  {
    title: "Setup Guide",
    url: "/workflow-guide",
    icon: GitBranch,
    tooltip: "Visual guide showing setup, monthly, weekly, and daily workflows",
  },
  {
    title: "Data Uploads",
    url: "/data-uploads",
    icon: Upload,
    tooltip: "Import accounts, products, categories, and order history from CSV files",
  },
  {
    title: "Subscription",
    url: "/subscription",
    icon: CreditCard,
    tooltip: "Manage your subscription plan and billing settings",
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    tooltip: "Configure scoring weights and manage Territory Managers",
  },
  {
    title: "App Admin",
    url: "/app-admin",
    icon: ShieldCheck,
    tooltip: "Platform administration - manage all tenants and subscriptions",
  },
];

function UserProfile() {
  const { user } = useAuth();

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email?.split('@')[0] || 'User';

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2">
      <SidebarMenuButton asChild className="flex-1 h-auto py-1" data-testid="link-profile">
        <Link href="/profile">
          <Avatar className="h-8 w-8 shrink-0">
            {user?.profileImageUrl && (
              <AvatarImage src={user.profileImageUrl} alt={displayName} />
            )}
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium truncate">{displayName}</span>
            <span className="text-xs opacity-60">My Profile</span>
          </div>
        </Link>
      </SidebarMenuButton>
      <SidebarMenuButton asChild size="sm" className="h-8 w-8 p-0 shrink-0 group-data-[collapsible=icon]:hidden" data-testid="button-logout">
        <a href="/api/logout">
          <LogOut className="h-4 w-4" />
        </a>
      </SidebarMenuButton>
    </div>
  );
}

export function AppSidebar() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();

  const { data: settingsData } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
  });

  const getSettingValue = (key: string, defaultValue: string): string => {
    const setting = settingsData?.find(s => s.key === key);
    return setting?.value || defaultValue;
  };

  const appTitle = getSettingValue("appTitle", "AI VP Dashboard");
  const companyName = getSettingValue("companyName", "ABC Supply");
  const companyLogo = getSettingValue("companyLogo", "");

  // Platform admin emails (tenexity team members) - case-insensitive comparison
  const platformAdminEmails = ["graham@tenexity.ai", "admin@tenexity.ai"];
  const isPlatformAdmin = user?.email && platformAdminEmails.some(
    adminEmail => adminEmail.toLowerCase() === (user.email || "").toLowerCase().trim()
  );

  // Filter admin items - hide App Admin from non-platform admins
  const visibleAdminItems = adminNavItems.filter(item => {
    if (item.url === "/app-admin") {
      return isPlatformAdmin;
    }
    return true;
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          {companyLogo ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md overflow-hidden bg-white group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
              <img
                src={companyLogo}
                alt="Company logo"
                className="h-full w-full object-contain p-1"
              />
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md overflow-hidden group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
              <img
                src={appLogo}
                alt="Wallet Share Expander"
                className="h-full w-full object-contain"
              />
            </div>
          )}
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold text-sidebar-foreground">{appTitle}</span>
            <span className="text-xs text-sidebar-foreground/60">{companyName}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={location === item.url}
                    onClick={() => navigate(item.url)}
                    tooltip={{ children: item.tooltip, side: "right" }}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Intelligence</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {intelligenceNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={location === item.url}
                    onClick={() => navigate(item.url)}
                    tooltip={{ children: item.tooltip, side: "right" }}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleAdminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={location === item.url}
                    onClick={() => navigate(item.url)}
                    tooltip={{ children: item.tooltip, side: "right" }}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-4 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:space-y-2">
        <UserProfile />
        <div className="border-t border-sidebar-border pt-3 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-center gap-2 text-xs text-sidebar-foreground/50">
            <span>Created with care by</span>
            <img
              src={tenexityLogo}
              alt="Tenexity"
              className="h-4 object-contain dark:invert"
            />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
