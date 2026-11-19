/*
 * Единая точка загрузки, проверки и нормализации данных.
 * Справочники загружаются независимо. Расписание подгружается отдельно
 * из файла выбранного факультета, группы и курса.
 */
import { getISOWeekType } from "../utils/date-utils.js";

const DATA_FILES = Object.freeze({
  faculties: { path: "../../data/faculties.js", exportName: "FACULTIES", type: "array" },
  teachers: { path: "../../data/teachers.js", exportName: "TEACHERS", type: "array" },
  contacts: { path: "../../data/contacts.js", exportName: "CONTACTS", type: "object" },
  settings: { path: "../../data/settings.js", exportName: "WEEK_SETTINGS", type: "object" },
  announcements: { path: "../../data/announcements.js", exportName: "ANNOUNCEMENTS", type: "array" },
  features: { path: "../../data/features.js", exportName: "FEATURES", type: "object" }
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEGRAM_RE = /^https:\/\/t\.me\/[A-Za-z0-9_+/?=-]+$/i;
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const TIME_RANGE_RE = /^((?:[0-9]|[01]\d|2[0-3]):[0-5]\d)\s*[–—-]\s*((?:[0-9]|[01]\d|2[0-3]):[0-5]\d)$/;
const DAY_KEYS = Object.freeze({ sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 });
const SAFE_SEGMENT_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ANNOUNCEMENT_TYPES = new Set(["info", "important", "cancellation", "change"]);

function addIssue(list, key, file, message, level = "error") {
  list.push({ key, file, message, level });
}

function getModuleUrl(relativePath) {
  const url = new URL(relativePath, import.meta.url);
  // Cache-busting полезен, когда редактируемые JS-файлы данных меняются,
  // а Live Server или браузер сохраняют предыдущую копию в кэше.
  url.searchParams.set("v", `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  return url;
}

async function importDataModule(key, issues, sources) {
  const config = DATA_FILES[key];
  const url = getModuleUrl(config.path);
  sources[key] = url.href;
  try {
    return await import(url.href);
  } catch (error) {
    addIssue(issues, key, `data/${key}.js`, error?.message || String(error));
    console.error(`[Расписание] Ошибка загрузки data/${key}.js`, error);
    return null;
  }
}

function readExport(module, key, issues) {
  const config = DATA_FILES[key];
  const value = module?.[config.exportName];
  if (config.type === "array" && Array.isArray(value)) return value;
  if (config.type === "object" && value && typeof value === "object" && !Array.isArray(value)) return value;
  if (module) addIssue(issues, key, `data/${key}.js`, `Файл должен экспортировать ${config.exportName} как ${config.type === "array" ? "массив" : "объект"}.`);
  return config.type === "array" ? [] : {};
}

export function normalizeFaculties(items, issues = []) {
  const faculties = [];
  const facultyIds = new Set();
  (Array.isArray(items) ? items : []).forEach((faculty, facultyIndex) => {
    const label = `Факультет №${facultyIndex + 1}`;
    if (!faculty || typeof faculty !== "object" || Array.isArray(faculty)) {
      addIssue(issues, "faculties", "data/faculties.js", `${label}: ожидается объект.`);
      return;
    }
    const id = String(faculty.id || "").trim();
    const name = String(faculty.name || faculty.title || "").trim();
    if (!id || !name) {
      addIssue(issues, "faculties", "data/faculties.js", `${label}: заполните уникальные поля id и name.`);
      return;
    }
    if (!SAFE_SEGMENT_RE.test(id) || id !== id.toLowerCase()) {
      addIssue(issues, "faculties", "data/faculties.js", `${label}: ID «${id}» должен состоять из строчных латинских букв, цифр и дефиса, как имя папки в data/schedule/.`);
      return;
    }
    if (facultyIds.has(id)) {
      addIssue(issues, "faculties", "data/faculties.js", `Повторяется ID факультета «${id}».`);
      return;
    }
    facultyIds.add(id);
    const groupIds = new Set();
    const groups = [];
    if (faculty.groups !== undefined && !Array.isArray(faculty.groups)) {
      addIssue(issues, "faculties", "data/faculties.js", `У факультета «${name}» поле groups должно быть массивом.`);
    }
    const configuredGroups = Array.isArray(faculty.groups) ? faculty.groups : [];
    configuredGroups.forEach((group, groupIndex) => {
        if (!group || typeof group !== "object" || Array.isArray(group)) {
          addIssue(issues, "faculties", "data/faculties.js", `${name}, группа №${groupIndex + 1}: ожидается объект.`);
          return;
        }
        const groupId = String(group.id || "").trim();
        const groupName = String(group.name || group.title || "").trim();
        if (!groupId || !groupName) {
          addIssue(issues, "faculties", "data/faculties.js", `${name}, группа №${groupIndex + 1}: заполните id и name.`);
          return;
        }
        if (!SAFE_SEGMENT_RE.test(groupId) || groupId !== groupId.toLowerCase()) {
          addIssue(issues, "faculties", "data/faculties.js", `${name}, группа «${groupName}»: ID «${groupId}» должен состоять из строчных латинских букв, цифр и дефиса, как имя папки в data/schedule/.`);
          return;
        }
        if (groupIds.has(groupId)) {
          addIssue(issues, "faculties", "data/faculties.js", `У факультета «${name}» повторяется ID группы «${groupId}».`);
          return;
        }
        groupIds.add(groupId);
        const rawCourses = Array.isArray(group.courses) ? group.courses : [];
        const courses = [...new Set(rawCourses.map(Number).filter(course => Number.isInteger(course) && course >= 1 && course <= 4))].sort((a, b) => a - b);
        if (courses.length === 0) {
          addIssue(issues, "faculties", "data/faculties.js", `У группы «${groupName}» нет корректных курсов 1–4.`);
          return;
        }
        groups.push({ id: groupId, name: groupName, courses });
    });
    // Единый порядок групп во всём приложении: русский алфавит,
    // без учёта регистра, с естественной сортировкой чисел в названиях.
    // Сортируем нормализованные данные, а не только DOM-селектор:
    // порядок будет одинаковым в навигации, тестах и будущих компонентах.
    const groupCollator = new Intl.Collator("ru-RU", {
      sensitivity: "base",
      numeric: true
    });
    groups.sort((first, second) => groupCollator.compare(first.name, second.name));

    // Пустой список групп допустим: факультет отображается в выборе,
    // а селекторы группы и курса остаются отключёнными до заполнения.
    faculties.push({ id, name, groups });
  });
  if (!faculties.length) addIssue(issues, "faculties", "data/faculties.js", "Добавьте хотя бы один корректный факультет в data/faculties.js.");
  return faculties;
}

export function normalizeTeacherList(items, issues = []) {
  const result = [];
  const seenNames = new Set();
  (Array.isArray(items) ? items : []).forEach((item, index) => {
    if (typeof item === "string") {
      const name = item.trim();
      if (!name) {
        addIssue(issues, "teachers", "data/teachers.js", `Запись №${index + 1}: пустое имя преподавателя.`);
        return;
      }
      const key = name.toLocaleLowerCase("ru-RU");
      if (seenNames.has(key)) addIssue(issues, "teachers", "data/teachers.js", `Преподаватель «${name}» повторяется.`, "warning");
      seenNames.add(key);
      result.push({ id: `teacher-${index + 1}`, name, subject: "Предмет не указан" });
      return;
    }
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      addIssue(issues, "teachers", "data/teachers.js", `Запись №${index + 1}: ожидается объект вида { name, subject }.`);
      return;
    }
    const rawName = item.name ?? item.fio ?? item.fullName ?? item.fullname ?? item.full_name ?? item.teacherName ?? item.teacher ?? item.title ?? item["ФИО"] ?? "";
    const name = String(rawName).trim();
    if (!name) {
      addIssue(issues, "teachers", "data/teachers.js", `Запись №${index + 1}: не указано имя. Используйте поле name.`);
      return;
    }
    const rawSubject = item.subject ?? item.subjects ?? item.discipline ?? item.disciplines ?? item.subjectName ?? item["Предмет"] ?? "";
    const subject = Array.isArray(rawSubject) ? rawSubject.map(value => String(value).trim()).filter(Boolean).join(" / ") : String(rawSubject).trim();
    const key = name.toLocaleLowerCase("ru-RU");
    if (seenNames.has(key)) addIssue(issues, "teachers", "data/teachers.js", `Преподаватель «${name}» повторяется.`, "warning");
    seenNames.add(key);
    result.push({ id: String(item.id || `teacher-${index + 1}`), name, subject: subject || "Предмет не указан" });
  });
  return result;
}


function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}


function parseTimeRange(value) {
  const match = String(value || "").trim().match(TIME_RANGE_RE);
  if (!match) return null;
  const [, start, end] = match;
  if (toMinutes(end) <= toMinutes(start)) return null;
  return { start: start.padStart(5, "0"), end: end.padStart(5, "0") };
}

/**
 * Проверяет объект расписания одного курса.
 * Формат файла: { monday: [{ time, subject, room, teacher, week }], ... }.
 */
export function normalizeCourseSchedule(rawSchedule, selection, filePath = "data/schedule/<faculty>/<group>/course-<n>.js") {
  const errors = [];
  const warnings = [];
  const lessons = [];

  if (!rawSchedule || typeof rawSchedule !== "object" || Array.isArray(rawSchedule)) {
    addIssue(errors, "schedule", filePath, "Файл должен экспортировать объект SCHEDULE с массивами дней недели.");
    return { lessons, errors, warnings };
  }

  Object.keys(rawSchedule).forEach(dayKey => {
    if (!(dayKey in DAY_KEYS)) addIssue(errors, "schedule", filePath, `Неизвестный день «${dayKey}». Используйте monday, tuesday, wednesday, thursday, friday, saturday или sunday.`);
  });

  for (const [dayKey, weekday] of Object.entries(DAY_KEYS)) {
    const dayLessons = rawSchedule[dayKey] ?? [];
    if (!Array.isArray(dayLessons)) {
      addIssue(errors, "schedule", filePath, `Поле ${dayKey} должно быть массивом.`);
      continue;
    }

    dayLessons.forEach((item, index) => {
      const label = `${dayKey}, занятие №${index + 1}`;
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        addIssue(errors, "schedule", filePath, `${label}: ожидается объект занятия.`);
        return;
      }

      const time = String(item.time ?? "").trim();
      const parsedTime = parseTimeRange(time);
      if (!parsedTime) {
        addIssue(errors, "schedule", filePath, `${label}: поле time должно иметь формат '10:45 – 12:20', окончание позже начала.`);
        return;
      }

      const subject = String(item.subject ?? "").trim();
      if (!subject) {
        addIssue(errors, "schedule", filePath, `${label}: заполните subject.`);
        return;
      }

      const week = String(item.week ?? "").trim().toLowerCase();
      if (!(["top", "bottom", "both"].includes(week))) {
        addIssue(errors, "schedule", filePath, `${label}: week должен быть 'top', 'bottom' или 'both'.`);
        return;
      }

      const room = String(item.room ?? "").trim();
      const teacher = String(item.teacher ?? "").trim();
      const sourceGroup = String(item.sourceGroup ?? item.stream ?? "").trim();
      lessons.push({
        id: `${selection.facultyId}-${selection.groupId}-${selection.course}-${dayKey}-${index + 1}`,
        facultyId: selection.facultyId,
        groupId: selection.groupId,
        course: Number(selection.course),
        dayKey,
        weekday,
        time,
        start: parsedTime.start,
        end: parsedTime.end,
        subject,
        room,
        teacher,
        week,
        sourceGroup
      });
    });
  }

  lessons.sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start));

  // Пересечения подсвечиваются как предупреждения, но занятия не удаляются:
  // иногда у групп бывают потоки или занятия в нескольких аудиториях.
  for (let i = 0; i < lessons.length; i += 1) {
    for (let j = i + 1; j < lessons.length; j += 1) {
      const first = lessons[i], second = lessons[j];
      if (first.weekday !== second.weekday) continue;
      if (toMinutes(second.start) >= toMinutes(first.end)) break;
      const sameWeek = first.week === "both" || second.week === "both" || first.week === second.week;
      if (sameWeek) {
        addIssue(warnings, "schedule", filePath,
          `Возможное пересечение занятий «${first.subject}» (${first.time}) и «${second.subject}» (${second.time}) в ${first.dayKey}. Проверьте, не являются ли они параллельными потоками.`,
          "warning");
      }
    }
  }

  return { lessons, errors, warnings };
}

function safePathPart(value, label) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!SAFE_SEGMENT_RE.test(normalized)) throw new Error(`${label}: ID «${value}» содержит недопустимые символы. Используйте латинские буквы, цифры и дефис.`);
  return normalized;
}

/** Загружает расписание только выбранного курса. */
export async function loadCourseSchedule(selection, faculties) {
  const errors = [];
  const warnings = [];
  const facultyId = safePathPart(selection?.facultyId, "Факультет");
  const groupId = safePathPart(selection?.groupId, "Группа");
  const course = Number(selection?.course);
  if (!Number.isInteger(course) || course < 1 || course > 4) {
    throw new Error("Курс должен быть целым числом от 1 до 4.");
  }

  const faculty = faculties.find(item => item.id === facultyId);
  const group = faculty?.groups.find(item => item.id === groupId);
  if (!faculty || !group || !group.courses.includes(course)) {
    throw new Error(`Сочетание факультета «${facultyId}», группы «${groupId}» и курса ${course} отсутствует в data/faculties.js.`);
  }

  const relativePath = `../../data/schedule/${facultyId}/${groupId}/course-${course}.js`;
  const displayPath = `data/schedule/${facultyId}/${groupId}/course-${course}.js`;
  const moduleUrl = new URL(relativePath, import.meta.url);
  const source = moduleUrl.href;
  moduleUrl.searchParams.set("v", `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  let module;
  try {
    module = await import(moduleUrl.href);
  } catch (error) {
    const message = `Не удалось загрузить файл курса. Проверьте, что существует ${relativePath}. ${error?.message || error}`;
    addIssue(errors, "schedule", displayPath, message);
    console.error(`[Расписание] ${message}`, error);
    updateScheduleDebug(selection, source, 0, errors, warnings);
    return { lessons: [], errors, warnings, source };
  }

  if (!Object.prototype.hasOwnProperty.call(module, "SCHEDULE")) {
    addIssue(errors, "schedule", displayPath, "Файл должен содержать export const SCHEDULE = { ... }.");
    updateScheduleDebug(selection, source, 0, errors, warnings);
    return { lessons: [], errors, warnings, source };
  }

  const normalized = normalizeCourseSchedule(module.SCHEDULE, { facultyId, groupId, course }, displayPath);
  errors.push(...normalized.errors);
  warnings.push(...normalized.warnings);
  updateScheduleDebug(selection, source, normalized.lessons.length, errors, warnings);
  return { ...normalized, source };
}

function updateScheduleDebug(selection, source, count, errors, warnings) {
  if (typeof window === "undefined" || !window.RASPISANIE_DEBUG) return;
  window.RASPISANIE_DEBUG.sources.schedule = source;
  window.RASPISANIE_DEBUG.counts.schedule = count;
  window.RASPISANIE_DEBUG.selectedCourse = { ...selection };
  window.RASPISANIE_DEBUG.errors = [
    ...window.RASPISANIE_DEBUG.errors.filter(issue => issue.key !== "schedule"),
    ...errors
  ];
  window.RASPISANIE_DEBUG.warnings = [
    ...window.RASPISANIE_DEBUG.warnings.filter(issue => issue.key !== "schedule"),
    ...warnings
  ];
}
function normalizeContacts(raw, issues) {
  const contacts = raw && typeof raw === "object" ? raw : {};
  const telegramChannels = Array.isArray(contacts.telegramChannels) ? contacts.telegramChannels.map((item, index) => {
    const title = String(item?.title || `Telegram-канал ${index + 1}`).trim();
    const url = String(item?.url || "").trim();
    if (url && !TELEGRAM_RE.test(url)) addIssue(issues, "contacts", "data/contacts.js", `Ссылка канала «${title}» должна быть полноценной ссылкой https://t.me/username.`);
    return { id: String(item?.id || `channel-${index + 1}`), title, url };
  }) : [];
  const email = String(contacts.email || "").trim();
  if (email && !EMAIL_RE.test(email)) addIssue(issues, "contacts", "data/contacts.js", `Адрес электронной почты «${email}» имеет неверный формат. Используйте name@example.com.`);
  return { telegramChannels, email };
}

export function normalizeAnnouncements(items, faculties, issues = []) {
  const result = [];
  const seen = new Set();
  const facultyMap = new Map(faculties.map(faculty => [faculty.id, faculty]));
  (Array.isArray(items) ? items : []).forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      addIssue(issues, "announcements", "data/announcements.js", `Объявление №${index + 1} должно быть объектом.`); return;
    }
    const id = String(item.id || "").trim();
    const title = String(item.title || "").trim();
    const message = String(item.message || item.text || "").trim();
    if (!id || !title || !message) {
      addIssue(issues, "announcements", "data/announcements.js", `Объявление №${index + 1}: обязательны поля id, title и message.`); return;
    }
    if (seen.has(id)) { addIssue(issues, "announcements", "data/announcements.js", `Повторяется ID объявления «${id}».`); return; }
    const date = String(item.date || "").trim();
    if (date) {
      const parsedDate = DATE_RE.test(date) ? new Date(`${date}T00:00:00Z`) : null;
      const isRealDate = parsedDate && !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === date;
      if (!isRealDate) {
        addIssue(issues, "announcements", "data/announcements.js", `Объявление «${title}»: дата должна быть реальной датой в формате ГГГГ-ММ-ДД.`); return;
      }
    }
    const type = String(item.type || "info");
    if (!ANNOUNCEMENT_TYPES.has(type)) {
      addIssue(issues, "announcements", "data/announcements.js", `Объявление «${title}»: неизвестный type «${type}». Используйте info, important, change или cancellation.`, "warning");
    }
    const facultyId = item.facultyId ? String(item.facultyId) : "";
    const groupId = item.groupId ? String(item.groupId) : "";
    const course = item.course === undefined || item.course === null || item.course === "" ? null : Number(item.course);
    if (facultyId) {
      const faculty = facultyMap.get(facultyId);
      const group = faculty?.groups.find(candidate => candidate.id === groupId);
      if (!faculty || (groupId && !group) || (course !== null && (!group || !group.courses.includes(course)))) {
        addIssue(issues, "announcements", "data/announcements.js", `Объявление «${title}»: целевая аудитория не найдена в data/faculties.js.`); return;
      }
    } else if (groupId || course !== null) {
      addIssue(issues, "announcements", "data/announcements.js", `Объявление «${title}»: укажите facultyId вместе с groupId/course.`); return;
    }
    if (course !== null && (!Number.isInteger(course) || course < 1 || course > 4)) {
      addIssue(issues, "announcements", "data/announcements.js", `Объявление «${title}»: course должен быть от 1 до 4.`); return;
    }
    seen.add(id);
    result.push({ id, title, message, date, type: ANNOUNCEMENT_TYPES.has(type) ? type : "info", facultyId, groupId, course, pinned: Boolean(item.pinned) });
  });
  return result.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date));
}


