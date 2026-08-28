import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 px-3.5 py-2 text-sm text-slate-900 dark:text-white transition-colors outline-none placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-[#56348f] focus:ring-2 focus:ring-[#56348f]/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:text-slate-500",
        className
      )}
      {...props}
    />
  )
}

export { Input }
