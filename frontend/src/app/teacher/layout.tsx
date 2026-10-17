"use client";

import { BookOutlined } from "@ant-design/icons";
import { Shell } from "@/components/Shell";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell role="teacher" nav={[{ href: "/teacher", label: "کلاس‌های من", icon: <BookOutlined /> }]}>
      {children}
    </Shell>
  );
}
