import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ClipboardList,
  Plus,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Download,
  Sparkles,
  Loader2,
  Calendar,
  User,
  MessageSquare,
} from "lucide-react";

interface Task {
  id: number;
  accountId: number;
  accountName: string;
  assignedTm: string;
  taskType: "call" | "email" | "visit";
  title: string;
  description: string;
  script: string;
  gapCategories: string[];
  status: "pending" | "in_progress" | "completed" | "skipped";
  dueDate: string;
  completedAt?: string;
  outcome?: string;
}

interface Playbook {
  id: number;
  name: string;
  generatedBy: string;
  generatedAt: string;
  taskCount: number;
  completedCount: number;
}

const taskTypeIcons = {
  call: Phone,
  email: Mail,
  visit: MapPin,
};

const statusColors: Record<string, string> = {
  pending: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  in_progress: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  completed: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  skipped: "bg-muted text-muted-foreground border-muted",
};

export default function Playbooks() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: playbooks } = useQuery<Playbook[]>({
    queryKey: ["/api/playbooks"],
  });

  // Mock data for demonstration
  const mockTasks: Task[] = [
    {
      id: 1,
      accountId: 1,
      accountName: "ABC Plumbing Co",
      assignedTm: "John Smith",
      taskType: "call",
      title: "Introduce Water Heater Line",
      description: "High-opportunity account missing water heater category",
      script: `Hi [Contact], this is [Your Name] from Mark Supply. I noticed you've been a great customer for pipe and fittings, and I wanted to reach out about our water heater line.

We've recently expanded our Bradford White and Rheem inventory, and I think there's a great opportunity for you to consolidate your purchases with us.

Would you have 15 minutes this week to discuss how we can support your water heater needs?`,
      gapCategories: ["Water Heaters", "Tools & Safety"],
      status: "pending",
      dueDate: "2024-01-25",
    },
    {
      id: 2,
      accountId: 2,
      accountName: "Elite HVAC Services",
      assignedTm: "Sarah Johnson",
      taskType: "email",
      title: "Controls & Thermostats Promotion",
      description: "Send information about Q1 controls promotion",
      script: `Subject: Exclusive Q1 Thermostat Promotion for Elite HVAC

Hi [Contact],

I hope the new year is treating you well! I wanted to reach out about an exclusive promotion we're running on Honeywell and Ecobee smart thermostats.

Given your HVAC installation volume, I think you could save significantly by consolidating your thermostat purchases with us.

Key benefits:
- 15% off all smart thermostats through March
- Same-day availability on most models
- Free technical support

Would you like me to send over a quote for your typical monthly volume?

Best,
[Your Name]`,
      gapCategories: ["Controls & Thermostats"],
      status: "in_progress",
      dueDate: "2024-01-26",
    },
    {
      id: 3,
      accountId: 3,
      accountName: "Metro Mechanical",
      assignedTm: "Mike Wilson",
      taskType: "visit",
      title: "Site Visit - Water Heater Opportunity",
      description: "Schedule jobsite visit to assess water heater needs",
      script: `Visit Objectives:
1. Tour current jobsite to understand project scope
2. Review their current water heater supplier and any pain points
3. Present our commercial water heater options
4. Discuss potential for bulk ordering and delivery scheduling

Key talking points:
- Our delivery flexibility
- Technical support and warranty handling
- Volume discount opportunities`,
      gapCategories: ["Water Heaters", "Ductwork"],
      status: "pending",
      dueDate: "2024-01-28",
    },
    {
      id: 4,
      accountId: 4,
      accountName: "Premier Plumbing",
      assignedTm: "John Smith",
      taskType: "call",
      title: "PVF Category Introduction",
      description: "Discuss PVF product availability",
      script: `Hi [Contact], this is [Your Name] from Mark Supply.

I wanted to follow up on our recent orders and check in on how everything's going. While I have you, I also wanted to mention that we've significantly expanded our PVF inventory.

I know you're currently sourcing these elsewhere, but we can now offer competitive pricing with the convenience of single-source ordering.

Can I send you our updated PVF catalog?`,
      gapCategories: ["PVF", "Tools"],
      status: "completed",
      dueDate: "2024-01-20",
      completedAt: "2024-01-20",
      outcome: "Interested in quote for PVF, scheduled follow-up call",
    },
  ];

  const mockPlaybooks: Playbook[] = [
    {
      id: 1,
      name: "Q1 2024 - Water Heater Push",
      generatedBy: "Graham",
      generatedAt: "2024-01-15",
      taskCount: 25,
      completedCount: 8,
    },
    {
      id: 2,
      name: "January Week 3 Tasks",
      generatedBy: "Graham",
      generatedAt: "2024-01-14",
      taskCount: 15,
      completedCount: 12,
    },
  ];

  const displayTasks = tasks || mockTasks;
  const displayPlaybooks = playbooks || mockPlaybooks;

  const filteredTasks = displayTasks.filter((task) => {
    const matchesSearch =
      task.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assignedTm.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesType = typeFilter === "all" || task.taskType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const toggleTaskExpanded = (taskId: number) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const handleGeneratePlaybook = async () => {
    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setIsGenerating(false);
    setShowGenerateDialog(false);
    toast({
      title: "Playbook generated",
      description: "AI has created 15 new tasks based on your criteria",
    });
  };

  const handleCompleteTask = (task: Task) => {
    setSelectedTask(task);
  };

  const TaskIcon = ({ type }: { type: "call" | "email" | "visit" }) => {
    const Icon = taskTypeIcons[type];
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-playbooks">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Playbooks & Tasks</h1>
          <p className="text-muted-foreground">
            AI-generated sales tasks and scripts for Territory Managers
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-export-tasks">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setShowGenerateDialog(true)} data-testid="button-generate-playbook">
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Playbook
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{displayTasks.length}</p>
                <p className="text-xs text-muted-foreground">Total Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-chart-3/10">
                <Clock className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {displayTasks.filter((t) => t.status === "pending").length}
                </p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-chart-1/10">
                <User className="h-5 w-5 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {displayTasks.filter((t) => t.status === "in_progress").length}
                </p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-chart-2/10">
                <CheckCircle className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {displayTasks.filter((t) => t.status === "completed").length}
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Playbooks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {displayPlaybooks.map((playbook) => (
                <div
                  key={playbook.id}
                  className="p-3 rounded-md border hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{playbook.name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {playbook.generatedAt}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-chart-2 rounded-full"
                        style={{
                          width: `${(playbook.completedCount / playbook.taskCount) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {playbook.completedCount}/{playbook.taskCount}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-tasks"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32" data-testid="select-status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="skipped">Skipped</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-32" data-testid="select-type">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="visit">Visit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredTasks.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No tasks found"
                  description="Generate a playbook to create AI-powered tasks"
                  action={{
                    label: "Generate Playbook",
                    onClick: () => setShowGenerateDialog(true),
                  }}
                  testId="empty-tasks"
                />
              ) : (
                filteredTasks.map((task) => (
                  <Collapsible
                    key={task.id}
                    open={expandedTasks.has(task.id)}
                    onOpenChange={() => toggleTaskExpanded(task.id)}
                  >
                    <div className="border rounded-md">
                      <CollapsibleTrigger asChild>
                        <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                              <TaskIcon type={task.taskType} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{task.title}</span>
                                <Badge variant="outline" className="capitalize">
                                  {task.taskType}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span>{task.accountName}</span>
                                <span>•</span>
                                <span>{task.assignedTm}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className={statusColors[task.status]}>
                                {task.status.replace("_", " ")}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {task.dueDate}
                              </span>
                              {expandedTasks.has(task.id) ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-0 border-t">
                          <div className="pt-4 space-y-4">
                            <div>
                              <Label className="text-sm text-muted-foreground">Gap Categories</Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {task.gapCategories.map((cat) => (
                                  <Badge key={cat} variant="secondary" className="text-xs">
                                    {cat}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground">
                                {task.taskType === "email" ? "Email Template" : "Script"}
                              </Label>
                              <pre className="mt-1 p-3 rounded-md bg-muted text-sm whitespace-pre-wrap font-mono">
                                {task.script}
                              </pre>
                            </div>
                            {task.outcome && (
                              <div>
                                <Label className="text-sm text-muted-foreground">Outcome</Label>
                                <p className="mt-1 text-sm">{task.outcome}</p>
                              </div>
                            )}
                            {task.status !== "completed" && task.status !== "skipped" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleCompleteTask(task)}
                                  data-testid={`button-complete-${task.id}`}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Mark Complete
                                </Button>
                                <Button variant="outline" size="sm">
                                  Skip Task
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generate Playbook
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Playbook Name</Label>
              <Input placeholder="e.g., Q1 Water Heater Campaign" />
            </div>
            <div className="space-y-2">
              <Label>Target Segment</Label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="Select segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Segments</SelectItem>
                  <SelectItem value="hvac">HVAC</SelectItem>
                  <SelectItem value="plumbing">Plumbing</SelectItem>
                  <SelectItem value="mechanical">Mechanical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Top N Accounts</Label>
              <Input type="number" placeholder="25" defaultValue="25" />
            </div>
            <div className="space-y-2">
              <Label>Priority Categories</Label>
              <div className="flex flex-wrap gap-2">
                {["Water Heaters", "Controls", "PVF", "Tools"].map((cat) => (
                  <Badge
                    key={cat}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGeneratePlaybook} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Task Outcome</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Textarea
                placeholder="Describe the outcome of this task..."
                rows={4}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="follow-up" />
              <Label htmlFor="follow-up" className="text-sm">
                Create follow-up task
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTask(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setSelectedTask(null);
                toast({
                  title: "Task completed",
                  description: "Outcome has been logged",
                });
              }}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
