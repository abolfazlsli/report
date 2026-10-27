"use client";

import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Badge, Button, Card, Col, Empty, Flex, Form, Input, InputNumber, Menu, Modal, Popconfirm, Row, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { useState } from "react";
import { Loading, PageHeader, RatingValue, useAction } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { faNum, RATING } from "@/lib/format";
import { byNum, byText, tableDefaults } from "@/lib/table";
import type { Criterion, Subject } from "@/lib/types";

export default function CriteriaPage() {
  const subjects = useApi<Subject[]>("/admin/subjects");
  const criteria = useApi<Criterion[]>("/admin/criteria");
  const run = useAction();
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Criterion | null>(null);
  const [form] = Form.useForm<{ title: string; description?: string }>();

  if (!subjects.data || !criteria.data) return <Loading />;

  const all = criteria.data;
  const selected = subjects.data.find((s) => s.id === subjectId) ?? subjects.data[0];
  const rows = selected ? all.filter((c) => c.subject_id === selected.id) : [];

  const columns: ColumnsType<Criterion> = [
    {
      title: "ترتیب",
      dataIndex: "order",
      width: 80,
      render: (v) => <span className="tabular">{faNum(v)}</span>,
      sorter: byNum((c) => c.order),
      defaultSortOrder: "ascend",
    },
    {
      title: "مورد ارزشیابی",
      key: "title",
      render: (_, c) => (
        <div>
          <strong>{c.title}</strong>
          {c.description && (
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {c.description}
              </Typography.Text>
            </div>
          )}
        </div>
      ),
      sorter: byText((c) => c.title),
    },
    {
      title: "ثبت‌شده",
      dataIndex: "used_count",
      render: (v) => (v ? <Tag color="blue">{faNum(v)} نمره</Tag> : <Typography.Text type="secondary">—</Typography.Text>),
      sorter: byNum((c) => c.used_count),
    },
    {
      title: "",
      key: "actions",
      align: "end",
      render: (_, c) => (
        <Flex gap={2} justify="end">
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEditing(c)} aria-label="ویرایش" />
          {c.used_count === 0 && (
            <Popconfirm
              title={`«${c.title}» حذف شود؟`}
              okText="حذف"
              cancelText="انصراف"
              okButtonProps={{ danger: true }}
              onConfirm={async () => (await run(() => api(`/admin/criteria/${c.id}`, { method: "DELETE" }), "حذف شد")) && criteria.reload()}
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label="حذف" />
            </Popconfirm>
          )}
        </Flex>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="نمرات توصیفی"
        subtitle="برای هر درس موارد ارزشیابی توصیفی را تعریف کنید. معلم هر مورد را از ۱ تا ۵ نمره می‌دهد و دانش‌آموز در کارنامه می‌بیند."
      />
      {!subjects.data.length ? (
        <Card className="soft">
          <Empty
            description={
              <>
                ابتدا از بخش <Link href="/admin/structure">دوره‌ها، پایه‌ها و دروس</Link> درس تعریف کنید.
              </>
            }
          />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={7}>
            <Card className="soft" title="دروس" styles={{ body: { padding: 8 } }}>
              <Menu
                mode="inline"
                selectedKeys={[String(selected?.id)]}
                style={{ borderInlineEnd: 0, background: "transparent" }}
                onClick={({ key }) => setSubjectId(Number(key))}
                items={subjects.data.map((s) => {
                  const n = all.filter((c) => c.subject_id === s.id).length;
                  return {
                    key: String(s.id),
                    label: (
                      <Flex justify="space-between" align="center">
                        {s.name}
                        <Badge count={faNum(n)} showZero color={n ? "var(--primary)" : "var(--muted)"} />
                      </Flex>
                    ),
                  };
                })}
              />
            </Card>
            <Card className="soft" title="مقیاس نمره‌دهی" style={{ marginTop: 16 }}>
              <Flex vertical gap={8}>
                {([5, 4, 3, 2, 1] as const).map((v) => (
                  <Flex key={v} justify="space-between" align="center">
                    <RatingValue value={v} compact showLabel={false} />
                    <span style={{ fontSize: 13 }}>
                      <strong className="tabular">{faNum(v)}</strong> — {RATING[v]}
                    </span>
                  </Flex>
                ))}
              </Flex>
            </Card>
          </Col>
          <Col xs={24} lg={17}>
            <Card className="soft" title={`موارد ارزشیابی «${selected?.name}»`}>
              <Form
                form={form}
                layout="inline"
                style={{ marginBottom: 16, rowGap: 8 }}
                onFinish={async (v) => {
                  const ok = await run(
                    () =>
                      api("/admin/criteria", {
                        method: "POST",
                        body: { ...v, subject_id: selected!.id, order: (rows.at(-1)?.order ?? 0) + 1 },
                      }),
                    "مورد ارزشیابی اضافه شد",
                  );
                  if (ok) {
                    form.resetFields();
                    criteria.reload();
                  }
                }}
              >
                <Form.Item name="title" rules={[{ required: true, message: "عنوان" }]} style={{ flex: "1 1 200px" }}>
                  <Input placeholder="مثلاً حل مسئله" maxLength={120} />
                </Form.Item>
                <Form.Item name="description" style={{ flex: "2 1 260px" }}>
                  <Input placeholder="توضیح (اختیاری)" maxLength={255} />
                </Form.Item>
                <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                  افزودن
                </Button>
              </Form>
              <Table<Criterion>
                {...tableDefaults}
                rowKey="id"
                loading={criteria.loading}
                columns={columns}
                dataSource={rows}
                locale={{ emptyText: "برای این درس هنوز مورد ارزشیابی تعریف نشده است." }}
              />
            </Card>
          </Col>
        </Row>
      )}
      {editing && (
        <EditCriterion
          criterion={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            criteria.reload();
          }}
        />
      )}
    </>
  );
}

function EditCriterion({ criterion, onClose, onDone }: { criterion: Criterion; onClose: () => void; onDone: () => void }) {
  const run = useAction();
  const [form] = Form.useForm<{ title: string; description?: string; order: number }>();
  return (
    <Modal open title="ویرایش مورد ارزشیابی" onCancel={onClose} onOk={() => form.submit()} okText="ذخیره">
      <Form
        form={form}
        layout="vertical"
        initialValues={{ title: criterion.title, description: criterion.description ?? "", order: criterion.order }}
        onFinish={async (v) => {
          if (await run(() => api(`/admin/criteria/${criterion.id}`, { method: "PATCH", body: v }), "ذخیره شد")) onDone();
        }}
      >
        <Form.Item name="title" label="عنوان" rules={[{ required: true, message: "عنوان را وارد کنید" }]}>
          <Input maxLength={120} />
        </Form.Item>
        <Form.Item name="description" label="توضیح">
          <Input.TextArea maxLength={255} autoSize={{ minRows: 2 }} />
        </Form.Item>
        <Form.Item name="order" label="ترتیب نمایش">
          <InputNumber min={0} style={{ width: 120 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
