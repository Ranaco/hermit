import * as React from "react"

import { cn } from "@/lib/utils"

const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "secondary" | "destructive" | "outline"
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variantStyles = {
    default: "border-transparent bg-secondary text-secondary-foreground",
    secondary: "border-transparent bg-muted text-secondary-foreground",
    destructive: "border-transparent bg-destructive/10 text-destructive",
    outline: "border-border bg-transparent text-foreground",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
})
Badge.displayName = "Badge"

export { Badge }
