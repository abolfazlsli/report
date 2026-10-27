"use client";

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BarChartOutlined,
  BookOutlined,
  CalendarOutlined,
  ClusterOutlined,
  StarOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { Alert, Button, Card, Col, Empty, Flex, Row, Typography } from "antd";
import Link from "next/link";
import { CompareBars } from "@/components/charts";
import { ReportPdfButton } from "@/components/ReportPdf";
import { PeriodSelect, useMyReport } from "@/components/student";
import { Hero, Loading, RatingValue, ScoreValue, StatCard } from "@/components/ui";
import { faDate, faNum, ltr } from "@/lib/format";

export default function StudentDashboard() {
  const { data, error, loading, period, setPeriod } = useMyReport();

  if (loading && !data) return <Loading />;
  if (error) return <Alert type="error" title={error} showIcon />;
  if (!data || !period) {
    return (
      <Card className="soft">
        <Empty description="هنوز سابقه تحصیلی برای شما ثبت نشده است." />
      </Card>
    );
  }

  const graded = period.subjects.filter((s) => s.average !== null).sort((a, b) => b.average! - a.average!);
  const strengths = graded.slice(0, 3);
  const weaknesses = graded.length > 3 ? graded.slice(-2).reverse() : [];
  const recent = period.subjects
    .flatMap((s) => s.scores.map((x) => ({ ...x, subject: s.subject_name })))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    .slice(0, 6);
  const rated = period.subjects.filter((s) => s.rating_average !== null);
  const ratingAvg = rated.length ? rated.reduce((n, s) => n + s.rating_average!, 0) / rated.length : null;
  const scoreCount = period.subjects.reduce((n, s) => n + s.scores.length, 0);
  const firstName = data.student.full_name.split(" ")[0];

  return (
    <>
      <Hero
        title={`سلام ${firstName}، خوش آمدی 👋`}
        subtitle="خلاصه وضعیت تحصیلی تو در یک نگاه"
        chips={[
          <>
            <BookOutlined /> پایه {period.grade_name} - کلاس {period.class_name}
          </>,
          ...(period.unit_name
            ? [
                <>
                  <ClusterOutlined /> {period.unit_name}
                </>,
              ]
            : []),
          <>
            <CalendarOutlined /> سال تحصیلی {ltr(period.year_name)}
          </>,
        ]}
        extra={
          <Flex gap={8} wrap>
            <ReportPdfButton report={data} enrollment={period} />
            <Link href="/student/report">
              <Button ghost style={{ color: "#fff", borderColor: "rgba(255,255,255,0.7)" }}>مشاهده کارنامه</Button>
            </Link>
          </Flex>
        }
      />

      {data.enrollments.length > 1 && (
        <Flex justify="end" style={{ marginBottom: 16 }}>
          <PeriodSelect report={data} value={period} onChange={setPeriod} />
        </Flex>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            icon={<BarChartOutlined />}
            title="معدل من"
            value={<ScoreValue value={period.average} />}
            hint={period.class_average !== null ? `میانگین کلاس: ${faNum(period.class_average)}` : undefined}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            icon={<TrophyOutlined />}
            tone="orange"
            title="رتبه در کلاس"
            value={period.rank ? faNum(period.rank) : "—"}
            suffix={period.rank ? `از ${faNum(period.class_size)} نفر` : undefined}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard icon={<StarOutlined />} tone="pink" title="ارزشیابی توصیفی" value={<RatingValue value={ratingAvg} />} href="/student/descriptive" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard icon={<BookOutlined />} tone="green" title="نمرات ثبت‌شده" value={scoreCount} hint={`در ${faNum(period.subjects.length)} درس`} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} xl={15}>
          <Card className="soft" title="مقایسه نمرات من با میانگین کلاس" style={{ height: "100%" }}>
            {graded.length ? (
              <CompareBars
                data={period.subjects.map((s) => ({ label: s.subject_name, mine: s.average, klass: s.class_average }))}
                series={[
                  { key: "mine", name: "میانگین من", color: "var(--series-1)" },
                  { key: "klass", name: "میانگین کلاس", color: "var(--series-2)" },
                ]}
                height={280}
              />
            ) : (
              <Empty description="هنوز نمره‌ای ثبت نشده است." />
            )}
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Card className="soft" title="نقاط قوت و نیاز به تلاش" style={{ height: "100%" }}>
            {!graded.length && <Typography.Text type="secondary">پس از ثبت نمرات نمایش داده می‌شود.</Typography.Text>}
            <Flex vertical gap={10}>
              {strengths.map((s) => (
                <SubjectLine key={s.class_subject_id} icon={<ArrowUpOutlined />} color="var(--good)" name={s.subject_name} value={s.average} />
              ))}
              {weaknesses.length > 0 && (
                <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 6 }}>
                  دروسی که بهتر است بیشتر روی آن‌ها کار کنی:
                </Typography.Text>
              )}
              {weaknesses.map((s) => (
                <SubjectLine key={s.class_subject_id} icon={<ArrowDownOutlined />} color="var(--warning)" name={s.subject_name} value={s.average} />
              ))}
            </Flex>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card className="soft" title="آخرین نمرات" style={{ height: "100%" }} extra={<Link href="/student/report">همه نمرات</Link>}>
            {!recent.length && <Empty description="نمره‌ای ثبت نشده است." />}
            <Flex vertical>
              {recent.map((x) => (
                <Flex key={x.id} justify="space-between" align="center" style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{x.subject}</div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {x.title ?? "ارزشیابی"} · {faDate(x.date)}
                    </Typography.Text>
                  </div>
                  <ScoreValue value={x.value} />
                </Flex>
              ))}
            </Flex>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card className="soft" title="خلاصه ارزشیابی توصیفی" style={{ height: "100%" }} extra={<Link href="/student/descriptive">جزئیات</Link>}>
            {!period.subjects.some((s) => s.ratings.length) && <Empty description="برای این دوره ارزشیابی توصیفی تعریف نشده است." />}
            <Flex vertical>
              {period.subjects
                .filter((s) => s.ratings.length)
                .map((s) => (
                  <Flex key={s.class_subject_id} justify="space-between" align="center" wrap gap={8} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.subject_name}</div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {faNum(s.ratings.filter((r) => r.value).length)} از {faNum(s.ratings.length)} مورد ثبت شده
                      </Typography.Text>
                    </div>
                    <RatingValue value={s.rating_average} />
                  </Flex>
                ))}
            </Flex>
          </Card>
        </Col>
      </Row>
    </>
  );
}

function SubjectLine({ icon, color, name, value }: { icon: React.ReactNode; color: string; name: string; value: number | null }) {
  return (
    <Flex align="center" gap={12} style={{ padding: "10px 12px", borderRadius: 12, background: "var(--surface-2)" }}>
      <span style={{ color, fontSize: 14 }}>{icon}</span>
      <span style={{ flex: 1, fontWeight: 600 }}>{name}</span>
      <ScoreValue value={value} />
    </Flex>
  );
}
