"use client";

import { CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { Alert, Card, Col, Empty, Flex, Row, Tag, Timeline, Typography } from "antd";
import { AverageBars } from "@/components/charts";
import { useMyReport } from "@/components/student";
import { Loading, PageHeader, ScoreValue } from "@/components/ui";
import { faDate, faNum, ltr, STATUS_LABEL } from "@/lib/format";

export default function StudentHistory() {
  const { data, error, loading } = useMyReport();
  const enrollments = data?.enrollments ?? [];

  return (
    <>
      <PageHeader title="سوابق تحصیلی" subtitle="همه دوره‌هایی که در این مدرسه گذرانده‌ای و معدل هر دوره" />
      {loading && !data && <Loading />}
      {error && <Alert type="error" title={error} showIcon />}
      {data && !enrollments.length && (
        <Card className="soft">
          <Empty description="سابقه‌ای ثبت نشده است." />
        </Card>
      )}
      {enrollments.length > 0 && (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card className="soft" title="معدل دوره‌ها" style={{ height: "100%" }}>
              <AverageBars
                height={280}
                data={enrollments.map((e) => ({
                  label: `پایه ${e.grade_name}`,
                  sub: `کلاس ${e.class_name} · ${ltr(e.year_name)}`,
                  value: e.average,
                }))}
              />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card className="soft" title="مسیر تحصیلی" style={{ height: "100%" }}>
              <Timeline
                items={[...enrollments].reverse().map((e) => ({
                  color: e.status === "active" ? "blue" : "green",
                  icon: e.status === "active" ? <ClockCircleOutlined /> : <CheckCircleOutlined />,
                  content: (
                    <div>
                      <Flex gap={8} align="center" wrap>
                        <strong>
                          پایه {e.grade_name} - کلاس {e.class_name}
                        </strong>
                        <Tag color={e.status === "active" ? "blue" : "default"}>{STATUS_LABEL[e.status]}</Tag>
                      </Flex>
                      <Typography.Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                        {ltr(e.year_name)}
                        {e.unit_name ? ` · ${e.unit_name}` : ""} · {faDate(e.started_at)}
                        {e.ended_at ? ` تا ${faDate(e.ended_at)}` : ""}
                      </Typography.Text>
                      <Flex gap={16} style={{ marginTop: 6, fontSize: 13 }} wrap>
                        <span>
                          معدل: <ScoreValue value={e.average} showLabel={false} />
                        </span>
                        {e.rank && (
                          <span>
                            رتبه: <strong className="tabular">{faNum(e.rank)}</strong> از {faNum(e.class_size)}
                          </span>
                        )}
                      </Flex>
                    </div>
                  ),
                }))}
              />
            </Card>
          </Col>
        </Row>
      )}
    </>
  );
}
