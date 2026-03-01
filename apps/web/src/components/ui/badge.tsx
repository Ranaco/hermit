import * as React from "react"

import { cn } from "@/lib/utils"

const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "secondary" | "destructive" | "outline"
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variantStyles = {
    default: "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-black/5 dark:bg-white/10 text-secondary-foreground border-black/5 dark:border-white/5 backdrop-blur-md",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    outline: "border-black/10 dark:border-white/10 text-foreground",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center border rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
})
Badge.displayName = "Badge"

export { Badge }
