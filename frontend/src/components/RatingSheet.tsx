"use client";

import { SaveOutlined, UndoOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Empty, Flex, Progress, Rate, Select, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { faNum, RATING, STATUS_LABEL } from "@/lib/format";
import { byText, searchFilter, tableDefaults } from "@/lib/table";
import type { RatingSheet as Sheet } from "@/lib/types";
import { RatingValue, useAction } from "./ui";

type Row = Sheet["students"][number];
const key = (enrollmentId: number, criterionId: number) => `${enrollmentId}:${criterionId}`;
const TOOLTIPS = [1, 2, 3, 4, 5].map((v) => RATING[v as 1 | 2 | 3 | 4 | 5]);

/**
 * Students x criteria grid of 1..5 descriptive ratings for one subject of a class.
 * Teachers edit cells locally and save all changes in one request.
 */
export function RatingSheet({
  sheet,
  editable,
  onSaved,
  studentHref,
}: {
  sheet: Sheet;
  editable: boolean;
  onSaved?: (s: Sheet) => void;
  studentHref: (studentId: number) => string;
}) {
  const run = useAction();
  // edits not saved yet: cell -> value (null = clear)
  const [draft, setDraft] = useState<Record<string, number | null>>({});
  const [busy, setBusy] = useState(false);

  const value = (r: Row, criterionId: number) => {
    const k = key(r.enrollment_id, criterionId);
    return k in draft ? draft[k] : (r.ratings[criterionId] ?? null);
  };
  const active = sheet.students.filter((s) => s.status === "active");
  const changes = Object.keys(draft).length;

  const progress = useMemo(() => {
    const expected = active.length * sheet.criteria.length;
    const filled = active.reduce((n, r) => n + sheet.criteria.filter((c) => value(r, c.id)).length, 0);
    return { expected, filled };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, draft]);

  if (!sheet.criteria.length) {
    return (
      <Card className="soft">
        <Empty
          description={
            <>
              برای درس «{sheet.subject_name}» هنوز مورد ارزشیابی توصیفی تعریف نشده است.
              <br />
              <Typography.Text type="secondary">موارد ارزشیابی را مدیر مدرسه از بخش «نمرات توصیفی» تعریف می‌کند.</Typography.Text>
            </>
          }
        />
      </Card>
    );
  }

  function set(r: Row, criterionId: number, v: number | null) {
    const k = key(r.enrollment_id, criterionId);
    const original = r.ratings[criterionId] ?? null;
    setDraft((prev) => {
      const next = { ...prev };
      if (v === original) delete next[k];
      else next[k] = v;
      return next;
    });
  }

  function fillColumn(criterionId: number, v: number) {
    for (const r of active) if (!value(r, criterionId)) set(r, criterionId, v);
  }

  async function save() {
    setBusy(true);
    let saved: Sheet | null = null;
    const ok = await run(async () => {
      saved = await api<Sheet>("/teacher/ratings", {
        method: "PUT",
        body: {
          class_subject_id: sheet.class_subject_id,
          items: Object.entries(draft).map(([k, v]) => {
            const [enrollment_id, criterion_id] = k.split(":").map(Number);
            return { enrollment_id, criterion_id, value: v };
          }),
        },
      });
    }, `${faNum(changes)} نمره توصیفی ذخیره شد`);
    setBusy(false);
    if (ok && saved) {
      setDraft({});
      onSaved?.(saved);
    }
  }

  const columns: ColumnsType<Row> = [
    {
      title: "دانش‌آموز",
      key: "student",
      fixed: "left",
      render: (_, r) => (
        <Flex vertical>
          <Link href={studentHref(r.student.id)}>
            <strong>{r.student.full_name}</strong>
          </Link>
          {r.status !== "active" && (
            <Tag style={{ width: "fit-content", marginTop: 2 }}>{STATUS_LABEL[r.status]}</Tag>
          )}
        </Flex>
      ),
      sorter: byText((r) => r.student.full_name),
      defaultSortOrder: "ascend",
      ...searchFilter((r) => r.student.full_name, "نام دانش‌آموز…"),
    },
    ...sheet.criteria.map((c) => ({
      key: `c${c.id}`,
      title: (
        <Flex vertical gap={4}>
          <Tooltip title={c.description}>
            <span>{c.title}</span>
          </Tooltip>
          {editable && (
            <Select
              size="small"
              placeholder="پر کردن خالی‌ها"
              value={null}
              style={{ width: 130, fontWeight: 400 }}
              options={[5, 4, 3, 2, 1].map((v) => ({ value: v, label: `${faNum(v)} — ${RATING[v as 1 | 2 | 3 | 4 | 5]}` }))}
              onChange={(v) => v && fillColumn(c.id, v)}
              aria-label={`پر کردن ${c.title} برای همه`}
            />
          )}
        </Flex>
      ),
      render: (_: unknown, r: Row) => {
        const v = value(r, c.id);
        const dirty = key(r.enrollment_id, c.id) in draft;
        if (!editable || r.status !== "active") return <RatingValue value={v} compact />;
        return (
          <span style={{ display: "inline-block", padding: "2px 6px", borderRadius: 8, background: dirty ? "var(--primary-soft)" : undefined }}>
            <Rate
              value={v ?? 0}
              onChange={(n) => set(r, c.id, n || null)}
              tooltips={TOOLTIPS}
              style={{ fontSize: 16 }}
              aria-label={`${c.title} ${r.student.full_name}`}
            />
          </span>
        );
      },
    })),
  ];

  const percent = progress.expected ? Math.round((progress.filled / progress.expected) * 100) : 0;

  return (
    <Card
      className="soft"
      title={`ارزشیابی توصیفی ${sheet.subject_name}`}
      extra={
        <Flex align="center" gap={8} style={{ minWidth: 180 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
            تکمیل {faNum(progress.filled)} از {faNum(progress.expected)}
          </Typography.Text>
          <Progress percent={percent} size="small" style={{ width: 90, margin: 0 }} showInfo={false} />
        </Flex>
      }
    >
      {editable && (
        <Flex
          wrap
          gap={12}
          align="center"
          justify="space-between"
          style={{ marginBottom: 16, padding: 12, borderRadius: 12, background: "var(--surface-2)" }}
        >
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            به هر مورد از ۱ (نیاز به تلاش بیشتر) تا ۵ (عالی) امتیاز دهید. برای پاک کردن، دوباره روی همان ستاره بزنید.
          </Typography.Text>
          <Flex gap={8}>
            <Button icon={<UndoOutlined />} disabled={!changes || busy} onClick={() => setDraft({})}>
              لغو تغییرات
            </Button>
            <Button type="primary" icon={<SaveOutlined />} disabled={!changes} loading={busy} onClick={save}>
              ذخیره {changes ? faNum(changes) : ""} تغییر
            </Button>
          </Flex>
        </Flex>
      )}
      {editable && changes > 0 && (
        <Alert type="info" showIcon style={{ marginBottom: 12 }} title="تغییرات ذخیره نشده دارید." />
      )}
      <Table<Row>
        {...tableDefaults}
        pagination={{ ...tableDefaults.pagination, defaultPageSize: 50 }}
        rowKey="enrollment_id"
        columns={columns}
        dataSource={sheet.students}
        locale={{ emptyText: "دانش‌آموزی در این کلاس نیست." }}
      />
    </Card>
  );
}
