// Загрузка и проверка расписания. Этот модуль не отвечает за отображение элементов страницы.
import { getCycleWeek, weekdayNumber, toISODate, parseDate } from "./calendar.js";
import { makeId, minutesFromTime, safeText } from "./utils.js";

export async function loadDefaultData() {
  // fetch JSON работает при запуске сайта через сервер (например, GitHub Pages или Live Server).
  const readJSON = async path => {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`Не удалось загрузить ${path}: HTTP ${response.status}`);
    return response.json();
  };
  const [schedule, settings] = await Promise.all([
    readJSON("data/schedule.json"),
    readJSON("data/settings.json")
  ]);
  const normalized = normalizeData({ ...schedule, settings });
  validateData(normalized);
  return normalized;
}

export function normalizeData(data) {
  // Валидация и добавление безопасных значений по умолчанию.
  const result = typeof structuredClone === "function" ? structuredClone(data || {}) : JSON.parse(JSON.stringify(data || {}));
  result.schemaVersion = 7;
  // Убираем служебные подписи о происхождении данных из публичной структуры.
  // Поле origin оставляем: оно определяет, какие записи посетитель может редактировать.
  delete result.officialImport;
  delete result.source;

  // Совместимость с форматом предыдущей версии FLAX GSU: specialties → units, pair → start/end.
  // Это позволяет импортировать старый schedule.json напрямую, без ручного переписывания.
  if (!Array.isArray(result.units) && Array.isArray(result.specialties)) {
    const defaultPairTimes = {
      1: ["09:00", "10:35"], 2: ["10:45", "12:20"], 3: ["12:40", "14:15"],
      4: ["14:35", "16:10"], 5: ["16:30", "18:05"], 6: ["18:15", "19:50"]
    };
    result.units = result.specialties.map(specialty => ({
      id: specialty.id || makeId(), name: specialty.name || "Направление",
      groups: (specialty.groups || []).map(group => ({
        id: group.id || makeId(), name: group.name || "Группа",
        lessons: (group.lessons || []).map((lesson, index) => {
          const pair = Number(lesson.pair) || 1;
          const times = result.settings?.pairTimes?.[String(pair)] || defaultPairTimes[pair] || defaultPairTimes[1];
          return {
            id: `${group.id || "group"}-${index + 1}`, day: lesson.day || 1, slot: pair,
            start: times[0], end: times[1], title: lesson.subject || "Занятие",
            type: lesson.type || "Занятие", location: lesson.room || "",
            teacher: lesson.teacher || "", week: lesson.week ?? 0, notes: ""
          };
        })
      }))
    }));
    result.organization ||= { name: "ГГУ имени Ф. Скорины", subtitle: "Импортированное расписание", type: "university" };
    result.settings ||= { semesterStart: "2026-09-07", weekCycle: true, activeDays: 6 };
  }

  result.organization ||= { name: "ГГУ имени Ф. Скорины", subtitle: "Гомель · 2026/2027", type: "university" };
  result.organization.name = safeText(result.organization.name, "ГГУ имени Ф. Скорины");
  result.organization.subtitle = safeText(result.organization.subtitle, "Гомель · 2026/2027");
  result.organization.type = "university"; // Сборка закреплена за ГГУ.
  result.settings ||= {};
  result.settings.semesterStart ||= "2026-09-07";
  result.settings.weekCycle = result.settings.weekCycle !== false;
  result.settings.activeDays = Math.min(7, Math.max(1, Number(result.settings.activeDays) || 7));
  result.units = Array.isArray(result.units) ? result.units : [];
  result.teacherSchedules = Array.isArray(result.teacherSchedules) ? result.teacherSchedules : [];

  // Каждому занятию нужен постоянный ID: по нему запись редактируется и удаляется.
  for (const unit of result.units) {
    unit.id ||= makeId();
    unit.name = safeText(unit.name, "Без названия");
    unit.groups = Array.isArray(unit.groups) ? unit.groups : [];
    for (const group of unit.groups) {
      group.id ||= makeId();
      delete group.source; delete group.sourceLabel;
      group.name = safeText(group.name, "Без группы");
      group.subgroups = Array.isArray(group.subgroups) ? group.subgroups.map(value => safeText(String(value), "")).filter(Boolean) : [];
      group.lessons = Array.isArray(group.lessons) ? group.lessons : [];
      for (const lesson of group.lessons) {
        delete lesson.source; delete lesson.sourceLabel;
        lesson.id ||= makeId();
        lesson.title = safeText(lesson.title || lesson.subject, "Новое событие");
        lesson.type = safeText(lesson.type, "Занятие");
        lesson.start ||= "09:00";
        lesson.end ||= "10:35";
        lesson.day = Math.min(7, Math.max(1, Number(lesson.day) || 1));
        lesson.week = [0, 1, 2].includes(Number(lesson.week)) ? Number(lesson.week) : 0;
        lesson.location = safeText(lesson.location || lesson.room, "");
        lesson.teacher = safeText(lesson.teacher, "");
        lesson.subgroup = safeText(lesson.subgroup, "");
        lesson.notes = safeText(lesson.notes, "");
      }
    }
  }
  // Отдельные расписания преподавателей храним отдельно от студенческих групп:
  // так они доступны в режиме «Преподаватель», но не засоряют список учебных групп.
  for (const schedule of result.teacherSchedules) {
    delete schedule.source; delete schedule.sourceLabel;
    schedule.id ||= makeId();
    schedule.name = safeText(schedule.name || schedule.title, "Преподаватель");
    schedule.title = safeText(schedule.title, `Расписание · ${schedule.name}`);
    schedule.lessons = Array.isArray(schedule.lessons) ? schedule.lessons : [];
    for (const lesson of schedule.lessons) {
      lesson.id ||= makeId();
      lesson.title = safeText(lesson.title || lesson.subject, "Занятие");
      lesson.type = safeText(lesson.type, "Занятие");
      lesson.start ||= "09:00";
      lesson.end ||= "10:35";
      lesson.day = Math.min(7, Math.max(1, Number(lesson.day) || 1));
      lesson.week = [0, 1, 2].includes(Number(lesson.week)) ? Number(lesson.week) : 0;
      lesson.location = safeText(lesson.location || lesson.room, "");
      lesson.teacher = safeText(lesson.teacher || schedule.name, schedule.name);
      lesson.notes = safeText(lesson.notes, "");
    }
  }
  return result;
}

