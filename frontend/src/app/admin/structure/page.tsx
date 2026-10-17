"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Col, Flex, Form, Input, InputNumber, Popconfirm, Row, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PageHeader, useAction } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { faNum } from "@/lib/format";
import { byNum, byText, searchFilter, tableDefaults, valueFilter } from "@/lib/table";
import type { Grade, Subject, Year } from "@/lib/types";

export default function StructurePage() {
  return (
    <>
      <PageHeader
        title="دوره‌ها، پایه‌ها و دروس"
        subtitle="ساختار آموزشی مدرسه را اینجا تعریف کنید؛ سپس در بخش کلاس‌ها از آن استفاده کنید."
      />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Years />
        </Col>
        <Col xs={24} lg={8}>
          <Grades />
        </Col>
        <Col xs={24} lg={8}>
          <Subjects />
        </Col>
      </Row>
    </>
  );
}

function DeleteButton({ title, onConfirm }: { title: string; onConfirm: () => void }) {
  return (
    <Popconfirm title={title} okText="حذف" cancelText="انصراف" okButtonProps={{ danger: true }} onConfirm={onConfirm}>
      <Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label="حذف" />
    </Popconfirm>
  );
}

const compactTable = { ...tableDefaults, size: "small" as const, pagination: { ...tableDefaults.pagination, defaultPageSize: 8 } };

function Years() {
  const { data, loading, reload } = useApi<Year[]>("/admin/years");
  const run = useAction();
  const [form] = Form.useForm<{ name: string }>();
  const rows = data ?? [];
  const status = (y: Year) => (y.is_current ? "جاری" : "غیرجاری");

  const columns: ColumnsType<Year> = [
    {
      title: "دوره",
      dataIndex: "name",
      render: (v) => <span className="tabular">{v}</span>,
      sorter: byText((y) => y.name),
      defaultSortOrder: "descend",
      ...searchFilter((y) => y.name),
    },
    {
      title: "وضعیت",
      key: "status",
      ...valueFilter(rows, status),
      render: (_, y) =>
        y.is_current ? (
          <Tag color="blue">جاری</Tag>
        ) : (
          <Button
            size="small"
            type="link"
            style={{ padding: 0 }}
            onClick={async () =>
              (await run(() => api(`/admin/years/${y.id}`, { method: "PATCH", body: { is_current: true } }), `${y.name} دوره جاری شد`)) &&
              reload()
            }
          >
            جاری کن
          </Button>
        ),
    },
    {
      title: "",
      key: "actions",
      align: "end",
      render: (_, y) => (
        <DeleteButton
          title={`دوره ${y.name} حذف شود؟`}
          onConfirm={async () => (await run(() => api(`/admin/years/${y.id}`, { method: "DELETE" }), "حذف شد")) && reload()}
        />
      ),
    },
  ];

  return (
    <Card title="دوره‌های تحصیلی">
      <Form
        form={form}
        layout="inline"
        style={{ marginBottom: 12, flexWrap: "nowrap" }}
        onFinish={async ({ name }) => {
          const ok = await run(
            () => api("/admin/years", { method: "POST", body: { name, is_current: !rows.length } }),
            "دوره اضافه شد",
          );
          if (ok) {
            form.resetFields();
            reload();
          }
        }}
      >
        <Form.Item name="name" rules={[{ required: true, message: "نام دوره" }]} style={{ flex: 1 }}>
          <Input placeholder="مثلاً 1405-1406" dir="ltr" />
        </Form.Item>
        <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
          افزودن
        </Button>
      </Form>
      <Table<Year> {...compactTable} rowKey="id" loading={loading} columns={columns} dataSource={rows} />
    </Card>
  );
}

function Grades() {
  const { data, loading, reload } = useApi<Grade[]>("/admin/grades");
  const run = useAction();
  const [form] = Form.useForm<{ name: string; level?: number }>();
  const rows = data ?? [];
  const nextLevel = (rows.at(-1)?.level ?? 0) + 1;

  const columns: ColumnsType<Grade> = [
    {
      title: "ترتیب",
      dataIndex: "level",
      render: (v) => <span className="tabular">{faNum(v)}</span>,
      sorter: byNum((g) => g.level),
      defaultSortOrder: "ascend",
      width: 80,
    },
    { title: "پایه", dataIndex: "name", sorter: byText((g) => g.name), ...searchFilter((g) => g.name) },
    {
      title: "",
      key: "actions",
      align: "end",
      render: (_, g) => (
        <DeleteButton
          title={`پایه ${g.name} حذف شود؟`}
          onConfirm={async () => (await run(() => api(`/admin/grades/${g.id}`, { method: "DELETE" }), "حذف شد")) && reload()}
        />
      ),
    },
  ];

  return (
    <Card title="پایه‌ها">
      <Form
        form={form}
        layout="inline"
        style={{ marginBottom: 4, flexWrap: "nowrap" }}
        onFinish={async ({ name, level }) => {
          const ok = await run(
            () => api("/admin/grades", { method: "POST", body: { name, level: level ?? nextLevel } }),
            "پایه اضافه شد",
          );
          if (ok) {
            form.resetFields();
            reload();
          }
        }}
      >
        <Form.Item name="name" rules={[{ required: true, message: "نام پایه" }]} style={{ flex: 1 }}>
          <Input placeholder="مثلاً دوم" />
        </Form.Item>
        <Form.Item name="level">
          <InputNumber min={1} placeholder={String(nextLevel)} style={{ width: 72 }} aria-label="ترتیب پایه" />
        </Form.Item>
        <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
          افزودن
        </Button>
      </Form>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
        عدد ترتیب مشخص می‌کند کدام پایه بالاتر است (برای پیشنهاد کلاس مقصد در ارتقا).
      </Typography.Paragraph>
      <Table<Grade> {...compactTable} rowKey="id" loading={loading} columns={columns} dataSource={rows} />
    </Card>
  );
}

function Subjects() {
  const { data, loading, reload } = useApi<Subject[]>("/admin/subjects");
  const run = useAction();
  const [form] = Form.useForm<{ name: string }>();

  const columns: ColumnsType<Subject> = [
    {
      title: "درس",
      dataIndex: "name",
      sorter: byText((s) => s.name),
      defaultSortOrder: "ascend",
      ...searchFilter((s) => s.name),
    },
    {
      title: "",
      key: "actions",
      align: "end",
      render: (_, s) => (
        <DeleteButton
          title={`درس ${s.name} حذف شود؟`}
          onConfirm={async () => (await run(() => api(`/admin/subjects/${s.id}`, { method: "DELETE" }), "حذف شد")) && reload()}
        />
      ),
    },
  ];

  return (
    <Card title="دروس">
      <Flex vertical>
        <Form
          form={form}
          layout="inline"
          style={{ marginBottom: 12, flexWrap: "nowrap" }}
          onFinish={async ({ name }) => {
            if (await run(() => api("/admin/subjects", { method: "POST", body: { name } }), "درس اضافه شد")) {
              form.resetFields();
              reload();
            }
          }}
        >
          <Form.Item name="name" rules={[{ required: true, message: "نام درس" }]} style={{ flex: 1 }}>
            <Input placeholder="مثلاً علوم" />
          </Form.Item>
          <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
            افزودن
          </Button>
        </Form>
        <Table<Subject> {...compactTable} rowKey="id" loading={loading} columns={columns} dataSource={data ?? []} />
      </Flex>
    </Card>
  );
}
