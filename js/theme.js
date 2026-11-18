// Управление светлой и тёмной темой FLAX GSU. Выбранная тема хранится в браузере.
const THEME_KEY = "flax-gsu:theme:v1";

function applyTheme(theme) {
  const selected = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = selected;
  const button = document.getElementById("themeToggle");
  const label = document.getElementById("themeToggleLabel");
  const icon = button?.querySelector(".theme-toggle-icon");
  if (button) {
    button.setAttribute("aria-pressed", String(selected === "dark"));
    button.title = selected === "dark" ? "Переключить на светлую тему" : "Переключить на тёмную тему";
  }
  if (label) label.textContent = selected === "dark" ? "Светлая тема" : "Тёмная тема";
  if (icon) icon.textContent = selected === "dark" ? "☀" : "☾";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = selected === "dark" ? "#111521" : "#e9ebf0";
}

export function initTheme() {
  let saved = "light";
  try { saved = localStorage.getItem(THEME_KEY) || "light"; } catch { /* Private mode: use the default theme. */ }
  applyTheme(saved);
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* The current page still changes theme. */ }
  });
}
