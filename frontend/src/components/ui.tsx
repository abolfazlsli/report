"use client";

import { App, Badge, Card, Flex, Spin, Statistic, Typography } from "antd";
import Link from "next/link";
import { useCallback } from "react";
import { faNum, scoreLevel, type Level } from "@/lib/format";

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
    <div style={{ marginBottom: 20 }}>
      {back && (
        <Link href={back.href} style={{ fontSize: 12 }}>
          → {back.label}
        </Link>
      )}
      <Flex justify="space-between" align="flex-end" wrap gap={12}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {title}
          </Typography.Title>
          {subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}
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

export function StatCard({
  title,
  value,
  href,
  suffix,
}: {
  title: string;
  value: React.ReactNode;
  href?: string;
  suffix?: React.ReactNode;
}) {
  const card = (
    <Card size="small" hoverable={!!href} style={{ height: "100%" }}>
      {typeof value === "number" ? (
        <Statistic title={title} value={value} formatter={(v) => faNum(Number(v))} suffix={suffix} />
      ) : (
        <>
          <Typography.Text type="secondary" style={{ fontSize: 14 }}>
            {title}
          </Typography.Text>
          <div style={{ marginTop: 4, fontSize: 18, fontWeight: 600 }}>{value}</div>
        </>
      )}
    </Card>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

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
