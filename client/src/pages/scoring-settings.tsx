import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Save,
  RotateCcw,
  HelpCircle,
  Target,
  DollarSign,
  Layers,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Link } from "wouter";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface ScoringWeights {
  id: number;
  name: string;
  gapSizeWeight: number;
  revenuePotentialWeight: number;
  categoryCountWeight: number;
  description: string;
  isActive: boolean;
}

const DEFAULT_WEIGHTS = {
  gapSizeWeight: 40,
  revenuePotentialWeight: 30,
  categoryCountWeight: 30,
};

export default function ScoringSettings() {
  const { toast } = useToast();
  
  const { data: scoringWeights, isLoading } = useQuery<ScoringWeights>({
    queryKey: ["/api/scoring-weights"],
  });

  const [gapSizeWeight, setGapSizeWeight] = useState(DEFAULT_WEIGHTS.gapSizeWeight);
  const [revenuePotentialWeight, setRevenuePotentialWeight] = useState(DEFAULT_WEIGHTS.revenuePotentialWeight);
  const [categoryCountWeight, setCategoryCountWeight] = useState(DEFAULT_WEIGHTS.categoryCountWeight);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (scoringWeights) {
      setGapSizeWeight(scoringWeights.gapSizeWeight);
      setRevenuePotentialWeight(scoringWeights.revenuePotentialWeight);
      setCategoryCountWeight(scoringWeights.categoryCountWeight);
    }
  }, [scoringWeights]);

  const updateMutation = useMutation({
    mutationFn: async (weights: { gapSizeWeight: number; revenuePotentialWeight: number; categoryCountWeight: number }) => {
      return apiRequest("PUT", "/api/scoring-weights", weights);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scoring-weights"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setHasChanges(false);
      toast({
        title: "Scoring weights updated",
        description: "The new weights will be applied to all opportunity score calculations.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update weights",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const total = gapSizeWeight + revenuePotentialWeight + categoryCountWeight;
  const isValidTotal = Math.abs(total - 100) < 0.01;

  const handleWeightChange = (setter: (val: number) => void, value: number) => {
    setter(value);
    setHasChanges(true);
  };

  const handleReset = () => {
    setGapSizeWeight(DEFAULT_WEIGHTS.gapSizeWeight);
    setRevenuePotentialWeight(DEFAULT_WEIGHTS.revenuePotentialWeight);
    setCategoryCountWeight(DEFAULT_WEIGHTS.categoryCountWeight);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!isValidTotal) {
      toast({
        title: "Invalid weights",
        description: "Weights must sum to 100%",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({
      gapSizeWeight,
      revenuePotentialWeight,
      categoryCountWeight,
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto" data-testid="page-scoring-settings">
      <div className="flex items-center gap-4">
        <Link href="/accounts">
          <Button variant="ghost" size="icon" data-testid="button-back-accounts">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scoring Settings</h1>
          <p className="text-muted-foreground">
            Customize how Opportunity Scores are calculated for accounts
          </p>
        </div>
      </div>

      <Alert>
        <HelpCircle className="h-4 w-4" />
        <AlertTitle>How Opportunity Scoring Works</AlertTitle>
        <AlertDescription>
          The Opportunity Score identifies accounts with the highest potential for wallet share capture. 
          It combines three factors with customizable weights that must sum to 100%. 
          Changing these weights will affect which accounts appear as highest priority for enrollment.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Scoring Weights
            {hasChanges && (
              <Badge variant="outline" className="ml-2">Unsaved changes</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Adjust the relative importance of each factor in the opportunity score calculation.
            Weights must sum to exactly 100%.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-chart-5/10">
                  <Target className="h-5 w-5 text-chart-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="font-medium">Gap Size</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground" data-testid="tooltip-gap-size">
                          <HelpCircle className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">Measures how far below the ICP target each account is across categories. Larger gaps indicate more opportunity for growth.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-muted-foreground">How far below ICP targets is this account?</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={[gapSizeWeight]}
                  onValueChange={([val]) => handleWeightChange(setGapSizeWeight, val)}
                  max={100}
                  step={5}
                  className="w-48"
                  data-testid="slider-gap-size"
                />
                <Input
                  type="number"
                  value={gapSizeWeight}
                  onChange={(e) => handleWeightChange(setGapSizeWeight, parseInt(e.target.value) || 0)}
                  className="w-20 text-center"
                  min={0}
                  max={100}
                  data-testid="input-gap-size"
                />
                <span className="text-sm text-muted-foreground w-4">%</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-chart-1/10">
                  <DollarSign className="h-5 w-5 text-chart-1" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="font-medium">Revenue Potential</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground" data-testid="tooltip-revenue-potential">
                          <HelpCircle className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">Based on the account's current revenue and estimated opportunity value. Higher revenue accounts have more potential for incremental gains.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-muted-foreground">Account's potential for incremental revenue</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={[revenuePotentialWeight]}
                  onValueChange={([val]) => handleWeightChange(setRevenuePotentialWeight, val)}
                  max={100}
                  step={5}
                  className="w-48"
                  data-testid="slider-revenue-potential"
                />
                <Input
                  type="number"
                  value={revenuePotentialWeight}
                  onChange={(e) => handleWeightChange(setRevenuePotentialWeight, parseInt(e.target.value) || 0)}
                  className="w-20 text-center"
                  min={0}
                  max={100}
                  data-testid="input-revenue-potential"
                />
                <span className="text-sm text-muted-foreground w-4">%</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-chart-2/10">
                  <Layers className="h-5 w-5 text-chart-2" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="font-medium">Category Count</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground" data-testid="tooltip-category-count">
                          <HelpCircle className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">Number of categories where there's a gap. More gaps across more categories may indicate broader opportunity or engagement issues.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-muted-foreground">Number of categories with gaps</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={[categoryCountWeight]}
                  onValueChange={([val]) => handleWeightChange(setCategoryCountWeight, val)}
                  max={100}
                  step={5}
                  className="w-48"
                  data-testid="slider-category-count"
                />
                <Input
                  type="number"
                  value={categoryCountWeight}
                  onChange={(e) => handleWeightChange(setCategoryCountWeight, parseInt(e.target.value) || 0)}
                  className="w-20 text-center"
                  min={0}
                  max={100}
                  data-testid="input-category-count"
                />
                <span className="text-sm text-muted-foreground w-4">%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              {isValidTotal ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <span className={`font-medium ${isValidTotal ? 'text-green-600' : 'text-destructive'}`}>
                Total: {total}%
              </span>
              {!isValidTotal && (
                <span className="text-sm text-destructive">(must equal 100%)</span>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || !isValidTotal || updateMutation.isPending}
              className="flex-1"
              data-testid="button-save-weights"
            >
              <Save className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={updateMutation.isPending}
              data-testid="button-reset-weights"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scoring Formula</CardTitle>
          <CardDescription>
            The mathematical formula used to calculate the Opportunity Score
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm">
            <p className="mb-2 text-muted-foreground">Opportunity Score =</p>
            <p className="pl-4">
              (Gap Size Score × <span className="text-chart-5 font-bold">{gapSizeWeight}%</span>) +
            </p>
            <p className="pl-4">
              (Revenue Potential Score × <span className="text-chart-1 font-bold">{revenuePotentialWeight}%</span>) +
            </p>
            <p className="pl-4">
              (Category Count Score × <span className="text-chart-2 font-bold">{categoryCountWeight}%</span>)
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Each component score is normalized to a 0-100 scale before applying weights. 
            The final score ranges from 0-100, with higher scores indicating greater opportunity.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
