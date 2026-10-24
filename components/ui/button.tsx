import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium cursor-pointer transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-white text-zinc-950 hover:bg-zinc-200 shadow-md font-semibold border border-white/20 hover:shadow-lg dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white",
        destructive:
          "bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 hover:text-rose-200",
        outline:
          "border border-white/15 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800/80 hover:text-white hover:border-white/30 shadow-xs backdrop-blur-sm",
        secondary:
          "bg-zinc-800/90 text-zinc-200 border border-zinc-700/60 hover:bg-zinc-700 hover:text-white shadow-xs",
        ghost:
          "text-zinc-400 hover:text-zinc-100 hover:bg-white/10",
        link: "text-zinc-200 underline-offset-4 hover:underline hover:text-white",
      },
      size: {
        default: "h-10 rounded-xl px-4 py-2 text-sm has-[>svg]:px-3.5",
        sm: "h-8 rounded-lg gap-1.5 px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-12 rounded-xl px-6 text-base font-semibold has-[>svg]:px-5",
        icon: "size-10 rounded-xl",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
