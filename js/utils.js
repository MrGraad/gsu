// Общие маленькие функции. Здесь нет бизнес-логики расписания — только удобные помощники.
export const $ = id => document.getElementById(id);
export const WEEKDAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
export const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function makeId() {
  // crypto.randomUUID доступен в современных браузерах; запасной вариант — на случай старого устройства.
  return globalThis.crypto?.randomUUID?.() || `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function minutesFromTime(value = "00:00") {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function formatTime(start, end) {
  return start && end ? `${start} – ${end}` : (start || end || "Время не задано");
}

export function pluralRu(value, one, few, many) {
  const n = Math.abs(value) % 100;
  const last = n % 10;
  if (n > 10 && n < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

export function showToast(message, isError = false) {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.toggle("is-error", isError);
  toast.classList.add("is-visible");
  // Таймер нужен только для автоматического скрытия ненавязчивого уведомления.
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

export function safeText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