export async function loadAppData() {
  const errors = [];
  const warnings = [];
  const sources = {};
  const keys = Object.keys(DATA_FILES);
  const modules = await Promise.all(keys.map(key => importDataModule(key, errors, sources)));
  const byKey = Object.fromEntries(keys.map((key, index) => [key, modules[index]]));

  const faculties = normalizeFaculties(readExport(byKey.faculties, "faculties", errors), errors);
  const teachers = normalizeTeacherList(readExport(byKey.teachers, "teachers", errors), warnings);
  const announcements = normalizeAnnouncements(readExport(byKey.announcements, "announcements", errors), faculties, errors);
  const weekRaw = readExport(byKey.settings, "settings", errors);
  const contactsRaw = readExport(byKey.contacts, "contacts", errors);
  const featuresRaw = readExport(byKey.features, "features", errors);

  const features = {
    teachersEnabled: featuresRaw.teachersEnabled === true,
    announcementsEnabled: featuresRaw.announcementsEnabled === true
  };
  for (const key of ["teachersEnabled", "announcementsEnabled"]) {
    if (key in featuresRaw && typeof featuresRaw[key] !== "boolean") {
      addIssue(errors, "features", "data/features.js", `${key} должен иметь значение true или false.`);
    }
  }

  const oddIsoWeek = weekRaw.oddIsoWeek || "above";
  if (!["above", "below"].includes(oddIsoWeek)) addIssue(errors, "settings", "data/settings.js", "oddIsoWeek должен быть above или below. Используется above.");
  const weekSettings = { oddIsoWeek: ["above", "below"].includes(oddIsoWeek) ? oddIsoWeek : "above" };
  const contacts = normalizeContacts(contactsRaw, errors);

  const data = { faculties, schedule: [], scheduleLoading: false, scheduleError: null, teachers, contacts, weekSettings, features, announcements, errors, warnings, sources };
  const counts = {
    faculties: faculties.length,
    groups: faculties.reduce((sum, faculty) => sum + faculty.groups.length, 0),
    schedule: 0,
    teachers: teachers.length,
    telegramChannels: contacts.telegramChannels.length,
    announcements: announcements.length,
    teachersEnabled: features.teachersEnabled,
    announcementsEnabled: features.announcementsEnabled
  };
  if (typeof window !== "undefined") {
    window.RASPISANIE_DEBUG = {
      version: "3.9.5", page: window.location?.href || "", loadedAt: new Date().toISOString(), counts, sources, errors, warnings,
      selectedCourse: null
    };
  }
  // Не выводим таблицы диагностики из Node.js test runner:
  // это сохраняет чистый и стабильный вывод npm test.
  const isNodeTest = typeof process !== "undefined" && Boolean(process.env.NODE_TEST_CONTEXT);
  if (!isNodeTest) {
    console.groupCollapsed?.("[Расписание] Диагностика загрузки справочников v3.9.5");
    console.table?.(counts);
    console.table?.(Object.entries(sources).map(([name, url]) => ({ file: name, loadedFrom: url })));
    if (errors.length) console.error("Ошибки данных:", errors);
    if (warnings.length) console.warn("Предупреждения данных:", warnings);
    if (!errors.length && !warnings.length) console.info("Все справочники загружены и проверены.");
    console.groupEnd?.();
  }
  return data;
}

export function getLessons(data, { date }) {
  const isoWeekType = getISOWeekType(date, data.weekSettings?.oddIsoWeek === "below" ? "below" : "above");
  const week = isoWeekType === "above" ? "top" : "bottom";
  return (data.schedule || [])
    .filter(item => item.weekday === date.getDay())
    .filter(item => item.week === "both" || item.week === week)
    .sort((first, second) => first.start.localeCompare(second.start));
}

export function getVisibleAnnouncements(data, selection = null) {
  return data.announcements.filter(item => {
    if (item.facultyId && item.facultyId !== selection?.facultyId) return false;
    if (item.groupId && item.groupId !== selection?.groupId) return false;
    if (item.course !== null && Number(item.course) !== Number(selection?.course)) return false;
    return true;
  });
}
