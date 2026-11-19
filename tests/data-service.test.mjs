import test from "node:test";
import assert from "node:assert/strict";
import {
  loadAppData,
  loadCourseSchedule,
  normalizeFaculties,
  normalizeTeacherList,
  normalizeCourseSchedule,
  getLessons,
  normalizeAnnouncements,
  getVisibleAnnouncements
} from "../js/services/data-service.js";

const fixtureFaculties = [{
  id: "physics-it", name: "Факультет физики и ИТ",
  groups: [{ id: "pf", name: "ПФ", courses: [1, 2, 3, 4] }]
}];

test("faculties: нормализует иерархию факультет → группа → курс", () => {
  const issues = [];
  const result = normalizeFaculties(fixtureFaculties, issues);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].groups[0].courses, [1, 2, 3, 4]);
  assert.equal(issues.length, 0);
});

test("faculties: accepts faculty with no groups yet", () => {
  const issues = [];
  const result = normalizeFaculties([{ id: "biology", name: "Биологический факультет", groups: [] }], issues);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].groups, []);
  assert.equal(issues.length, 0);
});

test("faculties: отклоняет повторяющиеся ID", () => {
  const issues = [];
  normalizeFaculties([...fixtureFaculties, fixtureFaculties[0]], issues);
  assert.ok(issues.some(issue => issue.message.includes("Повторяется ID факультета")));
});

test("teachers: поддерживает объекты и строковые записи", () => {
  const issues = [];
  const result = normalizeTeacherList([
    { name: "Иванов И.И.", subject: "Математика" },
    { fio: "Петров П.П.", disciplines: ["Физика", "Астрономия"] },
    "Сидорова Е.В."
  ], issues);
  assert.deepEqual(result.map(item => item.name), ["Иванов И.И.", "Петров П.П.", "Сидорова Е.В."]);
  assert.equal(result[1].subject, "Физика / Астрономия");
  assert.equal(issues.length, 0);
});

test("course schedule: принимает пользовательский короткий формат", () => {
  const result = normalizeCourseSchedule({
    monday: [
      { time: "10:45 – 12:20", subject: "Математический анализ (Лекция)", room: "Ауд. 6-28", teacher: "Немилостива В.А.", week: "top" },
      { time: "12:40 – 14:15", subject: "Физика (Практика)", room: "3-12", teacher: "Иванов А.А.", week: "bottom" },
      { time: "14:30 – 16:05", subject: "История", room: "", teacher: "", week: "both" }
    ], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
  }, { facultyId: "physics-it", groupId: "pf", course: 1 });
  assert.equal(result.lessons.length, 3);
  assert.equal(result.lessons[0].start, "10:45");
  assert.equal(result.lessons[0].end, "12:20");
  assert.equal(result.lessons[1].week, "bottom");
  assert.equal(result.errors.length, 0);
});

test("course schedule: отклоняет неверное время и week", () => {
  const result = normalizeCourseSchedule({
    monday: [
      { time: "25:70 – 12:20", subject: "Ошибка времени", week: "top" },
      { time: "10:45 – 12:20", subject: "Ошибка недели", week: "above" },
      { time: "10:45 – 12:20", subject: "Нет week" }
    ]
  }, { facultyId: "physics-it", groupId: "pf", course: 1 });
  assert.equal(result.lessons.length, 0);
  assert.equal(result.errors.length, 3);
});

test("course schedule: предупреждает о пересечениях совместимых вариантов недели", () => {
  const result = normalizeCourseSchedule({
    monday: [
      { time: "09:00 – 10:35", subject: "Пара 1", week: "both" },
      { time: "10:00 – 11:00", subject: "Пара 2", week: "top" }
    ]
  }, { facultyId: "physics-it", groupId: "pf", course: 1 });
  assert.equal(result.lessons.length, 2);
  assert.ok(result.warnings.length > 0);
});

test("schedule: фильтрует top/bottom/both по чётности ISO-недели и сортирует", () => {
  const data = {
    weekSettings: { oddIsoWeek: "above" },
    schedule: [
      { id: "both", weekday: 1, start: "10:45", week: "both" },
      { id: "top", weekday: 1, start: "09:00", week: "top" },
      { id: "bottom", weekday: 1, start: "08:00", week: "bottom" }
    ]
  };
  const topDate = new Date(2026, 10, 16); // ISO 47
  const bottomDate = new Date(2026, 10, 23); // ISO 48
  assert.deepEqual(getLessons(data, { date: topDate }).map(item => item.id), ["top", "both"]);
  assert.deepEqual(getLessons(data, { date: bottomDate }).map(item => item.id), ["bottom", "both"]);
});

test("course schedule: принимает часы без ведущего нуля и нормализует сортировку", () => {
  const result = normalizeCourseSchedule({
    monday: [
      { time: "9:00 – 10:35", subject: "Ранняя пара", week: "both" },
      { time: "10:45 – 12:20", subject: "Следующая пара", week: "both" }
    ]
  }, { facultyId: "physics-it", groupId: "as", course: 1 });
  assert.equal(result.errors.length, 0);
  assert.equal(result.lessons[0].start, "09:00");
  assert.equal(result.lessons[1].start, "10:45");
});

