"use client";

import { App, ConfigProvider, theme } from "antd";
import faIR from "antd/locale/fa_IR";
import { useSyncExternalStore } from "react";
import { AuthProvider } from "@/lib/auth";
import "@/lib/jalali";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function usePrefersDark() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(DARK_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const dark = usePrefersDark();
  return (
    <ConfigProvider
      direction="rtl"
      locale={faIR}
      theme={{
        algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: dark ? "#3987e5" : "#2a78d6",
          colorError: dark ? "#e66767" : "#d03b3b",
          colorSuccess: "#0ca30c",
          colorWarning: "#fab219",
          colorBgLayout: dark ? "#0d0d0d" : "#f6f6f3",
          colorBgContainer: dark ? "#1a1a19" : "#fcfcfb",
          borderRadius: 8,
          fontFamily: "var(--font-vazir), system-ui, -apple-system, 'Segoe UI', sans-serif",
        },
        components: {
          Layout: { siderBg: dark ? "#1a1a19" : "#fcfcfb", headerBg: dark ? "#1a1a19" : "#fcfcfb" },
          Menu: { itemBg: "transparent" },
          Table: { headerBg: dark ? "#242423" : "#f0efec" },
        },
      }}
    >
      <App>
        <AuthProvider>{children}</AuthProvider>
      </App>
    </ConfigProvider>
  );
}
