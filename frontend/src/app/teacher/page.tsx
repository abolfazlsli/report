"use client";

import { ApartmentOutlined, BookOutlined, EditOutlined, StarOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Empty, Flex, Progress, Row, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { Hero, Loading, ScoreValue, StatCard } from "@/components/ui";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { faNum, ltr } from "@/lib/format";
import { byNum, byText, scoreFilter, tableDefaults, valueFilter } from "@/lib/table";
import type { Assignment } from "@/lib/types";

const ratingPercent = (a: Assignment) => {
  const expected = a.criteria_count * a.student_count;
  return expected ? Math.min(100, Math.round((a.rated_count / expected) * 100)) : null;
};

export default function TeacherHome() {
  const { user } = useAuth();
  const { data, error, loading } = useApi<Assignment[]>("/teacher/assignments");
  const rows = data ?? [];
  const current = rows.filter((a) => a.is_current_year);
  const students = current.reduce((n, a) => n + a.student_count, 0);
  const expected = current.reduce((n, a) => n + a.criteria_count * a.student_count, 0);
  const rated = current.reduce((n, a) => n + a.rated_count, 0);

  const columns: ColumnsType<Assignment> = [
    {
      title: "درس",
      dataIndex: "subject_name",
      render: (v, a) => (
        <Link href={`/teacher/assignments/${a.class_subject_id}`}>
          <strong>{v}</strong>
        </Link>
      ),
      sorter: byText((a) => a.subject_name),
      ...valueFilter(rows, (a) => a.subject_name),
    },
    { title: "واحد", dataIndex: "unit_name", render: (v) => v ?? "—", ...valueFilter(rows, (a) => a.unit_name) },
    {
      title: "پایه / کلاس",
      key: "class",
      render: (_, a) => `${a.grade_name} - ${a.class_name}`,
      sorter: byText((a) => a.grade_name),
      ...valueFilter(rows, (a) => a.grade_name),
    },
    {
      title: "دوره",
      dataIndex: "year_name",
      render: (v, a) => <Tag color={a.is_current_year ? "blue" : "default"}>{v}</Tag>,
      sorter: byText((a) => a.year_name),
      ...valueFilter(rows, (a) => (a.is_current_year ? `${a.year_name} (جاری)` : a.year_name)),
    },
    { title: "نمرات", dataIndex: "score_count", render: (v) => <span className="tabular">{faNum(v)}</span>, sorter: byNum((a) => a.score_count) },
    { title: "میانگین", dataIndex: "average", render: (v) => <ScoreValue value={v} />, ...scoreFilter((a) => a.average) },
    {
      title: "",
      key: "action",
      render: (_, a) => <Link href={`/teacher/assignments/${a.class_subject_id}`}>{a.is_current_year ? "ثبت نمره" : "مشاهده"}</Link>,
    },
  ];

  return (
    <>
      <Hero
        title={`سلام ${user?.full_name ?? ""}`}
        subtitle="کلاس‌های این دوره، وضعیت نمرات و ارزشیابی توصیفی شما"
        chips={[
          <>
            <BookOutlined /> {faNum(current.length)} درس در دوره جاری
          </>,
        ]}
      />
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} xl={6}>
          <StatCard icon={<ApartmentOutlined />} title="کلاس‌های دوره جاری" value={new Set(current.map((a) => a.class_id)).size} />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard icon={<UserOutlined />} tone="green" title="دانش‌آموزان" value={students} hint="مجموع دانش‌آموزان درس‌ها" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard icon={<EditOutlined />} tone="orange" title="نمرات ثبت‌شده" value={current.reduce((n, a) => n + a.score_count, 0)} />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            icon={<StarOutlined />}
            tone="pink"
            title="تکمیل ارزشیابی توصیفی"
            value={expected ? `${faNum(Math.round((rated / expected) * 100))}٪` : "—"}
            hint={expected ? `${faNum(rated)} از ${faNum(expected)} مورد` : "موردی تعریف نشده"}
          />
        </Col>
      </Row>

      <Typography.Title level={5} style={{ marginBottom: 12 }}>
        درس‌های دوره جاری
      </Typography.Title>
      {loading && !data && <Loading />}
      {data && !current.length && (
        <Card className="soft" style={{ marginBottom: 20 }}>
          <Empty description="در دوره جاری درسی به شما واگذار نشده است." />
        </Card>
      )}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {current.map((a, i) => {
          const pct = ratingPercent(a);
          return (
            <Col key={a.class_subject_id} xs={24} md={12} xl={8}>
              <Card className="soft lift" style={{ height: "100%", borderTop: `3px solid var(--series-${(i % 8) + 1})` }}>
                <Flex justify="space-between" align="flex-start">
                  <div>
                    <Typography.Title level={5} style={{ margin: 0 }}>
                      {a.subject_name}
                    </Typography.Title>
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                      پایه {a.grade_name} - کلاس {a.class_name}
                      {a.unit_name ? ` · ${a.unit_name}` : ""}
                    </Typography.Text>
                  </div>
                  <Tag>{ltr(a.year_name)}</Tag>
                </Flex>
                <Flex gap={16} style={{ margin: "16px 0" }}>
                  <Mini label="دانش‌آموز" value={faNum(a.student_count)} />
                  <Mini label="نمره" value={faNum(a.score_count)} />
                  <Mini label="میانگین" value={faNum(a.average)} />
                </Flex>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>
                  ارزشیابی توصیفی {pct === null ? "(موردی تعریف نشده)" : ""}
                </div>
                <Progress percent={pct ?? 0} size="small" strokeColor="var(--primary)" format={(p) => `${faNum(p ?? 0)}٪`} />
                <Flex gap={8} style={{ marginTop: 12 }}>
                  <Link href={`/teacher/assignments/${a.class_subject_id}`} style={{ flex: 1 }}>
                    <Button type="primary" block icon={<EditOutlined />}>
                      ثبت نمره
                    </Button>
                  </Link>
                  <Link href={`/teacher/assignments/${a.class_subject_id}?tab=ratings`} style={{ flex: 1 }}>
                    <Button block icon={<StarOutlined />}>
                      توصیفی
                    </Button>
                  </Link>
                </Flex>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Card className="soft" title="همه درس‌ها (شامل دوره‌های گذشته)">
        <Table<Assignment>
          {...tableDefaults}
          rowKey="class_subject_id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          locale={{ emptyText: "درسی به شما واگذار نشده است." }}
        />
      </Card>
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, padding: "8px 10px", borderRadius: 10, background: "var(--surface-2)" }}>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>{label}</div>
      <div className="tabular" style={{ fontWeight: 800, fontSize: 16 }}>
        {value}
      </div>
    </div>
  );
}
