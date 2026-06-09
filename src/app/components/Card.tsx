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
        "rounded-xl border dash-panel-bg dash-border shadow-lg relative overflow-hidden flex flex-col",
        className,
      )}
      style={{
        backgroundColor: "var(--dash-panel-bg)",
        borderColor: "var(--dash-panel-border)",
      }}
    >
      <div
        className="absolute top-0 left-0 w-full h-px"
        style={{ background: "linear-gradient(to right, transparent, color-mix(in srgb, var(--dash-accent) 30%, transparent), transparent)" }}
      />
      {title && (
        <div
          className="flex items-center justify-between border-b px-5 py-4 shrink-0"
          style={{ borderColor: "var(--dash-panel-border)" }}
        >
          <h3 className="text-sm font-semibold tracking-wide dash-text-primary uppercase flex items-center gap-2">
            {title}
          </h3>
          {action && <div className="dash-text-secondary text-sm">{action}</div>}
        </div>
      )}
      <div className="p-5 flex-1 flex flex-col">{children}</div>
    </div>
  );
}
