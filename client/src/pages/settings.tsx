import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  Database,
  Brain,
  Mail,
  Shield,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Sliders,
  FileText,
} from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast({
      title: "Settings saved",
      description: "Your changes have been applied",
    });
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-settings">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure system settings and integrations
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-settings">
          {isSaving ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" data-testid="tab-general">
            <Settings className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="scoring" data-testid="tab-scoring">
            <Sliders className="mr-2 h-4 w-4" />
            Scoring
          </TabsTrigger>
          <TabsTrigger value="prompts" data-testid="tab-prompts">
            <Brain className="mr-2 h-4 w-4" />
            AI Prompts
          </TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">
            <Database className="mr-2 h-4 w-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company Information</CardTitle>
              <CardDescription>
                Basic company and branding settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input id="company-name" defaultValue="Mark Supply" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-share-rate">Default Share Rate (%)</Label>
                  <Input id="default-share-rate" type="number" defaultValue="15" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notifications</CardTitle>
              <CardDescription>
                Configure email and in-app notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive weekly summary reports
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Task Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Send reminders for upcoming tasks
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>ICP Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when AI generates new ICP suggestions
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Management</CardTitle>
              <CardDescription>
                Manage data retention and cleanup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Order History Retention</Label>
                <Select defaultValue="36">
                  <SelectTrigger>
                    <SelectValue placeholder="Select retention period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 months</SelectItem>
                    <SelectItem value="24">24 months</SelectItem>
                    <SelectItem value="36">36 months</SelectItem>
                    <SelectItem value="60">60 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-archive Completed Tasks</Label>
                  <p className="text-sm text-muted-foreground">
                    Archive tasks older than 90 days
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Opportunity Score Weights</CardTitle>
              <CardDescription>
                Adjust how different factors contribute to the opportunity score
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Gap Score Weight</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue="40" className="w-20" />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Weight of category gaps in final score
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Account Size Weight</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue="30" className="w-20" />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Weight of account revenue in final score
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Growth Trend Weight</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue="20" className="w-20" />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Weight of YoY growth rate in final score
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Recency Weight</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue="10" className="w-20" />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Weight of recent purchase activity
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thresholds</CardTitle>
              <CardDescription>
                Set thresholds for alerts and classifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>High Priority Score</Label>
                  <Input type="number" defaultValue="70" />
                  <p className="text-xs text-muted-foreground">
                    Accounts above this score are high priority
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Minimum Revenue for Class A</Label>
                  <Input type="number" defaultValue="50000" />
                  <p className="text-xs text-muted-foreground">
                    Minimum 12M revenue for Class A designation
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Call Script Template
              </CardTitle>
              <CardDescription>
                Template used by AI to generate call scripts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={10}
                defaultValue={`Account: {account_name}
Segment: {segment}
Annual Revenue: {last_12m_revenue}
Gap Categories: {gap_categories_with_details}
Recommended Action: {recommended_action}

Generate a concise call script for a Territory Manager. Include:
1. Opening (reference recent orders or relationship)
2. Transition to gap category (natural, not salesy)
3. Specific product recommendation with 1-2 benefits
4. Suggested next step (quote, site visit, sample)

Keep it conversational—this is a relationship, not a cold call.`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Template
              </CardTitle>
              <CardDescription>
                Template used by AI to generate email drafts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={10}
                defaultValue={`Account: {account_name}
Contact Name: {contact_name}
Segment: {segment}
Gap Categories: {gap_categories_with_details}
Recent Orders: {recent_order_summary}

Generate a short email (3 paragraphs max) that:
1. References their business/recent activity
2. Introduces the gap category naturally (seasonal tie-in, project mention, etc.)
3. Offers a specific next step (call, quote, catalog)

Tone: Helpful, not pushy. This is a trusted supplier relationship.
Subject line: Keep it specific and under 50 characters.`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4" />
                ICP Analysis Prompt
              </CardTitle>
              <CardDescription>
                Prompt used for AI-powered segment analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={8}
                defaultValue={`Analyze the purchasing patterns of Class A {segment} customers.

Identify:
1. Which product categories typically appear together
2. Expected percentage breakdown by category
3. Which categories are required vs optional
4. Strategic priorities based on margin and growth potential

Output a structured profile with category expectations.`}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Provider
              </CardTitle>
              <CardDescription>
                OpenAI integration for AI-powered features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-md bg-chart-2/10 border border-chart-2/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-chart-2" />
                  <div>
                    <p className="font-medium">Connected</p>
                    <p className="text-sm text-muted-foreground">
                      Using Replit AI Integrations
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-chart-2 border-chart-2/30">
                  Active
                </Badge>
              </div>
              <div className="space-y-2">
                <Label>Default Model</Label>
                <Select defaultValue="gpt-5.1">
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-5.1">GPT-5.1 (Recommended)</SelectItem>
                    <SelectItem value="gpt-5">GPT-5</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Provider
              </CardTitle>
              <CardDescription>
                Configure email sending for task notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-md bg-muted border">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Not Connected</p>
                    <p className="text-sm text-muted-foreground">
                      Configure email provider for notifications
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                Database
              </CardTitle>
              <CardDescription>
                PostgreSQL database connection status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-md bg-chart-2/10 border border-chart-2/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-chart-2" />
                  <div>
                    <p className="font-medium">Connected</p>
                    <p className="text-sm text-muted-foreground">
                      PostgreSQL via Neon
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-chart-2 border-chart-2/30">
                  Healthy
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
