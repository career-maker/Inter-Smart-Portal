"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-xl p-1 text-slate-600 dark:text-slate-400 group-data-horizontal/tabs:h-10 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-2px)] flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
        // Inactive states
        "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60",
        // Active states (Base UI data-selected + aria-selected + data-active)
        "data-selected:bg-white data-selected:text-slate-900 data-selected:shadow-xs data-selected:border-slate-200/60",
        "aria-selected:bg-white aria-selected:text-slate-900 aria-selected:shadow-xs aria-selected:border-slate-200/60",
        "data-active:bg-white data-active:text-slate-900 data-active:shadow-xs",
        "data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs",
        "dark:data-selected:bg-slate-700 dark:data-selected:text-white dark:data-selected:border-slate-600",
        "dark:aria-selected:bg-slate-700 dark:aria-selected:text-white dark:aria-selected:border-slate-600",
        "dark:data-active:bg-slate-700 dark:data-active:text-white",
        "dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-white",
        // Focus states
        "focus-visible:ring-2 focus-visible:ring-[#56348f]/40 focus-visible:outline-none",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
