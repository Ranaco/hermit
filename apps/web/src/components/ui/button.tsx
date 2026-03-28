import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] border text-sm font-medium ring-offset-background transition-[color,background-color,border-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-ring)_18%,transparent)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-primary/80 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-primary)_88%,white_12%)_0%,var(--color-primary)_100%)] text-primary-foreground shadow-[0_18px_34px_-20px_color-mix(in_oklab,var(--color-primary)_62%,transparent)] hover:-translate-y-px hover:brightness-[1.02]",
        destructive:
          "border-destructive bg-destructive text-primary-foreground shadow-[0_16px_30px_-18px_rgba(220,38,38,0.45)] hover:-translate-y-px hover:opacity-95",
        outline:
          "border-border/85 bg-background/78 text-foreground shadow-[0_12px_28px_-22px_rgba(39,28,17,0.26)] hover:bg-muted/72",
        secondary: "border-border/70 bg-secondary/88 text-secondary-foreground shadow-[0_12px_28px_-22px_rgba(39,28,17,0.22)] hover:bg-muted/82",
        ghost: "border-transparent bg-transparent text-foreground hover:bg-muted/72",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-[12px] px-3.5 text-xs",
        lg: "h-11 rounded-[16px] px-6 text-base",
        icon: "h-10 w-10 rounded-[14px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, size, className }))} />
      )
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
