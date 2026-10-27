"use client";

import { FilePdfOutlined } from "@ant-design/icons";
import { App, Button } from "antd";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { avatarObjectUrl } from "@/lib/avatar";
import { faDate, faDigits, faNum, LEVEL_LABEL, ltr, RATING, scoreLevel, STATUS_LABEL, todayISO, type Level } from "@/lib/format";
import type { Report, ReportEnrollment, ReportSubject } from "@/lib/types";

/*
 * The PDF is rendered by the browser itself (html-to-image -> canvas -> jsPDF),
 * so Persian shaping, RTL and the Vazir font come out exactly as on screen.
 * The sheet uses fixed light colors so the file looks the same in dark mode.
 */

// A4 landscape at 96dpi
const PAGE_W = 1123;
const PAGE_H = 794;
const PAGE_PADDING = 28;

const C = {
  ink: "#1e1b4b",
  ink2: "#4c4a73",
  muted: "#8b89a8",
  line: "#ece9fb",
  paper: "#fffdf7",
  card: "#ffffff",
  level: { good: "#16a34a", ok: "#2563eb", warning: "#d97706", critical: "#dc2626" } as Record<Level, string>,
  levelSoft: { good: "#dcfce7", ok: "#dbeafe", warning: "#fef3c7", critical: "#fee2e2" } as Record<Level, string>,
};

// One cheerful color per subject; text always stays in ink colors for readability.
const FUN = [
  { main: "#6366f1", soft: "#eef0ff" },
  { main: "#f97316", soft: "#fff1e6" },
  { main: "#10b981", soft: "#e3f8ef" },
  { main: "#ec4899", soft: "#fde8f2" },
  { main: "#0ea5e9", soft: "#e0f4fd" },
  { main: "#eab308", soft: "#fdf6d8" },
  { main: "#8b5cf6", soft: "#f1eafe" },
  { main: "#ef4444", soft: "#fde7e7" },
];

const CHEER: Record<Level, { title: string; text: string }> = {
  good: { title: "آفرین، تو یک ستاره‌ای!", text: "تلاش و پشتکارت عالی بوده؛ همین‌طور با انرژی ادامه بده." },
  ok: { title: "خیلی خوب پیش رفتی!", text: "با کمی تمرین بیشتر می‌توانی به ستاره‌ها برسی." },
  warning: { title: "تو می‌توانی!", text: "قدم‌به‌قدم و با تمرین روزانه، هر روز بهتر می‌شوی." },
  critical: { title: "با هم پیش می‌رویم!", text: "نگران نباش؛ با کمک معلم و خانواده حتماً پیشرفت می‌کنی." },
};

export function ReportPdfButton({ report, enrollment }: { report: Report; enrollment: ReportEnrollment }) {
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  async function download() {
    setBusy(true);
    try {
      const v = report.student.avatar_version;
      setPhoto(v ? await avatarObjectUrl(report.student.id, v) : null);
      // let the off-screen sheet mount, then wait for fonts and images
      await new Promise((r) => setTimeout(r, 80));
      await document.fonts?.ready;
      const node = ref.current;
      if (!node) throw new Error("no sheet");
      await Promise.all([...node.querySelectorAll("img")].map((img) => img.decode().catch(() => {})));
      const [{ toCanvas }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);

      // Page breaks: never cut through a block marked data-keep.
      const top = node.getBoundingClientRect().top;
      const blocks = [...node.querySelectorAll<HTMLElement>("[data-keep]")].map((el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top - top, bottom: r.bottom - top };
      });
      // offsetHeight, not scrollHeight: the decorative shapes overflow the page on purpose
      const total = node.offsetHeight;
      const usable = PAGE_H - PAGE_PADDING;
      const cuts: number[] = [0];
      while (total - cuts.at(-1)! > PAGE_H) {
        const start = cuts.at(-1)!;
        let cut = start + usable;
        const crossing = blocks
          .filter((b) => b.top < cut && b.bottom > cut && b.top > start + 40)
          .sort((a, b) => a.top - b.top)[0];
        if (crossing) cut = crossing.top - 6;
        cuts.push(cut);
      }
      cuts.push(total);

      const scale = 2;
      const canvas = await toCanvas(node, { pixelRatio: scale, backgroundColor: C.paper, width: PAGE_W });
      const pdf = new jsPDF({ unit: "px", format: [PAGE_W, PAGE_H], orientation: "landscape", hotfixes: ["px_scaling"] });
      const pages = cuts.length - 1;

      for (let i = 0; i < pages; i++) {
        const from = cuts[i];
        const height = Math.min(cuts[i + 1], canvas.height / scale) - from;
        const slice = document.createElement("canvas");
        slice.width = PAGE_W * scale;
        slice.height = height * scale;
        slice.getContext("2d")!.drawImage(canvas, 0, from * scale, slice.width, slice.height, 0, 0, slice.width, slice.height);
        if (i > 0) pdf.addPage([PAGE_W, PAGE_H], "landscape");
        pdf.setFillColor(C.paper);
        pdf.rect(0, 0, PAGE_W, PAGE_H, "F");
        pdf.addImage(slice.toDataURL("image/jpeg", 0.95), "JPEG", 0, i > 0 ? PAGE_PADDING / 2 : 0, PAGE_W, height);
        if (pages > 1) {
          pdf.setFontSize(9);
          pdf.setTextColor(150);
          pdf.text(`${i + 1} / ${pages}`, PAGE_W / 2, PAGE_H - 8, { align: "center" });
        }
      }
      pdf.save(`karname-${report.student.username}-${enrollment.year_name}.pdf`);
      message.success("فایل PDF کارنامه آماده شد");
    } catch (e) {
      console.error(e);
      message.error("ساخت PDF ناموفق بود؛ دوباره تلاش کنید");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="primary" icon={<FilePdfOutlined />} loading={busy} onClick={download}>
        دریافت PDF کارنامه
      </Button>
      {busy &&
        createPortal(
          <div style={{ position: "fixed", top: 0, left: -20000, zIndex: -1 }} aria-hidden>
            <ReportSheet ref={ref} report={report} e={enrollment} photo={photo} />
          </div>,
          document.body,
        )}
    </>
  );
}

