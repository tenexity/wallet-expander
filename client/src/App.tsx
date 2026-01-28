import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import DataUploads from "@/pages/data-uploads";
import Accounts from "@/pages/accounts";
import ICPBuilder from "@/pages/icp-builder";
import Playbooks from "@/pages/playbooks";
import Revenue from "@/pages/revenue";
import Settings from "@/pages/settings";
import WorkflowGuide from "@/pages/workflow-guide";
import Landing from "@/pages/landing";
import Subscription from "@/pages/subscription";
import AppAdmin from "@/pages/app-admin";

function DashboardRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/workflow-guide" component={WorkflowGuide} />
      <Route path="/data-uploads" component={DataUploads} />
      <Route path="/accounts" component={Accounts} />
      <Route path="/icp-builder" component={ICPBuilder} />
      <Route path="/playbooks" component={Playbooks} />
      <Route path="/revenue" component={Revenue} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/settings" component={Settings} />
      <Route path="/app-admin" component={AppAdmin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function DashboardLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <DashboardRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const isLandingPage = location === "/promo";

  // Always show landing page for /promo
  if (isLandingPage) {
    return <Landing />;
  }

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Redirect to promo/login if not authenticated
  if (!isAuthenticated) {
    return <Redirect to="/promo" />;
  }

  // Show dashboard for authenticated users
  return <DashboardLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="ai-vp-theme">
        <TooltipProvider>
          <AuthenticatedApp />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
