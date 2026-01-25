import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Settings,
  Target,
  Users,
  ClipboardList,
  TrendingUp,
  LayoutDashboard,
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  Calendar,
  CalendarDays,
  CalendarClock,
} from "lucide-react";
import teeterTotterImage from "@assets/teeter-totter-workflow.png";

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  url: string;
  icon: React.ElementType;
}

const setupSteps: WorkflowStep[] = [
  {
    id: "setup-1",
    title: "Upload Data",
    description: "Import accounts, products, categories, and order history from CSV files",
    url: "/data-uploads",
    icon: Upload,
  },
  {
    id: "setup-2",
    title: "Configure Settings",
    description: "Set up scoring weights, company info, and territory managers",
    url: "/settings",
    icon: Settings,
  },
  {
    id: "setup-3",
    title: "Build ICP",
    description: "Define Ideal Customer Profiles for each customer segment",
    url: "/icp-builder",
    icon: Target,
  },
];

const monthlySteps: WorkflowStep[] = [
  {
    id: "monthly-1",
    title: "Review Revenue",
    description: "Analyze enrolled accounts and calculate monthly rev-share fees",
    url: "/revenue",
    icon: TrendingUp,
  },
  {
    id: "monthly-2",
    title: "Update Data",
    description: "Refresh account data and upload new order history",
    url: "/data-uploads",
    icon: Upload,
  },
  {
    id: "monthly-3",
    title: "Refine ICP",
    description: "Adjust Ideal Customer Profiles based on new data insights",
    url: "/icp-builder",
    icon: Target,
  },
];

const weeklySteps: WorkflowStep[] = [
  {
    id: "weekly-1",
    title: "Analyze Accounts",
    description: "Review gap analysis and opportunity scores for all accounts",
    url: "/accounts",
    icon: Users,
  },
  {
    id: "weekly-2",
    title: "Generate Playbooks",
    description: "Create AI-powered sales tasks with call scripts and emails",
    url: "/playbooks",
    icon: ClipboardList,
  },
  {
    id: "weekly-3",
    title: "Track Revenue",
    description: "Monitor incremental revenue and update account enrollments",
    url: "/revenue",
    icon: TrendingUp,
  },
];

const dailySteps: WorkflowStep[] = [
  {
    id: "daily-1",
    title: "Check Dashboard",
    description: "Review KPIs, top opportunities, and your daily focus tasks",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    id: "daily-2",
    title: "Execute Playbooks",
    description: "Complete assigned sales tasks, calls, and follow-ups",
    url: "/playbooks",
    icon: ClipboardList,
  },
  {
    id: "daily-3",
    title: "Update Progress",
    description: "Mark tasks complete and log customer interactions",
    url: "/playbooks",
    icon: CheckCircle2,
  },
];

interface SwimLaneProps {
  title: string;
  subtitle: string;
  steps: WorkflowStep[];
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ElementType;
}

function SwimLane({ title, subtitle, steps, color, bgColor, borderColor, icon: LaneIcon }: SwimLaneProps) {
  const [, navigate] = useLocation();

  return (
    <div className={`rounded-lg border-2 ${borderColor} ${bgColor} p-4`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <LaneIcon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center gap-3">
            <button
              onClick={() => navigate(step.url)}
              className="group flex flex-col items-start p-3 rounded-lg bg-background border border-border hover-elevate active-elevate-2 cursor-pointer min-w-[180px] text-left transition-all"
              data-testid={`workflow-step-${step.id}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <step.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                <span className="font-medium text-sm text-foreground">{step.title}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{step.description}</p>
            </button>
            {index < steps.length - 1 && (
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 hidden sm:block" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WorkflowGuide() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-workflow-title">
          Workflow Guide
        </h1>
        <p className="text-muted-foreground">
          Visual overview of how to use the AI VP Dashboard. Click any step to navigate directly to that feature.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <img 
              src={teeterTotterImage} 
              alt="Workflow diagram showing Account Enrollment as the central fulcrum, with data preparation activities on the left and sales execution activities on the right" 
              className="w-full max-w-4xl rounded-lg border border-border"
              data-testid="img-teeter-totter"
            />
            <p className="text-sm text-muted-foreground text-center max-w-2xl">
              Account Enrollment is the central pivot point of this system. On the left, prepare your data through uploads, configuration, and ICP analysis. 
              Once enrolled, execute sales activities on the right through playbooks, tasks, and revenue tracking.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              One-Time Setup
            </Badge>
            Getting Started
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SwimLane
            title="Initial Setup"
            subtitle="Complete these steps once when first using the system"
            steps={setupSteps}
            color="bg-amber-500"
            bgColor="bg-amber-50/50 dark:bg-amber-950/20"
            borderColor="border-amber-200 dark:border-amber-800"
            icon={Settings}
          />
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <ArrowDown className="h-8 w-8 text-muted-foreground" />
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                Monthly
              </Badge>
              Monthly Review Cycle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SwimLane
              title="Monthly Tasks"
              subtitle="Complete these tasks once per month"
              steps={monthlySteps}
              color="bg-purple-500"
              bgColor="bg-purple-50/50 dark:bg-purple-950/20"
              borderColor="border-purple-200 dark:border-purple-800"
              icon={Calendar}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                Weekly
              </Badge>
              Weekly Planning Cycle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SwimLane
              title="Weekly Tasks"
              subtitle="Complete these tasks once per week"
              steps={weeklySteps}
              color="bg-blue-500"
              bgColor="bg-blue-50/50 dark:bg-blue-950/20"
              borderColor="border-blue-200 dark:border-blue-800"
              icon={CalendarDays}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                Daily
              </Badge>
              Daily Execution Cycle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SwimLane
              title="Daily Tasks"
              subtitle="Complete these tasks every day"
              steps={dailySteps}
              color="bg-green-500"
              bgColor="bg-green-50/50 dark:bg-green-950/20"
              borderColor="border-green-200 dark:border-green-800"
              icon={CalendarClock}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Pro Tip</h4>
              <p className="text-sm text-muted-foreground">
                Start each day by checking the Dashboard for your top opportunities, then work through your assigned playbook tasks. 
                Weekly, review account gaps and generate new playbooks. Monthly, refresh your data and review overall revenue performance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
