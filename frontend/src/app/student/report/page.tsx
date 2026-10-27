"use client";

import { Alert } from "antd";
import { ReportCard } from "@/components/ReportCard";
import { Loading, PageHeader } from "@/components/ui";
import { useApi } from "@/lib/api";
import type { Report } from "@/lib/types";

export default function StudentReport() {
  const { data, error, loading } = useApi<Report>("/student/report");
  return (
    <>
      <PageHeader title="کارنامه من" subtitle="نمرات، ارزشیابی توصیفی و روند پیشرفت تحصیلی — قابل دریافت به صورت PDF" />
      {loading && <Loading />}
      {error && <Alert type="error" title={error} showIcon />}
      {data && <ReportCard report={data} />}
    </>
  );
}
