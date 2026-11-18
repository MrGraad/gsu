// Проверка пароля в интерфейсе. ВАЖНО: это только клиентский барьер, не серверная авторизация.
import { ADMIN_PASSWORD_SHA256 } from "./admin-config.js";

export async function verifyAdminPassword(password) {
  if (!globalThis.crypto?.subtle) throw new Error("Проверка пароля требует HTTPS или localhost.");
  const bytes = new TextEncoder().encode(String(password));
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hash = [...new Uint8Array(hashBuffer)].map(value => value.toString(16).padStart(2, "0")).join("");
  return hash === ADMIN_PASSWORD_SHA256;
}
