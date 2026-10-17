"use client";

import { Alert, Button } from "antd";
import { useParams, useRouter } from "next/navigation";
import { ReportCard } from "@/components/ReportCard";
import { Loading, PageHeader } from "@/components/ui";
import { useApi } from "@/lib/api";
import type { Report } from "@/lib/types";

export default function TeacherStudentReport() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, error, loading } = useApi<Report>(`/teacher/students/${id}/report`);
  return (
    <>
      <Button type="link" onClick={() => router.back()} style={{ padding: 0, height: "auto", fontSize: 12 }}>
        → بازگشت
      </Button>
      <PageHeader title={data ? `کارنامه ${data.student.full_name}` : "کارنامه دانش‌آموز"} />
      {loading && <Loading />}
      {error && <Alert type="error" title={error} showIcon />}
      {data && <ReportCard report={data} />}
    </>
  );
}
