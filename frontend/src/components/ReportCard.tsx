"use client";

import { Card, Col, Empty, Flex, Row, Select, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";
import { faDate, faNum, ltr, STATUS_LABEL } from "@/lib/format";
import { byNum, byText, scoreFilter, searchFilter, tableDefaults, valueFilter } from "@/lib/table";
import type { Report, ReportEnrollment, ReportSubject, Score } from "@/lib/types";
import { AverageBars, Legend, seriesColor, TrendChart, type TrendSeries } from "./charts";
import { ScoreValue, StatCard } from "./ui";

const enrollmentLabel = (e: ReportEnrollment) => `پایه ${e.grade_name} - کلاس ${e.class_name} (${ltr(e.year_name)})`;

/** Student report card: score trend chart, per-subject table and academic history. */
export function ReportCard({ report }: { report: Report }) {
  const enrollments = report.enrollments;
  const defaultId =
    enrollments.find((e) => e.status === "active")?.enrollment_id ?? enrollments.at(-1)?.enrollment_id;
  const [enrollmentId, setEnrollmentId] = useState<number | undefined>(defaultId);
  const [chartSubjects, setChartSubjects] = useState<number[]>([]);

  // Color follows the subject everywhere (stable across periods), never its rank.
  const colorBySubject = useMemo(() => {
    const ids = [...new Set(enrollments.flatMap((e) => e.subjects.map((s) => s.subject_id)))].sort((a, b) => a - b);
    return new Map(ids.map((id, i) => [id, seriesColor(i)]));
  }, [enrollments]);

  const current = enrollments.find((e) => e.enrollment_id === enrollmentId);
  if (!current) {
    return (
      <Card>
        <Empty description="هنوز سابقه تحصیلی برای این دانش‌آموز ثبت نشده است." />
      </Card>
    );
  }

  const series: TrendSeries[] = current.subjects
    .filter((s) => s.scores.length && (!chartSubjects.length || chartSubjects.includes(s.subject_id)))
    .map((s) => ({
      key: `s${s.subject_id}`,
      name: s.subject_name,
      color: colorBySubject.get(s.subject_id)!,
      points: s.scores.map((x) => ({ date: x.date, value: x.value, title: x.title })),
    }));
  const scoreCount = current.subjects.reduce((n, s) => n + s.scores.length, 0);

  const subjectColumns: ColumnsType<ReportSubject> = [
    {
      title: "درس",
      key: "subject",
      render: (_, s) => (
        <Flex align="center" gap={8}>
          <span style={{ width: 8, height: 8, borderRadius: 8, background: colorBySubject.get(s.subject_id) }} />
          <strong>{s.subject_name}</strong>
        </Flex>
      ),
      sorter: byText((s) => s.subject_name),
      ...valueFilter(current.subjects, (s) => s.subject_name),
    },
    {
      title: "معلم",
      dataIndex: "teacher_name",
      render: (v) => v ?? "—",
      sorter: byText((s) => s.teacher_name),
      ...valueFilter(current.subjects, (s) => s.teacher_name),
    },
    {
      title: "تعداد نمره",
      key: "count",
      render: (_, s) => <span className="tabular">{faNum(s.scores.length)}</span>,
      sorter: byNum((s) => s.scores.length),
    },
    {
      title: "آخرین نمره",
      key: "last",
      render: (_, s) => {
        const last = s.scores.at(-1);
        return last ? (
          <span className="tabular">
            {faNum(last.value)}{" "}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              ({faDate(last.date)})
            </Typography.Text>
          </span>
        ) : (
          "—"
        );
      },
      sorter: byNum((s) => s.scores.at(-1)?.value),
    },
    {
      title: "میانگین",
      key: "average",
      render: (_, s) => <ScoreValue value={s.average} />,
      ...scoreFilter((s) => s.average),
    },
  ];

  const historyColumns: ColumnsType<ReportEnrollment> = [
    {
      title: "دوره",
      dataIndex: "year_name",
      render: (v) => <span className="tabular">{v}</span>,
      sorter: byText((e) => e.year_name),
      ...valueFilter(enrollments, (e) => e.year_name),
    },
    {
      title: "پایه / کلاس",
      key: "class",
      render: (_, e) => `${e.grade_name} - ${e.class_name}`,
      sorter: byNum((e) => e.grade_level),
      ...valueFilter(enrollments, (e) => e.grade_name),
    },
    {
      title: "وضعیت",
      dataIndex: "status",
      render: (_, e) => <Tag color={e.status === "active" ? "blue" : "default"}>{STATUS_LABEL[e.status]}</Tag>,
      ...valueFilter(enrollments, (e) => STATUS_LABEL[e.status]),
    },
    { title: "از", dataIndex: "started_at", render: faDate, sorter: byText((e) => e.started_at) },
    {
      title: "تا",
      dataIndex: "ended_at",
      render: (v) => (v ? faDate(v) : "—"),
      sorter: byText((e) => e.ended_at),
    },
    {
      title: "معدل",
      key: "average",
      render: (_, e) => <ScoreValue value={e.average} />,
      ...scoreFilter((e) => e.average),
    },
  ];

  return (
    <Flex vertical gap={20}>
      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}>
          <StatCard title="دانش‌آموز" value={report.student.full_name} />
        </Col>
        <Col xs={12} md={6}>
          <StatCard title="کلاس فعلی" value={<span style={{ fontSize: 14 }}>{report.current_class ?? "—"}</span>} />
        </Col>
        <Col xs={12} md={6}>
          <StatCard title="معدل این دوره" value={<ScoreValue value={current.average} />} />
        </Col>
        <Col xs={12} md={6}>
          <StatCard title="تعداد نمرات این دوره" value={scoreCount} />
        </Col>
      </Row>

      <Flex wrap gap={12} align="center">
        <Select
          value={enrollmentId}
          onChange={(v) => {
            setEnrollmentId(v);
            setChartSubjects([]);
          }}
          options={enrollments.map((e) => ({ value: e.enrollment_id, label: enrollmentLabel(e) }))}
          style={{ minWidth: 280 }}
          aria-label="دوره تحصیلی"
        />
        <Tag color={current.status === "active" ? "blue" : "default"}>{STATUS_LABEL[current.status]}</Tag>
      </Flex>

      <Card
        title="روند نمرات"
        extra={
          <Select
            mode="multiple"
            allowClear
            placeholder="همه دروس"
            value={chartSubjects}
            onChange={setChartSubjects}
            options={current.subjects.map((s) => ({ value: s.subject_id, label: s.subject_name }))}
            style={{ minWidth: 180 }}
            maxTagCount="responsive"
            aria-label="فیلتر درس در نمودار"
          />
        }
      >
        {series.length ? (
          <>
            <Legend items={series} />
            <TrendChart series={series} />
          </>
        ) : (
          <Empty description="در این دوره هنوز نمره‌ای ثبت نشده است." />
        )}
      </Card>

      <Card title={`کارنامه دروس — ${enrollmentLabel(current)}`}>
        <Table<ReportSubject>
          {...tableDefaults}
          rowKey="class_subject_id"
          columns={subjectColumns}
          dataSource={current.subjects}
          expandable={{
            rowExpandable: (s) => s.scores.length > 0,
            expandedRowRender: (s) => <ScoreList scores={s.scores} />,
          }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5}>
                <strong>معدل کل دوره</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <ScoreValue value={current.average} />
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>

      <Card title="سابقه تحصیلی">
        {enrollments.length > 1 && (
          <AverageBars
            data={enrollments.map((e) => ({
              label: `پایه ${e.grade_name}`,
              sub: `کلاس ${e.class_name} · ${ltr(e.year_name)}`,
              value: e.average,
            }))}
          />
        )}
        <Table<ReportEnrollment>
          {...tableDefaults}
          rowKey="enrollment_id"
          columns={historyColumns}
          dataSource={enrollments}
        />
      </Card>
    </Flex>
  );
}

function ScoreList({ scores }: { scores: Score[] }) {
  const columns: ColumnsType<Score> = [
    { title: "تاریخ", dataIndex: "date", render: faDate, sorter: byText((x) => x.date), defaultSortOrder: "ascend" },
    { title: "عنوان", dataIndex: "title", render: (v) => v ?? "—", ...searchFilter((x) => x.title) },
    { title: "نمره", dataIndex: "value", render: (v) => <ScoreValue value={v} />, ...scoreFilter((x) => x.value) },
    { title: "ثبت‌کننده", dataIndex: "teacher_name", render: (v) => v ?? "—", ...valueFilter(scores, (x) => x.teacher_name) },
  ];
  return <Table<Score> {...tableDefaults} size="small" rowKey="id" columns={columns} dataSource={scores} />;
}
