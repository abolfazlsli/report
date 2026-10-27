"use client";

import { App, Badge, Card, Flex, Spin, Typography } from "antd";
import Link from "next/link";
import { useCallback } from "react";
import { faNum, RATING, ratingLevel, scoreLevel, type Level } from "@/lib/format";

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      {back && (
        <Link href={back.href} style={{ fontSize: 12, display: "inline-block", marginBottom: 6 }}>
          → {back.label}
        </Link>
      )}
      <Flex justify="space-between" align="flex-end" wrap gap={12}>
        <div>
          <Typography.Title level={3} style={{ margin: 0, fontWeight: 800 }}>
            {title}
          </Typography.Title>
          {subtitle && (
            <Typography.Text type="secondary" style={{ display: "block", marginTop: 4 }}>
              {subtitle}
            </Typography.Text>
          )}
        </div>
        {actions && (
          <Flex gap={8} wrap>
            {actions}
          </Flex>
        )}
      </Flex>
    </div>
  );
}

/** Gradient banner at the top of a dashboard. */
export function Hero({
  title,
  subtitle,
  chips,
  extra,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  chips?: React.ReactNode[];
  extra?: React.ReactNode;
}) {
  return (
    <div className="hero" style={{ marginBottom: 20 }}>
      <Flex justify="space-between" align="center" wrap gap={16} style={{ position: "relative", zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.5 }}>{title}</div>
          {subtitle && <div style={{ opacity: 0.85, marginTop: 4 }}>{subtitle}</div>}
          {chips && chips.length > 0 && (
            <Flex wrap gap={8} style={{ marginTop: 14 }}>
              {chips.map((c, i) => (
                <span key={i} className="hero-chip">
                  {c}
                </span>
              ))}
            </Flex>
          )}
        </div>
        {extra}
      </Flex>
    </div>
  );
}

const BADGE_STATUS: Record<Level, "success" | "processing" | "warning" | "error"> = {
  good: "success",
  ok: "processing",
  warning: "warning",
  critical: "error",
};

/** A score with its descriptive level: status dot + text label (never color alone). */
export function ScoreValue({ value, showLabel = true }: { value: number | null; showLabel?: boolean }) {
  if (value === null || value === undefined) return <Typography.Text type="secondary">—</Typography.Text>;
  const { level, label } = scoreLevel(value);
  return (
    <span style={{ whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 8 }}>
      <strong className="tabular">{faNum(value)}</strong>
      {showLabel && (
        <Badge
          status={BADGE_STATUS[level]}
          text={<Typography.Text type="secondary" style={{ fontSize: 12 }}>{label}</Typography.Text>}
        />
      )}
    </span>
  );
}

const LEVEL_COLOR: Record<Level, string> = {
  good: "var(--good)",
  ok: "var(--ok)",
  warning: "var(--warning)",
  critical: "var(--critical)",
};

/** Five-step meter for a 1..5 descriptive rating, with its label. */
export function RatingValue({ value, showLabel = true, compact = false }: { value: number | null | undefined; showLabel?: boolean; compact?: boolean }) {
  if (value === null || value === undefined) return <Typography.Text type="secondary">ثبت نشده</Typography.Text>;
  const rounded = Math.round(value);
  const color = LEVEL_COLOR[ratingLevel(value)];
  return (
    <span style={{ whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span className="rating-dots" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} style={i <= rounded ? { background: color } : undefined} />
        ))}
      </span>
      {!compact && <strong className="tabular">{faNum(value, 1)}</strong>}
      {showLabel && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {RATING[rounded as 1 | 2 | 3 | 4 | 5]}
        </Typography.Text>
      )}
    </span>
  );
}

export function StatCard({
  title,
  value,
  href,
  suffix,
  icon,
  tone = "indigo",
  hint,
}: {
  title: string;
  value: React.ReactNode;
  href?: string;
  suffix?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "indigo" | "green" | "orange" | "pink" | "blue" | "violet";
  hint?: React.ReactNode;
}) {
  const card = (
    <Card className={`soft${href ? " lift" : ""}`} style={{ height: "100%" }} styles={{ body: { padding: 18 } }}>
      <Flex gap={14} align="center">
        {icon && (
          <span className="stat-icon" style={TONES[tone]}>
            {icon}
          </span>
        )}
        <div style={{ minWidth: 0 }}>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {title}
          </Typography.Text>
          <div style={{ fontSize: typeof value === "number" ? 24 : 16, fontWeight: 800, lineHeight: 1.4 }} className="tabular">
            {typeof value === "number" ? faNum(value) : value}
            {suffix && <span style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)", marginInlineStart: 4 }}>{suffix}</span>}
          </div>
          {hint && <div style={{ fontSize: 12, color: "var(--muted)" }}>{hint}</div>}
        </div>
      </Flex>
    </Card>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

const TONES: Record<string, React.CSSProperties> = {
  indigo: { background: "rgba(99,102,241,0.12)", color: "#6366f1" },
  green: { background: "rgba(16,185,129,0.12)", color: "#10b981" },
  orange: { background: "rgba(249,115,22,0.12)", color: "#f97316" },
  pink: { background: "rgba(236,72,153,0.12)", color: "#ec4899" },
  blue: { background: "rgba(59,130,246,0.12)", color: "#3b82f6" },
  violet: { background: "rgba(139,92,246,0.12)", color: "#8b5cf6" },
};

export function Loading() {
  return (
    <Flex justify="center" style={{ padding: 48 }}>
      <Spin />
    </Flex>
  );
}

/**
 * Run an API action and report the outcome with antd's message toast.
 * Resolves to true on success.
 */
export function useAction() {
  const { message } = App.useApp();
  return useCallback(
    async (fn: () => Promise<unknown>, success?: string) => {
      try {
        await fn();
        if (success) message.success(success);
        return true;
      } catch (e) {
        message.error((e as Error).message);
        return false;
      }
    },
    [message],
  );
}
