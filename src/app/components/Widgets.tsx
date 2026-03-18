import { ReactNode } from "react";
import { clsx } from "clsx";

export function MetricCard({
  title,
  value,
  unit,
  trend,
  trendValue,
  icon: Icon,
  status = "normal",
  className,
}: {
  title: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: any;
  status?: "normal" | "warning" | "error" | "success" | "info";
  className?: string;
}) {
  const statusColors = {
    normal: "text-slate-400 bg-slate-800",
    success: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    error: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    info: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  };

  const trendColors = {
    up: "text-emerald-400",
    down: "text-rose-400",
    neutral: "text-slate-500",
  };

  const trendSymbols = {
    up: "↑",
    down: "↓",
    neutral: "→",
  };

  return (
    <div
      className={clsx(
        "rounded-lg border border-slate-800 bg-slate-900/40 p-5 shadow-md flex flex-col justify-between hover:bg-slate-800/40 transition-colors cursor-default",
        status !== "normal" && "border" && statusColors[status],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            {title}
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-mono font-medium text-slate-100 tracking-tight">
              {value}
            </span>
            {unit && <span className="text-sm font-mono text-slate-500">{unit}</span>}
          </div>
        </div>
        {Icon && (
          <div
            className={clsx(
              "p-2 rounded-md border",
              statusColors[status]
            )}
          >
            <Icon size={16} strokeWidth={2.5} />
          </div>
        )}
      </div>

      {(trendValue || trend) && (
        <div className="mt-4 flex items-center gap-1.5 text-xs font-mono">
          {trend && (
            <span className={clsx("font-bold", trendColors[trend])}>
              {trendSymbols[trend]}
            </span>
          )}
          {trendValue && (
            <span className="text-slate-400">{trendValue}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function StatusBadge({
  status,
  children,
  className,
}: {
  status: "success" | "warning" | "error" | "info" | "neutral";
  children: ReactNode;
  className?: string;
}) {
  const styles = {
    success: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    error: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    info: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    neutral: "text-slate-400 bg-slate-800 border-slate-700",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest border",
        styles[status],
        className
      )}
    >
      {status !== "neutral" && (
        <span
          className={clsx(
            "h-1.5 w-1.5 rounded-full",
            status === "success" && "bg-emerald-400 animate-pulse",
            status === "warning" && "bg-amber-400",
            status === "error" && "bg-rose-400 animate-pulse",
            status === "info" && "bg-cyan-400"
          )}
        ></span>
      )}
      {children}
    </span>
  );
}
