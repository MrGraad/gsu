/* Главная точка входа приложения. */
import { APP_VERSION } from "./app-config.js";
import { loadAppData, loadCourseSchedule } from "./services/data-service.js";
import { initCalendar } from "./features/calendar.js";
import { initGroupSelectors } from "./features/groups.js";
import { initNavigation } from "./features/navigation.js";
import { renderSchedule } from "./features/schedule.js";
import { initSearch } from "./features/search.js";

const state = {
  selectedDate: new Date(),
  selection: null,
  groupNames: null,
  query: "",
  data: null,
  navigation: null,
  courseSchedule: [],
  scheduleLoading: false,
  scheduleError: null,
  scheduleRequestId: 0
};

function getScheduleViewData() {
  return {
    ...state.data,
    schedule: state.courseSchedule,
    scheduleLoading: state.scheduleLoading,
    scheduleError: state.scheduleError
  };
}

function renderCurrentSchedule() {
  if (!state.selection || !state.groupNames || !state.data) return;
  renderSchedule({
    data: getScheduleViewData(),
    date: state.selectedDate,
    selection: state.selection,
    groupNames: state.groupNames,
    query: state.query
  });
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function showStartupError(error) {
  console.error("[Расписание] Ошибка запуска приложения:", error);
  const errorPanel = document.querySelector("#startupError");
  if (!errorPanel) return;
  errorPanel.classList.remove("hidden");
  errorPanel.textContent = `Не удалось запустить приложение. ${error?.message || error}. Проверьте Console (F12) и структуру папок проекта.`;
}

function initializeTelegram() {
  const telegram = window.Telegram?.WebApp;
  if (!telegram) return;
  try { telegram.ready(); telegram.expand(); }
  catch (error) { console.warn("[Расписание] Telegram WebApp API пока недоступен:", error); }
}

async function loadSelectedCourse() {
  if (!state.selection || !state.data) return;
  const requestId = ++state.scheduleRequestId;

  // Факультет может быть добавлен раньше его групп. В этом случае
  // не пытаемся импортировать несуществующий course-N.js.
  if (!state.selection.groupId || !state.selection.course) {
    state.scheduleLoading = false;
    state.scheduleError = null;
    state.courseSchedule = [];
    renderCurrentSchedule();
    return;
  }

  state.scheduleLoading = true;
  state.scheduleError = null;
  state.courseSchedule = [];
  renderCurrentSchedule();

  try {
    const result = await loadCourseSchedule(state.selection, state.data.faculties);
    if (requestId !== state.scheduleRequestId) return;
    state.courseSchedule = result.lessons;
    state.scheduleError = result.errors.length
      ? result.errors.map(issue => issue.message).join(" ")
      : null;
    state.data.warnings = [...state.data.warnings.filter(issue => issue.key !== "schedule"), ...result.warnings];
    if (window.RASPISANIE_DEBUG) {
      window.RASPISANIE_DEBUG.counts.schedule = result.lessons.length;
      window.RASPISANIE_DEBUG.sources.schedule = result.source;
      window.RASPISANIE_DEBUG.selectedCourse = { ...state.selection };
      window.RASPISANIE_DEBUG.errors = [
        ...window.RASPISANIE_DEBUG.errors.filter(issue => issue.key !== "schedule"),
        ...result.errors
      ];
    }
  } catch (error) {
    if (requestId !== state.scheduleRequestId) return;
    state.scheduleError = error?.message || String(error);
    state.courseSchedule = [];
    console.error("[Расписание] Не удалось открыть файл выбранного курса:", error);
  } finally {
    if (requestId === state.scheduleRequestId) {
      state.scheduleLoading = false;
      renderCurrentSchedule();
    }
  }
}

async function refreshData() {
  showToast("Обновляю данные сайта…");
  try {
    state.data = await loadAppData();
    state.navigation?.updateData(state.data);
    await loadSelectedCourse();
    showToast("Данные обновлены.");
  } catch (error) {
    console.error("[Расписание] Ошибка обновления данных:", error);
    showToast("Не удалось обновить данные. Проверьте Console (F12).");
  }
}

async function startApp() {
  try {
    state.data = await loadAppData();
    if (!state.data.faculties.length) {
      const facultyError = state.data.errors.find(item => item.key === "faculties");
      throw new Error(facultyError ? `${facultyError.file}: ${facultyError.message}` : "Не загружен список факультетов из data/faculties.js.");
    }

    const calendar = initCalendar(date => {
      state.selectedDate = date;
      renderCurrentSchedule();
    });

    const groups = initGroupSelectors(state.data.faculties, () => {
      state.selection = groups.getSelection();
      state.groupNames = groups.getNames();
      loadSelectedCourse();
    });
    state.selection = groups.getSelection();
    state.groupNames = groups.getNames();
    state.selectedDate = calendar.getSelectedDate();

    state.navigation = initNavigation(
      view => { if (view === "schedule") renderCurrentSchedule(); },
      state.data,
      () => state.selection
    );
    initSearch(
      query => { state.query = query; renderCurrentSchedule(); },
      () => state.navigation.setView("schedule")
    );

    document.querySelector("#profileButton")?.addEventListener("click", () => {
      showToast("Данный функционал пока недоступен.");
    });

    window.RASPISANIE_REFRESH_DATA = refreshData;
    window.RASPISANIE_DEBUG_REFRESH = refreshData;
    await loadSelectedCourse();
    console.info(`[Расписание] Приложение v${APP_VERSION} запущено.`);
    if (state.data.errors.length) console.warn("Некоторые данные требуют проверки. Откройте Console (F12).");
  } catch (error) {
    showStartupError(error);
  }
}

initializeTelegram();
window.addEventListener("load", initializeTelegram, { once: true });
startApp();
