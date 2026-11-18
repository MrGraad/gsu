// Даты разбираются как локальные календарные даты, чтобы не было сдвига из-за часового пояса.
import { WEEKDAYS, WEEKDAYS_SHORT } from "./utils.js";

export function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function toISODate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDays(date, count) {
  const result = new Date(date);
  result.setDate(result.getDate() + count);
  result.setHours(12, 0, 0, 0);
  return result;
}

export function mondayOf(date) {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  result.setHours(12, 0, 0, 0);
  return result;
}

export function weekdayNumber(date) {
  // В JSON понедельник = 1, воскресенье = 7. В JavaScript воскресенье = 0.
  return date.getDay() || 7;
}

// Номер учебной недели от понедельника недели начала семестра.
export function getAcademicWeekNumber(semesterStart, date) {
  const start = parseDate(semesterStart);
  if (!start) return null;
  const difference = Math.round((mondayOf(date) - mondayOf(start)) / 86400000);
  return Math.floor(difference / 7) + 1;
}

export function getCycleWeek(semesterStart, date) {
  const start = parseDate(semesterStart);
  if (!start) return 1;
  const difference = Math.round((mondayOf(date) - mondayOf(start)) / 86400000);
  const weekIndex = Math.floor(difference / 7);
  return ((weekIndex % 2) + 2) % 2 === 0 ? 1 : 2;
}

export function formatLongDate(date) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export function formatWeekRange(date) {
  const monday = mondayOf(date);
  const sunday = addDays(monday, 6);
  const leftDay = new Intl.DateTimeFormat("ru-RU", { day: "numeric" }).format(monday);
  const right = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(sunday);
  if (monday.getMonth() === sunday.getMonth() && monday.getFullYear() === sunday.getFullYear()) {
    const monthYear = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(sunday);
    return `${leftDay}–${sunday.getDate()} ${monthYear}`;
  }
  const left = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(monday);
  return `${left} – ${right}`;
}

export function fullWeek(date) {
  const monday = mondayOf(date);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function weekdayName(day) {
  return WEEKDAYS[day - 1] || WEEKDAYS[0];
}

export function weekdayShort(day) {
  return WEEKDAYS_SHORT[day - 1] || WEEKDAYS_SHORT[0];
}
