"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { faDate, faNum, faShortDate } from "@/lib/format";

const MAX_SLOTS = 8;

/** Fixed categorical slot for the i-th entity (never cycled; overflow goes gray). */
export function seriesColor(index: number) {
  return index < MAX_SLOTS ? `var(--series-${index + 1})` : "var(--muted)";
}

export interface TrendSeries {
  key: string;
  name: string;
  color: string;
  points: { date: string; value: number; title: string | null }[];
}

const axisTick = { fill: "var(--muted)", fontSize: 11 };
const Y_TICKS = [0, 5, 10, 15, 20];

function TooltipBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      dir="rtl"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        color: "var(--ink-2)",
        boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
      }}
    >
      {children}
    </div>
  );
}

/** Score-over-time line chart, one line per subject, y fixed to 0..20. */
export function TrendChart({ series, height = 280 }: { series: TrendSeries[]; height?: number }) {
  const byDate = new Map<string, Record<string, number | string>>();
  const titles = new Map<string, string>();
  for (const s of series) {
    for (const p of s.points) {
      const row = byDate.get(p.date) ?? { date: p.date };
      row[s.key] = p.value; // same subject twice on one day: last one wins
      byDate.set(p.date, row);
      if (p.title) titles.set(`${s.key}|${p.date}`, p.title);
    }
  }
  const data = [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return (
    <div dir="ltr" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 4, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis
            dataKey="date"
            reversed
            tickFormatter={faShortDate}
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: "var(--axis)" }}
            minTickGap={24}
          />
          <YAxis
            orientation="right"
            domain={[0, 20]}
            ticks={Y_TICKS}
            tickFormatter={(v) => faNum(v)}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            cursor={{ stroke: "var(--axis)", strokeWidth: 1 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox>
                  <div className="mb-1 font-medium text-ink">{faDate(String(label))}</div>
                  {payload.map((p) => (
                    <div key={String(p.dataKey)} className="flex items-center gap-2 text-ink-2">
                      <span className="size-2 rounded-full" style={{ background: p.color }} />
                      <span>{p.name}</span>
                      {titles.get(`${p.dataKey}|${label}`) && (
                        <span className="text-muted">({titles.get(`${p.dataKey}|${label}`)})</span>
                      )}
                      <span className="tabular ms-auto ps-3 font-semibold text-ink">{faNum(Number(p.value))}</span>
                    </div>
                  ))}
                </TooltipBox>
              ) : null
            }
          />
          {series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              name={s.name}
              type="monotone"
              stroke={s.color}
              strokeWidth={2}
              connectNulls
              dot={{ r: 4, fill: s.color, stroke: "var(--surface)", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: s.color, stroke: "var(--surface)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Legend({ items }: { items: { key: string; name: string; color: string }[] }) {
  if (items.length < 2) return null;
  return (
    <ul style={{ listStyle: "none", margin: "0 0 12px", padding: 0, display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 12, color: "var(--ink-2)" }}>
      {items.map((i) => (
        <li key={i.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 16, height: 2, borderRadius: 2, background: i.color }} />
          {i.name}
        </li>
      ))}
    </ul>
  );
}

/** Average per academic period, single series. */
export function AverageBars({
  data,
  height = 220,
}: {
  data: { label: string; sub: string; value: number | null }[];
  height?: number;
}) {
  const rows = data.map((d) => ({ ...d, value: d.value ?? 0, missing: d.value === null }));
  return (
    <div dir="ltr" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 20, right: 4, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis
            dataKey="label"
            reversed
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: "var(--axis)" }}
          />
          <YAxis
            orientation="right"
            domain={[0, 20]}
            ticks={Y_TICKS}
            tickFormatter={(v) => faNum(v)}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as (typeof rows)[number] | undefined;
              return active && row ? (
                <TooltipBox>
                  <div className="font-medium text-ink">{row.label}</div>
                  <div className="text-muted">{row.sub}</div>
                  <div className="mt-1 text-ink-2">
                    معدل: <span className="tabular font-semibold text-ink">{row.missing ? "—" : faNum(row.value)}</span>
                  </div>
                </TooltipBox>
              ) : null;
            }}
          />
          <Bar dataKey="value" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
            <LabelList
              dataKey="value"
              position="top"
              formatter={(v: unknown) => (Number(v) ? faNum(Number(v)) : "")}
              style={{ fill: "var(--ink-2)", fontSize: 11 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Two measures on the same 0..20 scale, side by side per category (e.g. me vs class). */
export function CompareBars({
  data,
  series,
  height = 260,
  max = 20,
}: {
  data: Record<string, string | number | null>[];
  series: { key: string; name: string; color: string }[];
  height?: number;
  max?: number;
}) {
  const ticks = max === 20 ? Y_TICKS : [0, 1, 2, 3, 4, 5];
  return (
    <>
      <Legend items={series} />
      <div dir="ltr" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 4, left: 4 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="label" reversed tick={axisTick} tickLine={false} axisLine={{ stroke: "var(--axis)" }} interval={0} />
            <YAxis
              orientation="right"
              domain={[0, max]}
              ticks={ticks}
              tickFormatter={(v) => faNum(v)}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipBox>
                    <div className="mb-1 font-medium text-ink">{String(label)}</div>
                    {payload.map((p) => (
                      <div key={String(p.dataKey)} className="flex items-center gap-2 text-ink-2">
                        <span className="size-2 rounded-full" style={{ background: p.color }} />
                        <span>{p.name}</span>
                        <span className="tabular ms-auto ps-3 font-semibold text-ink">
                          {p.value === null || p.value === undefined ? "—" : faNum(Number(p.value))}
                        </span>
                      </div>
                    ))}
                  </TooltipBox>
                ) : null
              }
            />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

/** Horizontal share bar for status levels; every segment carries its label and count. */
export function LevelBar({ items }: { items: { key: string; label: string; value: number; color: string }[] }) {
  const total = items.reduce((n, i) => n + i.value, 0);
  if (!total) return null;
  return (
    <div>
      <div style={{ display: "flex", gap: 2, height: 14, borderRadius: 7, overflow: "hidden" }} role="img" aria-label="توزیع سطح نمرات">
        {items
          .filter((i) => i.value)
          .map((i) => (
            <div key={i.key} title={`${i.label}: ${faNum(i.value)}`} style={{ flex: i.value, background: i.color }} />
          ))}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 }}>
        {items.map((i) => (
          <li key={i.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-2)" }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: i.color }} />
            {i.label}
            <span className="tabular" style={{ marginInlineStart: "auto", color: "var(--ink)", fontWeight: 600 }}>
              {faNum(i.value)}
              <span style={{ color: "var(--muted)", fontWeight: 400 }}> ({faNum(Math.round((i.value / total) * 100))}٪)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
