"use client";

import { DeleteOutlined, PlusOutlined, RiseOutlined, UserAddOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Flex, Form, Modal, Popconfirm, Row, Select, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Loading, PageHeader, useAction } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { faDate, faNum, ltr, STATUS_LABEL } from "@/lib/format";
import { byNum, byText, searchFilter, tableDefaults, valueFilter } from "@/lib/table";
import type { ClassDetail, ClassSubject, Enrollment, Subject, Unit, User } from "@/lib/types";

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const run = useAction();
  const { data, error, loading, reload } = useApi<ClassDetail>(`/admin/classes/${id}`);
  const units = useApi<Unit[]>("/admin/units");

  if (loading && !data) return <Loading />;
  if (error || !data) return <Alert type="error" title={error ?? "کلاس یافت نشد"} showIcon />;

  const active = data.enrollments.filter((e) => e.status === "active");
  const history = data.enrollments.filter((e) => e.status !== "active");

  return (
    <>
      <PageHeader
        back={{ href: "/admin/classes", label: "همه کلاس‌ها" }}
        title={`پایه ${data.grade.name} - کلاس ${data.name}`}
        subtitle={`${data.unit ? data.unit.name + " · " : ""}دوره ${ltr(data.academic_year.name)} · ${faNum(active.length)} دانش‌آموز فعال`}
        actions={
          <>
            <Select
              value={data.unit?.id}
              placeholder="تعیین واحد"
              style={{ minWidth: 180 }}
              options={(units.data ?? []).map((u) => ({ value: u.id, label: u.name }))}
              onChange={async (unit_id) =>
                (await run(() => api(`/admin/classes/${data.id}`, { method: "PATCH", body: { unit_id } }), "واحد کلاس تغییر کرد")) &&
                reload()
              }
              aria-label="واحد کلاس"
            />
            {active.length > 0 && (
              <Link href={`/admin/promote?source=${data.id}`}>
                <Button icon={<RiseOutlined />}>ارتقا / انتقال دانش‌آموزان</Button>
              </Link>
            )}
            {data.enrollments.length === 0 && (
              <Popconfirm
                title="این کلاس حذف شود؟"
                okText="حذف"
                cancelText="انصراف"
                okButtonProps={{ danger: true }}
                onConfirm={async () => {
                  if (await run(() => api(`/admin/classes/${data.id}`, { method: "DELETE" }), "کلاس حذف شد"))
                    router.replace("/admin/classes");
                }}
              >
                <Button danger icon={<DeleteOutlined />}>
                  حذف کلاس
                </Button>
              </Popconfirm>
            )}
          </>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={13}>
          <SubjectsCard data={data} reload={reload} />
        </Col>
        <Col xs={24} xl={11}>
          <StudentsCard data={data} active={active} reload={reload} />
        </Col>
        {history.length > 0 && (
          <Col span={24}>
            <HistoryCard history={history} />
          </Col>
        )}
      </Row>
    </>
  );
}

