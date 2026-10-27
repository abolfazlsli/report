"use client";

import { BarChartOutlined, FilePdfOutlined, LockOutlined, ReadOutlined, StarOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Col, Flex, Form, Input, Row, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HOME_BY_ROLE, useAuth } from "@/lib/auth";

const FEATURES = [
  { icon: <BarChartOutlined />, title: "نمودار پیشرفت", text: "روند نمرات هر درس و مقایسه با میانگین کلاس" },
  { icon: <StarOutlined />, title: "ارزشیابی توصیفی", text: "نمره‌دهی ۱ تا ۵ به مهارت‌های هر درس" },
  { icon: <FilePdfOutlined />, title: "کارنامه PDF", text: "دریافت کارنامه رسمی با یک کلیک" },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace(HOME_BY_ROLE[user.role]);
  }, [user, router]);

  async function submit(v: { username: string; password: string }) {
    setBusy(true);
    setError(null);
    try {
      const u = await login(v.username, v.password);
      router.replace(HOME_BY_ROLE[u.role]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Row style={{ minHeight: "100vh" }}>
      <Col xs={0} lg={12} style={{ background: "var(--sider)", color: "#fff", position: "relative", overflow: "hidden" }}>
        <div
          aria-hidden
          style={{
            position: "absolute",
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(129,140,248,0.35), transparent 65%)",
            top: -160,
            insetInlineEnd: -160,
          }}
        />
        <Flex vertical justify="center" style={{ height: "100%", padding: "48px 64px", position: "relative" }}>
          <span className="sider-logo" style={{ width: 56, height: 56, fontSize: 26, borderRadius: 16 }}>
            <ReadOutlined />
          </span>
          <div style={{ fontSize: 34, fontWeight: 800, marginTop: 24, lineHeight: 1.5 }}>سامانه کارنامه</div>
          <div style={{ fontSize: 16, opacity: 0.75, marginTop: 8, maxWidth: 420 }}>
            مدیریت واحدها و کلاس‌ها، ثبت نمرات و ارزشیابی توصیفی، و کارنامه هوشمند برای دانش‌آموزان.
          </div>
          <Flex vertical gap={14} style={{ marginTop: 40 }}>
            {FEATURES.map((f) => (
              <Flex key={f.title} gap={14} align="center">
                <span className="stat-icon" style={{ background: "rgba(255,255,255,0.1)", color: "#c7d2fe" }}>
                  {f.icon}
                </span>
                <div>
                  <div style={{ fontWeight: 700 }}>{f.title}</div>
                  <div style={{ fontSize: 13, opacity: 0.65 }}>{f.text}</div>
                </div>
              </Flex>
            ))}
          </Flex>
        </Flex>
      </Col>
      <Col xs={24} lg={12}>
        <Flex justify="center" align="center" style={{ minHeight: "100vh", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 380 }}>
            <Typography.Title level={2} style={{ marginBottom: 4, fontWeight: 800 }}>
              ورود به حساب
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 28 }}>
              نام کاربری و رمز عبوری که مدرسه به شما داده را وارد کنید.
            </Typography.Paragraph>
            <Form layout="vertical" onFinish={submit} requiredMark={false} size="large">
              <Form.Item name="username" label="نام کاربری" rules={[{ required: true, message: "نام کاربری را وارد کنید" }]}>
                <Input prefix={<UserOutlined />} autoComplete="username" dir="ltr" />
              </Form.Item>
              <Form.Item name="password" label="رمز عبور" rules={[{ required: true, message: "رمز عبور را وارد کنید" }]}>
                <Input.Password prefix={<LockOutlined />} autoComplete="current-password" dir="ltr" />
              </Form.Item>
              {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
              <Button type="primary" htmlType="submit" block loading={busy} style={{ height: 48, fontWeight: 700 }}>
                ورود
              </Button>
            </Form>
          </div>
        </Flex>
      </Col>
    </Row>
  );
}
