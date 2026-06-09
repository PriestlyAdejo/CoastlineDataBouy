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
    normal: "dash-text-secondary",
    success: "text-[var(--dash-success)] border-[var(--dash-success)]",
    warning: "text-[var(--dash-warning)] border-[var(--dash-warning)]",
    error: "text-[var(--dash-error)] border-[var(--dash-error)]",
    info: "text-[var(--dash-accent)] border-[var(--dash-accent)]",
  };

  const trendColors = {
    up: "text-[var(--dash-success)]",
    down: "text-[var(--dash-error)]",
    neutral: "dash-text-faint",
  };

  const trendSymbols = {
    up: "↑",
    down: "↓",
    neutral: "→",
  };

  return (
    <div
      className={clsx(
        "rounded-lg border p-5 shadow-md flex flex-col justify-between transition-colors cursor-default",
        status !== "normal" && "border" && statusColors[status],
        className,
      )}
      style={{
        backgroundColor: "var(--dash-panel-bg)",
        borderColor: status === "normal" ? "var(--dash-panel-border)" : undefined,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold dash-text-secondary uppercase tracking-widest">
            {title}
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-mono font-medium dash-text-primary tracking-tight">
              {value}
            </span>
            {unit && <span className="text-sm font-mono dash-text-faint">{unit}</span>}
          </div>
        </div>
        {Icon && (
          <div className={clsx("p-2 rounded-md border", statusColors[status])}>
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
          {trendValue && <span className="dash-text-secondary">{trendValue}</span>}
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
    success: "text-[var(--dash-success)] bg-[var(--dash-success-bg)] border-[var(--dash-success)]",
    warning: "text-[var(--dash-warning)] bg-[var(--dash-warning-bg)] border-[var(--dash-warning)]",
    error: "text-[var(--dash-error)] bg-[var(--dash-error-bg)] border-[var(--dash-error)]",
    info: "text-[var(--dash-accent)] bg-[var(--dash-accent-bg)] border-[var(--dash-accent)]",
    neutral: "text-[var(--dash-badge-neutral-text)] bg-[var(--dash-badge-neutral-bg)] border-[var(--dash-panel-border)]",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest border",
        styles[status],
        className,
      )}
    >
      {status !== "neutral" && (
        <span
          className={clsx(
            "h-1.5 w-1.5 rounded-full",
            status === "success" && "bg-[var(--dash-success)] animate-pulse",
            status === "warning" && "bg-[var(--dash-warning)]",
            status === "error" && "bg-[var(--dash-error)] animate-pulse",
            status === "info" && "bg-[var(--dash-accent)]",
          )}
        />
      )}
      {children}
    </span>
  );
}
