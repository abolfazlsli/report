"use client";

import { Select } from "antd";
import { useState } from "react";
import { useApi } from "@/lib/api";
import { ltr } from "@/lib/format";
import type { Report, ReportEnrollment } from "@/lib/types";

export const periodLabel = (e: ReportEnrollment) => `پایه ${e.grade_name} - کلاس ${e.class_name} (${ltr(e.year_name)})`;

/** The signed-in student's report, with a selectable period (defaults to the active one). */
export function useMyReport() {
  const api = useApi<Report>("/student/report");
  const enrollments = api.data?.enrollments ?? [];
  const [picked, setPicked] = useState<number | null>(null);
  const fallback = enrollments.find((e) => e.status === "active") ?? enrollments.at(-1);
  const period = enrollments.find((e) => e.enrollment_id === picked) ?? fallback ?? null;
  return { ...api, period, setPeriod: setPicked };
}

export function PeriodSelect({
  report,
  value,
  onChange,
}: {
  report: Report;
  value: ReportEnrollment;
  onChange: (id: number) => void;
}) {
  if (report.enrollments.length < 2) return null;
  return (
    <Select
      value={value.enrollment_id}
      onChange={onChange}
      options={report.enrollments.map((e) => ({ value: e.enrollment_id, label: periodLabel(e) }))}
      style={{ minWidth: 260 }}
      aria-label="دوره تحصیلی"
    />
  );
}
