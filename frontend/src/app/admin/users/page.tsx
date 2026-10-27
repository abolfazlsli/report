"use client";

import { DeleteOutlined, EditOutlined, UserAddOutlined } from "@ant-design/icons";
import { Button, Card, Flex, Form, Input, Modal, Popconfirm, Segmented, Select, Switch, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Loading, PageHeader, useAction } from "@/components/ui";
import { UserAvatar } from "@/components/UserAvatar";
import { api, useApi } from "@/lib/api";
import { ROLE_LABEL } from "@/lib/format";
import { byText, searchFilter, tableDefaults, valueFilter } from "@/lib/table";
import type { Role, User } from "@/lib/types";

const ROLES: Role[] = ["student", "teacher", "admin"];

export default function UsersPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Users />
    </Suspense>
  );
}

function Users() {
  const params = useSearchParams();
  const router = useRouter();
  const role = (ROLES.includes(params.get("role") as Role) ? params.get("role") : "student") as Role;
  const { data, loading, reload } = useApi<User[]>(`/admin/users?role=${role}`);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const rows = data ?? [];

  const columns: ColumnsType<User> = [
    {
      title: "نام",
      dataIndex: "full_name",
      render: (v, u) => (
        <Flex align="center" gap={10}>
          <UserAvatar user={u} size={30} />
          {role === "student" ? <Link href={`/admin/students/${u.id}`}>{v}</Link> : v}
        </Flex>
      ),
      sorter: byText((u) => u.full_name),
      defaultSortOrder: "ascend",
      ...searchFilter((u) => u.full_name, "نام…"),
    },
    {
      title: "نام کاربری",
      dataIndex: "username",
      render: (v) => <span dir="ltr">{v}</span>,
      sorter: byText((u) => u.username),
      ...searchFilter((u) => u.username),
    },
    {
      title: "کد ملی",
      dataIndex: "national_code",
      render: (v) => <span className="tabular">{v ?? "—"}</span>,
      ...searchFilter((u) => u.national_code),
    },
    ...(role === "student"
      ? [
          {
            title: "کلاس فعلی",
            key: "class",
            render: (_: unknown, u: User) =>
              u.current_class_id ? (
                <Link href={`/admin/classes/${u.current_class_id}`}>{u.current_class}</Link>
              ) : (
                <Tag>بدون کلاس</Tag>
              ),
            sorter: byText<User>((u) => u.current_class),
            ...valueFilter(rows, (u) => u.current_class ?? "بدون کلاس"),
          },
        ]
      : []),
    {
      title: "وضعیت",
      key: "active",
      render: (_, u) => (u.is_active ? <Tag color="green">فعال</Tag> : <Tag color="red">غیرفعال</Tag>),
      ...valueFilter(rows, (u) => (u.is_active ? "فعال" : "غیرفعال")),
    },
    {
      title: "",
      key: "actions",
      align: "end",
      render: (_, u) => (
        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEditing(u)}>
          ویرایش
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="کاربران"
        subtitle="دانش‌آموزان، معلمان و مدیران سامانه"
        actions={
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => setCreating(true)}>
            افزودن {ROLE_LABEL[role]}
          </Button>
        }
      />
      <Card>
        <Segmented<Role>
          value={role}
          onChange={(r) => router.replace(`/admin/users?role=${r}`)}
          options={ROLES.map((r) => ({ value: r, label: `${ROLE_LABEL[r]}ها` }))}
          style={{ marginBottom: 16 }}
        />
        <Table<User>
          {...tableDefaults}
          key={role}
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          locale={{ emptyText: "کاربری یافت نشد." }}
        />
      </Card>

      {creating && (
        <CreateUser
          role={role}
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            reload();
          }}
        />
      )}
      {editing && (
        <EditUser
          user={editing}
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

interface CreateValues {
  role: Role;
  full_name: string;
  national_code?: string;
  username: string;
  password: string;
}

function CreateUser({ role, onClose, onDone }: { role: Role; onClose: () => void; onDone: () => void }) {
  const run = useAction();
  const [form] = Form.useForm<CreateValues>();
  const [busy, setBusy] = useState(false);

  async function submit(v: CreateValues) {
    setBusy(true);
    const ok = await run(
      () => api("/admin/users", { method: "POST", body: { ...v, national_code: v.national_code || null } }),
      `${v.full_name} اضافه شد`,
    );
    setBusy(false);
    if (ok) onDone();
  }

  return (
    <Modal open title="افزودن کاربر" onCancel={onClose} onOk={() => form.submit()} okText="ثبت" confirmLoading={busy}>
      <Form form={form} layout="vertical" onFinish={submit} initialValues={{ role }}>
        <Form.Item name="role" label="نقش">
          <Select options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
        </Form.Item>
        <Form.Item name="full_name" label="نام و نام خانوادگی" rules={[{ required: true, min: 2, message: "نام را وارد کنید" }]}>
          <Input />
        </Form.Item>
        <Form.Item name="national_code" label="کد ملی (اختیاری)">
          <Input dir="ltr" inputMode="numeric" />
        </Form.Item>
        <Form.Item name="username" label="نام کاربری" rules={[{ required: true, min: 3, message: "حداقل ۳ حرف" }]}>
          <Input dir="ltr" autoComplete="off" />
        </Form.Item>
        <Form.Item name="password" label="رمز عبور" rules={[{ required: true, min: 4, message: "حداقل ۴ حرف" }]}>
          <Input.Password dir="ltr" autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

interface EditValues {
  full_name: string;
  national_code?: string;
  password?: string;
  is_active: boolean;
}

function EditUser({ user, onClose, onDone }: { user: User; onClose: () => void; onDone: () => void }) {
  const run = useAction();
  const [form] = Form.useForm<EditValues>();

  async function submit(v: EditValues) {
    const body: Record<string, unknown> = {
      full_name: v.full_name,
      national_code: v.national_code || null,
      is_active: v.is_active,
    };
    if (v.password) body.password = v.password;
    if (await run(() => api(`/admin/users/${user.id}`, { method: "PATCH", body }), "ذخیره شد")) onDone();
  }

  async function remove() {
    if (await run(() => api(`/admin/users/${user.id}`, { method: "DELETE" }), "کاربر حذف شد")) onDone();
  }

  return (
    <Modal
      open
      title={`ویرایش ${user.full_name}`}
      onCancel={onClose}
      footer={
        <Flex justify="space-between">
          <Popconfirm
            title={`«${user.full_name}» حذف شود؟`}
            description="اگر سابقه نمره داشته باشد، به‌جای حذف غیرفعالش کنید."
            okText="حذف"
            cancelText="انصراف"
            okButtonProps={{ danger: true }}
            onConfirm={remove}
          >
            <Button danger icon={<DeleteOutlined />}>
              حذف کاربر
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
        onFinish={submit}
        initialValues={{ full_name: user.full_name, national_code: user.national_code ?? "", is_active: user.is_active }}
      >
        <Form.Item name="full_name" label="نام و نام خانوادگی" rules={[{ required: true, min: 2, message: "نام را وارد کنید" }]}>
          <Input />
        </Form.Item>
        <Form.Item name="national_code" label="کد ملی">
          <Input dir="ltr" />
        </Form.Item>
        <Form.Item name="password" label="رمز عبور جدید" extra="خالی بگذارید تا تغییر نکند" rules={[{ min: 4, message: "حداقل ۴ حرف" }]}>
          <Input.Password dir="ltr" autoComplete="new-password" />
        </Form.Item>
        <Form.Item name="is_active" label="حساب فعال" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
