"use client";

import { Alert, Card, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { useApi } from "@/lib/api";
import { faNum } from "@/lib/format";
import { byNum, byText, tableDefaults, valueFilter } from "@/lib/table";
import type { Assignment } from "@/lib/types";

export default function TeacherHome() {
  const { data, error, loading } = useApi<Assignment[]>("/teacher/assignments");
  const rows = data ?? [];

  const columns: ColumnsType<Assignment> = [
    {
      title: "درس",
      dataIndex: "subject_name",
      render: (v, a) => (
        <Link href={`/teacher/assignments/${a.class_subject_id}`}>
          <strong>{v}</strong>
        </Link>
      ),
      sorter: byText((a) => a.subject_name),
      ...valueFilter(rows, (a) => a.subject_name),
    },
    {
      title: "پایه",
      dataIndex: "grade_name",
      sorter: byText((a) => a.grade_name),
      ...valueFilter(rows, (a) => a.grade_name),
    },
    {
      title: "کلاس",
      dataIndex: "class_name",
      sorter: byText((a) => a.class_name),
      ...valueFilter(rows, (a) => a.class_name),
    },
    {
      title: "دوره",
      dataIndex: "year_name",
      render: (v, a) => <Tag color={a.is_current_year ? "blue" : "default"}>{v}</Tag>,
      sorter: byText((a) => a.year_name),
      ...valueFilter(rows, (a) => (a.is_current_year ? `${a.year_name} (جاری)` : a.year_name)),
      defaultFilteredValue: rows.filter((a) => a.is_current_year).slice(0, 1).map((a) => `${a.year_name} (جاری)`),
    },
    {
      title: "دانش‌آموز فعال",
      dataIndex: "student_count",
      render: (v) => <span className="tabular">{faNum(v)}</span>,
      sorter: byNum((a) => a.student_count),
    },
    {
      title: "",
      key: "action",
      render: (_, a) => (
        <Link href={`/teacher/assignments/${a.class_subject_id}`}>{a.is_current_year ? "ثبت نمره" : "مشاهده"}</Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="کلاس‌های من" subtitle="برای ثبت نمره روی درس مورد نظر بزنید. کلاس‌های دوره‌های گذشته فقط قابل مشاهده‌اند." />
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
      <Card>
        <Table<Assignment>
          {...tableDefaults}
          // remount once data arrives so the "current year" default filter applies
          key={data ? "ready" : "loading"}
          rowKey="class_subject_id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          locale={{ emptyText: "درسی به شما واگذار نشده است." }}
        />
      </Card>
    </>
  );
}