test("physics-it schedule: all 28 course files load and the single F group is empty", async () => {
  globalThis.window = { location: { href: "http://127.0.0.1:5500/" } };
  const { FACULTIES } = await import("../data/faculties.js");
  const groups = FACULTIES.find(item => item.id === "physics-it").groups;
  assert.equal(groups.length, 7);
  assert.deepEqual(groups.filter(group => group.id === "f").map(group => [group.id, group.name, group.courses]), [["f", "Ф", [1, 2, 3, 4]]]);
  assert.equal(groups.some(group => /^f-[1-5]$/.test(group.id)), false);
  let files = 0;
  let lessons = 0;
  for (const group of groups) for (const courseNumber of group.courses) {
    const result = await loadCourseSchedule({ facultyId: "physics-it", groupId: group.id, course: courseNumber }, FACULTIES);
    assert.equal(result.errors.length, 0, `${group.id} course ${courseNumber}: ${JSON.stringify(result.errors)}`);
    files += 1;
    lessons += result.lessons.length;
  }
  assert.equal(files, 28);
  assert.equal(lessons, 569);
  for (const courseNumber of [1, 2, 3, 4]) {
    const result = await loadCourseSchedule({ facultyId: "physics-it", groupId: "f", course: courseNumber }, FACULTIES);
    assert.equal(result.lessons.length, 0, `Ф course ${courseNumber} должен быть пустым`);
  }
});

test("announcements: проверяет и фильтрует адресную аудиторию", () => {
  const issues = [];
  const result = normalizeAnnouncements([
    { id: "global", title: "Общее", message: "Для всех", date: "2026-11-20" },
    { id: "pf1", title: "ПФ 1", message: "Только ПФ", date: "2026-11-21", facultyId: "physics-it", groupId: "pf", course: 1 }
  ], fixtureFaculties, issues);
  assert.equal(issues.length, 0);
  assert.equal(getVisibleAnnouncements({ announcements: result }, { facultyId: "physics-it", groupId: "pf", course: 1 }).length, 2);
  assert.deepEqual(getVisibleAnnouncements({ announcements: result }, { facultyId: "physics-it", groupId: "pf", course: 2 }).map(item => item.id), ["global"]);
});

test("loaders: загружают справочники и файл выбранного курса", async () => {
  globalThis.window = { location: { href: "http://127.0.0.1:5500/" } };
  const data = await loadAppData();
  assert.equal(data.faculties.length, 11);
  assert.equal(data.faculties.find(item => item.id === "biology").groups.length, 0);
  assert.equal(data.faculties.find(item => item.id === "physics-it").groups.length, 7);
  assert.equal(data.contacts.email, "flaxproduction.corp@gmail.com");
  assert.equal(data.contacts.telegramChannels.length, 2);
  assert.ok(Array.isArray(data.teachers));
  assert.deepEqual(data.features, { teachersEnabled: false, announcementsEnabled: false });
  const course = await loadCourseSchedule({ facultyId: "physics-it", groupId: "pf", course: 1 }, data.faculties);
  assert.equal(course.errors.length, 0);
  assert.ok(Array.isArray(course.lessons));
  assert.match(course.source, /data\/schedule\/physics-it\/pf\/course-1\.js/);
});


test("v3.9.5: ПФ исправлен, группа Ф пустая, 19.11.2026 — неделя под чертой", async () => {
  globalThis.window = { location: { href: "http://127.0.0.1:5500/" } };
  const { FACULTIES } = await import("../data/faculties.js");
  const { WEEK_SETTINGS } = await import("../data/settings.js");
  const { getISOWeekNumber, getISOWeekType } = await import("../js/utils/date-utils.js");
  const date = new Date(2026, 10, 19);
  assert.equal(getISOWeekNumber(date), 47);
  assert.equal(WEEK_SETTINGS.oddIsoWeek, "below");
  assert.equal(getISOWeekType(date, WEEK_SETTINGS.oddIsoWeek), "below");

  const pf = await loadCourseSchedule({ facultyId: "physics-it", groupId: "pf", course: 1 }, FACULTIES);
  const agila = pf.lessons.filter(item => item.subject === "АГИЛА");
  assert.equal(agila.length, 3);
  assert.ok(!pf.lessons.some(item => /аналитическ.*геометр|линейн.*алгебр/i.test(item.subject)));
  const mechanics = pf.lessons.filter(item => item.subject === "Механика" && item.teacher === "Хахомов С.А.");
  assert.equal(mechanics.length, 2);
  assert.ok(!pf.lessons.some(item => item.subject === "ахомов С.А. -7" || item.teacher === "Механика Х."));

  const { getLessons } = await import("../js/services/data-service.js");
  const thursdayLessons = getLessons({ schedule: pf.lessons, weekSettings: WEEK_SETTINGS }, { date });
  assert.ok(thursdayLessons.some(item => item.subject === "Механика (ПР)" && item.week === "bottom"));
  assert.ok(!thursdayLessons.some(item => item.subject === "Основы программирования" && item.week === "top"));
});


test("UI: пустой день не показывает техническое имя файла, группы или курса", async () => {
  const fs = await import("node:fs/promises");
  const source = await fs.readFile(new URL("../js/features/schedule.js", import.meta.url), "utf8");
  assert.ok(!source.includes("В выбранном файле нет занятий на этот день"));
  assert.ok(source.includes("На этот день занятий нет"));
});