export function validateData(data) {
  if (!data || !Array.isArray(data.units)) throw new Error("Файл должен содержать массив units (направления и группы).");
  for (const unit of data.units) {
    if (!unit.name || !Array.isArray(unit.groups)) throw new Error("У каждого направления должны быть name и groups.");
    for (const group of unit.groups) {
      if (!group.name || !Array.isArray(group.lessons)) throw new Error("У каждой группы должны быть name и lessons.");
      for (const lesson of group.lessons) {
        const validTime = value => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value || "");
        if (!lesson.title || !validTime(lesson.start) || !validTime(lesson.end)) {
          throw new Error(`Проверьте название и время одного из событий в группе «${group.name}».`);
        }
        if (lesson.date && !parseDate(lesson.date)) {
          throw new Error(`В событии «${lesson.title}» указана некорректная дата.`);
        }
        if (minutesFromTime(lesson.end) <= minutesFromTime(lesson.start)) {
          throw new Error(`В событии «${lesson.title}» время окончания должно быть позже начала.`);
        }
      }
    }
  }
  // Проверяем самостоятельные преподавательские расписания теми же правилами времени.
  for (const schedule of data.teacherSchedules || []) {
    if (!schedule.name || !Array.isArray(schedule.lessons)) throw new Error("У расписания преподавателя должны быть name и lessons.");
    for (const lesson of schedule.lessons) {
      const validTime = value => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value || "");
      if (!lesson.title || !validTime(lesson.start) || !validTime(lesson.end) || minutesFromTime(lesson.end) <= minutesFromTime(lesson.start)) {
        throw new Error(`Проверьте название и время события в расписании преподавателя «${schedule.name}».`);
      }
    }
  }
  return true;
}

export function allGroups(data) {
  return data.units.flatMap(unit => unit.groups.map(group => ({
    id: group.id, name: group.name, unitId: unit.id, unitName: unit.name
  })));
}


