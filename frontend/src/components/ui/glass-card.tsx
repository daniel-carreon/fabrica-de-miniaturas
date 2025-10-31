import * as React from "react";
import { cn } from "@/lib/utils";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "purple" | "dark";
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "dark", children, ...props }, ref) => {
    // 🎨 Esquema minimalista: Negro sólido con toques morados sutiles
    const variants = {
      default: "bg-neutral-900/95 border-neutral-700/30",
      purple: "bg-neutral-900/95 border-purple-500/20",
      dark: "bg-neutral-950/98 border-neutral-800/25"
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-lg border backdrop-blur-sm shadow-xl",
          "transition-all duration-200 hover:shadow-2xl hover:border-opacity-40",
          variants[variant],
          className
        )}
        {...props}
      >
        {/* Toque morado MUY sutil - apenas visible */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-purple-500/[0.02] to-transparent pointer-events-none" />
        <div className="relative z-10 p-6">
          {children}
        </div>
      </div>
    );
  }
);

GlassCard.displayName = "GlassCard";

export default GlassCard;