import { AntdRegistry } from "@ant-design/nextjs-registry";
import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "antd/dist/reset.css";
import "./globals.css";
import { Providers } from "./providers";

const vazir = Vazirmatn({ subsets: ["arabic", "latin"], variable: "--font-vazir" });

export const metadata: Metadata = {
  title: "سامانه کارنامه",
  description: "مدیریت کلاس‌ها، ثبت نمرات و کارنامه دانش‌آموزان",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazir.variable}>
      <body>
        <AntdRegistry>
          <Providers>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
