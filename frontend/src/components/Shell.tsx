"use client";

import {
  CameraOutlined,
  DesktopOutlined,
  KeyOutlined,
  LogoutOutlined,
  MenuOutlined,
  MoonOutlined,
  ReadOutlined,
  SunOutlined,
} from "@ant-design/icons";
import { Button, Drawer, Dropdown, Form, Grid, Input, Layout, Menu, Modal, Tooltip, Typography } from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useThemeMode, type ThemeMode } from "@/app/providers";
import { api } from "@/lib/api";
import { HOME_BY_ROLE, useAuth } from "@/lib/auth";
import { faDate, ROLE_LABEL, todayISO } from "@/lib/format";
import type { Role } from "@/lib/types";
import { Loading, useAction } from "./ui";
import { AvatarEditor, UserAvatar } from "./UserAvatar";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const SIDER_WIDTH = 256;

const THEME_NEXT: Record<ThemeMode, { next: ThemeMode; icon: React.ReactNode; label: string }> = {
  system: { next: "light", icon: <DesktopOutlined />, label: "پوسته: خودکار" },
  light: { next: "dark", icon: <SunOutlined />, label: "پوسته: روشن" },
  dark: { next: "system", icon: <MoonOutlined />, label: "پوسته: تیره" },
};

/** Authenticated layout for one role's panel: guards access and renders the navigation. */
export function Shell({ role, nav, children }: { role: Role; nav: NavItem[]; children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { mode, setMode } = useThemeMode();
  const router = useRouter();
  const pathname = usePathname();
  const screens = Grid.useBreakpoint();
  const [drawer, setDrawer] = useState(false);
  const [password, setPassword] = useState(false);
  const [photo, setPhoto] = useState(false);
  const desktop = screens.lg ?? true;

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role !== role) router.replace(HOME_BY_ROLE[user.role]);
  }, [user, loading, role, router]);

  useEffect(() => setDrawer(false), [pathname]);

  if (loading || !user || user.role !== role) return <Loading />;

  const home = HOME_BY_ROLE[role];
  // the longest matching prefix wins, so /student/report doesn't also light up /student
  const selected = nav
    .filter((n) => (n.href === home ? pathname === home : pathname.startsWith(n.href)))
    .sort((a, b) => b.href.length - a.href.length)
    .slice(0, 1)
    .map((n) => n.href);
  const theme = THEME_NEXT[mode];

  const sider = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="sider-brand">
        <span className="sider-logo">
          <ReadOutlined />
        </span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>سامانه کارنامه</div>
          <div style={{ fontSize: 12, opacity: 0.65 }}>پنل {ROLE_LABEL[role]}</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", padding: "12px 24px 6px" }}>منوی اصلی</div>
      <Menu
        mode="inline"
        theme="dark"
        selectedKeys={selected}
        style={{ borderInlineEnd: 0, flex: 1 }}
        items={nav.map((n) => ({ key: n.href, icon: n.icon, label: <Link href={n.href}>{n.label}</Link> }))}
      />
      <div className="sider-user">
        <UserAvatar user={user} size={36} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.full_name}
          </div>
          <div style={{ fontSize: 11, opacity: 0.6 }} dir="ltr">
            {user.username}
          </div>
        </div>
        <Tooltip title="خروج">
          <Button
            type="text"
            size="small"
            icon={<LogoutOutlined />}
            onClick={logout}
            style={{ color: "rgba(255,255,255,0.7)" }}
            aria-label="خروج"
          />
        </Tooltip>
      </div>
    </div>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {desktop && (
        <Layout.Sider
          width={SIDER_WIDTH}
          className="app-sider"
          style={{ position: "fixed", insetInlineStart: 0, top: 0, bottom: 0, overflow: "auto" }}
        >
          {sider}
        </Layout.Sider>
      )}
      <Drawer
        open={!desktop && drawer}
        onClose={() => setDrawer(false)}
        placement="right"
        size={SIDER_WIDTH}
        styles={{ body: { padding: 0, background: "var(--sider)" } }}
        closable={false}
      >
        {sider}
      </Drawer>
      <Layout style={{ marginInlineStart: desktop ? SIDER_WIDTH : 0, background: "var(--page)" }}>
        <Layout.Header
          className="app-header"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: desktop ? "0 32px" : "0 16px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          {desktop ? (
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              امروز {faDate(todayISO())}
            </Typography.Text>
          ) : (
            <Button icon={<MenuOutlined />} onClick={() => setDrawer(true)} aria-label="منو" />
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Tooltip title={theme.label}>
              <Button type="text" shape="circle" icon={theme.icon} onClick={() => setMode(theme.next)} aria-label={theme.label} />
            </Tooltip>
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  { key: "user", label: `${user.full_name} (${ROLE_LABEL[user.role]})`, disabled: true },
                  { type: "divider" },
                  { key: "photo", label: "عکس پروفایل", icon: <CameraOutlined />, onClick: () => setPhoto(true) },
                  { key: "password", label: "تغییر رمز عبور", icon: <KeyOutlined />, onClick: () => setPassword(true) },
                  { key: "logout", label: "خروج از حساب", icon: <LogoutOutlined />, danger: true, onClick: logout },
                ],
              }}
            >
              <Button type="text" style={{ height: 44, paddingInline: 8 }}>
                <UserAvatar user={user} size={30} />
                {desktop && <span style={{ fontWeight: 500 }}>{user.full_name}</span>}
              </Button>
            </Dropdown>
          </div>
        </Layout.Header>
        <Layout.Content style={{ padding: desktop ? "28px 32px 48px" : "16px 16px 32px", maxWidth: 1360, width: "100%", margin: "0 auto" }}>
          {children}
        </Layout.Content>
      </Layout>
      {password && <ChangePasswordModal onClose={() => setPassword(false)} />}
      <Modal open={photo} title="عکس پروفایل" onCancel={() => setPhoto(false)} footer={null} width={360} destroyOnHidden>
        <div style={{ padding: "12px 0" }}>
          <AvatarEditor />
        </div>
      </Modal>
    </Layout>
  );
}

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const run = useAction();
  const [form] = Form.useForm<{ current_password: string; new_password: string; confirm: string }>();
  const [busy, setBusy] = useState(false);
  return (
    <Modal open title="تغییر رمز عبور" onCancel={onClose} onOk={() => form.submit()} okText="ذخیره" confirmLoading={busy}>
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={async ({ current_password, new_password }) => {
          setBusy(true);
          const ok = await run(
            () => api("/auth/password", { method: "POST", body: { current_password, new_password } }),
            "رمز عبور تغییر کرد",
          );
          setBusy(false);
          if (ok) onClose();
        }}
      >
        <Form.Item name="current_password" label="رمز فعلی" rules={[{ required: true, message: "رمز فعلی را وارد کنید" }]}>
          <Input.Password dir="ltr" autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="new_password"
          label="رمز جدید"
          rules={[{ required: true, min: 4, message: "حداقل ۴ کاراکتر" }]}
        >
          <Input.Password dir="ltr" autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="تکرار رمز جدید"
          dependencies={["new_password"]}
          rules={[
            { required: true, message: "تکرار رمز را وارد کنید" },
            ({ getFieldValue }) => ({
              validator: (_, v) =>
                !v || v === getFieldValue("new_password") ? Promise.resolve() : Promise.reject(new Error("تکرار رمز یکسان نیست")),
            }),
          ]}
        >
          <Input.Password dir="ltr" autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
