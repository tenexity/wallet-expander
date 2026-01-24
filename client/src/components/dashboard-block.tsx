import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical } from "lucide-react";
import type { DraggableProvided } from "@hello-pangea/dnd";

interface DashboardBlockProps {
  id: string;
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  headerTooltip?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  provided: DraggableProvided;
  isDragging?: boolean;
  testId?: string;
}

export function DashboardBlock({
  id,
  title,
  subtitle,
  headerAction,
  headerTooltip,
  children,
  className = "",
  provided,
  isDragging,
  testId,
}: DashboardBlockProps) {
  return (
    <Card
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={`${className} ${isDragging ? "ring-2 ring-primary shadow-lg" : ""}`}
      data-testid={testId || `dashboard-block-${id}`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            {...provided.dragHandleProps}
            className="flex items-center justify-center h-8 w-8 rounded-md cursor-grab active:cursor-grabbing hover-elevate text-muted-foreground hover:text-foreground"
            data-testid={`drag-handle-${id}`}
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{title}</CardTitle>
              {headerTooltip}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {headerAction}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
