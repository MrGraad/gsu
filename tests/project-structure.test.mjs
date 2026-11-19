import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

test("navigation: order matches schedule, disabled teachers, disabled announcements, about", () => {
  const html = read("index.html");
  const items = [...html.matchAll(/<button\b([^>]*data-view=["']([^"']+)["'][^>]*)>/g)];
  assert.deepEqual(items.map(item => item[2]), ["schedule", "teachers", "announcements", "about"]);
  for (const view of ["teachers", "announcements"]) {
    const button = items.find(item => item[2] === view);
    assert.match(button[1], /\bdisabled\b/);
    assert.match(button[1], /aria-disabled=["']true["']/);
  }
  assert.equal((html.match(/class="nav-status"/g) || []).length, 2);
  assert.doesNotMatch(html, /class="nav-status">Скоро<\/span>/);
  assert.equal((html.match(/class="nav-icon"/g) || []).length, 4);
  assert.equal((html.match(/<svg viewBox="0 0 24 24"/g) || []).length, 4);
});

test("navigation: teachers and announcements are controlled by feature flags", () => {
  const navigation = read("js/features/navigation.js");
  const features = read("data/features.js");
  assert.match(navigation, /features\.teachersEnabled/);
  assert.match(navigation, /features\.announcementsEnabled/);
  assert.match(navigation, /button && !button\.disabled/);
  assert.match(features, /teachersEnabled: false/);
  assert.match(features, /announcementsEnabled: false/);
});

test("rooms: no standalone room list or page remains", () => {
  assert.equal(fs.existsSync(path.join(root, "data/rooms.js")), false);
  const html = read("index.html");
  const navigation = read("js/features/navigation.js");
  const service = read("js/services/data-service.js");
  assert.doesNotMatch(html, /data-view=["']rooms["']/);
  assert.doesNotMatch(navigation, /renderRoomsPage|data\.rooms/);
  assert.doesNotMatch(service, /data\/rooms\.js|normalizeRooms|rooms:/);
});

test("rooms: room remains a free-text field on a lesson", async () => {
  const service = await import("../js/services/data-service.js");
  const normalized = service.normalizeCourseSchedule({
    monday: [{ time: "10:45 – 12:20", subject: "Тестовая пара", room: "Корпус 4, ауд. 6-28", teacher: "Иванов И.И.", week: "top" }]
  }, { facultyId: "physics-it", groupId: "pf", course: 1 });
  assert.equal(normalized.errors.length, 0);
  assert.equal(normalized.lessons[0].room, "Корпус 4, ауд. 6-28");
});

test("documentation: all root-level text files have moved into docs", () => {
  const findTextFiles = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? findTextFiles(full) : /\.(?:md|txt)$/i.test(entry.name) ? [full] : [];
  });
  const misplaced = findTextFiles(root).filter(file => path.relative(root, file).split(path.sep)[0] !== "docs");
  assert.deepEqual(misplaced, []);
  for (const required of ["README.md", "CHANGELOG.md", "START-HERE.txt", "TEST-RESULTS.md"]) {
    assert.equal(fs.existsSync(path.join(root, "docs", required)), true, `docs/${required} missing`);
  }
});

test("faculties: exactly the 11 approved faculties are present", async () => {
  const { FACULTIES } = await import("../data/faculties.js");
  const expectedNames = [
    "Биологический факультет",
    "Геолого-географический факультет",
    "Факультет истории и межкультурных коммуникаций",
    "Факультет иностранных языков",
    "Факультет математики и технологий программирования",
    "Факультет психологии и педагогики",
    "Факультет физики и информационных технологий",
    "Факультет физической культуры",
    "Филологический факультет",
    "Экономический факультет",
    "Юридический факультет"
  ];
  assert.deepEqual(FACULTIES.map(item => item.name), expectedNames);
});

test("faculties: empty groups are allowed until user defines actual group names", async () => {
  const { normalizeFaculties } = await import("../js/services/data-service.js");
  const issues = [];
  const result = normalizeFaculties([{ id: "biology", name: "Биологический факультет", groups: [] }], issues);
  assert.equal(result.length, 1);
  assert.equal(result[0].groups.length, 0);
  assert.equal(issues.length, 0);
});

test("schedule templates: each faculty without registered groups has four course templates", async () => {
  const { FACULTIES } = await import("../data/faculties.js");
  for (const faculty of FACULTIES.filter(item => item.groups.length === 0)) {
    for (let course = 1; course <= 4; course++) {
      const file = path.join(root, "data", "schedule", faculty.id, "group-template", `course-${course}.js`);
      assert.equal(fs.existsSync(file), true, `${faculty.id} course ${course} template missing`);
    }
  }
});

test("group selectors: empty group list is handled without requiring a fake group", () => {
  const groups = read("js/features/groups.js");
  assert.match(groups, /Группы пока не добавлены/);
  assert.match(groups, /Сначала добавьте группу/);
  assert.match(groups, /currentFaculty\.groups\[0\] \|\| null/);
});

test("contacts: configured project email is correct", async () => {
  const contacts = await import("../data/contacts.js");
  assert.equal(contacts.CONTACTS.email, "flaxproduction.corp@gmail.com");
  assert.equal(contacts.CONTACTS.telegramChannels.length, 2);
});


test("UI: developer instructions and code examples are not rendered in app pages", () => {
  const navigation = read("js/features/navigation.js");
  const schedule = read("js/features/schedule.js");
  assert.doesNotMatch(navigation, /Откройте data\/teachers\.js|Пример находится в начале файла|Ссылка добавляется в data\//);
  assert.doesNotMatch(navigation, /data-example|Перечитать данные/);
  assert.doesNotMatch(navigation, /Добавьте записи в data\/teachers\.js|Добавьте Telegram-ссылки в data\/contacts\.js/);
  assert.doesNotMatch(navigation, /Источник: data\/teachers\.js|редактируются в папке data\//);
  assert.doesNotMatch(schedule, /Добавьте занятия в data\/schedule|Примеры находятся в комментариях/);
});

test("About page has no data refresh button; instructions remain in docs", () => {
  const navigation = read("js/features/navigation.js");
  const readme = read("docs/README.md");
  assert.doesNotMatch(navigation, /makeElement\("button", "secondary-action", "Перечитать данные"\)/);
  assert.match(readme, /Откройте `data\/teachers\.js` и добавьте записи/);
  assert.match(readme, /data\/schedule/);
  assert.match(readme, /добавить группу/i);
  assert.match(readme, /group-template/);
});

test("group selectors: switch between faculties with and without groups", async () => {
  const { FACULTIES } = await import("../data/faculties.js");
  const { initGroupSelectors } = await import("../js/features/groups.js");

  class MockSelect {
    constructor() { this.options = []; this.value = ""; this.disabled = false; this.listeners = {}; }
    replaceChildren() { this.options = []; this.value = ""; }
    append(option) {
      this.options.push(option);
      if (option.selected && this.value === "") this.value = option.value;
      if (this.options.length === 1 && this.value === "") this.value = option.value;
    }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    dispatch(name) { this.listeners[name]?.({ target: this }); }
  }

  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const stored = new Map();
  const elements = {
    "#facultySelect": new MockSelect(),
    "#groupSelect": new MockSelect(),
    "#courseSelect": new MockSelect()
  };
  globalThis.window = {
    localStorage: {
      getItem: key => stored.get(key) ?? null,
      setItem: (key, value) => stored.set(key, value)
    }
  };
  globalThis.document = {
    querySelector: selector => elements[selector] ?? null,
    createElement: tag => ({ tagName: tag.toUpperCase(), value: "", textContent: "", selected: false })
  };

  try {
    const changes = [];
    const selectors = initGroupSelectors(FACULTIES, selection => changes.push(selection));

    assert.equal(selectors.getSelection().facultyId, "biology");
    assert.equal(selectors.getSelection().groupId, "");
    assert.equal(selectors.getSelection().course, null);
    assert.equal(elements["#groupSelect"].disabled, true);
    assert.equal(elements["#courseSelect"].disabled, true);
    assert.equal(elements["#groupSelect"].options[0].textContent, "Группы пока не добавлены");

    elements["#facultySelect"].value = "physics-it";
    elements["#facultySelect"].dispatch("change");
    assert.deepEqual(selectors.getSelection(), { facultyId: "physics-it", groupId: "as", course: 1 });
    assert.equal(elements["#groupSelect"].disabled, false);

    elements["#groupSelect"].value = "f";
    elements["#groupSelect"].dispatch("change");
    elements["#courseSelect"].value = "3";
    elements["#courseSelect"].dispatch("change");
    assert.deepEqual(selectors.getSelection(), { facultyId: "physics-it", groupId: "f", course: 3 });

    elements["#facultySelect"].value = "economics";
    elements["#facultySelect"].dispatch("change");
    assert.deepEqual(selectors.getSelection(), { facultyId: "economics", groupId: "", course: null });
    assert.equal(elements["#groupSelect"].disabled, true);
    assert.equal(elements["#courseSelect"].disabled, true);
    assert.ok(changes.length >= 3);
    assert.ok([...stored.values()].some(value => value.includes('"facultyId":"economics"')));
  } finally {
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument;
  }
});


test("UI: empty faculty state does not expose file paths or developer instructions", () => {
  const schedule = read("js/features/schedule.js");
  assert.match(schedule, /Для этого факультета пока не добавлены учебные группы/);
  assert.doesNotMatch(schedule, /docs\/README|data\/faculties\.js|group-template/);
});


test("group selectors: migrates previous F subgroup selections to the single F group", async () => {
  const { FACULTIES } = await import("../data/faculties.js");
  const { initGroupSelectors } = await import("../js/features/groups.js");
  class MockSelect {
    constructor() { this.options = []; this.value = ""; this.disabled = false; this.listeners = {}; }
    replaceChildren() { this.options = []; this.value = ""; }
    append(option) { this.options.push(option); if (option.selected && !this.value) this.value = option.value; if (this.options.length === 1 && !this.value) this.value = option.value; }
    addEventListener(name, callback) { this.listeners[name] = callback; }
  }
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const elements = { "#facultySelect": new MockSelect(), "#groupSelect": new MockSelect(), "#courseSelect": new MockSelect() };
  globalThis.window = { localStorage: { getItem: () => JSON.stringify({ facultyId: "physics-it", groupId: "f-3", course: 3 }), setItem() {} } };
  globalThis.document = { querySelector: selector => elements[selector], createElement: () => ({ value: "", textContent: "", selected: false }) };
  try {
    const selectors = initGroupSelectors(FACULTIES, () => {});
    assert.deepEqual(selectors.getSelection(), { facultyId: "physics-it", groupId: "f", course: 3 });
  } finally {
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument;
  }
});

test("physics-it: one ordinary F group remains with four empty courses", async () => {
  const { FACULTIES } = await import("../data/faculties.js");
  const physics = FACULTIES.find(item => item.id === "physics-it");
  const fGroups = physics.groups.filter(group => group.name === "Ф" || /^f-[1-5]$/.test(group.id));
  assert.deepEqual(fGroups.map(group => [group.id, group.name, group.courses]), [["f", "Ф", [1, 2, 3, 4]]]);
});

test("groups: normalized group lists are sorted in Russian alphabetical order", async () => {
  const { normalizeFaculties } = await import("../js/services/data-service.js");
  const unsortedGroups = [
    { id: "pf", name: "ПФ", courses: [1, 2, 3, 4] },
    { id: "f", name: "Ф", courses: [1, 2, 3, 4] },
    { id: "kb", name: "КБ", courses: [1, 2, 3, 4] },
    { id: "sb", name: "СБ", courses: [1, 2, 3, 4] },
    { id: "ki", name: "КИ", courses: [1, 2, 3, 4] },
    { id: "as", name: "АС", courses: [1, 2, 3, 4] },
    { id: "kf", name: "КФ", courses: [1, 2, 3, 4] }
  ];
  const normalized = normalizeFaculties([{ id: "test-faculty", name: "Тестовый факультет", groups: unsortedGroups }]);
  assert.deepEqual(normalized[0].groups.map(group => group.name), ["АС", "КБ", "КИ", "КФ", "ПФ", "СБ", "Ф"]);
});

test("groups: natural alphabetical sort handles numbers in group names", async () => {
  const { normalizeFaculties } = await import("../js/services/data-service.js");
  const normalized = normalizeFaculties([{
    id: "test-faculty", name: "Тестовый факультет", groups: [
      { id: "pf-10", name: "ПФ-10", courses: [1] },
      { id: "pf-2", name: "ПФ-2", courses: [1] },
      { id: "as-1", name: "АС-1", courses: [1] }
    ]
  }]);
  assert.deepEqual(normalized[0].groups.map(group => group.name), ["АС-1", "ПФ-2", "ПФ-10"]);
});


test("physics-it: no old F subgroup folders remain", async () => {
  const fs = await import("node:fs/promises");
  const base = new URL("../data/schedule/physics-it/", import.meta.url);
  for (let number = 1; number <= 5; number += 1) {
    await assert.rejects(fs.access(new URL(`f-${number}/`, base)));
  }
  for (let course = 1; course <= 4; course += 1) {
    await fs.access(new URL(`f/course-${course}.js`, base));
  }
});


test("footer: discloses project independence from gsu.by and links to official schedule", () => {
  const html = read("index.html");
  const css = read("css/styles.css");
  const responsive = read("css/responsive.css");
  assert.match(html, /Сайт не является официальным ресурсом ГГУ и не связан с/);
  assert.match(html, /href="https:\/\/gsu\.by\/"/);
  assert.match(css, /\.site-footer/);
  assert.match(responsive, /\.site-footer/);
});

test("schedule cards: subject column has a stable start and words are not split", () => {
  const css = read("css/styles.css");
  const responsive = read("css/responsive.css");
  assert.match(css, /grid-template-columns:\s*104px\s+minmax\(0,1fr\)\s+minmax\(105px,130px\)\s+minmax\(125px,155px\)/);
  assert.match(css, /word-break:\s*normal/);
  assert.match(css, /overflow-wrap:\s*normal/);
  assert.match(css, /hyphens:\s*none/);
  assert.match(responsive, /grid-template-columns:\s*104px\s+minmax\(0,1fr\)/);
});


test("UI: about page shows only version number and week label omits ISO number", () => {
  const navigation = read("js/features/navigation.js");
  const schedule = read("js/features/schedule.js");
  assert.match(navigation, /makeRow\("Версия", APP_VERSION\)/);
  assert.doesNotMatch(navigation, /модульная версия сайта/);
  assert.match(schedule, /const weekLabel = isoWeekType === "above" \? "Над чертой" : "Под чертой"/);
  assert.doesNotMatch(schedule, /getISOWeekNumber|неделя/);
});

test("UI: room and teacher details have their own aligned grid columns", () => {
  const schedule = read("js/features/schedule.js");
  const css = read("css/styles.css");
  assert.match(schedule, /lesson-room/);
  assert.match(schedule, /lesson-teacher/);
  assert.match(css, /\.lesson-room \{ grid-column: 3; \}/);
  assert.match(css, /\.lesson-teacher \{ grid-column: 4; \}/);
  assert.match(css, /\.meta-value \{ min-width: 0; white-space: normal; word-break: normal;/);
});

test("faculties: empty faculties show a soon label without hardcoding faculty names", () => {
  const groups = read("js/features/groups.js");
  assert.match(groups, /item\.groups\.length \? item\.name : `\$\{item\.name\} — скоро`/);
});
