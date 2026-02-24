import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  Users,
  Target,
  Mail,
  Phone,
  CheckCircle,
  Clock,
  BarChart3,
  Building2,
  ArrowUpRight,
  Sparkles,
  GraduationCap,
  HelpCircle,
  ShieldAlert,
  AlertTriangle,
  Crosshair,
  UserCheck,
  Radar,
  Zap,
  CreditCard,
  Layers,
  Activity,
  ShieldCheck,
} from "lucide-react";

const mockAccounts = [
  { name: "Metro HVAC Solutions", segment: "HVAC Contractor", score: 92, revenue: "$142,500", penetration: "34%", enrolled: true },
  { name: "Summit Mechanical", segment: "Mechanical", score: 87, revenue: "$98,200", penetration: "28%", enrolled: false },
  { name: "Pacific Plumbing Pro", segment: "Plumbing", score: 85, revenue: "$76,800", penetration: "41%", enrolled: true },
  { name: "Valley General Contractors", segment: "General Contractor", score: 82, revenue: "$234,100", penetration: "22%", enrolled: false },
  { name: "Mountain Air Systems", segment: "HVAC Contractor", score: 79, revenue: "$67,400", penetration: "38%", enrolled: true },
];

const mockCategories = [
  { name: "Copper Fittings", current: 12400, potential: 45000, gap: 72 },
  { name: "PVC Pipe", current: 8900, potential: 32000, gap: 72 },
  { name: "HVAC Filters", current: 15600, potential: 28000, gap: 44 },
  { name: "Ductwork", current: 22000, potential: 35000, gap: 37 },
  { name: "Thermostats", current: 9800, potential: 14000, gap: 30 },
];

const mockICPData = [
  { segment: "HVAC Contractor", avgRevenue: "$145K", categories: 8, topCategory: "Ductwork" },
  { segment: "Plumbing", avgRevenue: "$98K", categories: 6, topCategory: "Copper Fittings" },
  { segment: "Mechanical", avgRevenue: "$210K", categories: 10, topCategory: "Motors & Drives" },
  { segment: "General Contractor", avgRevenue: "$178K", categories: 7, topCategory: "Safety Equipment" },
];

