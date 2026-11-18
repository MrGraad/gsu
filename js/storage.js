// Хранение данных и настроек просмотра в браузере. Старые ключи Aule намеренно сохранены, чтобы при обновлении FLAX GSU не потерять уже введённые пользователями данные.
// Важно: localStorage привязан к адресу сайта и браузеру. Для переноса используйте экспорт JSON.
const DATA_KEY = "aule-ggu:data:v3";
const PREFS_KEY = "aule-ggu:prefs:v3";

export function readSavedData() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Не удалось прочитать сохранённые данные расписания:", error);
    return null;
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Не удалось сохранить данные расписания:", error);
    return false;
  }
}

export function readPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
  } catch {
    return null;
  }
}

export function savePrefs(prefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }
  catch (error) { console.warn("Не удалось сохранить настройки интерфейса:", error); }
}

export function clearSavedData() {
  try { localStorage.removeItem(DATA_KEY); localStorage.removeItem(PREFS_KEY); }
  catch (error) { console.warn("Не удалось очистить локальное хранилище:", error); }
}
