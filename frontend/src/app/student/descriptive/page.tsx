"use client";

import { Alert, Card, Col, Empty, Flex, Row, Typography } from "antd";
import { PeriodSelect, periodLabel, useMyReport } from "@/components/student";
import { Loading, PageHeader, RatingValue } from "@/components/ui";
import { faNum, RATING } from "@/lib/format";

export default function StudentDescriptive() {
  const { data, error, loading, period, setPeriod } = useMyReport();
  const subjects = period?.subjects.filter((s) => s.ratings.length) ?? [];

  return (
    <>
      <PageHeader
        title="ارزشیابی توصیفی"
        subtitle={period ? periodLabel(period) : "ارزشیابی معلمان از مهارت‌های تو در هر درس"}
        actions={data && period && <PeriodSelect report={data} value={period} onChange={setPeriod} />}
      />
      {loading && !data && <Loading />}
      {error && <Alert type="error" title={error} showIcon />}

      <Card className="soft" style={{ marginBottom: 16 }} styles={{ body: { padding: "12px 18px" } }}>
        <Flex wrap gap="8px 24px" align="center">
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            مقیاس:
          </Typography.Text>
          {([5, 4, 3, 2, 1] as const).map((v) => (
            <Flex key={v} gap={6} align="center" style={{ fontSize: 13 }}>
              <RatingValue value={v} compact showLabel={false} />
              {faNum(v)} = {RATING[v]}
            </Flex>
          ))}
        </Flex>
      </Card>

      {data && !subjects.length && (
        <Card className="soft">
          <Empty description="برای این دوره هنوز ارزشیابی توصیفی ثبت نشده است." />
        </Card>
      )}
      <Row gutter={[16, 16]}>
        {subjects.map((s, i) => (
          <Col key={s.class_subject_id} xs={24} md={12} xl={8}>
            <Card className="soft" style={{ height: "100%", borderTop: `3px solid var(--series-${(i % 8) + 1})` }}>
              <Flex justify="space-between" align="flex-start" style={{ marginBottom: 12 }}>
                <div>
                  <Typography.Title level={5} style={{ margin: 0 }}>
                    {s.subject_name}
                  </Typography.Title>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {s.teacher_name ? `معلم: ${s.teacher_name}` : "معلم تعیین نشده"}
                  </Typography.Text>
                </div>
                <div style={{ textAlign: "left" }}>
                  <div className="tabular" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>
                    {s.rating_average === null ? "—" : faNum(s.rating_average, 1)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>از ۵</div>
                </div>
              </Flex>
              <Flex vertical>
                {s.ratings.map((r) => (
                  <div key={r.criterion_id} style={{ padding: "10px 0", borderTop: "1px dashed var(--line)" }}>
                    <Flex justify="space-between" align="center" gap={8} wrap>
                      <span style={{ fontWeight: 500 }}>{r.title}</span>
                      <RatingValue value={r.value} compact />
                    </Flex>
                    {(r.note || r.description) && (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {r.note ?? r.description}
                      </Typography.Text>
                    )}
                  </div>
                ))}
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}
