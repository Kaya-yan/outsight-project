import { Badge } from "@/components/ui/badge";
import { ARTICLE_STATUS_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "default";
}

export function StatusBadge({ status, size = "default" }: StatusBadgeProps) {
  const colorClass = ARTICLE_STATUS_COLORS[status] ?? "text-muted bg-muted";
  return (
    <Badge
      className={cn(
        "font-normal",
        size === "sm" ? "text-[10px] px-1.5 h-4" : "text-xs",
        colorClass,
      )}
    >
      {status}
    </Badge>
  );
}
