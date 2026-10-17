"use client";

/**
 * Jalali (شمسی) calendar for antd's DatePicker.
 *
 * dayjs is switched to the Jalali calendar globally (only antd pickers use
 * dayjs here; every other date in the app is formatted with Intl). Values
 * travel to/from the API as Gregorian "YYYY-MM-DD" via toISO/fromISO.
 */
import type { GenerateConfig } from "@rc-component/picker/lib/generate";
import { DatePicker } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import customParseFormat from "dayjs/plugin/customParseFormat";
import localeData from "dayjs/plugin/localeData";
import weekday from "dayjs/plugin/weekday";
import weekOfYear from "dayjs/plugin/weekOfYear";
import weekYear from "dayjs/plugin/weekYear";
import jalaliday from "jalaliday";

const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const WEEKDAYS = ["یک‌شنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"];

dayjs.extend(customParseFormat);
dayjs.extend(advancedFormat);
dayjs.extend(weekday);
dayjs.extend(localeData);
dayjs.extend(weekOfYear);
dayjs.extend(weekYear);
dayjs.extend(jalaliday);
dayjs.locale(
  {
    name: "fa",
    weekdays: WEEKDAYS,
    weekdaysShort: WEEKDAYS,
    weekdaysMin: ["ی", "د", "س", "چ", "پ", "ج", "ش"],
    weekStart: 6, // Saturday
    months: MONTHS,
    monthsShort: MONTHS,
    jmonths: MONTHS,
    ordinal: (n: number) => String(n),
    formats: { LT: "HH:mm", LTS: "HH:mm:ss", L: "YYYY/MM/DD", LL: "D MMMM YYYY", LLL: "D MMMM YYYY HH:mm", LLLL: "dddd D MMMM YYYY HH:mm" },
    relativeTime: {
      future: "در %s",
      past: "%s پیش",
      s: "چند ثانیه",
      m: "یک دقیقه",
      mm: "%d دقیقه",
      h: "یک ساعت",
      hh: "%d ساعت",
      d: "یک روز",
      dd: "%d روز",
      M: "یک ماه",
      MM: "%d ماه",
      y: "یک سال",
      yy: "%d سال",
    },
  } as ILocale,
  undefined,
  true,
);
dayjs.calendar("jalali");

const toLocale = (locale: string) => (locale === "fa_IR" ? "fa" : locale.split("_")[0]);

const jalaliConfig: GenerateConfig<Dayjs> = {
  getNow: () => dayjs(),
  getFixedDate: (s) => dayjs(s, "YYYY-MM-DD"),
  getEndDate: (d) => d.endOf("month"),
  getWeekDay: (d) => {
    const en = d.locale("en");
    return en.weekday() + en.localeData().firstDayOfWeek();
  },
  getYear: (d) => d.year(),
  getMonth: (d) => d.month(),
  getDate: (d) => d.date(),
  getHour: (d) => d.hour(),
  getMinute: (d) => d.minute(),
  getSecond: (d) => d.second(),
  getMillisecond: (d) => d.millisecond(),
  addYear: (d, n) => d.add(n, "year"),
  addMonth: (d, n) => d.add(n, "month"),
  addDate: (d, n) => d.add(n, "day"),
  setYear: (d, n) => d.year(n),
  setMonth: (d, n) => d.month(n),
  setDate: (d, n) => d.date(n),
  setHour: (d, n) => d.hour(n),
  setMinute: (d, n) => d.minute(n),
  setSecond: (d, n) => d.second(n),
  setMillisecond: (d, n) => d.millisecond(n),
  isAfter: (a, b) => a.isAfter(b),
  isValidate: (d) => d.isValid(),
  locale: {
    getWeekFirstDay: (locale) => dayjs().locale(toLocale(locale)).localeData().firstDayOfWeek(),
    getWeekFirstDate: (locale, d) => d.locale(toLocale(locale)).weekday(0),
    getWeek: (locale, d) => d.locale(toLocale(locale)).week(),
    getShortWeekDays: (locale) => dayjs().locale(toLocale(locale)).localeData().weekdaysMin(),
    getShortMonths: (locale) => dayjs().locale(toLocale(locale)).localeData().monthsShort(),
    format: (locale, d, format) => d.locale(toLocale(locale)).format(format),
    parse: (locale, text, formats) => {
      for (const format of formats) {
        const d = dayjs(text, { format, jalali: true } as never).locale(toLocale(locale));
        if (d.isValid() && d.format(format) === text) return d;
      }
      return null;
    },
  },
};

/** antd DatePicker that shows and accepts Jalali dates. */
export const JalaliDatePicker = DatePicker.generatePicker<Dayjs>(jalaliConfig);

/** Gregorian "YYYY-MM-DD" (API format) -> Jalali dayjs for the picker. */
export const fromISO = (iso: string) => dayjs(iso);

/** Picker value -> Gregorian "YYYY-MM-DD" for the API. */
export const toISO = (d: Dayjs) => d.calendar("gregory").format("YYYY-MM-DD");
