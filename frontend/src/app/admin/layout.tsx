"use client";

import {
  ApartmentOutlined,
  ClusterOutlined,
  DashboardOutlined,
  StarOutlined,
  RiseOutlined,
  SettingOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Shell } from "@/components/Shell";

const NAV = [
  { href: "/admin", label: "داشبورد", icon: <DashboardOutlined /> },
  { href: "/admin/units", label: "واحدها", icon: <ClusterOutlined /> },
  { href: "/admin/classes", label: "کلاس‌ها", icon: <ApartmentOutlined /> },
  { href: "/admin/structure", label: "دوره‌ها، پایه‌ها و دروس", icon: <SettingOutlined /> },
  { href: "/admin/criteria", label: "نمرات توصیفی", icon: <StarOutlined /> },
  { href: "/admin/users", label: "کاربران", icon: <TeamOutlined /> },
  { href: "/admin/promote", label: "ارتقا و انتقال", icon: <RiseOutlined /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell role="admin" nav={NAV}>
      {children}
    </Shell>
  );
}
