import { clsx } from "clsx";
import { ReactNode } from "react";

export function Card({
  title,
  children,
  action,
  className,
}: {
  title?: string | ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl shadow-lg relative overflow-hidden flex flex-col",
        className
      )}
    >
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
      {title && (
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 shrink-0">
          <h3 className="text-sm font-semibold tracking-wide text-slate-100 uppercase flex items-center gap-2">
            {title}
          </h3>
          {action && <div className="text-slate-400 text-sm">{action}</div>}
        </div>
      )}
      <div className="p-5 flex-1 flex flex-col">{children}</div>
    </div>
  );
}
