import { useLocation } from "wouter";
import {
  LayoutDashboard,
  Upload,
  Users,
  Target,
  ClipboardList,
  TrendingUp,
  Settings,
  LogOut,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const mainNavItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    tooltip: "Overview of KPIs, top opportunities, and your daily focus tasks",
  },
  {
    title: "Data Uploads",
    url: "/data-uploads",
    icon: Upload,
    tooltip: "Import accounts, products, categories, and order history from CSV files",
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
  {
    title: "Revenue Tracking",
    url: "/revenue",
    icon: TrendingUp,
    tooltip: "Track enrolled accounts, incremental revenue, and calculate rev-share fees",
  },
];

const adminNavItems = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    tooltip: "Configure scoring weights and manage Territory Managers",
  },
];

export function AppSidebar() {
  const [location, navigate] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">AI VP Dashboard</span>
            <span className="text-xs text-sidebar-foreground/60">Mark Supply</span>
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
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
              GM
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium text-sidebar-foreground truncate">Graham</span>
            <span className="text-xs text-sidebar-foreground/60">Admin</span>
          </div>
          <SidebarMenuButton size="sm" className="h-8 w-8 p-0" data-testid="button-logout">
            <LogOut className="h-4 w-4" />
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
