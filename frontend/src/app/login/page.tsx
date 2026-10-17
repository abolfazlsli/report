"use client";

import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Flex, Form, Input, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HOME_BY_ROLE, useAuth } from "@/lib/auth";

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
    <Flex justify="center" align="center" style={{ minHeight: "100vh", padding: 16 }}>
      <Card style={{ width: "100%", maxWidth: 380 }}>
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>
          سامانه کارنامه
        </Typography.Title>
        <Typography.Paragraph type="secondary">برای ورود نام کاربری و رمز عبور خود را وارد کنید.</Typography.Paragraph>
        <Form layout="vertical" onFinish={submit} requiredMark={false}>
          <Form.Item name="username" label="نام کاربری" rules={[{ required: true, message: "نام کاربری را وارد کنید" }]}>
            <Input prefix={<UserOutlined />} autoComplete="username" dir="ltr" size="large" />
          </Form.Item>
          <Form.Item name="password" label="رمز عبور" rules={[{ required: true, message: "رمز عبور را وارد کنید" }]}>
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" dir="ltr" size="large" />
          </Form.Item>
          {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
          <Button type="primary" htmlType="submit" block size="large" loading={busy}>
            ورود
          </Button>
        </Form>
      </Card>
    </Flex>
  );
}
