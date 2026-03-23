import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-28 w-full max-w-full resize-y rounded-[14px] border border-input/85 bg-background/92 px-3.5 py-3 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] placeholder:text-muted-foreground/90 transition-[border-color,box-shadow,background-color] whitespace-pre-wrap break-words outline-none focus-visible:border-ring focus-visible:bg-background focus-visible:ring-0 focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-ring)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
