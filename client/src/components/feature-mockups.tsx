import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
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