export function MockupDashboard() {
  return (
    <div className="bg-background rounded-lg p-4 space-y-4 text-sm border shadow-sm">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
            <TrendingUp className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">Wallet Share Expander</span>
        </div>
        <Badge variant="secondary" className="text-xs">Dashboard</Badge>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Accounts</p>
              <p className="text-xl font-bold">25</p>
            </div>
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Enrolled</p>
              <p className="text-xl font-bold text-primary">8</p>
            </div>
            <Target className="h-5 w-5 text-primary" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Revenue Growth</p>
              <p className="text-xl font-bold text-green-600">+$142K</p>
            </div>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Avg. Penetration</p>
              <p className="text-xl font-bold">32%</p>
            </div>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
      </div>

      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Top Opportunities</h3>
          <Button variant="ghost" size="sm" className="h-6 text-xs">View All</Button>
        </div>
        <div className="space-y-2">
          {mockAccounts.slice(0, 4).map((account, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded bg-muted flex items-center justify-center">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="font-medium text-xs">{account.name}</p>
                  <p className="text-[10px] text-muted-foreground">{account.segment}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-semibold text-xs">{account.revenue}</p>
                  <p className="text-[10px] text-muted-foreground">{account.penetration} penetration</p>
                </div>
                <Badge variant={account.score >= 85 ? "default" : "secondary"} className="text-[10px]">
                  {account.score}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function MockupEnrollment() {
  return (
    <div className="bg-background rounded-lg p-4 space-y-4 text-sm border shadow-sm">
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="font-semibold">Account Discovery</h3>
        <Badge variant="outline" className="text-xs">25 Accounts Analyzed</Badge>
      </div>

      <div className="space-y-2">
        {mockAccounts.map((account, i) => (
          <Card key={i} className={`p-3 ${account.enrolled ? 'border-primary/50 bg-primary/5' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${account.enrolled ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {account.enrolled ? <CheckCircle className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-xs">{account.name}</p>
                    {account.enrolled && <Badge className="text-[10px] h-4">Enrolled</Badge>}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{account.segment} • {account.revenue}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span className="font-bold text-xs">{account.score}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Opportunity Score</p>
                </div>
                {!account.enrolled && (
                  <Button size="sm" className="h-6 text-xs">Enroll</Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function MockupGapAnalysis() {
  return (
    <div className="bg-background rounded-lg p-4 space-y-4 text-sm border shadow-sm">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="font-semibold">Metro HVAC Solutions</h3>
          <p className="text-xs text-muted-foreground">Gap Analysis • $142,500 current revenue</p>
        </div>
        <Badge className="text-xs">92 Score</Badge>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-primary">$98,400</p>
          <p className="text-[10px] text-muted-foreground">Opportunity Value</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold">34%</p>
          <p className="text-[10px] text-muted-foreground">Current Penetration</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-green-600">69%</p>
          <p className="text-[10px] text-muted-foreground">Target Penetration</p>
        </Card>
      </div>

      <Card className="p-3">
        <h4 className="font-semibold text-xs mb-3">Category Gap Analysis</h4>
        <div className="space-y-3">
          {mockCategories.map((cat, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{cat.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  ${(cat.current / 1000).toFixed(1)}K / ${(cat.potential / 1000).toFixed(1)}K potential
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={100 - cat.gap} className="h-2 flex-1" />
                <Badge variant={cat.gap > 50 ? "destructive" : "secondary"} className="text-[10px] w-12 justify-center">
                  {cat.gap}% gap
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function MockupICPBuilder() {
  return (
    <div className="bg-background rounded-lg p-4 space-y-4 text-sm border shadow-sm">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="font-semibold">ICP Builder</h3>
          <p className="text-xs text-muted-foreground">AI-Generated Ideal Customer Profiles</p>
        </div>
        <Badge variant="secondary" className="text-xs">4 Segments</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {mockICPData.map((icp, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-semibold text-xs">{icp.segment}</h4>
                <p className="text-[10px] text-muted-foreground">Ideal Customer Profile</p>
              </div>
              <Sparkles className="h-4 w-4 text-amber-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Avg. Revenue</span>
                <span className="font-semibold">{icp.avgRevenue}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Category Count</span>
                <span className="font-semibold">{icp.categories} categories</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Top Category</span>
                <span className="font-semibold">{icp.topCategory}</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t">
              <Badge variant="outline" className="text-[10px]">View Full Profile</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function MockupRevenue() {
  const enrolledAccounts = [
    { name: "Metro HVAC Solutions", enrolled: "Jan 15", baseline: "$142.5K", current: "$168.2K", growth: "+18%", progress: 72 },
    { name: "Pacific Plumbing Pro", enrolled: "Jan 8", baseline: "$76.8K", current: "$89.4K", growth: "+16%", progress: 65 },
    { name: "Mountain Air Systems", enrolled: "Jan 22", baseline: "$67.4K", current: "$74.1K", growth: "+10%", progress: 45 },
  ];

  return (
    <div className="bg-background rounded-lg p-4 space-y-4 text-sm border shadow-sm">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="font-semibold">Revenue Tracking</h3>
          <p className="text-xs text-muted-foreground">Enrolled Account Performance</p>
        </div>
        <Badge className="text-xs bg-green-600">+$42.9K Growth</Badge>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-lg font-bold">8</p>
          <p className="text-[10px] text-muted-foreground">Enrolled Accounts</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-green-600">+15%</p>
          <p className="text-[10px] text-muted-foreground">Avg. Growth Rate</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold">2</p>
          <p className="text-[10px] text-muted-foreground">Ready to Graduate</p>
        </Card>
      </div>

      <Card className="p-3">
        <h4 className="font-semibold text-xs mb-3">Account Progress</h4>
        <div className="space-y-3">
          {enrolledAccounts.map((account, i) => (
            <div key={i} className="space-y-1.5 pb-2 border-b last:border-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-xs">{account.name}</p>
                    <p className="text-[10px] text-muted-foreground">Enrolled {account.enrolled}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-xs text-green-600">{account.growth}</p>
                  <p className="text-[10px] text-muted-foreground">{account.baseline} → {account.current}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={account.progress} className="h-1.5 flex-1" />
                <span className="text-[10px] text-muted-foreground w-8">{account.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function MockupPlaybooks() {
  return (
    <div className="bg-background rounded-lg p-4 space-y-4 text-sm border shadow-sm">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="font-semibold">AI Playbooks</h3>
          <p className="text-xs text-muted-foreground">Customized Action Plans</p>
        </div>
        <Badge variant="secondary" className="text-xs">4 Active Playbooks</Badge>
      </div>

      <Card className="p-3 border-primary/30 bg-primary/5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-xs">Metro HVAC Solutions</h4>
              <Badge className="text-[10px]">Priority</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">HVAC Contractor • $98,400 opportunity</p>
          </div>
          <Sparkles className="h-4 w-4 text-amber-500" />
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-start gap-2 p-2 rounded bg-background border">
            <Phone className="h-3.5 w-3.5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-[10px]">Call Script: Copper Fittings Expansion</p>
              <p className="text-[10px] text-muted-foreground line-clamp-2">
                "Hi [Contact], I noticed you've been growing your HVAC installations. I wanted to share how our copper fitting packages..."
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2 rounded bg-background border">
            <Mail className="h-3.5 w-3.5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-[10px]">Email: New Product Introduction</p>
              <p className="text-[10px] text-muted-foreground line-clamp-2">
                "Subject: Exclusive pricing on HVAC filter bundles for Metro HVAC Solutions..."
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">3 tasks pending</span>
          </div>
          <Button size="sm" className="h-6 text-xs">View Full Playbook</Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        {[
          { name: "Pacific Plumbing Pro", tasks: 2, segment: "Plumbing" },
          { name: "Mountain Air Systems", tasks: 4, segment: "HVAC" },
        ].map((playbook, i) => (
          <Card key={i} className="p-2.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-5 w-5 rounded bg-muted flex items-center justify-center">
                <Building2 className="h-2.5 w-2.5" />
              </div>
              <div>
                <p className="font-medium text-[10px]">{playbook.name}</p>
                <p className="text-[9px] text-muted-foreground">{playbook.segment}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{playbook.tasks} tasks</span>
              <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

const mockGraduatedAccounts = [
  {
    name: "Mountain Air HVAC",
    segment: "HVAC",
    daysEnrolled: 90,
    baseline: 201000,
    graduation: 245000,
    growth: 44000,
    icpSuccess: 80
  },
  {
    name: "Great Lakes Heating",
    segment: "HVAC",
    daysEnrolled: 75,
    baseline: 169000,
    graduation: 199000,
    growth: 30000,
    icpSuccess: 67
  },
];

export function MockupGraduationSuccess() {
  const totalGraduated = mockGraduatedAccounts.length;
  const incrementalRevenue = mockGraduatedAccounts.reduce((sum, acc) => sum + acc.growth, 0);
  const avgDays = Math.round(mockGraduatedAccounts.reduce((sum, acc) => sum + acc.daysEnrolled, 0) / totalGraduated);
  const avgIcpSuccess = Math.round(mockGraduatedAccounts.reduce((sum, acc) => sum + acc.icpSuccess, 0) / totalGraduated);

  return (
    <div className="bg-background rounded-lg p-4 space-y-4 text-sm border shadow-sm">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Graduation Success</h3>
            <p className="text-[10px] text-muted-foreground">Wallet share captured from graduated accounts</p>
          </div>
        </div>
        <Button variant="outline" size="sm" data-testid="button-view-graduates">
          View All Graduates
          <ArrowUpRight className="h-3 w-3 ml-1" />
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="text-center p-2.5 rounded-lg bg-muted/50" data-testid="stat-graduated-count">
          <p className="text-xl font-bold text-chart-3">{totalGraduated}</p>
          <div className="flex items-center justify-center gap-1">
            <p className="text-[10px] text-muted-foreground">Accounts Graduated</p>
            <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
          </div>
        </div>
        <div className="text-center p-2.5 rounded-lg bg-muted/50" data-testid="stat-incremental-revenue">
          <p className="text-xl font-bold text-chart-1">${Math.round(incrementalRevenue / 1000)}K</p>
          <div className="flex items-center justify-center gap-1">
            <p className="text-[10px] text-muted-foreground">Incremental Revenue</p>
            <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
          </div>
        </div>
        <div className="text-center p-2.5 rounded-lg bg-muted/50" data-testid="stat-avg-days">
          <p className="text-xl font-bold">{avgDays}</p>
          <div className="flex items-center justify-center gap-1">
            <p className="text-[10px] text-muted-foreground">Avg Days to Graduate</p>
            <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
          </div>
        </div>
        <div className="text-center p-2.5 rounded-lg bg-muted/50" data-testid="stat-icp-success">
          <p className="text-xl font-bold text-chart-2">{avgIcpSuccess}%</p>
          <div className="flex items-center justify-center gap-1">
            <p className="text-[10px] text-muted-foreground">Avg ICP Category Success</p>
            <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium text-xs text-muted-foreground">Recent Graduates</h4>
        {mockGraduatedAccounts.map((account, i) => (
          <div key={i} className="flex items-center gap-2" data-testid={`graduate-row-${i}`}>
            <div className="w-1 h-full min-h-[3.5rem] rounded-full bg-chart-2" />
            <Card className="flex-1 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-chart-2/10 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-chart-2" />
                  </div>
                  <div>
                    <p className="font-medium text-xs" data-testid={`graduate-name-${i}`}>{account.name}</p>
                    <p className="text-[10px] text-muted-foreground">{account.segment} • {account.daysEnrolled} days enrolled</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Baseline</p>
                    <p className="font-semibold text-xs" data-testid={`graduate-baseline-${i}`}>${Math.round(account.baseline / 1000)}K</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">At Graduation</p>
                    <p className="font-semibold text-xs" data-testid={`graduate-graduation-${i}`}>${Math.round(account.graduation / 1000)}K</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Growth</p>
                    <p className="font-bold text-xs text-green-600" data-testid={`graduate-growth-${i}`}>+${Math.round(account.growth / 1000)}K</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── NEW: Daily Briefing Mockup ────────────────────────────────────────────────
export function MockupDailyBriefing() {
  const priorityAccounts = [
    { name: "Metro HVAC Solutions", action: "Call re: Copper Fittings proposal", urgency: "Today", dot: "bg-red-500" },
    { name: "Pacific Plumbing Pro", action: "Follow up on last email — no reply in 8 days", urgency: "Overdue", dot: "bg-orange-500" },
    { name: "Summit Mechanical", action: "Send ductwork pricing sheet", urgency: "This week", dot: "bg-blue-500" },
  ];

  return (
    <div className="bg-background rounded-lg p-4 space-y-4 text-sm border shadow-sm">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Daily Briefing • Mon Feb 17</p>
          <h3 className="font-semibold text-sm mt-0.5">Good morning, Sarah 👋</h3>
        </div>
        <Badge variant="secondary" className="text-[10px]">8 Enrolled Accounts</Badge>
      </div>

      <Card className="p-3 border-primary/20 bg-primary/5">
        <p className="text-[10px] font-medium text-primary uppercase tracking-wide mb-1">Today's Focus</p>
        <p className="text-xs text-foreground font-medium">Metro HVAC is your highest-risk account this week. Their last order was 31 days ago — copper fitting gap is widening. A call today could recover ~$12K.</p>
      </Card>

      <div>
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Priority Actions</p>
        <div className="space-y-2">
          {priorityAccounts.map((acc, i) => (
            <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg border bg-background">
              <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${acc.dot}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs truncate">{acc.name}</p>
                <p className="text-[10px] text-muted-foreground">{acc.action}</p>
              </div>
              <Badge variant="outline" className="text-[9px] shrink-0">{acc.urgency}</Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t text-[10px] text-muted-foreground">
        <span>Generated at 7:00am EST by your AI agent</span>
        <span className="text-primary font-medium cursor-pointer">View Full Briefing →</span>
      </div>
    </div>
  );
}

// ─── NEW: Ask Anything Mockup ──────────────────────────────────────────────────
export function MockupAskAnything() {
  return (
    <div className="bg-background rounded-lg p-4 space-y-4 text-sm border shadow-sm">
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="font-semibold text-sm">Ask Anything</h3>
        <div className="flex items-center gap-1">
          {["Portfolio", "Account", "Program"].map((scope, i) => (
            <Badge key={i} variant={i === 0 ? "default" : "outline"} className="text-[10px] cursor-pointer">{scope}</Badge>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-muted/30">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs text-muted-foreground">Which accounts haven't ordered in 90+ days?</span>
        </div>
      </div>

      <Card className="p-3 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <p className="text-[10px] font-medium text-primary uppercase tracking-wide">AI Response</p>
        </div>
        <p className="text-xs text-foreground leading-relaxed">
          <span className="font-semibold">3 accounts</span> have gone 90+ days without an order:
        </p>
        <div className="mt-2 space-y-1.5">
          {[
            { name: "Valley General Contractors", days: "104 days", risk: "High" },
            { name: "Summit Mechanical", days: "91 days", risk: "Med" },
            { name: "Blue Ridge Plumbing", days: "90 days", risk: "Med" },
          ].map((acc, i) => (
            <div key={i} className="flex items-center justify-between text-[10px]">
              <span className="font-medium">{acc.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{acc.days} silent</span>
                <Badge variant={acc.risk === "High" ? "destructive" : "secondary"} className="text-[9px]">{acc.risk}</Badge>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">I recommend opening their dossiers and triggering playbook reviews today.</p>
      </Card>

      <div className="text-[10px] text-muted-foreground text-center">
        Powered by your live account data · Answers stream in real time
      </div>
    </div>
  );
}

// ─── Agentic CRM Intelligence Mockup ──────────────────────────────────────────
export function MockupCRMIntelligence() {
  const threats = [
    { competitor: "Ferguson", account: "Allied Mechanical", category: "PVF", level: "critical" as const, detail: "15% volume discount offered on airport project", priceGap: "-4.6%" },
    { competitor: "HD Supply", account: "Great Lakes Heating", category: "Controls", level: "high" as const, detail: "8% lower on BAS controllers for Lakeview Plaza", priceGap: "-8.1%" },
    { competitor: "Winsupply", account: "Sunshine HVAC", category: "Refrigerant", level: "medium" as const, detail: "Comparing R-410A pricing. Delivery failure noted.", priceGap: "-6.1%" },
  ];

  const signals = [
    { account: "Metro HVAC", type: "Quote Request", product: "Carrier 50XC Rooftop Units", value: "$124K", urgency: "immediate" as const },
    { account: "Northeast H&C", type: "Purchase Intent", product: "Honeywell T6 Pro Thermostats", value: "$32K", urgency: "immediate" as const },
    { account: "Buckeye Mechanical", type: "Pricing Inquiry", product: "Data Center Controls Package", value: "$95K", urgency: "this_week" as const },
  ];

  const contacts = [
    { name: "Jennifer Adams", title: "Dir. of Purchasing", account: "Buckeye Mechanical", role: "Decision Maker", lastContact: "3d ago", action: true },
    { name: "Robert Chang", title: "Owner / President", account: "Allied Mechanical", role: "Decision Maker", lastContact: "45d ago", action: true },
  ];

  const threatBadge = (level: "critical" | "high" | "medium") => {
    const styles = {
      critical: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800",
      high: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 border-orange-200 dark:border-orange-800",
      medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    };
    return styles[level];
  };

  const urgencyBadge = (urgency: "immediate" | "this_week") => {
    const styles = {
      immediate: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800",
      this_week: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    };
    return styles[urgency];
  };

  return (
    <div className="bg-background rounded-lg p-4 space-y-3 text-sm border shadow-sm">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-red-600 dark:bg-red-700 flex items-center justify-center">
            <Radar className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <span className="font-semibold text-sm">CRM Intelligence</span>
            <p className="text-[10px] text-muted-foreground">Auto-populated by AI agents</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-[10px]">Live</Badge>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Card className="p-2 text-center">
          <p className="text-base font-bold text-red-600 dark:text-red-400">2</p>
          <p className="text-[9px] text-muted-foreground">Critical Threats</p>
        </Card>
        <Card className="p-2 text-center">
          <p className="text-base font-bold text-amber-600 dark:text-amber-400">18</p>
          <p className="text-[9px] text-muted-foreground">Active Signals</p>
        </Card>
        <Card className="p-2 text-center">
          <p className="text-base font-bold">25</p>
          <p className="text-[9px] text-muted-foreground">Contacts Tracked</p>
        </Card>
        <Card className="p-2 text-center">
          <p className="text-base font-bold text-green-600 dark:text-green-400">$1.2M</p>
          <p className="text-[9px] text-muted-foreground">Pipeline Value</p>
        </Card>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <ShieldAlert className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
          <p className="text-[10px] font-semibold uppercase tracking-wide">Competitor Threats</p>
        </div>
        <div className="space-y-1.5">
          {threats.map((t, i) => (
            <Card key={i} className={`p-2 ${i === 0 ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border ${threatBadge(t.level)}`}>
                      {t.level === "critical" && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
                      {t.level.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-semibold">{t.competitor}</span>
                    <span className="text-[10px] text-muted-foreground">vs us</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{t.account} - {t.detail}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold text-red-600 dark:text-red-400">{t.priceGap}</p>
                  <p className="text-[9px] text-muted-foreground">{t.category}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <p className="text-[10px] font-semibold uppercase tracking-wide">Order Signals Detected</p>
        </div>
        <div className="space-y-1.5">
          {signals.map((s, i) => (
            <div key={i} className="flex items-center gap-2 p-1.5 rounded border bg-background">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold">{s.account}</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border ${urgencyBadge(s.urgency)}`}>
                    {s.urgency === "immediate" ? "NOW" : "THIS WEEK"}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{s.type}: {s.product}</p>
              </div>
              <span className="text-[10px] font-bold shrink-0">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <UserCheck className="h-3.5 w-3.5 text-primary" />
          <p className="text-[10px] font-semibold uppercase tracking-wide">Key Contacts to Engage</p>
        </div>
        <div className="space-y-1.5">
          {contacts.map((c, i) => (
            <div key={i} className="flex items-center justify-between p-1.5 rounded border bg-background">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-3 w-3 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold">{c.name}</p>
                  <p className="text-[9px] text-muted-foreground">{c.title} - {c.account}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground">{c.lastContact}</span>
                {c.action && (
                  <Badge variant="outline" className="text-[9px] border-primary/50 text-primary">Action Needed</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-primary" />
          <span>All data auto-populated from email analysis</span>
        </div>
        <span className="text-primary font-medium cursor-pointer">View Full CRM</span>
      </div>
    </div>
  );
}

// ─── NEW: Email Intelligence Mockup ───────────────────────────────────────────
export function MockupEmailIntelligence() {
  return (
    <div className="bg-background rounded-lg p-4 space-y-4 text-sm border shadow-sm">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="font-semibold text-sm">Email Intelligence</h3>
          <p className="text-[10px] text-muted-foreground">AI analysis complete · 2 minutes ago</p>
        </div>
        <Badge className="text-[10px] bg-green-600">Signal Detected</Badge>
      </div>

      <Card className="p-3 bg-muted/30 border-muted">
        <p className="text-[10px] font-medium text-muted-foreground mb-1">Logged Email — Metro HVAC Solutions</p>
        <p className="text-xs italic text-muted-foreground line-clamp-3">
          "…we've actually been getting some quotes from Ferguson on the copper side. Their pricing is competitive but the lead times are longer. Wanted to let you know before we make a final decision…"
        </p>
      </Card>

      <div>
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">AI Analysis</p>
        <div className="grid grid-cols-2 gap-2">
          <Card className="p-2.5">
            <p className="text-[10px] text-muted-foreground">Sentiment</p>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="h-2 w-2 rounded-full bg-orange-500" />
              <p className="text-xs font-semibold">At Risk</p>
            </div>
          </Card>
          <Card className="p-2.5">
            <p className="text-[10px] text-muted-foreground">Buying Signal</p>
            <p className="text-xs font-semibold text-amber-600">Decision Near</p>
          </Card>
          <Card className="p-2.5 col-span-2">
            <p className="text-[10px] text-muted-foreground mb-1">Competitor Mentioned</p>
            <Badge variant="destructive" className="text-[10px]">Ferguson — Copper Fittings</Badge>
          </Card>
        </div>
      </div>

      <Card className="p-2.5 border-red-500/30 bg-red-500/5">
        <p className="text-[10px] font-semibold text-red-600">⚠ Urgent Alert Sent to Rep</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Metro HVAC is evaluating a competitor. Respond within 24 hours to protect this account.</p>
      </Card>
    </div>
  );
}

const mockSubSegmentAccounts = [
  { name: "Tri-County Plumbing", subSegment: "Residential Service", revenue: "$134K", strategy: "High frequency, broad SKU mix", color: "bg-blue-500", icon: Users },
  { name: "Midwest Pipe & Supply", subSegment: "Commercial Mechanical", revenue: "$162K", strategy: "Project-based, large orders", color: "bg-purple-500", icon: Building2 },
  { name: "Chicago Comfort Systems", subSegment: "Builder", revenue: "$118K", strategy: "Volume pricing, spec-driven", color: "bg-amber-500", icon: Layers },
];

export function MockupSubSegments() {
  return (
    <div className="bg-background rounded-lg p-4 space-y-4 text-sm border shadow-sm" data-testid="mockup-sub-segments">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="font-semibold">Customer Classification</h3>
          <p className="text-xs text-muted-foreground">Sub-segment driven strategies</p>
        </div>
        <Badge variant="secondary" className="text-xs">3 Types</Badge>
      </div>

      <div className="space-y-2">
        {mockSubSegmentAccounts.map((account, i) => (
          <Card key={i} className="p-3" data-testid={`card-sub-segment-${i}`}>
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${account.color} text-white`}>
                <account.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-xs" data-testid={`text-account-name-${i}`}>{account.name}</p>
                  <Badge variant="outline" className="text-[10px] shrink-0" data-testid={`badge-sub-segment-${i}`}>{account.subSegment}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">{account.revenue} revenue</p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t">
              <div className="flex items-center gap-1.5">
                <Target className="h-3 w-3 text-primary" />
                <p className="text-[10px] text-muted-foreground">Strategy: <span className="font-medium text-foreground" data-testid={`text-strategy-${i}`}>{account.strategy}</span></p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-3 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs font-semibold">ICPs auto-adapt by sub-segment</p>
            <p className="text-[10px] text-muted-foreground">Each type gets a tailored profile and playbook strategy</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

const mockCreditAccounts = [
  { name: "Premier Plumbing NJ", creditUsed: 27500, creditLimit: 30000, gap: "$30.8K", constrained: true },
  { name: "Heartland Mechanical", creditUsed: 42000, creditLimit: 60000, gap: "$27.5K", constrained: false },
  { name: "Ohio Valley HVAC", creditUsed: 16500, creditLimit: 18000, gap: "$19.0K", constrained: true },
];

export function MockupCreditAssessment() {
  return (
    <div className="bg-background rounded-lg p-4 space-y-4 text-sm border shadow-sm" data-testid="mockup-credit-assessment">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="font-semibold">Opportunity Filtering</h3>
          <p className="text-xs text-muted-foreground">Credit constraint assessment</p>
        </div>
        <Badge variant="outline" className="text-xs gap-1">
          <CreditCard className="h-3 w-3" />
          Credit Check
        </Badge>
      </div>

      <div className="space-y-2">
        {mockCreditAccounts.map((account, i) => {
          const utilization = Math.round((account.creditUsed / account.creditLimit) * 100);
          return (
            <Card key={i} className={`p-3 ${account.constrained ? 'border-orange-400/40 bg-orange-50/50 dark:bg-orange-950/10' : ''}`} data-testid={`card-credit-${i}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-xs" data-testid={`text-credit-account-${i}`}>{account.name}</p>
                  {account.constrained && (
                    <Badge variant="outline" className="text-[10px] border-orange-400 text-orange-600 dark:text-orange-400 gap-0.5" data-testid={`badge-constrained-${i}`}>
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Credit Constrained
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">{account.gap} opportunity</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Credit Utilization</span>
                  <span className={`font-semibold ${utilization > 80 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>${(account.creditUsed / 1000).toFixed(0)}K / ${(account.creditLimit / 1000).toFixed(0)}K ({utilization}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${utilization > 80 ? 'bg-orange-500' : 'bg-green-500'}`}
                    style={{ width: `${utilization}%` }}
                  />
                </div>
              </div>
              {account.constrained && (
                <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-1.5 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Gap may require credit increase before pursuing
                </p>
              )}
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card className="p-2.5 text-center">
          <p className="text-lg font-bold text-green-600">7</p>
          <p className="text-[10px] text-muted-foreground">Real Opportunities</p>
        </Card>
        <Card className="p-2.5 text-center">
          <p className="text-lg font-bold text-orange-500">3</p>
          <p className="text-[10px] text-muted-foreground">Credit Constrained</p>
        </Card>
      </div>
    </div>
  );
}

const mockRFMScores = [
  { label: "Recency", score: 85, description: "Last order 8 days ago" },
  { label: "Frequency", score: 66, description: "40 orders in 12 months" },
  { label: "Monetary", score: 92, description: "$245K annual revenue" },
  { label: "Mix", score: 50, description: "6 of 12 categories purchased" },
];

export function MockupRFMScoring() {
  return (
    <div className="bg-background rounded-lg p-4 space-y-4 text-sm border shadow-sm" data-testid="mockup-rfm-scoring">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="font-semibold">Account Health Scoring</h3>
          <p className="text-xs text-muted-foreground">Metro HVAC Solutions — RFM + Mix</p>
        </div>
        <Badge className="text-xs gap-1" data-testid="badge-health-status">
          <Activity className="h-3 w-3" />
          Healthy
        </Badge>
      </div>

      <div className="space-y-3">
        {mockRFMScores.map((dim, i) => {
          const color = dim.score > 70 ? 'bg-green-500' : dim.score > 40 ? 'bg-amber-500' : 'bg-red-500';
          const textColor = dim.score > 70 ? 'text-green-600 dark:text-green-400' : dim.score > 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
          return (
            <div key={i} className="space-y-1" data-testid={`rfm-dimension-${dim.label.toLowerCase()}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{dim.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{dim.description}</span>
                  <span className={`text-xs font-bold ${textColor}`} data-testid={`text-score-${dim.label.toLowerCase()}`}>{dim.score}</span>
                </div>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${dim.score}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card className="p-2.5">
          <p className="text-[10px] text-muted-foreground">Overall Health</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <p className="text-xs font-bold">73 / 100</p>
          </div>
        </Card>
        <Card className="p-2.5">
          <p className="text-[10px] text-muted-foreground">Growth Signal</p>
          <div className="flex items-center gap-1 mt-0.5">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <p className="text-xs font-semibold text-green-600 dark:text-green-400">Expanding</p>
          </div>
        </Card>
      </div>

      <Card className="p-2.5 bg-amber-500/5 border-amber-500/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          <div>
            <p className="text-[10px] font-semibold">Mix score below target</p>
            <p className="text-[10px] text-muted-foreground">6 categories purchased vs. 12 available — category breadth opportunity detected</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
