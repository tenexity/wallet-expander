import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
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
  HelpCircle,
  Target,
  BookOpen,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  playbookId?: number;
}

interface Playbook {
  id: number;
  name: string;
  generatedBy: string;
  generatedAt: string;
  taskCount: number;
  completedCount: number;
}

interface CustomCategory {
  id: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
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
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const search = useSearch();
  
  // Generate dialog form state
  const [playbookName, setPlaybookName] = useState("");
  const [generateSegment, setGenerateSegment] = useState<string>("all");
  const [topN, setTopN] = useState<number>(5);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Create task dialog form state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskType, setNewTaskType] = useState<string>("call");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskAccountId, setNewTaskAccountId] = useState<string>("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  
  // Parse URL parameters for task auto-selection
  const params = new URLSearchParams(search);
  const taskIdFromUrl = params.get("task");
  const segmentFromUrl = params.get("segment");

  interface Account {
    id: number;
    name: string;
    segment: string | null;
  }

  const { data: playbooks } = useQuery<Playbook[]>({
    queryKey: ["/api/playbooks"],
  });

  const tasksQueryKey = selectedPlaybookId 
    ? `/api/tasks?playbookId=${selectedPlaybookId}`
    : "/api/tasks";
    
  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: [tasksQueryKey],
  });

  // Fetch custom categories for the dialog
  const { data: customCategories } = useQuery<CustomCategory[]>({
    queryKey: ["/api/custom-categories"],
  });

  // Fetch accounts for manual task creation
  const { data: accounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  // Seed default categories if none exist
  useEffect(() => {
    if (customCategories && customCategories.length === 0) {
      apiRequest("POST", "/api/custom-categories/seed-defaults").catch(console.error);
    }
  }, [customCategories]);

  // Handle URL parameters for segment pre-fill
  useEffect(() => {
    if (segmentFromUrl) {
      setGenerateSegment(segmentFromUrl);
      setShowGenerateDialog(true);
    }
  }, [segmentFromUrl]);

  // Use a guard to prevent repeated auto-selection
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  // Handle URL task auto-selection with memoized task
  const taskToAutoSelect = useMemo(() => {
    if (!taskIdFromUrl || !tasks || hasAutoSelected) return null;
    const taskId = parseInt(taskIdFromUrl);
    return tasks.find(t => t.id === taskId);
  }, [taskIdFromUrl, tasks, hasAutoSelected]);

  useEffect(() => {
    if (taskToAutoSelect && !hasAutoSelected) {
      setExpandedTasks(new Set([taskToAutoSelect.id]));
      setHasAutoSelected(true);
    }
  }, [taskToAutoSelect, hasAutoSelected]);

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
      script: "Hi [Contact Name], this is [Your Name] from Mark Supply...",
      gapCategories: ["Water Heaters"],
      status: "pending",
      dueDate: "2026-01-25",
    },
    {
      id: 2,
      accountId: 2,
      accountName: "Elite HVAC Services",
      assignedTm: "Sarah Johnson",
      taskType: "email",
      title: "Cross-sell Controls & Thermostats",
      description: "HVAC contractor with gap in controls category",
      script: "Subject: Boost Your Efficiency with Smart Controls...",
      gapCategories: ["Controls & Thermostats"],
      status: "in_progress",
      dueDate: "2026-01-26",
    },
  ];

  const mockPlaybooks: Playbook[] = [
    {
      id: 1,
      name: "Q1 Water Heater Campaign",
      generatedBy: "AI",
      generatedAt: "2026-01-15",
      taskCount: 25,
      completedCount: 8,
    },
  ];

  const displayTasks = tasks || mockTasks;
  const displayPlaybooks = playbooks || mockPlaybooks;
  
  // Get active categories for the dialog
  const activeCategories = customCategories?.filter(c => c.isActive) || [];
  
  // Default categories if none loaded
  const defaultCategories = ["Water Heaters", "Controls", "PVF", "Tools", "Chinaware", "Brass and Fittings"];
  const categoryOptions = activeCategories.length > 0 
    ? activeCategories.map(c => c.name) 
    : defaultCategories;

  const filteredTasks = displayTasks.filter((task) => {
    const matchesSearch =
      searchQuery === "" ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.accountName.toLowerCase().includes(searchQuery.toLowerCase());
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

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  const handleGeneratePlaybook = async () => {
    if (!playbookName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a playbook name",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiRequest("POST", "/api/playbooks/generate", {
        name: playbookName,
        segment: generateSegment === "all" ? undefined : generateSegment,
        topN: topN,
        priorityCategories: selectedCategories.length > 0 ? selectedCategories : undefined,
      });

      const data = await response.json();
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/playbooks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      
      setShowGenerateDialog(false);
      setPlaybookName("");
      setSelectedCategories([]);
      setGenerateSegment("all");
      setTopN(5);
      
      toast({
        title: "Playbook generated",
        description: `AI created ${data.tasksGenerated || 0} new tasks for "${data.playbook?.name || playbookName}"`,
      });

      // Auto-select the newly created playbook
      if (data.playbook?.id) {
        setSelectedPlaybookId(data.playbook.id);
      }
    } catch (error) {
      console.error("Generate playbook error:", error);
      toast({
        title: "Generation failed",
        description: "Failed to generate playbook. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCompleteTask = (task: Task) => {
    setSelectedTask(task);
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !newTaskAccountId) {
      toast({
        title: "Missing information",
        description: "Please provide a task title and select an account",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingTask(true);
    try {
      await apiRequest("POST", "/api/tasks", {
        accountId: parseInt(newTaskAccountId),
        playbookId: selectedPlaybookId,
        taskType: newTaskType,
        title: newTaskTitle,
        description: newTaskDescription || undefined,
        status: "pending",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: [tasksQueryKey] });
      
      setShowCreateTaskDialog(false);
      setNewTaskTitle("");
      setNewTaskType("call");
      setNewTaskDescription("");
      setNewTaskAccountId("");

      toast({
        title: "Task created",
        description: "Manual task has been added to the playbook",
      });
    } catch (error) {
      console.error("Create task error:", error);
      toast({
        title: "Failed to create task",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTask(false);
    }
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
            <Plus className="mr-2 h-4 w-4" />
            Generate Playbook
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{displayTasks.length}</p>
                  <p className="text-xs text-muted-foreground">Total Tasks</p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="tooltip-playbooks-total">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Total number of AI-generated sales tasks including calls, emails, and site visits.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="tooltip-playbooks-pending">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Tasks waiting to be started by Territory Managers.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="tooltip-playbooks-progress">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Tasks currently being worked on by Territory Managers.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="tooltip-playbooks-completed">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Successfully completed tasks with recorded outcomes.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column - Playbooks list */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Playbooks</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHelpDialog(true)}
                  data-testid="button-help"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div
                onClick={() => setSelectedPlaybookId(null)}
                className={`p-3 rounded-md border cursor-pointer transition-colors ${
                  selectedPlaybookId === null
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-muted/50"
                }`}
                data-testid="button-all-tasks"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">All Tasks</span>
                  <Badge variant="secondary" className="text-xs">
                    {displayTasks.length}
                  </Badge>
                </div>
              </div>
              
              {displayPlaybooks.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No playbooks yet</p>
                  <p className="text-xs mt-1">Click "Generate Playbook" to create one</p>
                </div>
              ) : (
                displayPlaybooks.map((playbook) => (
                  <div
                    key={playbook.id}
                    onClick={() => setSelectedPlaybookId(playbook.id)}
                    className={`p-3 rounded-md border cursor-pointer transition-colors ${
                      selectedPlaybookId === playbook.id
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted/50"
                    }`}
                    data-testid={`playbook-item-${playbook.id}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate">{playbook.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {playbook.generatedAt}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {playbook.taskCount} tasks
                      </Badge>
                      {playbook.completedCount > 0 && (
                        <Badge variant="outline" className="text-xs bg-chart-2/10 text-chart-2 border-chart-2/20">
                          {playbook.completedCount} done
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column - Tasks */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedPlaybookId 
                      ? displayPlaybooks.find(p => p.id === selectedPlaybookId)?.name || "Tasks"
                      : "All Tasks"
                    }
                  </CardTitle>
                  <CardDescription>
                    {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
                    {selectedPlaybookId && " in this playbook"}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedPlaybookId && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowCreateTaskDialog(true)}
                      data-testid="button-add-task"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Task
                    </Button>
                  )}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-48"
                      data-testid="input-search-tasks"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32" data-testid="select-status-filter">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-32" data-testid="select-type-filter">
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
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredTasks.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No tasks found"
                  description={selectedPlaybookId 
                    ? "This playbook has no tasks yet"
                    : "Generate a playbook to create AI-powered sales tasks"
                  }
                  action={{
                    label: "Generate Playbook",
                    onClick: () => setShowGenerateDialog(true),
                  }}
                />
              ) : (
                filteredTasks.map((task) => (
                  <Collapsible
                    key={task.id}
                    open={expandedTasks.has(task.id)}
                    onOpenChange={() => toggleTaskExpanded(task.id)}
                  >
                    <div
                      className={`border rounded-lg transition-colors ${
                        expandedTasks.has(task.id) ? "border-primary/50" : ""
                      }`}
                      data-testid={`task-item-${task.id}`}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-md ${
                              task.taskType === "call"
                                ? "bg-chart-1/10 text-chart-1"
                                : task.taskType === "email"
                                ? "bg-chart-4/10 text-chart-4"
                                : "bg-chart-5/10 text-chart-5"
                            }`}
                          >
                            <TaskIcon type={task.taskType} />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{task.title}</span>
                              <Badge variant="outline" className={statusColors[task.status]}>
                                {task.status.replace("_", " ")}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <span>{task.accountName}</span>
                              <span className="text-muted-foreground/50">•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                              {task.assignedTm && (
                                <>
                                  <span className="text-muted-foreground/50">•</span>
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {task.assignedTm}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {task.gapCategories?.slice(0, 2).map((cat) => (
                              <Badge key={cat} variant="secondary" className="text-xs">
                                {cat}
                              </Badge>
                            ))}
                            {expandedTasks.has(task.id) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-2 border-t bg-muted/30">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                {task.taskType === "email" ? "Email Template" : "Call Script"}
                              </h4>
                              <div className="bg-background rounded-md p-3 text-sm whitespace-pre-wrap border">
                                {task.script || task.description}
                              </div>
                            </div>
                            {task.status !== "completed" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCompleteTask(task);
                                  }}
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

      {/* Generate Playbook Dialog */}
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
              <Input 
                placeholder="e.g., Q1 Water Heater Campaign" 
                value={playbookName}
                onChange={(e) => setPlaybookName(e.target.value)}
                data-testid="input-playbook-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Target Segment</Label>
              <Select value={generateSegment} onValueChange={setGenerateSegment}>
                <SelectTrigger data-testid="select-segment">
                  <SelectValue placeholder="Select segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Segments</SelectItem>
                  <SelectItem value="HVAC">HVAC</SelectItem>
                  <SelectItem value="Plumbing">Plumbing</SelectItem>
                  <SelectItem value="Mechanical">Mechanical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Top N Accounts</Label>
              <Input 
                type="number" 
                placeholder="5" 
                value={topN}
                onChange={(e) => setTopN(parseInt(e.target.value) || 5)}
                min={1}
                max={100}
                data-testid="input-top-n"
              />
            </div>
            <div className="space-y-2">
              <Label>Priority Categories</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Click to select categories to focus on (optional)
              </p>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((cat) => (
                  <Badge
                    key={cat}
                    variant={selectedCategories.includes(cat) ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleCategory(cat)}
                    data-testid={`category-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                  >
                    {cat}
                    {selectedCategories.includes(cat) && (
                      <CheckCircle className="ml-1 h-3 w-3" />
                    )}
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

      {/* Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              How to Generate Playbooks
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium">Approve an ICP Profile</p>
                  <p className="text-sm text-muted-foreground">
                    Navigate to ICP Builder and approve at least one segment profile. This defines the ideal category mix for each customer type.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium">Click "Generate Playbook"</p>
                  <p className="text-sm text-muted-foreground">
                    Choose a target segment, select priority categories to focus on, and specify how many top accounts to include.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium">AI Generates Tasks</p>
                  <p className="text-sm text-muted-foreground">
                    The AI analyzes account gaps against ICP targets and creates personalized call scripts, email templates, and visit plans for each opportunity.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Playbooks are organized collections of tasks. Each playbook targets specific segments and categories, making it easy to track campaign progress and measure results.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHelpDialog(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Task Dialog */}
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

      {/* Create Task Dialog */}
      <Dialog open={showCreateTaskDialog} onOpenChange={(open) => {
        setShowCreateTaskDialog(open);
        if (!open) {
          setNewTaskTitle("");
          setNewTaskType("call");
          setNewTaskDescription("");
          setNewTaskAccountId("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task to Playbook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={newTaskAccountId} onValueChange={setNewTaskAccountId}>
                <SelectTrigger data-testid="select-task-account">
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map(account => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name} {account.segment && `(${account.segment})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Task Type</Label>
              <Select value={newTaskType} onValueChange={setNewTaskType}>
                <SelectTrigger data-testid="select-new-task-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="visit">Site Visit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Task Title</Label>
              <Input 
                placeholder="e.g., Follow up on water heater quote" 
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                data-testid="input-new-task-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea 
                placeholder="Additional details about this task..."
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                rows={3}
                data-testid="input-new-task-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTaskDialog(false)} disabled={isCreatingTask}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask} disabled={isCreatingTask || !newTaskTitle.trim() || !newTaskAccountId}>
              {isCreatingTask ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Task
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
