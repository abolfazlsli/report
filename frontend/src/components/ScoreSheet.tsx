"use client";

import { DeleteOutlined, SaveOutlined } from "@ant-design/icons";
import { Button, Card, Flex, Form, Input, InputNumber, Modal, Popconfirm, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { faDate, faNum, STATUS_LABEL, todayISO } from "@/lib/format";
import { fromISO, JalaliDatePicker, toISO } from "@/lib/jalali";
import { byNum, byText, scoreFilter, searchFilter, tableDefaults, valueFilter } from "@/lib/table";
import type { Score, Sheet, SheetStudent } from "@/lib/types";
import { ScoreValue, useAction } from "./ui";

/**
 * Students of one class with their scores in one subject.
 * Teachers (editable) record an assessment for the whole class at once and edit/delete scores.
 */
export function ScoreSheet({
  sheet,
  editable,
  onChange,
  studentHref,
}: {
  sheet: Sheet;
  editable: boolean;
  onChange?: () => void;
  studentHref: (studentId: number) => string;
}) {
  const run = useAction();
  const [date, setDate] = useState<Dayjs | null>(() => fromISO(todayISO()));
  const [title, setTitle] = useState("");
  const [values, setValues] = useState<Record<number, number | null>>({});
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Score | null>(null);

  const entered = Object.entries(values).filter(([, v]) => v !== null && v !== undefined);
  const hasInactive = sheet.students.some((s) => s.status !== "active");

  async function submitBulk() {
    if (!date) return;
    setBusy(true);
    const ok = await run(
      () =>
        api("/teacher/scores/bulk", {
          method: "POST",
          body: {
            class_subject_id: sheet.class_subject_id,
            date: toISO(date),
            title: title || null,
            items: entered.map(([id, value]) => ({ enrollment_id: Number(id), value })),
          },
        }),
      `${faNum(entered.length)} نمره ثبت شد`,
    );
    setBusy(false);
    if (ok) {
      setValues({});
      setTitle("");
      onChange?.();
    }
  }

  const columns: ColumnsType<SheetStudent> = [
    {
      title: "دانش‌آموز",
      key: "student",
      fixed: "left",
      render: (_, s) => (
        <Link href={studentHref(s.student.id)}>
          <strong>{s.student.full_name}</strong>
        </Link>
      ),
      sorter: byText((s) => s.student.full_name),
      defaultSortOrder: "ascend",
      ...searchFilter((s) => s.student.full_name, "نام دانش‌آموز…"),
    },
    ...(hasInactive
      ? [
          {
            title: "وضعیت",
            key: "status",
            render: (_: unknown, s: SheetStudent) => (
              <Tag color={s.status === "active" ? "blue" : "default"}>{STATUS_LABEL[s.status]}</Tag>
            ),
            ...valueFilter(sheet.students, (s) => STATUS_LABEL[s.status]),
          },
        ]
      : []),
    {
      title: "نمرات",
      key: "scores",
      render: (_, s) =>
        s.scores.length === 0 ? (
          <Typography.Text type="secondary">—</Typography.Text>
        ) : (
          <Flex wrap gap={4}>
            {s.scores.map((x) => (
              <Tooltip key={x.id} title={`${faDate(x.date)}${x.title ? " · " + x.title : ""}`}>
                <Tag
                  className="tabular"
                  style={{ cursor: editable && s.status === "active" ? "pointer" : "default", marginInlineEnd: 0 }}
                  onClick={() => editable && s.status === "active" && setEditing(x)}
                >
                  {faNum(x.value)}
                </Tag>
              </Tooltip>
            ))}
          </Flex>
        ),
    },
    {
      title: "تعداد",
      key: "count",
      render: (_, s) => <span className="tabular">{faNum(s.scores.length)}</span>,
      sorter: byNum((s) => s.scores.length),
    },
    {
      title: "میانگین",
      key: "average",
      render: (_, s) => <ScoreValue value={s.average} />,
      ...scoreFilter((s) => s.average),
    },
    ...(editable
      ? [
          {
            title: "نمره جدید",
            key: "new",
            fixed: "right" as const,
            render: (_: unknown, s: SheetStudent) =>
              s.status === "active" ? (
                <InputNumber
                  min={0}
                  max={20}
                  step={0.25}
                  placeholder="—"
                  style={{ width: 90 }}
                  value={values[s.enrollment_id] ?? null}
                  onChange={(v) => setValues((prev) => ({ ...prev, [s.enrollment_id]: v }))}
                  aria-label={`نمره جدید ${s.student.full_name}`}
                />
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <>
      <Card
        title={`نمرات ${sheet.subject_name}`}
        extra={
          editable && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              برای ویرایش یا حذف، روی نمره بزنید
            </Typography.Text>
          )
        }
      >
        {editable && (
          <Flex
            wrap
            gap={12}
            align="end"
            style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: "var(--surface-2)" }}
          >
            <Flex vertical gap={4}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                تاریخ ارزشیابی
              </Typography.Text>
              <JalaliDatePicker value={date} onChange={setDate} allowClear={false} format="YYYY/MM/DD" />
            </Flex>
            <Flex vertical gap={4} style={{ flex: "1 1 200px" }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                عنوان (اختیاری)
              </Typography.Text>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً آزمون فصل ۲" maxLength={100} />
            </Flex>
            <Button type="primary" icon={<SaveOutlined />} loading={busy} disabled={!entered.length || !date} onClick={submitBulk}>
              ثبت {entered.length ? faNum(entered.length) : ""} نمره
            </Button>
          </Flex>
        )}
        <Table<SheetStudent>
          {...tableDefaults}
          pagination={{ ...tableDefaults.pagination, defaultPageSize: 50 }}
          rowKey="enrollment_id"
          columns={columns}
          dataSource={sheet.students}
          locale={{ emptyText: "دانش‌آموزی در این کلاس نیست." }}
        />
      </Card>

      {editing && (
        <EditScoreModal
          score={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChange?.();
          }}
        />
      )}
    </>
  );
}

interface EditValues {
  value: number;
  date: Dayjs;
  title?: string;
}

function EditScoreModal({ score, onClose, onSaved }: { score: Score; onClose: () => void; onSaved: () => void }) {
  const run = useAction();
  const [form] = Form.useForm<EditValues>();

  async function save(v: EditValues) {
    const ok = await run(
      () =>
        api(`/teacher/scores/${score.id}`, {
          method: "PATCH",
          body: { value: v.value, date: toISO(v.date), title: v.title || null },
        }),
      "نمره ویرایش شد",
    );
    if (ok) onSaved();
  }

  async function remove() {
    if (await run(() => api(`/teacher/scores/${score.id}`, { method: "DELETE" }), "نمره حذف شد")) onSaved();
  }

  return (
    <Modal
      open
      title="ویرایش نمره"
      onCancel={onClose}
      footer={
        <Flex justify="space-between">
          <Popconfirm title="این نمره حذف شود؟" okText="حذف" cancelText="انصراف" okButtonProps={{ danger: true }} onConfirm={remove}>
            <Button danger icon={<DeleteOutlined />}>
              حذف نمره
            </Button>
          </Popconfirm>
          <Button type="primary" onClick={() => form.submit()}>
            ذخیره
          </Button>
        </Flex>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={save}
        initialValues={{ value: score.value, date: fromISO(score.date), title: score.title ?? "" }}
      >
        <Form.Item name="value" label="نمره (از ۲۰)" rules={[{ required: true, message: "نمره را وارد کنید" }]}>
          <InputNumber min={0} max={20} step={0.25} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="date" label="تاریخ" rules={[{ required: true, message: "تاریخ را انتخاب کنید" }]}>
          <JalaliDatePicker format="YYYY/MM/DD" style={{ width: "100%" }} allowClear={false} />
        </Form.Item>
        <Form.Item name="title" label="عنوان">
          <Input maxLength={100} />
        </Form.Item>
        {score.teacher_name && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            ثبت‌شده توسط {score.teacher_name}
          </Typography.Text>
        )}
      </Form>
    </Modal>
  );
}
