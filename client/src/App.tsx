import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Accounts from "@/pages/accounts";
import ICPBuilder from "@/pages/icp-builder";
import Playbooks from "@/pages/playbooks";
import Revenue from "@/pages/revenue";
import DataUploads from "@/pages/data-uploads";
import Settings from "@/pages/settings";
import WorkflowGuide from "@/pages/workflow-guide";
import Profile from "@/pages/profile";
import Subscription from "@/pages/subscription";
import AppAdmin from "@/pages/app-admin";
import Landing from "@/pages/landing";
import ProgramPerformance from "@/pages/program-performance";
import CRMContacts from "@/pages/crm-contacts";
import CRMProjects from "@/pages/crm-projects";
import CRMSignals from "@/pages/crm-signals";
import CreditUsage from "@/pages/credit-usage";
import { AskAnythingBar } from "@/components/ask-anything-bar";

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/accounts" component={Accounts} />
      <Route path="/icp-builder" component={ICPBuilder} />
      <Route path="/playbooks" component={Playbooks} />
      <Route path="/revenue" component={Revenue} />
      <Route path="/data-uploads" component={DataUploads} />
      <Route path="/settings" component={Settings} />
      <Route path="/workflow-guide" component={WorkflowGuide} />
      <Route path="/profile" component={Profile} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/app-admin" component={AppAdmin} />
      <Route path="/program-performance" component={ProgramPerformance} />
      <Route path="/crm/contacts" component={CRMContacts} />
      <Route path="/crm/projects" component={CRMProjects} />
      <Route path="/crm/signals" component={CRMSignals} />
      <Route path="/credits" component={CreditUsage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-1 p-2 border-b sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <AskAnythingBar />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <AuthenticatedRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (location === "/promo" || location === "/landing") {
    return <Landing />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return <AuthenticatedLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="ai-vp-theme">
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