// В расписаниях ГГУ у одной пары иногда указаны несколько преподавателей через точку с запятой.
// Разделяем их, чтобы каждый преподаватель появлялся в справочнике отдельно и мог открыть свой график.
export function teacherNames(value) {
  return String(value || "").split(/\s*;\s*/).map(name => name.trim()).filter(Boolean);
}

// При обновлении версии добавляет опубликованные университетом группы, но сохраняет личные группы пользователя.
export function mergeDefaultOfficialGroups(savedData, defaultData) {
  const base = normalizeData(savedData || defaultData);
  const defaults = normalizeData(defaultData);
  // В старых сборках подгруппы Ф-23/Ф-33/Ф-43 хранились отдельными группами.
  // Переносим пользовательские дополнительные записи в общую группу и подписываем подгруппу.
  const legacySubgroups = {
    "official-xls-f-23-1": { target: "official-xls-f-23", label: "Подгруппа 1" },
    "official-xls-f-23-2": { target: "official-xls-f-23", label: "Подгруппа 2" },
    "official-xls-f-33-1": { target: "official-xls-f-33", label: "Подгруппа 1" },
    "official-xls-f-33-2": { target: "official-xls-f-33", label: "Подгруппа 2" },
    "official-xls-f-33-3": { target: "official-xls-f-33", label: "Подгруппа 3" },
    "official-xls-f-33-4": { target: "official-xls-f-33", label: "Подгруппа 4" },
    "official-xls-f-33-5": { target: "official-xls-f-33", label: "Подгруппа 5" },
    "official-xls-f-43-1": { target: "official-xls-f-43", label: "Подгруппа 1" },
    "official-xls-f-43-2": { target: "official-xls-f-43", label: "Подгруппа 2" },
    "official-xls-f-43-3": { target: "official-xls-f-43", label: "Подгруппа 3" }
  };
  for (const sourceUnit of defaults.units) {
    let targetUnit = base.units.find(unit => unit.id === sourceUnit.id);
    if (!targetUnit) {
      base.units.push(JSON.parse(JSON.stringify(sourceUnit)));
      continue;
    }
    const legacyEntries = sourceUnit.id === "physics-it" ? legacySubgroups : {};
    for (const [legacyId, mapping] of Object.entries(legacyEntries)) {
      const oldGroup = targetUnit.groups.find(group => group.id === legacyId);
      if (!oldGroup) continue;
      let targetGroup = targetUnit.groups.find(group => group.id === mapping.target);
      if (!targetGroup) {
        const defaultTarget = sourceUnit.groups.find(group => group.id === mapping.target);
        if (defaultTarget) {
          targetGroup = JSON.parse(JSON.stringify(defaultTarget));
          targetUnit.groups.push(targetGroup);
        }
      }
      if (targetGroup) {
        const knownLessonIds = new Set(targetGroup.lessons.map(lesson => lesson.id));
        for (const oldLesson of oldGroup.lessons || []) {
          if (oldLesson.origin === "personal" && !knownLessonIds.has(oldLesson.id)) {
            const migrated = JSON.parse(JSON.stringify(oldLesson));
            migrated.subgroup ||= mapping.label;
            targetGroup.lessons.push(migrated);
            knownLessonIds.add(migrated.id);
          }
        }
      }
      targetUnit.groups = targetUnit.groups.filter(group => group.id !== legacyId);
    }
    // Добавляем отсутствующие базовые группы; уже сохранённые личные записи не трогаем.
    const knownIds = new Set(targetUnit.groups.map(group => group.id));
    const missingGroups = sourceUnit.groups.filter(group => String(group.id).startsWith("official-") && !knownIds.has(group.id));
    targetUnit.groups.push(...JSON.parse(JSON.stringify(missingGroups)));
  }
  // Новые расписания преподавателей тоже добавляются при обновлении сайта,
  // но уже существующие пользовательские копии не перезаписываются.
  base.teacherSchedules = Array.isArray(base.teacherSchedules) ? base.teacherSchedules : [];
  const knownTeacherSchedules = new Set(base.teacherSchedules.map(item => item.id));
  const missingTeacherSchedules = (defaults.teacherSchedules || []).filter(item => !knownTeacherSchedules.has(item.id));
  base.teacherSchedules.push(...JSON.parse(JSON.stringify(missingTeacherSchedules)));
  // Удаляем старые подписи о происхождении данных из локальной копии после обновления.
  delete base.officialImport;
  delete base.source;
  return normalizeData(base);
}

