"use client";

import { RiseOutlined } from "@ant-design/icons";
import { Alert, App, Button, Card, Col, Row, Select, Table, Typography } from "antd";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Loading, PageHeader } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { faDate, faNum, ltr } from "@/lib/format";
import { byText, searchFilter, tableDefaults } from "@/lib/table";
import type { ClassDetail, ClassRoom, Enrollment } from "@/lib/types";

const GRADUATE = -1;

export default function PromotePage() {
  return (
    <Suspense fallback={<Loading />}>
      <Promote />
    </Suspense>
  );
}

function Promote() {
  const params = useSearchParams();
  const { modal, message } = App.useApp();
  const classes = useApi<ClassRoom[]>("/admin/classes");
  const [sourceId, setSourceId] = useState<number | undefined>(
    params.get("source") ? Number(params.get("source")) : undefined,
  );
  const [targetId, setTargetId] = useState<number | undefined>();
  const [selected, setSelected] = useState<number[]>([]);
  const [result, setResult] = useState<{ moved: number; skipped: string[] } | null>(null);
  const source = useApi<ClassDetail>(sourceId ? `/admin/classes/${sourceId}` : null);

  const active = useMemo(
    () => source.data?.enrollments.filter((e) => e.status === "active") ?? [],
    [source.data],
  );
  useEffect(() => setSelected(active.map((e) => e.student.id)), [active]);

  const label = (c: ClassRoom) => `پایه ${c.grade.name} - ${c.name} (${ltr(c.academic_year.name)})`;
  const all = classes.data ?? [];
  const sourceClass = all.find((c) => c.id === sourceId);
  const level = sourceClass?.grade.level ?? 0;
  const others = all.filter((c) => c.id !== sourceId);
  const option = (c: ClassRoom) => ({ value: c.id, label: label(c) });
  const targetOptions = [
    { label: "پایه بعدی (پیشنهادی)", options: others.filter((c) => c.grade.level === level + 1).map(option) },
    { label: "سایر کلاس‌ها", options: others.filter((c) => c.grade.level !== level + 1).map(option) },
    { label: "پایان تحصیل", options: [{ value: GRADUATE, label: "فارغ‌التحصیلی" }] },
  ].filter((g) => g.options.length);

  function submit() {
    const target = targetId === GRADUATE ? "فارغ‌التحصیلی" : label(all.find((c) => c.id === targetId)!);
    modal.confirm({
      title: "انتقال دانش‌آموزان",
      content: `${faNum(selected.length)} دانش‌آموز به «${target}» منتقل شوند؟ سوابق کلاس فعلی در کارنامه‌شان حفظ می‌شود.`,
      okText: "انتقال",
      cancelText: "انصراف",
      onOk: async () => {
        try {
          const res = await api<{ moved: number; skipped: string[] }>("/admin/promote", {
            method: "POST",
            body: {
              source_class_id: sourceId,
              target_class_id: targetId === GRADUATE ? null : targetId,
              student_ids: selected,
            },
          });
          setResult(res);
          message.success(`${faNum(res.moved)} دانش‌آموز منتقل شدند`);
          source.reload();
          classes.reload();
        } catch (e) {
          message.error((e as Error).message);
        }
      },
    });
  }

  return (
    <>
      <PageHeader
        title="ارتقا و انتقال دانش‌آموزان"
        subtitle="دانش‌آموزان به کلاس مقصد منتقل می‌شوند و سوابق و نمرات کلاس قبلی در کارنامه‌شان حفظ می‌شود."
      />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="۱. کلاس مبدا و دانش‌آموزان">
            <Select
              value={sourceId}
              onChange={(v) => {
                setSourceId(v);
                setTargetId(undefined);
                setResult(null);
              }}
              placeholder="کلاس مبدا را انتخاب کنید"
              loading={classes.loading}
              showSearch={{ optionFilterProp: "label" }}
              options={all.map((c) => ({ value: c.id, label: `${label(c)} — ${faNum(c.student_count)} نفر` }))}
              style={{ width: "100%", marginBottom: 16 }}
            />
            {sourceId && (
              <Table<Enrollment>
                {...tableDefaults}
                size="small"
                rowKey={(e) => e.student.id}
                loading={source.loading}
                dataSource={active}
                rowSelection={{ selectedRowKeys: selected, onChange: (keys) => setSelected(keys as number[]) }}
                columns={[
                  {
                    title: "دانش‌آموز",
                    key: "name",
                    render: (_, e) => e.student.full_name,
                    sorter: byText((e) => e.student.full_name),
                    defaultSortOrder: "ascend",
                    ...searchFilter((e) => e.student.full_name, "نام دانش‌آموز…"),
                  },
                  {
                    title: "نام کاربری",
                    key: "username",
                    render: (_, e) => <span dir="ltr">{e.student.username}</span>,
                    ...searchFilter((e) => e.student.username),
                  },
                  { title: "از تاریخ", dataIndex: "started_at", render: faDate, sorter: byText((e) => e.started_at) },
                ]}
                locale={{ emptyText: "دانش‌آموز فعالی در این کلاس نیست." }}
                footer={() => (
                  <Typography.Text type="secondary">
                    {faNum(selected.length)} از {faNum(active.length)} دانش‌آموز انتخاب شده
                  </Typography.Text>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="۲. مقصد">
            <Select
              value={targetId}
              onChange={setTargetId}
              disabled={!sourceId}
              placeholder="کلاس مقصد را انتخاب کنید"
              showSearch={{ optionFilterProp: "label" }}
              options={targetOptions}
              style={{ width: "100%" }}
            />
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
              اگر کلاس پایه بالاتر در دوره جدید هنوز ساخته نشده، ابتدا آن را در <Link href="/admin/classes">کلاس‌ها</Link> بسازید.
            </Typography.Paragraph>
            {result && (
              <Alert
                type={result.skipped.length ? "warning" : "success"}
                showIcon
                style={{ marginBottom: 12 }}
                title={`${faNum(result.moved)} دانش‌آموز منتقل شدند.`}
                description={
                  result.skipped.length
                    ? `رد شده چون قبلاً در کلاس مقصد بوده‌اند: ${result.skipped.join("، ")}`
                    : undefined
                }
              />
            )}
            <Button
              type="primary"
              block
              icon={<RiseOutlined />}
              disabled={!sourceId || targetId === undefined || !selected.length}
              onClick={submit}
            >
              انتقال {selected.length ? faNum(selected.length) : ""} دانش‌آموز
            </Button>
          </Card>
        </Col>
      </Row>
    </>
  );
}
