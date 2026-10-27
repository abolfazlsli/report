"use client";

import {
  ApartmentOutlined,
  BarChartOutlined,
  CalendarOutlined,
  ClusterOutlined,
  StarOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Alert, Button, Card, Col, Empty, Flex, Progress, Row, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { CompareBars, LevelBar } from "@/components/charts";
import { Hero, ScoreValue, StatCard } from "@/components/ui";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { faDate, faNum, LEVEL_LABEL, ltr } from "@/lib/format";
import { byNum, byText, scoreFilter, searchFilter, tableDefaults, valueFilter } from "@/lib/table";
import type { Stats } from "@/lib/types";

type Recent = Stats["recent_scores"][number];
type UnitRow = Stats["units"][number];

const LEVEL_COLORS = { good: "var(--good)", ok: "var(--ok)", warning: "var(--warning)", critical: "var(--critical)" } as const;

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data, error, loading } = useApi<Stats>("/admin/stats");
  const recent = data?.recent_scores ?? [];
  const ratingPercent = data?.ratings.expected ? Math.round((data.ratings.filled / data.ratings.expected) * 100) : 0;

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

  const unitColumns: ColumnsType<UnitRow> = [
    { title: "واحد", dataIndex: "name", render: (v) => <strong>{v}</strong>, sorter: byText((u) => u.name) },
    { title: "کلاس‌های دوره جاری", dataIndex: "classes", render: (v) => <span className="tabular">{faNum(v)}</span>, sorter: byNum((u) => u.classes) },
    { title: "دانش‌آموز فعال", dataIndex: "students", render: (v) => <span className="tabular">{faNum(v)}</span>, sorter: byNum((u) => u.students) },
    { title: "میانگین نمرات", dataIndex: "average", render: (v) => <ScoreValue value={v} />, ...scoreFilter((u) => u.average) },
  ];

  return (
    <>
      <Hero
        title={`سلام ${user?.full_name ?? ""}، خوش آمدید`}
        subtitle="نمای کلی وضعیت آموزشی مدرسه در دوره جاری"
        chips={[
          <>
            <CalendarOutlined /> {data?.current_year ? `دوره جاری ${ltr(data.current_year)}` : "دوره جاری تعیین نشده"}
          </>,
          <>
            <ClusterOutlined /> {faNum(data?.units.length ?? 0)} واحد آموزشی
          </>,
        ]}
        extra={
          <Flex gap={8} wrap>
            <Link href="/admin/classes">
              <Button ghost style={{ color: "#fff", borderColor: "rgba(255,255,255,0.7)" }}>مدیریت کلاس‌ها</Button>
            </Link>
            <Link href="/admin/criteria">
              <Button style={{ background: "#fff", color: "#4338ca", border: 0 }}>تعریف نمرات توصیفی</Button>
            </Link>
          </Flex>
        }
      />
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}>
          <StatCard icon={<UserOutlined />} title="دانش‌آموزان" value={data?.students ?? 0} href="/admin/users?role=student" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard icon={<TeamOutlined />} tone="green" title="معلمان" value={data?.teachers ?? 0} href="/admin/users?role=teacher" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            icon={<ApartmentOutlined />}
            tone="orange"
            title="کلاس‌های دوره جاری"
            value={data?.classes ?? 0}
            href="/admin/classes"
            hint={data?.unassigned_subjects ? `${faNum(data.unassigned_subjects)} درس بدون معلم` : undefined}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            icon={<BarChartOutlined />}
            tone="violet"
            title="میانگین نمرات دوره"
            value={<ScoreValue value={data?.year_average ?? null} />}
            hint={`${faNum(data?.year_score_count ?? 0)} نمره در این دوره`}
          />
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
      {data && !data.units.length && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title={
            <>
              هنوز واحدی تعریف نشده است. از بخش <Link href="/admin/units">واحدها</Link> واحدهای مدرسه را بسازید.
            </>
          }
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <Card className="soft" title="میانگین نمرات به تفکیک درس" style={{ height: "100%" }}>
            {data?.subject_averages.length ? (
              <CompareBars
                data={data.subject_averages.map((s) => ({ label: s.name, average: s.average }))}
                series={[{ key: "average", name: "میانگین", color: "var(--series-1)" }]}
              />
            ) : (
              <Empty description="در دوره جاری هنوز نمره‌ای ثبت نشده است." />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Flex vertical gap={16} style={{ height: "100%" }}>
            <Card className="soft" title="توزیع سطح نمرات دوره">
              {data?.year_score_count ? (
                <LevelBar
                  items={(["good", "ok", "warning", "critical"] as const).map((k) => ({
                    key: k,
                    label: LEVEL_LABEL[k],
                    value: data.distribution[k],
                    color: LEVEL_COLORS[k],
                  }))}
                />
              ) : (
                <Typography.Text type="secondary">داده‌ای وجود ندارد.</Typography.Text>
              )}
            </Card>
            <Card className="soft" title="پیشرفت ثبت نمرات توصیفی" style={{ flex: 1 }}>
              <Flex align="center" gap={20}>
                <Progress type="circle" percent={ratingPercent} size={96} strokeColor="var(--primary)" format={(p) => `${faNum(p ?? 0)}٪`} />
                <div>
                  <div style={{ fontSize: 13, color: "var(--ink-2)" }}>
                    <StarOutlined /> {faNum(data?.ratings.filled ?? 0)} از {faNum(data?.ratings.expected ?? 0)} مورد ثبت شده
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                    {faNum(data?.criteria ?? 0)} مورد ارزشیابی برای دروس تعریف شده است.
                  </div>
                </div>
              </Flex>
            </Card>
          </Flex>
        </Col>
      </Row>

      <Card className="soft" title="واحدهای آموزشی" style={{ marginBottom: 16 }} extra={<Link href="/admin/units">مدیریت واحدها</Link>}>
        <Table<UnitRow>
          {...tableDefaults}
          rowKey="id"
          loading={loading}
          columns={unitColumns}
          dataSource={data?.units ?? []}
          locale={{ emptyText: "واحدی تعریف نشده است." }}
        />
      </Card>

      <Card className="soft" title="آخرین نمرات ثبت‌شده">
        <Table<Recent>
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