function SubjectsCard({ data, reload }: { data: ClassDetail; reload: () => void }) {
  const run = useAction();
  const subjects = useApi<Subject[]>("/admin/subjects");
  const teachers = useApi<User[]>("/admin/users?role=teacher");
  const [form] = Form.useForm<{ subject_id: number; teacher_id?: number }>();

  const used = new Set(data.subjects.map((s) => s.subject.id));
  const teacherOptions = (teachers.data ?? [])
    .filter((t) => t.is_active)
    .map((t) => ({ value: t.id, label: t.full_name }));

  const setTeacher = (cs: ClassSubject, teacherId: number | null) =>
    run(
      () => api(`/admin/class-subjects/${cs.id}`, { method: "PATCH", body: { teacher_id: teacherId } }),
      "معلم درس به‌روز شد",
    ).then((ok) => ok && reload());

  const columns: ColumnsType<ClassSubject> = [
    {
      title: "درس",
      key: "subject",
      render: (_, cs) => <strong>{cs.subject.name}</strong>,
      sorter: byText((cs) => cs.subject.name),
      defaultSortOrder: "ascend",
      ...searchFilter((cs) => cs.subject.name),
    },
    {
      title: "معلم",
      key: "teacher",
      render: (_, cs) => {
        // keep an inactive current teacher visible in the select
        const options =
          cs.teacher && !teacherOptions.some((o) => o.value === cs.teacher!.id)
            ? [{ value: cs.teacher.id, label: cs.teacher.full_name }, ...teacherOptions]
            : teacherOptions;
        return (
          <Select
            size="small"
            value={cs.teacher?.id}
            placeholder="بدون معلم"
            allowClear
            showSearch={{ optionFilterProp: "label" }}
            options={options}
            style={{ minWidth: 150 }}
            onChange={(v) => setTeacher(cs, v ?? null)}
            aria-label={`معلم ${cs.subject.name}`}
          />
        );
      },
      sorter: byText((cs) => cs.teacher?.full_name),
      ...valueFilter(data.subjects, (cs) => cs.teacher?.full_name ?? "بدون معلم"),
    },
    {
      title: "نمرات",
      dataIndex: "score_count",
      render: (v, cs) => (
        <Flex gap={12}>
          <Link href={`/admin/sheets/${cs.id}`}>{faNum(v)} نمره</Link>
          <Link href={`/admin/sheets/${cs.id}?tab=ratings`}>توصیفی</Link>
        </Flex>
      ),
      sorter: byNum((cs) => cs.score_count),
    },
    {
      title: "",
      key: "actions",
      align: "end",
      render: (_, cs) =>
        cs.score_count === 0 && (
          <Popconfirm
            title={`درس ${cs.subject.name} از کلاس حذف شود؟`}
            okText="حذف"
            cancelText="انصراف"
            okButtonProps={{ danger: true }}
            onConfirm={async () =>
              (await run(() => api(`/admin/class-subjects/${cs.id}`, { method: "DELETE" }), "درس حذف شد")) && reload()
            }
          >
            <Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label="حذف درس" />
          </Popconfirm>
        ),
    },
  ];

  return (
    <Card className="soft" title="دروس و معلمان کلاس" style={{ height: "100%" }}>
      <Form
        form={form}
        layout="inline"
        style={{ marginBottom: 12, rowGap: 8 }}
        onFinish={async (v) => {
          const ok = await run(
            () => api(`/admin/classes/${data.id}/subjects`, { method: "POST", body: { ...v, teacher_id: v.teacher_id ?? null } }),
            "درس اضافه شد",
          );
          if (ok) {
            form.resetFields();
            reload();
          }
        }}
      >
        <Form.Item name="subject_id" rules={[{ required: true, message: "درس" }]} style={{ minWidth: 140 }}>
          <Select
            placeholder="انتخاب درس"
            showSearch={{ optionFilterProp: "label" }}
            options={(subjects.data ?? []).filter((s) => !used.has(s.id)).map((s) => ({ value: s.id, label: s.name }))}
          />
        </Form.Item>
        <Form.Item name="teacher_id" style={{ minWidth: 150 }}>
          <Select placeholder="معلم (اختیاری)" allowClear showSearch={{ optionFilterProp: "label" }} options={teacherOptions} />
        </Form.Item>
        <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
          افزودن درس
        </Button>
      </Form>
      <Table<ClassSubject>
        {...tableDefaults}
        rowKey="id"
        columns={columns}
        dataSource={data.subjects}
        locale={{ emptyText: "هنوز درسی برای این کلاس تعریف نشده است." }}
      />
    </Card>
  );
}

function StudentsCard({ data, active, reload }: { data: ClassDetail; active: Enrollment[]; reload: () => void }) {
  const run = useAction();
  const [adding, setAdding] = useState(false);

  const columns: ColumnsType<Enrollment> = [
    {
      title: "دانش‌آموز",
      key: "student",
      render: (_, e) => <Link href={`/admin/students/${e.student.id}`}>{e.student.full_name}</Link>,
      sorter: byText((e) => e.student.full_name),
      defaultSortOrder: "ascend",
      ...searchFilter((e) => e.student.full_name, "نام دانش‌آموز…"),
    },
    { title: "از تاریخ", dataIndex: "started_at", render: faDate, sorter: byText((e) => e.started_at) },
    {
      title: "",
      key: "actions",
      align: "end",
      render: (_, e) => (
        <Popconfirm
          title={`«${e.student.full_name}» از کلاس خارج شود؟`}
          description="نمرات ثبت‌شده حفظ می‌شوند."
          okText="خروج از کلاس"
          cancelText="انصراف"
          okButtonProps={{ danger: true }}
          onConfirm={async () =>
            (await run(() => api(`/admin/enrollments/${e.id}`, { method: "DELETE" }), "دانش‌آموز از کلاس خارج شد")) &&
            reload()
          }
        >
          <Button type="text" danger size="small">
            خروج از کلاس
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card
      className="soft"
      title="دانش‌آموزان کلاس"
      extra={
        <Button type="primary" size="small" icon={<UserAddOutlined />} onClick={() => setAdding(true)}>
          افزودن دانش‌آموز
        </Button>
      }
      style={{ height: "100%" }}
    >
      <Table<Enrollment>
        {...tableDefaults}
        rowKey="id"
        columns={columns}
        dataSource={active}
        locale={{ emptyText: "دانش‌آموز فعالی در این کلاس نیست." }}
      />
      {adding && (
        <AddStudents
          classId={data.id}
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            reload();
          }}
        />
      )}
    </Card>
  );
}

