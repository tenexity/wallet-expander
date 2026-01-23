import { cn } from "@/lib/utils";

interface ProgressRingProps {
  value: number;
  maxValue?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  testId?: string;
}

export function ProgressRing({
  value,
  maxValue = 100,
  size = 60,
  strokeWidth = 6,
  className,
  showLabel = true,
  testId,
}: ProgressRingProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  let strokeColor = "hsl(var(--chart-1))";
  if (percentage >= 75) {
    strokeColor = "hsl(var(--chart-2))";
  } else if (percentage >= 50) {
    strokeColor = "hsl(var(--chart-3))";
  } else if (percentage < 25) {
    strokeColor = "hsl(var(--chart-5))";
  }

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      data-testid={testId}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {showLabel && (
        <span className="absolute text-xs font-semibold">
          {percentage.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
