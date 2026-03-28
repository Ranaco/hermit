import * as React from "react"

import { cn } from "@/lib/utils"

const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "secondary" | "destructive" | "outline"
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variantStyles = {
    default: "border-transparent bg-secondary text-secondary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
    secondary: "border-transparent bg-muted text-secondary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
    destructive: "border-transparent bg-destructive/10 text-destructive",
    outline: "border-border bg-background/40 text-foreground",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.08em] uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
})
Badge.displayName = "Badge"

export { Badge }
