"use client";

import { KeyOutlined } from "@ant-design/icons";
import { Button, Card, Col, Descriptions, Flex, Row, Typography } from "antd";
import { useState } from "react";
import { ChangePasswordModal } from "@/components/Shell";
import { AvatarEditor } from "@/components/UserAvatar";
import { PageHeader } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { faDigits, ROLE_LABEL } from "@/lib/format";

export default function StudentProfile() {
  const { user } = useAuth();
  const [password, setPassword] = useState(false);
  if (!user) return null;

  return (
    <>
      <PageHeader title="پروفایل" subtitle="اطلاعات حساب کاربری تو" />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card className="soft" style={{ textAlign: "center", height: "100%" }}>
            <AvatarEditor />
            <Typography.Title level={4} style={{ margin: "16px 0 0" }}>
              {user.full_name}
            </Typography.Title>
            <Typography.Text type="secondary">{ROLE_LABEL[user.role]}</Typography.Text>
            <Flex justify="center" style={{ marginTop: 20 }}>
              <Button icon={<KeyOutlined />} onClick={() => setPassword(true)}>
                تغییر رمز عبور
              </Button>
            </Flex>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card className="soft" title="مشخصات" style={{ height: "100%" }}>
            <Descriptions
              column={{ xs: 1, md: 2 }}
              items={[
                { key: "name", label: "نام و نام خانوادگی", children: user.full_name },
                { key: "username", label: "نام کاربری", children: <span dir="ltr">{user.username}</span> },
                { key: "code", label: "کد ملی", children: user.national_code ? faDigits(user.national_code) : "—" },
                { key: "class", label: "کلاس فعلی", children: user.current_class ?? "—" },
                { key: "unit", label: "واحد", children: user.current_unit ?? "—" },
                { key: "status", label: "وضعیت حساب", children: user.is_active ? "فعال" : "غیرفعال" },
              ]}
            />
          </Card>
        </Col>
      </Row>
      {password && <ChangePasswordModal onClose={() => setPassword(false)} />}
    </>
  );
}
