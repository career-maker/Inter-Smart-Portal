import * as React from "react";

/** Use once inside a card when the whole list is empty. Never per row. */
export function EmptyState({
  icon,
  text,
  action,
}: {
  icon?: React.ReactNode;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-500">
      {icon && <div className="h-8 w-8 text-slate-400 [&>svg]:h-8 [&>svg]:w-8">{icon}</div>}
      <p className="text-sm">{text}</p>
      {action}
    </div>
  );
}
