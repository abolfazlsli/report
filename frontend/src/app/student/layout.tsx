"use client";

import { FileTextOutlined } from "@ant-design/icons";
import { Shell } from "@/components/Shell";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell role="student" nav={[{ href: "/student", label: "کارنامه من", icon: <FileTextOutlined /> }]}>
      {children}
    </Shell>
  );
}