/* ---------------- decorations ---------------- */

function Star({ size = 14, fill = "#facc15", stroke }: { size?: number; fill?: string; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      <path
        d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
        fill={fill}
        stroke={stroke}
        strokeWidth={stroke ? 1.4 : 0}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Stars({ value, size = 13, color = "#f59e0b" }: { value: number | null; size?: number; color?: string }) {
  const n = value ? Math.round(value) : 0;
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} fill={i <= n ? color : "#ece9f5"} />
      ))}
    </span>
  );
}

function Medal({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ display: "block" }}>
      <path d="M14 3h8l4 12h-8z" fill="#60a5fa" />
      <path d="M34 3h-8l-4 12h8z" fill="#f472b6" />
      <circle cx="24" cy="30" r="14" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2" />
      <path d="M24 21.5l2.6 5.3 5.8.8-4.2 4.1 1 5.7-5.2-2.7-5.2 2.7 1-5.7-4.2-4.1 5.8-.8z" fill="#fff7d6" />
    </svg>
  );
}

function Blob({ color, size, style }: { color: string; size: number; style: React.CSSProperties }) {
  return <div style={{ position: "absolute", width: size, height: size, borderRadius: "50%", background: color, ...style }} />;
}

/* ---------------- sheet ---------------- */

function Bubble({ label, value, sub, color, soft, icon }: { label: string; value: React.ReactNode; sub?: React.ReactNode; color: string; soft: string; icon: React.ReactNode }) {
  return (
    <div
      data-keep
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 20,
        background: soft,
        border: `2px solid ${color}33`,
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 14, background: "#fff", display: "grid", placeItems: "center", boxShadow: `0 4px 10px ${color}33`, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, color: C.ink2 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.ink, lineHeight: 1.3 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: C.muted }}>{sub}</div>}
      </div>
    </div>
  );
}

