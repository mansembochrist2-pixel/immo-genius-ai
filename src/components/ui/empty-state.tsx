import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  variant?: "default" | "ai-credits";
}

/**
 * Illustrated empty-state component.
 * Use everywhere a list/grid has zero items, or when a feature is gracefully unavailable.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  variant = "default",
}: EmptyStateProps) {
  const isCredits = variant === "ai-credits";

  return (
    <Card className={cn("bg-card/60 border-border/30", className)}>
      <CardContent className="py-12 px-6 text-center space-y-4">
        <div
          className={cn(
            "h-16 w-16 rounded-2xl mx-auto flex items-center justify-center",
            isCredits ? "bg-accent/10" : "bg-primary/5",
          )}
        >
          <Icon
            className={cn(
              "h-8 w-8",
              isCredits ? "text-accent" : "text-primary/70",
            )}
          />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actionLabel && onAction && (
          <Button size="sm" variant={isCredits ? "default" : "outline"} onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
