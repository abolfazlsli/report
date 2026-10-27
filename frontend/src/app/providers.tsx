"use client";

import { App, ConfigProvider, theme } from "antd";
import faIR from "antd/locale/fa_IR";
import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { AuthProvider } from "@/lib/auth";
import "@/lib/jalali";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const MODE_KEY = "report_theme";

export type ThemeMode = "light" | "dark" | "system";

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

const ThemeContext = createContext<{ mode: ThemeMode; dark: boolean; setMode: (m: ThemeMode) => void }>({
  mode: "system",
  dark: false,
  setMode: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);

export function Providers({ children }: { children: React.ReactNode }) {
  const prefersDark = usePrefersDark();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY) as ThemeMode | null;
      if (saved === "light" || saved === "dark") setModeState(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    try {
      if (m === "system") localStorage.removeItem(MODE_KEY);
      else localStorage.setItem(MODE_KEY, m);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const dark = mode === "system" ? prefersDark : mode === "dark";

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ mode, dark, setMode }}>
      <ConfigProvider
        direction="rtl"
        locale={faIR}
        theme={{
          algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: dark ? "#6366f1" : "#4f46e5",
            colorInfo: dark ? "#6366f1" : "#4f46e5",
            colorError: dark ? "#e66767" : "#d03b3b",
            colorSuccess: "#0ca30c",
            colorWarning: "#fab219",
            colorBgLayout: dark ? "#0a0f1e" : "#f4f6fb",
            colorBgContainer: dark ? "#111a2e" : "#ffffff",
            colorBgElevated: dark ? "#18223a" : "#ffffff",
            colorBorderSecondary: dark ? "#232f4b" : "#e5e9f2",
            colorBorder: dark ? "#2d3a5a" : "#d8deea",
            colorText: dark ? "#e7eaf3" : "#0f172a",
            colorTextSecondary: dark ? "#aab3c8" : "#64748b",
            borderRadius: 10,
            borderRadiusLG: 16,
            controlHeight: 36,
            fontFamily: "var(--font-vazir), system-ui, -apple-system, 'Segoe UI', sans-serif",
          },
          components: {
            Layout: { siderBg: "transparent", headerBg: dark ? "#111a2e" : "#ffffff", headerHeight: 64 },
            Menu: {
              darkItemBg: "transparent",
              darkSubMenuItemBg: "transparent",
              darkItemSelectedBg: "rgba(255,255,255,0.14)",
              darkItemHoverBg: "rgba(255,255,255,0.07)",
              darkItemColor: "rgba(255,255,255,0.72)",
              itemHeight: 44,
              itemBorderRadius: 10,
              itemMarginInline: 12,
              iconSize: 16,
            },
            Card: { headerFontSize: 15 },
            Table: {
              headerBg: dark ? "#18223a" : "#f6f8fc",
              headerColor: dark ? "#aab3c8" : "#475569",
              rowHoverBg: dark ? "#16203a" : "#f8f9ff",
            },
            Tabs: { titleFontSize: 14 },
          },
        }}
      >
        <App>
          <AuthProvider>{children}</AuthProvider>
        </App>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