function SubjectRow({ s, i }: { s: ReportSubject; i: number }) {
  const fun = FUN[i % FUN.length];
  const lv = s.average === null ? null : scoreLevel(s.average);
  const pct = s.average === null ? 0 : Math.max(4, (s.average / 20) * 100);
  const classPct = s.class_average === null ? null : (s.class_average / 20) * 100;
  return (
    <div
      data-keep
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "9px 12px",
        borderRadius: 16,
        background: C.card,
        border: `1.5px solid ${C.line}`,
        borderInlineStart: `6px solid ${fun.main}`,
      }}
    >
      <div style={{ width: 128, flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{s.subject_name}</div>
        <div style={{ fontSize: 10.5, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {s.teacher_name ?? "—"}
        </div>
      </div>
      <div style={{ flex: 1, position: "relative", height: 14, borderRadius: 7, background: fun.soft }}>
        <div style={{ position: "absolute", insetInlineStart: 0, top: 0, bottom: 0, width: `${pct}%`, borderRadius: 7, background: fun.main }} />
        {classPct !== null && (
          <div
            title="میانگین کلاس"
            style={{ position: "absolute", top: -3, bottom: -3, insetInlineStart: `calc(${classPct}% - 1px)`, width: 3, borderRadius: 2, background: C.ink }}
          />
        )}
      </div>
      <div style={{ width: 56, textAlign: "center", fontSize: 20, fontWeight: 900, color: C.ink }}>{faNum(s.average)}</div>
      <div
        style={{
          width: 86,
          textAlign: "center",
          fontSize: 11.5,
          fontWeight: 700,
          padding: "4px 0",
          borderRadius: 999,
          color: lv ? C.level[lv.level] : C.muted,
          background: lv ? C.levelSoft[lv.level] : "#f4f4f8",
        }}
      >
        {lv ? lv.label : "بدون نمره"}
      </div>
    </div>
  );
}

function ReportSheet({ report, e, photo, ref }: { report: Report; e: ReportEnrollment; photo: string | null; ref: React.Ref<HTMLDivElement> }) {
  const rated = e.subjects.filter((s) => s.ratings.length);
  const ratingAvgs = rated.map((s) => s.rating_average).filter((v): v is number => v !== null);
  const ratingAvg = ratingAvgs.length ? ratingAvgs.reduce((a, b) => a + b, 0) / ratingAvgs.length : null;
  const level = e.average === null ? null : scoreLevel(e.average).level;
  const cheer = level ? CHEER[level] : null;
  const name = report.student.full_name;

  return (
    <div
      ref={ref}
      dir="rtl"
      style={{
        position: "relative",
        width: PAGE_W,
        minHeight: PAGE_H,
        padding: PAGE_PADDING,
        background: C.paper,
        color: C.ink,
        fontFamily: "var(--font-vazir), Tahoma, sans-serif",
        boxSizing: "border-box",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* soft background shapes */}
      <Blob color="#fde68a55" size={220} style={{ left: -70, bottom: -90 }} />
      <Blob color="#bae6fd55" size={160} style={{ left: 300, bottom: -110 }} />
      <Blob color="#fbcfe855" size={130} style={{ right: -40, bottom: 120 }} />

      {/* header banner */}
      <div
        data-keep
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "18px 24px",
          borderRadius: 28,
          color: "#fff",
          background: "linear-gradient(115deg, #6366f1 0%, #8b5cf6 45%, #ec4899 100%)",
          boxShadow: "0 10px 24px rgba(99,102,241,0.25)",
          overflow: "hidden",
        }}
      >
        <Blob color="rgba(255,255,255,0.12)" size={180} style={{ left: -40, top: -90 }} />
        <Blob color="rgba(255,255,255,0.10)" size={90} style={{ left: 170, bottom: -50 }} />
        <div style={{ position: "absolute", left: 200, top: 14 }}>
          <Star size={18} fill="#fde047" />
        </div>
        <div style={{ position: "absolute", left: 140, top: 52 }}>
          <Star size={11} fill="#ffffffcc" />
        </div>
        <div style={{ position: "absolute", left: 250, top: 70 }}>
          <Star size={13} fill="#fbcfe8" />
        </div>

        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            border: "5px solid #fff",
            background: "linear-gradient(135deg,#fde68a,#f9a8d4)",
            overflow: "hidden",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
          }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" width={96} height={96} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 36, fontWeight: 900, color: "#7c3aed" }}>{name.trim()[0]}</span>
          )}
        </div>
        <div style={{ flex: 1, position: "relative" }}>
          <div style={{ fontSize: 13, opacity: 0.9 }}>کارنامه تحصیلی سال {ltr(e.year_name)}</div>
          <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.5 }}>{name}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {[
              `پایه ${e.grade_name} - کلاس ${e.class_name}`,
              e.unit_name,
              report.national_code ? `کد ملی ${faDigits(report.national_code)}` : null,
              STATUS_LABEL[e.status],
            ]
              .filter(Boolean)
              .map((t) => (
                <span key={t} style={{ fontSize: 12, padding: "3px 12px", borderRadius: 999, background: "rgba(255,255,255,0.2)" }}>
                  {t}
                </span>
              ))}
          </div>
        </div>
        <div style={{ textAlign: "center", position: "relative", flexShrink: 0 }}>
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: -1 }}>کارنامه من</div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>تاریخ صدور: {faDate(todayISO())}</div>
        </div>
      </div>

      {/* summary bubbles */}
      <div style={{ display: "flex", gap: 14, margin: "16px 0" }}>
        <Bubble
          label="معدل کل"
          value={faNum(e.average)}
          sub={level ? LEVEL_LABEL[level] : "هنوز نمره‌ای نیست"}
          color="#6366f1"
          soft="#eef0ff"
          icon={<Star size={26} fill="#6366f1" />}
        />
        <Bubble
          label="رتبه در کلاس"
          value={e.rank ? faNum(e.rank) : "—"}
          sub={e.rank ? `از ${faNum(e.class_size)} دانش‌آموز` : undefined}
          color="#f59e0b"
          soft="#fff7e0"
          icon={<Medal size={30} />}
        />
        <Bubble
          label="میانگین کلاس"
          value={faNum(e.class_average)}
          sub="برای مقایسه"
          color="#10b981"
          soft="#e3f8ef"
          icon={
            <svg width="26" height="26" viewBox="0 0 24 24">
              <rect x="3" y="12" width="4" height="9" rx="2" fill="#6ee7b7" />
              <rect x="10" y="7" width="4" height="14" rx="2" fill="#10b981" />
              <rect x="17" y="3" width="4" height="18" rx="2" fill="#059669" />
            </svg>
          }
        />
        <Bubble
          label="ارزشیابی توصیفی"
          value={<Stars value={ratingAvg} size={18} />}
          sub={ratingAvg === null ? "ثبت نشده" : `${faNum(ratingAvg, 1)} از ۵`}
          color="#ec4899"
          soft="#fde8f2"
          icon={
            <svg width="26" height="26" viewBox="0 0 24 24">
              <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3.2 4.5 6.9 4.5c2.1 0 3.6 1.2 5.1 3 1.5-1.8 3-3 5.1-3 3.7 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z" fill="#ec4899" />
            </svg>
          }
        />
      </div>

      {/* body: scores + descriptive */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", position: "relative" }}>
        <div style={{ flex: rated.length ? 1.15 : 1, minWidth: 0 }}>
          <SectionTitle color="#6366f1" title="نمرات دروس" hint="نوار رنگی = نمره از ۲۰ · خط تیره = میانگین کلاس" />
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {e.subjects.map((s, i) => (
              <SubjectRow key={s.class_subject_id} s={s} i={i} />
            ))}
          </div>
        </div>

        {rated.length > 0 && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <SectionTitle color="#ec4899" title="ارزشیابی توصیفی" hint={`★ ۱ ${RATING[1]} تا ★★★★★ ${RATING[5]}`} />
            <div style={{ display: "grid", gridTemplateColumns: rated.length > 1 ? "1fr 1fr" : "1fr", gap: 8 }}>
              {rated.map((s) => {
                const fun = FUN[e.subjects.indexOf(s) % FUN.length];
                return (
                  <div key={s.class_subject_id} data-keep style={{ borderRadius: 16, background: fun.soft, padding: "8px 10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: C.ink, display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 4, background: fun.main }} />
                        {s.subject_name}
                      </span>
                      <span style={{ fontSize: 11, color: C.ink2 }}>{s.rating_average === null ? "—" : `${faNum(s.rating_average, 1)} از ۵`}</span>
                    </div>
                    {s.ratings.map((r) => (
                      <div
                        key={r.criterion_id}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "3px 8px", marginTop: 3, borderRadius: 10, background: "#ffffffcc" }}
                      >
                        <span style={{ fontSize: 11.5, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</span>
                        {r.value ? <Stars value={r.value} size={12} color={fun.main} /> : <span style={{ fontSize: 10.5, color: C.muted }}>ثبت نشده</span>}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* footer: encouragement + signatures */}
      <div data-keep style={{ display: "flex", gap: 16, marginTop: "auto", paddingTop: 16, alignItems: "stretch", position: "relative" }}>
        {cheer && (
          <div
            style={{
              flex: 1.15,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 18px",
              borderRadius: 20,
              background: "linear-gradient(110deg,#fef9c3,#fde68a)",
              border: "2px dashed #f59e0b88",
            }}
          >
            <div style={{ display: "flex", gap: 2 }}>
              <Star size={22} fill="#f59e0b" />
              <Star size={30} fill="#facc15" />
              <Star size={22} fill="#f59e0b" />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: "#92400e" }}>{cheer.title}</div>
              <div style={{ fontSize: 12.5, color: "#78350f" }}>{cheer.text}</div>
            </div>
          </div>
        )}
        <div style={{ flex: 1, display: "flex", gap: 10 }}>
          {["معلم", "مدیر مدرسه", "ولی دانش‌آموز"].map((t) => (
            <div
              key={t}
              style={{ flex: 1, borderRadius: 16, border: `1.5px dashed ${C.muted}88`, background: "#ffffffaa", padding: "8px 10px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 74 }}
            >
              <div style={{ fontSize: 11, color: C.ink2 }}>امضای {t}</div>
              <div style={{ height: 1, background: C.line }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, hint, color }: { title: string; hint: string; color: string }) {
  return (
    <div data-keep style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 22, borderRadius: 4, background: color }} />
        <span style={{ fontSize: 17, fontWeight: 900, color: C.ink }}>{title}</span>
      </div>
      <span style={{ fontSize: 10.5, color: C.muted }}>{hint}</span>
    </div>
  );
}
