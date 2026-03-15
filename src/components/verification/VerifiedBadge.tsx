import { CheckCircle, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  size?: "sm" | "md";
  variant?: "standard" | "elite";
}

export function VerifiedBadge({ className, size = "sm", variant = "standard" }: Props) {
  if (variant === "elite") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 font-semibold bg-gradient-to-r from-blue-500/15 to-indigo-500/15 border border-blue-400/30 rounded-full text-blue-400",
          size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
          className
        )}
      >
        <Shield className={cn("fill-blue-400/30", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
        Vérifié
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        className
      )}
    >
      <CheckCircle className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      Verified Pro
    </span>
  );
}
