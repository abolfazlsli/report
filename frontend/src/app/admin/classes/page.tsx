"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Modal, Select, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { useState } from "react";
import { PageHeader, useAction } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { faNum } from "@/lib/format";
import { byNum, byText, searchFilter, tableDefaults, valueFilter } from "@/lib/table";
import type { ClassRoom, Grade, Year } from "@/lib/types";

const yearLabel = (y: Year) => (y.is_current ? `${y.name} (جاری)` : y.name);

export default function ClassesPage() {
  const years = useApi<Year[]>("/admin/years");
  const grades = useApi<Grade[]>("/admin/grades");
  const classes = useApi<ClassRoom[]>("/admin/classes");
  const [creating, setCreating] = useState(false);
  const rows = classes.data ?? [];
  const current = years.data?.find((y) => y.is_current);

  const columns: ColumnsType<ClassRoom> = [
    {
      title: "کلاس",
      key: "name",
      render: (_, c) => (
        <Link href={`/admin/classes/${c.id}`}>
          <strong>
            پایه {c.grade.name} - {c.name}
          </strong>
        </Link>
      ),
      sorter: (a, b) => a.grade.level - b.grade.level || byText<ClassRoom>((c) => c.name)(a, b),
      ...searchFilter((c) => `${c.grade.name} ${c.name}`, "نام کلاس…"),
    },
    {
      title: "پایه",
      key: "grade",
      render: (_, c) => c.grade.name,
      sorter: byNum((c) => c.grade.level),
      ...valueFilter(rows, (c) => c.grade.name),
    },
    {
      title: "دوره",
      key: "year",
      render: (_, c) => <Tag color={c.academic_year.is_current ? "blue" : "default"}>{c.academic_year.name}</Tag>,
      sorter: byText((c) => c.academic_year.name),
      ...valueFilter(rows, (c) => yearLabel(c.academic_year)),
      // show the current year's classes first; the filter can be cleared to see all
      defaultFilteredValue: current ? [yearLabel(current)] : undefined,
    },
    {
      title: "دانش‌آموز فعال",
      dataIndex: "student_count",
      render: (v) => <span className="tabular">{faNum(v)}</span>,
      sorter: byNum((c) => c.student_count),
    },
    { title: "", key: "open", align: "end", render: (_, c) => <Link href={`/admin/classes/${c.id}`}>مدیریت کلاس</Link> },
  ];

  const ready = !!classes.data && !!years.data;

  return (
    <>
      <PageHeader
        title="کلاس‌ها"
        subtitle="هر کلاس متعلق به یک پایه در یک دوره تحصیلی است"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
            کلاس جدید
          </Button>
        }
      />
      <Card>
        <Table<ClassRoom>
          {...tableDefaults}
          // remount once data arrives so the default "current year" filter applies
          key={ready ? "ready" : "loading"}
          rowKey="id"
          loading={!ready}
          columns={columns}
          dataSource={rows}
          locale={{ emptyText: "کلاسی وجود ندارد." }}
        />
      </Card>
      {creating && (
        <CreateClass
          years={years.data ?? []}
          grades={grades.data ?? []}
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            classes.reload();
          }}
        />
      )}
    </>
  );
}

function CreateClass({
  years,
  grades,
  onClose,
  onDone,
}: {
  years: Year[];
  grades: Grade[];
  onClose: () => void;
  onDone: () => void;
}) {
  const run = useAction();
  const [form] = Form.useForm<{ academic_year_id: number; grade_id: number; name: string }>();

  if (!years.length || !grades.length) {
    return (
      <Modal open title="کلاس جدید" onCancel={onClose} footer={null}>
        <Typography.Paragraph>
          ابتدا در بخش <Link href="/admin/structure">دوره‌ها، پایه‌ها و دروس</Link> دوره و پایه تعریف کنید.
        </Typography.Paragraph>
      </Modal>
    );
  }

  return (
    <Modal open title="کلاس جدید" onCancel={onClose} onOk={() => form.submit()} okText="ساخت کلاس">
      <Form
        form={form}
        layout="vertical"
        initialValues={{ academic_year_id: (years.find((y) => y.is_current) ?? years[0]).id }}
        onFinish={async (v) => {
          if (await run(() => api("/admin/classes", { method: "POST", body: v }), "کلاس ساخته شد")) onDone();
        }}
      >
        <Form.Item name="academic_year_id" label="دوره" rules={[{ required: true }]}>
          <Select options={years.map((y) => ({ value: y.id, label: yearLabel(y) }))} />
        </Form.Item>
        <Form.Item name="grade_id" label="پایه" rules={[{ required: true, message: "پایه را انتخاب کنید" }]}>
          <Select placeholder="انتخاب کنید" options={grades.map((g) => ({ value: g.id, label: g.name }))} />
        </Form.Item>
        <Form.Item name="name" label="نام کلاس" rules={[{ required: true, message: "نام کلاس را وارد کنید" }]}>
          <Input placeholder="مثلاً الف" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