export function allPeople(data) {
  const people = new Map();
  for (const unit of data.units) for (const group of unit.groups) for (const lesson of group.lessons) {
    for (const name of teacherNames(lesson.teacher)) {
      const entry = people.get(name) || { name, lessons: 0, groups: new Set(), subjects: new Set() };
      entry.lessons += 1;
      entry.groups.add(group.name);
      entry.subjects.add(lesson.title);
      people.set(name, entry);
    }
  }
  // Преподаватель с отдельным опубликованным/переданным графиком также появляется в фильтре.
  for (const schedule of data.teacherSchedules || []) {
    const entry = people.get(schedule.name) || { name: schedule.name, lessons: 0, groups: new Set(), subjects: new Set() };
    for (const lesson of schedule.lessons || []) {
      entry.lessons += 1;
      entry.groups.add(schedule.title || "Отдельный график преподавателя");
      entry.subjects.add(lesson.title);
    }
    people.set(schedule.name, entry);
  }
  return [...people.values()].map(item => ({ ...item, groups: [...item.groups], subjects: [...item.subjects] }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export function findGroup(data, unitId, groupId) {
  const unit = data.units.find(item => item.id === unitId);
  const group = unit?.groups.find(item => item.id === groupId);
  return group ? { unit, group } : null;
}

export function findLesson(data, lessonId) {
  for (const unit of data.units) for (const group of unit.groups) {
    const lesson = group.lessons.find(item => item.id === lessonId);
    if (lesson) return { unit, group, lesson };
  }
  return null;
}

export function lessonsForDate(data, prefs, date) {
  const day = weekdayNumber(date);
  const cycleWeek = getCycleWeek(data.settings.semesterStart, date);
  const sources = [];

  if (prefs.mode === "teacher" && prefs.teacher) {
    for (const unit of data.units) for (const group of unit.groups) {
      for (const lesson of group.lessons) if (teacherNames(lesson.teacher).includes(prefs.teacher)) {
        sources.push({ unit, group, lesson });
      }
    }
    for (const schedule of data.teacherSchedules || []) if (schedule.name === prefs.teacher) {
      const unit = { id: "teacher-schedules", name: "Графики преподавателей" };
      const group = { id: schedule.id, name: schedule.title || `Расписание · ${schedule.name}` };
      for (const lesson of schedule.lessons || []) sources.push({ unit, group, lesson });
    }
  } else {
    const unit = data.units.find(item => item.id === prefs.unitId);
    const group = unit?.groups.find(item => item.id === prefs.groupId);
    if (group) for (const lesson of group.lessons) sources.push({ unit, group, lesson });
  }

  return sources.filter(({ lesson }) => {
    // Если задана точная дата, событие показывается только в этот день.
    if (lesson.date) return lesson.date === toISODate(date);
    // Официальные файлы могут содержать замену расписания, действующую с определённой даты.
    // validFrom/validTo позволяют не показывать более раннюю версию после опубликованного обновления.
    const isoDate = toISODate(date);
    if (lesson.validFrom && isoDate < lesson.validFrom) return false;
    if (lesson.validTo && isoDate > lesson.validTo) return false;
    if (lesson.day !== day) return false;
    if (!data.settings.weekCycle || lesson.week === 0) return true;
    return lesson.week === cycleWeek;
  }).sort((a, b) => minutesFromTime(a.lesson.start) - minutesFromTime(b.lesson.start))
    .map(item => ({ ...item.lesson, unitId: item.unit.id, unitName: item.unit.name, groupId: item.group.id, groupName: item.group.name }));
}

export function lessonsForWeek(data, prefs, mondayToSunday) {
  return mondayToSunday.flatMap(date => lessonsForDate(data, prefs, date).map(lesson => ({ ...lesson, date: toISODate(date) })));
}
