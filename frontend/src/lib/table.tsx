"use client";

/** Reusable column filters/sorters so every table filters the same way. */
import { FilterFilled, SearchOutlined } from "@ant-design/icons";
import { Button, Input, Space } from "antd";
import type { ColumnType } from "antd/es/table";
import { scoreLevel, type Level } from "./format";

const collator = new Intl.Collator("fa");

/** Unify Arabic/Persian letters and digits so search is forgiving. */
export function normalize(s: string) {
  return s
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/‌/g, " ")
    .toLowerCase()
    .trim();
}

type Get<T, V> = (row: T) => V | null | undefined;

export const byText =
  <T,>(get: Get<T, string>) =>
  (a: T, b: T) =>
    collator.compare(get(a) ?? "", get(b) ?? "");

export const byNum =
  <T,>(get: Get<T, number>) =>
  (a: T, b: T) =>
    (get(a) ?? -1) - (get(b) ?? -1);

/** Free-text search box in the column header. */
export function searchFilter<T>(get: Get<T, string>, placeholder = "جستجو…"): Partial<ColumnType<T>> {
  return {
    filterDropdown: ({ selectedKeys, setSelectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8, width: 220 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          autoFocus
          placeholder={placeholder}
          value={selectedKeys[0] as string}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8 }}
        />
        <Space>
          <Button type="primary" size="small" icon={<SearchOutlined />} onClick={() => confirm()}>
            جستجو
          </Button>
          <Button
            size="small"
            onClick={() => {
              clearFilters?.();
              confirm();
            }}
          >
            پاک کردن
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? "var(--series-1)" : undefined }} />,
    onFilter: (value, row) => normalize(get(row) ?? "").includes(normalize(String(value))),
  };
}

/** Multi-select filter built from the distinct values present in `data`. */
export function valueFilter<T>(data: readonly T[], get: Get<T, string>, empty = "—"): Partial<ColumnType<T>> {
  const values = [...new Set(data.map((r) => get(r) || empty))].sort(collator.compare);
  return {
    filters: values.map((v) => ({ text: v, value: v })),
    filterSearch: values.length > 6,
    filterIcon: (filtered) => <FilterFilled style={{ color: filtered ? "var(--series-1)" : undefined }} />,
    onFilter: (value, row) => (get(row) || empty) === value,
  };
}

const LEVELS: { value: Level | "none"; text: string }[] = [
  { value: "good", text: "خیلی خوب (۱۷ به بالا)" },
  { value: "ok", text: "خوب (۱۴ تا ۱۷)" },
  { value: "warning", text: "قابل قبول (۱۰ تا ۱۴)" },
  { value: "critical", text: "نیاز به تلاش (زیر ۱۰)" },
  { value: "none", text: "بدون نمره" },
];

/** Filter + sort a score/average column by descriptive level. */
export function scoreFilter<T>(get: Get<T, number>): Partial<ColumnType<T>> {
  return {
    filters: LEVELS,
    filterIcon: (filtered) => <FilterFilled style={{ color: filtered ? "var(--series-1)" : undefined }} />,
    onFilter: (value, row) => {
      const v = get(row);
      return v === null || v === undefined ? value === "none" : scoreLevel(v).level === value;
    },
    sorter: byNum(get),
  };
}

export const tableDefaults = {
  size: "middle" as const,
  scroll: { x: "max-content" },
  pagination: { defaultPageSize: 10, hideOnSinglePage: true, showSizeChanger: true },
};
