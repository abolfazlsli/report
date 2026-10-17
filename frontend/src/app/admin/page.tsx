"use client";

import { Alert, Card, Col, Row, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { PageHeader, ScoreValue, StatCard } from "@/components/ui";
import { useApi } from "@/lib/api";
import { faDate, faNum, ltr } from "@/lib/format";
import { byText, scoreFilter, searchFilter, tableDefaults, valueFilter } from "@/lib/table";
import type { Stats } from "@/lib/types";

type Recent = Stats["recent_scores"][number];

export default function AdminDashboard() {
  const { data, error, loading } = useApi<Stats>("/admin/stats");
  const recent = data?.recent_scores ?? [];

  const columns: ColumnsType<Recent> = [
    {
      title: "دانش‌آموز",
      dataIndex: "student_name",
      render: (v, s) => <Link href={`/admin/students/${s.student_id}`}>{v}</Link>,
      sorter: byText((s) => s.student_name),
      ...searchFilter((s) => s.student_name),
    },
    { title: "کلاس", dataIndex: "class_name", ...valueFilter(recent, (s) => s.class_name) },
    { title: "درس", dataIndex: "subject_name", ...valueFilter(recent, (s) => s.subject_name) },
    { title: "معلم", dataIndex: "teacher_name", render: (v) => v ?? "—", ...valueFilter(recent, (s) => s.teacher_name) },
    { title: "عنوان", dataIndex: "title", render: (v) => v ?? "—", ...searchFilter((s) => s.title) },
    { title: "تاریخ", dataIndex: "date", render: faDate, sorter: byText((s) => s.date) },
    { title: "نمره", dataIndex: "value", render: (v) => <ScoreValue value={v} />, ...scoreFilter((s) => s.value) },
  ];

  return (
    <>
      <PageHeader
        title="داشبورد مدیریت"
        subtitle={data?.current_year ? `دوره جاری: ${ltr(data.current_year)}` : loading ? " " : "هنوز دوره جاری تعیین نشده است"}
      />
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <StatCard title="دانش‌آموزان" value={data?.students ?? 0} href="/admin/users?role=student" />
        </Col>
        <Col xs={12} md={6}>
          <StatCard title="معلمان" value={data?.teachers ?? 0} href="/admin/users?role=teacher" />
        </Col>
        <Col xs={12} md={6}>
          <StatCard title="کلاس‌های دوره جاری" value={data?.classes ?? 0} href="/admin/classes" />
        </Col>
        <Col xs={12} md={6}>
          <StatCard title="کل نمرات ثبت‌شده" value={data?.scores ?? 0} />
        </Col>
      </Row>

      {data && !data.current_year && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title={
            <>
              برای شروع، از بخش <Link href="/admin/structure">دوره‌ها، پایه‌ها و دروس</Link> یک دوره بسازید و آن را «جاری» کنید.
            </>
          }
        />
      )}
      {data && data.unassigned_subjects > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title={`${faNum(data.unassigned_subjects)} درس در کلاس‌ها هنوز معلم ندارد.`}
        />
      )}

      <Card title="آخرین نمرات ثبت‌شده">
        <Table<Stats["recent_scores"][number]>
          {...tableDefaults}
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={recent}
          locale={{ emptyText: "هنوز نمره‌ای ثبت نشده است." }}
        />
      </Card>
    </>
  );
}
