import * as React from "react";

/** Title 22/28, one-line description, one primary action on the right. No icon tile. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-[22px] leading-7 font-semibold text-slate-900">{title}</h1>
        {description && <p className="text-sm leading-5 text-slate-500 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
