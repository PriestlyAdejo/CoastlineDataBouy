/** Recharts props derived from explicit dashboard CSS tokens (not OS colour scheme). */

function cssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function chartColors() {
  return {
    grid: cssVar("--chart-grid", cssVar("--dash-chart-grid", "#334155")),
    axis: cssVar("--chart-axis", cssVar("--dash-chart-axis", "#64748b")),
    label: cssVar("--chart-label", cssVar("--dash-chart-label", "#cbd5e1")),
    tooltipBg: cssVar("--dash-chart-tooltip-bg", "#1e293b"),
    tooltipBorder: cssVar("--dash-chart-tooltip-border", "#475569"),
    accent: cssVar("--accent", cssVar("--dash-accent", "#22d3ee")),
  };
}

export function cartesianGridProps() {
  const c = chartColors();
  return { strokeDasharray: "3 3" as const, stroke: c.grid, vertical: false };
}

export function xAxisProps(extra?: Record<string, unknown>) {
  const c = chartColors();
  return {
    stroke: c.axis,
    tick: { fill: c.label, fontSize: 11 },
    tickLine: false,
    axisLine: false,
    ...extra,
  };
}

export function yAxisProps(extra?: Record<string, unknown>) {
  const c = chartColors();
  return {
    stroke: c.axis,
    tick: { fill: c.label, fontSize: 11 },
    tickLine: false,
    axisLine: false,
    ...extra,
  };
}

export function chartTooltipStyle() {
  const c = chartColors();
  return {
    contentStyle: {
      backgroundColor: c.tooltipBg,
      border: `1px solid ${c.tooltipBorder}`,
      borderRadius: "6px",
      fontSize: "12px",
      color: c.label,
    },
    labelStyle: { color: c.label },
    itemStyle: { color: c.label },
  };
}

export function chartLegendStyle() {
  const c = chartColors();
  return { wrapperStyle: { fontSize: "12px", color: c.label } };
}
