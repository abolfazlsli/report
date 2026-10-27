"use client";

import { DashboardOutlined, FileTextOutlined, HistoryOutlined, IdcardOutlined, StarOutlined } from "@ant-design/icons";
import { Shell } from "@/components/Shell";

const NAV = [
  { href: "/student", label: "داشبورد", icon: <DashboardOutlined /> },
  { href: "/student/report", label: "کارنامه من", icon: <FileTextOutlined /> },
  { href: "/student/descriptive", label: "ارزشیابی توصیفی", icon: <StarOutlined /> },
  { href: "/student/history", label: "سوابق تحصیلی", icon: <HistoryOutlined /> },
  { href: "/student/profile", label: "پروفایل", icon: <IdcardOutlined /> },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell role="student" nav={NAV}>
      {children}
    </Shell>
  );
}
