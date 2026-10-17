"use client";

import { Alert } from "antd";
import { useParams } from "next/navigation";
import { ScoreSheet } from "@/components/ScoreSheet";
import { Loading, PageHeader } from "@/components/ui";
import { useApi } from "@/lib/api";
import { ltr } from "@/lib/format";
import type { Sheet } from "@/lib/types";

export default function AssignmentPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading, reload } = useApi<Sheet>(`/teacher/assignments/${id}`);

  return (
    <>
      {loading && !data && <Loading />}
      {error && <Alert type="error" title={error} showIcon />}
      {data && (
        <>
          <PageHeader
            back={{ href: "/teacher", label: "کلاس‌های من" }}
            title={`${data.subject_name} — پایه ${data.grade_name} کلاس ${data.class_name}`}
            subtitle={`دوره ${ltr(data.year_name)}`}
          />
          <ScoreSheet
            sheet={data}
            editable={data.students.some((s) => s.status === "active")}
            onChange={reload}
            studentHref={(sid) => `/teacher/students/${sid}`}
          />
        </>
      )}
    </>
  );
}
