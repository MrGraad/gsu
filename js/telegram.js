// Telegram Mini App — дополнительная интеграция. В обычном браузере модуль ничего не требует.
const tg = window.Telegram?.WebApp ?? null;
export function initTelegram() {
  if (!tg) return;
  try { tg.ready(); tg.expand(); }
  catch (error) { console.warn("Telegram Web App API недоступен:", error); }
}
export function selectionHaptic() {
  try { tg?.HapticFeedback?.selectionChanged?.(); } catch { /* Не все клиенты поддерживают виброотклик. */ }
}
