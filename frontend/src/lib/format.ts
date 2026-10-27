import type { EnrollmentStatus, Role } from "./types";

const dateFmt = new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" });
const shortDateFmt = new Intl.DateTimeFormat("fa-IR", { month: "short", day: "numeric" });

function parse(d: string) {
  // API dates are plain YYYY-MM-DD; parse at local noon to avoid timezone day shifts.
  return new Date(d.length === 10 ? `${d}T12:00:00` : d);
}

/** Jalali (شمسی) date, e.g. ۲۳ مهر ۱۴۰۵ */
export const faDate = (d: string) => dateFmt.format(parse(d));
export const faShortDate = (d: string) => shortDateFmt.format(parse(d));

export const faNum = (n: number | null | undefined, digits = 2) =>
  n === null || n === undefined
    ? "—"
    : n.toLocaleString("fa-IR", { maximumFractionDigits: digits });

/**
 * Isolate a left-to-right run such as a year name "1405-1406" so the bidi
 * algorithm doesn't reorder it to "1406-1405" after Persian text.
 */
export const ltr = (s: string) => `⁦${s}⁩`;

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "مدیر",
  teacher: "معلم",
  student: "دانش‌آموز",
};

export const STATUS_LABEL: Record<EnrollmentStatus, string> = {
  active: "در حال تحصیل",
  promoted: "ارتقا یافته",
  completed: "فارغ‌التحصیل",
  withdrawn: "خارج‌شده",
};

export type Level = "good" | "ok" | "warning" | "critical";

/** Descriptive evaluation for a score out of 20. */
export function scoreLevel(v: number): { level: Level; label: string } {
  if (v >= 17) return { level: "good", label: "خیلی خوب" };
  if (v >= 14) return { level: "ok", label: "خوب" };
  if (v >= 10) return { level: "warning", label: "قابل قبول" };
  return { level: "critical", label: "نیاز به تلاش" };
}

/** Labels of the 1..5 descriptive rating scale. */
export const RATING: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "نیاز به تلاش بیشتر",
  2: "قابل قبول",
  3: "خوب",
  4: "خیلی خوب",
  5: "عالی",
};

export function ratingLevel(v: number): Level {
  if (v >= 4) return "good";
  if (v >= 3) return "ok";
  if (v >= 2) return "warning";
  return "critical";
}

export const LEVEL_LABEL: Record<Level, string> = {
  good: "خیلی خوب",
  ok: "خوب",
  warning: "قابل قبول",
  critical: "نیاز به تلاش",
};

/** Latin digits -> Persian digits, keeping the text as-is (e.g. a national code with a leading 0). */
export const faDigits = (s: string) => s.replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
