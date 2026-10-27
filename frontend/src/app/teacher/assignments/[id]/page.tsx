"use client";

import { EditOutlined, StarOutlined } from "@ant-design/icons";
import { Alert, Tabs } from "antd";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RatingSheet } from "@/components/RatingSheet";
import { ScoreSheet } from "@/components/ScoreSheet";
import { Loading, PageHeader } from "@/components/ui";
import { useApi } from "@/lib/api";
import { ltr } from "@/lib/format";
import type { RatingSheet as Ratings, Sheet } from "@/lib/types";

export default function AssignmentPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Assignment />
    </Suspense>
  );
}

function Assignment() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { data, error, loading, reload } = useApi<Sheet>(`/teacher/assignments/${id}`);
  const ratings = useApi<Ratings>(`/teacher/assignments/${id}/ratings`);
  const tab = params.get("tab") === "ratings" ? "ratings" : "scores";
  const editable = !!data?.students.some((s) => s.status === "active");

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
          <Tabs
            activeKey={tab}
            onChange={(k) => router.replace(k === "ratings" ? "?tab=ratings" : "?")}
            items={[
              {
                key: "scores",
                label: (
                  <span>
                    <EditOutlined /> نمرات
                  </span>
                ),
                children: (
                  <ScoreSheet sheet={data} editable={editable} onChange={reload} studentHref={(sid) => `/teacher/students/${sid}`} />
                ),
              },
              {
                key: "ratings",
                label: (
                  <span>
                    <StarOutlined /> ارزشیابی توصیفی
                  </span>
                ),
                children: ratings.data ? (
                  <RatingSheet
                    sheet={ratings.data}
                    editable={editable}
                    onSaved={ratings.setData}
                    studentHref={(sid) => `/teacher/students/${sid}`}
                  />
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
