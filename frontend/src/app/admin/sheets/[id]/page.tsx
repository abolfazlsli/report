"use client";

import { Alert } from "antd";
import { useParams } from "next/navigation";
import { ScoreSheet } from "@/components/ScoreSheet";
import { Loading, PageHeader } from "@/components/ui";
import { useApi } from "@/lib/api";
import { ltr } from "@/lib/format";
import type { Sheet } from "@/lib/types";

/** Admin oversight: read-only view of one subject's scores in a class. */
export default function AdminSheetPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading } = useApi<Sheet>(`/admin/class-subjects/${id}/sheet`);
  return (
    <>
      {loading && <Loading />}
      {error && <Alert type="error" title={error} showIcon />}
      {data && (
        <>
          <PageHeader
            back={{ href: `/admin/classes/${data.class_id}`, label: "بازگشت به کلاس" }}
            title={`${data.subject_name} — پایه ${data.grade_name} کلاس ${data.class_name}`}
            subtitle={`دوره ${ltr(data.year_name)} · معلم: ${data.teacher_name ?? "تعیین نشده"}`}
          />
          <ScoreSheet sheet={data} editable={false} studentHref={(sid) => `/admin/students/${sid}`} />
        </>
      )}
    </>
  );
}
