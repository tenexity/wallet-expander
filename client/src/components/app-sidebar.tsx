import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
    title: "Workflow Guide",
    url: "/workflow-guide",
    icon: GitBranch,
    tooltip: "Visual guide showing setup, monthly, weekly, and daily workflows",
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

const adminNavItems = [
  {
    title: "Data Uploads",
    url: "/data-uploads",
    icon: Upload,
    tooltip: "Import accounts, products, categories, and order history from CSV files",
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    tooltip: "Configure scoring weights and manage Territory Managers",
  },
];

export function AppSidebar() {
  const [location, navigate] = useLocation();

  const { data: settingsData } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
  });

  const getSettingValue = (key: string, defaultValue: string): string => {
    const setting = settingsData?.find(s => s.key === key);
    return setting?.value || defaultValue;
  };

  const appTitle = getSettingValue("appTitle", "AI VP Dashboard");
  const companyName = getSettingValue("companyName", "Mark Supply");
  const companyLogo = getSettingValue("companyLogo", "");

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          {companyLogo ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-md overflow-hidden bg-sidebar-primary">
              <img 
                src={companyLogo} 
                alt="Company logo" 
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <TrendingUp className="h-5 w-5" />
            </div>
          )}
          <div className="flex flex-col">
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
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => (
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
      <SidebarFooter className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <SidebarMenuButton asChild className="flex-1 h-auto py-1" data-testid="link-profile">
            <Link href="/settings">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
                  GM
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium truncate">Graham</span>
                <span className="text-xs opacity-60">Admin</span>
              </div>
            </Link>
          </SidebarMenuButton>
          <SidebarMenuButton asChild size="sm" className="h-8 w-8 p-0 shrink-0" data-testid="button-logout">
            <Link href="/promo">
              <LogOut className="h-4 w-4" />
            </Link>
          </SidebarMenuButton>
        </div>
        <div className="border-t border-sidebar-border pt-3">
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
