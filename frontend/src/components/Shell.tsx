"use client";

import { LogoutOutlined, MenuOutlined, UserOutlined } from "@ant-design/icons";
import { Avatar, Button, Drawer, Dropdown, Grid, Layout, Menu, Typography } from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HOME_BY_ROLE, useAuth } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/format";
import type { Role } from "@/lib/types";
import { Loading } from "./ui";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const SIDER_WIDTH = 240;

/** Authenticated layout for one role's panel: guards access and renders the navigation. */
export function Shell({ role, nav, children }: { role: Role; nav: NavItem[]; children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const screens = Grid.useBreakpoint();
  const [drawer, setDrawer] = useState(false);
  const desktop = screens.lg ?? true;

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role !== role) router.replace(HOME_BY_ROLE[user.role]);
  }, [user, loading, role, router]);

  useEffect(() => setDrawer(false), [pathname]);

  if (loading || !user || user.role !== role) return <Loading />;

  const home = HOME_BY_ROLE[role];
  const selected = nav
    .filter((n) => (n.href === home ? pathname === home : pathname.startsWith(n.href)))
    .map((n) => n.href);

  const brand = (
    <div style={{ padding: "20px 24px 12px" }}>
      <Typography.Text strong style={{ fontSize: 16 }}>
        سامانه کارنامه
      </Typography.Text>
      <br />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        پنل {ROLE_LABEL[role]}
      </Typography.Text>
    </div>
  );
  const menu = (
    <Menu
      mode="inline"
      selectedKeys={selected}
      style={{ borderInlineEnd: 0 }}
      items={nav.map((n) => ({ key: n.href, icon: n.icon, label: <Link href={n.href}>{n.label}</Link> }))}
    />
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {desktop && (
        <Layout.Sider
          width={SIDER_WIDTH}
          theme="light"
          style={{ position: "fixed", insetInlineStart: 0, top: 0, bottom: 0, overflow: "auto", borderInlineEnd: "1px solid var(--line)" }}
        >
          {brand}
          {menu}
        </Layout.Sider>
      )}
      <Drawer
        open={!desktop && drawer}
        onClose={() => setDrawer(false)}
        placement="right"
        size={SIDER_WIDTH}
        styles={{ body: { padding: 0 } }}
        closable={false}
      >
        {brand}
        {menu}
      </Drawer>
      <Layout style={{ marginInlineStart: desktop ? SIDER_WIDTH : 0 }}>
        <Layout.Header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "0 16px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          {desktop ? <span /> : (
            <Button icon={<MenuOutlined />} onClick={() => setDrawer(true)} aria-label="منو" />
          )}
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: "user", label: user.username, disabled: true },
                { type: "divider" },
                { key: "logout", label: "خروج از حساب", icon: <LogoutOutlined />, danger: true, onClick: logout },
              ],
            }}
          >
            <Button type="text" style={{ height: 40 }}>
              <Avatar size="small" icon={<UserOutlined />} />
              {user.full_name}
            </Button>
          </Dropdown>
        </Layout.Header>
        <Layout.Content style={{ padding: desktop ? "24px 32px" : "16px", maxWidth: 1280, width: "100%", margin: "0 auto" }}>
          {children}
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
