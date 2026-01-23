import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  maxScore?: number;
  showLabel?: boolean;
  size?: "sm" | "default";
  testId?: string;
}

export function ScoreBadge({
  score,
  maxScore = 100,
  showLabel = true,
  size = "default",
  testId,
}: ScoreBadgeProps) {
  const percentage = (score / maxScore) * 100;

  let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  let label = "Low";

  if (percentage >= 75) {
    variant = "default";
    label = "High";
  } else if (percentage >= 50) {
    variant = "secondary";
    label = "Medium";
  } else if (percentage >= 25) {
    variant = "outline";
    label = "Low";
  } else {
    variant = "destructive";
    label = "Critical";
  }

  return (
    <Badge
      variant={variant}
      className={cn(
        size === "sm" && "text-xs px-1.5 py-0"
      )}
      data-testid={testId}
    >
      {score.toFixed(0)}
      {showLabel && ` - ${label}`}
    </Badge>
  );
}