function AddStudents({ classId, onClose, onDone }: { classId: number; onClose: () => void; onDone: () => void }) {
  const run = useAction();
  const unassigned = useApi<User[]>("/admin/users?role=student&unassigned=true");
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const candidates = (unassigned.data ?? []).filter((u) => u.is_active);

  async function submit() {
    setBusy(true);
    const ok = await run(
      () => api(`/admin/classes/${classId}/enrollments`, { method: "POST", body: { student_ids: selected } }),
      `${faNum(selected.length)} دانش‌آموز به کلاس اضافه شد`,
    );
    setBusy(false);
    if (ok) onDone();
  }

  return (
    <Modal
      open
      title="افزودن دانش‌آموز به کلاس"
      onCancel={onClose}
      onOk={submit}
      okText={`افزودن ${selected.length ? faNum(selected.length) : ""} دانش‌آموز`}
      okButtonProps={{ disabled: !selected.length }}
      confirmLoading={busy}
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        فقط دانش‌آموزانی که کلاس فعال ندارند نمایش داده می‌شوند. برای جابجایی دانش‌آموزان کلاس‌های دیگر از بخش «ارتقا و انتقال»
        استفاده کنید. دانش‌آموز جدید را از بخش <Link href="/admin/users?role=student">کاربران</Link> بسازید.
      </Typography.Paragraph>
      <Table<User>
        {...tableDefaults}
        size="small"
        rowKey="id"
        loading={unassigned.loading}
        dataSource={candidates}
        rowSelection={{ selectedRowKeys: selected, onChange: (keys) => setSelected(keys as number[]) }}
        columns={[
          {
            title: "نام",
            dataIndex: "full_name",
            sorter: byText((u) => u.full_name),
            defaultSortOrder: "ascend",
            ...searchFilter((u) => u.full_name),
          },
          {
            title: "نام کاربری",
            dataIndex: "username",
            render: (v) => <span dir="ltr">{v}</span>,
            ...searchFilter((u) => u.username),
          },
          { title: "کد ملی", dataIndex: "national_code", render: (v) => v ?? "—", ...searchFilter((u) => u.national_code) },
        ]}
        locale={{ emptyText: "دانش‌آموز بدون کلاسی وجود ندارد." }}
      />
    </Modal>
  );
}

function HistoryCard({ history }: { history: Enrollment[] }) {
  const columns: ColumnsType<Enrollment> = [
    {
      title: "دانش‌آموز",
      key: "student",
      render: (_, e) => <Link href={`/admin/students/${e.student.id}`}>{e.student.full_name}</Link>,
      sorter: byText((e) => e.student.full_name),
      ...searchFilter((e) => e.student.full_name),
    },
    {
      title: "وضعیت",
      key: "status",
      render: (_, e) => <Tag>{STATUS_LABEL[e.status]}</Tag>,
      ...valueFilter(history, (e) => STATUS_LABEL[e.status]),
    },
    { title: "از", dataIndex: "started_at", render: faDate, sorter: byText((e) => e.started_at) },
    {
      title: "تا",
      dataIndex: "ended_at",
      render: (v) => (v ? faDate(v) : "—"),
      sorter: byText((e) => e.ended_at),
      defaultSortOrder: "descend",
    },
  ];
  return (
    <Card className="soft" title="سابقه (دانش‌آموزانی که از این کلاس رفته‌اند)">
      <Flex vertical>
        <Table<Enrollment> {...tableDefaults} rowKey="id" columns={columns} dataSource={history} />
      </Flex>
    </Card>
  );
}
