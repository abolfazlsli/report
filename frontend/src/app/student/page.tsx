"use client";

import { Alert } from "antd";
import { ReportCard } from "@/components/ReportCard";
import { Loading, PageHeader } from "@/components/ui";
import { useApi } from "@/lib/api";
import type { Report } from "@/lib/types";

export default function StudentHome() {
  const { data, error, loading } = useApi<Report>("/student/report");
  return (
    <>
      <PageHeader title="کارنامه من" subtitle="نمرات ثبت‌شده و روند پیشرفت تحصیلی شما" />
      {loading && <Loading />}
      {error && <Alert type="error" title={error} showIcon />}
      {data && <ReportCard report={data} />}
    </>
  );
}
