"use client";

import { Alert, Tabs } from "antd";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RatingSheet } from "@/components/RatingSheet";
import { ScoreSheet } from "@/components/ScoreSheet";
import { Loading, PageHeader } from "@/components/ui";
import { useApi } from "@/lib/api";
import { ltr } from "@/lib/format";
import type { RatingSheet as Ratings, Sheet } from "@/lib/types";

/** Admin oversight: read-only view of one subject's scores and descriptive ratings in a class. */
export default function AdminSheetPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminSheet />
    </Suspense>
  );
}

function AdminSheet() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { data, error, loading } = useApi<Sheet>(`/admin/class-subjects/${id}/sheet`);
  const ratings = useApi<Ratings>(`/admin/class-subjects/${id}/ratings`);
  const tab = params.get("tab") === "ratings" ? "ratings" : "scores";
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
          <Tabs
            activeKey={tab}
            onChange={(k) => router.replace(k === "ratings" ? `?tab=ratings` : "?")}
            items={[
              {
                key: "scores",
                label: "نمرات",
                children: <ScoreSheet sheet={data} editable={false} studentHref={(sid) => `/admin/students/${sid}`} />,
              },
              {
                key: "ratings",
                label: "ارزشیابی توصیفی",
                children: ratings.data ? (
                  <RatingSheet sheet={ratings.data} editable={false} studentHref={(sid) => `/admin/students/${sid}`} />
                ) : (
                  <Loading />
                ),
              },
            ]}
          />
        </>
      )}
    </>
  );
}
