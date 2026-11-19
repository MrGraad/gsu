/* Общие функции для работы с датами и календарными неделями. */
export const monthFormatter = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" });
export const dateFormatter = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" });
export const shortDateFormatter = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" });
export const weekdayFormatter = new Intl.DateTimeFormat("ru-RU", { weekday: "short" });

export function sameDate(first, second) {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}
export function mondayIndex(jsDay) { return (jsDay + 6) % 7; }
export function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month, day);
}
export function toDateKey(date) { return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`; }
export function capitalize(value) { return value ? value.charAt(0).toLocaleUpperCase("ru-RU") + value.slice(1) : ""; }
export function pluralLessons(number) {
  const lastTwo = number % 100, last = number % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "занятий";
  if (last === 1) return "занятие";
  if (last >= 2 && last <= 4) return "занятия";
  return "занятий";
}
export function getISOWeekNumber(date) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekday = (utcDate.getUTCDay() + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - weekday + 3);
  const firstThursday = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 4));
  const firstWeekday = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstWeekday + 3);
  return 1 + Math.round((utcDate - firstThursday) / 604800000);
}
export function getISOWeekType(date, oddWeekType = "above") {
  const evenWeekType = oddWeekType === "above" ? "below" : "above";
  return getISOWeekNumber(date) % 2 === 1 ? oddWeekType : evenWeekType;
}
