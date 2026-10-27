"use client";

import { ApartmentOutlined, ClusterOutlined, DeleteOutlined, EditOutlined, PlusOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Col, Empty, Flex, Form, Input, Modal, Popconfirm, Row, Typography } from "antd";
import Link from "next/link";
import { useState } from "react";
import { Loading, PageHeader, useAction } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { faNum } from "@/lib/format";
import type { Unit } from "@/lib/types";

export default function UnitsPage() {
  const { data, loading, reload } = useApi<Unit[]>("/admin/units");
  const run = useAction();
  const [editing, setEditing] = useState<Unit | "new" | null>(null);

  return (
    <>
      <PageHeader
        title="واحدهای آموزشی"
        subtitle="هر مدرسه واحدهای خودش را دارد (مثلاً «واحد ۷» یا «دبیرستان پسرانه»). هر کلاس به یک واحد تعلق دارد."
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing("new")}>
            واحد جدید
          </Button>
        }
      />
      {loading && !data && <Loading />}
      {data && !data.length && (
        <Card className="soft">
          <Empty description="هنوز واحدی تعریف نشده است.">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing("new")}>
              ساخت اولین واحد
            </Button>
          </Empty>
        </Card>
      )}
      <Row gutter={[16, 16]}>
        {data?.map((u, i) => (
          <Col key={u.id} xs={24} md={12} xl={8}>
            <Card className="soft lift" style={{ height: "100%" }}>
              <Flex gap={14} align="flex-start">
                <span
                  className="stat-icon"
                  style={{ background: `color-mix(in srgb, var(--series-${(i % 8) + 1}) 14%, transparent)`, color: `var(--series-${(i % 8) + 1})` }}
                >
                  <ClusterOutlined />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Typography.Title level={5} style={{ margin: 0 }}>
                    {u.name}
                  </Typography.Title>
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    {u.description || "بدون توضیح"}
                  </Typography.Text>
                </div>
                <Flex gap={2}>
                  <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEditing(u)} aria-label="ویرایش" />
                  {u.class_count === 0 && (
                    <Popconfirm
                      title={`واحد «${u.name}» حذف شود؟`}
                      okText="حذف"
                      cancelText="انصراف"
                      okButtonProps={{ danger: true }}
                      onConfirm={async () => (await run(() => api(`/admin/units/${u.id}`, { method: "DELETE" }), "واحد حذف شد")) && reload()}
                    >
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label="حذف" />
                    </Popconfirm>
                  )}
                </Flex>
              </Flex>
              <Flex gap={12} style={{ marginTop: 18 }}>
                <Metric icon={<ApartmentOutlined />} label="کلاس" value={u.class_count} />
                <Metric icon={<UserOutlined />} label="دانش‌آموز فعال" value={u.student_count} />
              </Flex>
              <Link href={`/admin/classes?unit=${u.id}`} style={{ display: "inline-block", marginTop: 14, fontSize: 13 }}>
                مشاهده کلاس‌های این واحد ←
              </Link>
            </Card>
          </Col>
        ))}
      </Row>
      {editing && (
        <UnitModal
          unit={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div style={{ flex: 1, padding: "10px 12px", borderRadius: 12, background: "var(--surface-2)" }}>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>
        {icon} {label}
      </div>
      <div className="tabular" style={{ fontSize: 20, fontWeight: 800 }}>
        {faNum(value)}
      </div>
    </div>
  );
}

function UnitModal({ unit, onClose, onDone }: { unit: Unit | null; onClose: () => void; onDone: () => void }) {
  const run = useAction();
  const [form] = Form.useForm<{ name: string; description?: string }>();
  return (
    <Modal open title={unit ? "ویرایش واحد" : "واحد جدید"} onCancel={onClose} onOk={() => form.submit()} okText="ذخیره">
      <Form
        form={form}
        layout="vertical"
        initialValues={{ name: unit?.name, description: unit?.description ?? "" }}
        onFinish={async (v) => {
          const ok = await run(
            () =>
              unit
                ? api(`/admin/units/${unit.id}`, { method: "PATCH", body: v })
                : api("/admin/units", { method: "POST", body: v }),
            unit ? "واحد ویرایش شد" : "واحد ساخته شد",
          );
          if (ok) onDone();
        }}
      >
        <Form.Item name="name" label="نام واحد" rules={[{ required: true, message: "نام واحد را وارد کنید" }]}>
          <Input placeholder="مثلاً واحد ۷ یا دبیرستان" maxLength={80} />
        </Form.Item>
        <Form.Item name="description" label="توضیح (اختیاری)">
          <Input.TextArea placeholder="مثلاً فقط دانش‌آموزان دبیرستانی" maxLength={255} autoSize={{ minRows: 2 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
