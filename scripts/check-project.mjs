/* Проверяет структуру, модули, файлы курсов и их фактическую загрузку. */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const passed = [], errors = [], warnings = [];
const ok = value => passed.push(value), fail = value => errors.push(value), warn = value => warnings.push(value);
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
function walk(dir) {
  const list = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) list.push(...walk(full)); else list.push(full);
  }
  return list;
}

const required = [
  "index.html", "package.json", "docs/README.md", "docs/CHANGELOG.md", "docs/START-HERE.txt", "docs/TEST-RESULTS.md",
  "css/styles.css", "css/responsive.css", "css/diagnostics.css",
  "js/app.js", "js/app-config.js", "js/features/calendar.js", "js/features/groups.js", "js/features/navigation.js", "js/features/schedule.js", "js/features/search.js",
  "js/services/data-service.js", "js/utils/date-utils.js",
  "data/faculties.js", "data/teachers.js", "data/contacts.js", "data/settings.js", "data/features.js", "data/announcements.js",
  "scripts/serve.mjs", "scripts/check-project.mjs", "tests/data-service.test.mjs", "tests/project-structure.test.mjs", "docs/schedule-guide.md"
];
for (const item of required) fs.existsSync(path.join(root, item)) ? ok(`Есть ${item}`) : fail(`Нет обязательного файла ${item}`);

const packageJson = JSON.parse(read("package.json"));
if (packageJson.type === "module") ok("ES Modules включены"); else fail("В package.json отсутствует type=module");
if (packageJson.version === "3.9.5") ok("Версия проекта 3.9.5"); else fail(`Ожидалась версия 3.9.5, найдена ${packageJson.version}`);
if (packageJson.scripts?.dev && packageJson.scripts?.check && packageJson.scripts?.test) ok("Команды dev/check/test определены"); else fail("Не хватает одной из команд dev/check/test");

const html = read("index.html");
const appConfigModule = await import(`${pathToFileURL(path.join(root, "js/app-config.js")).href}?version=${Date.now()}`);
const versionMeta = html.match(/<meta name="application-version" content="([^"]+)"/);
if (appConfigModule.APP_VERSION === packageJson.version && versionMeta?.[1] === packageJson.version) ok("Версия согласована в package.json, app-config.js и index.html");
else fail("Версия расходится между package.json, app-config.js и index.html");
const htmlIds = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]));
const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
if (ids.length === htmlIds.size) ok("ID в index.html уникальны"); else fail("В index.html повторяются ID");
for (const [, reference] of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
  if (/^(?:https?:|mailto:|#|data:|javascript:)/i.test(reference)) continue;
  const local = reference.split(/[?#]/)[0];
  if (local && !fs.existsSync(path.resolve(root, local))) fail(`index.html ссылается на отсутствующий ресурс ${local}`);
}
if ((html.match(/<script\b[^>]*type=["']module["'][^>]*src=["']\.\/js\/app\.js["']/g) || []).length === 1) ok("HTML подключает одну ES module точку входа"); else fail("Неверное подключение js/app.js");
const navViews = [...html.matchAll(/<button\b([^>]*data-view=["']([^"']+)["'][^>]*)>/g)].map(match => ({ attrs: match[1], view: match[2] }));
const navNames = navViews.map(item => item.view);
if (navNames.join(",") === "schedule,teachers,announcements,about") ok("Навигация расположена в согласованном порядке без списка аудиторий"); else fail(`Неверный порядок пунктов меню: ${navNames.join(", ")}`);
for (const view of ["teachers", "announcements"]) {
  const item = navViews.find(entry => entry.view === view);
  if (item && /\bdisabled\b/.test(item.attrs) && /aria-disabled=["']true["']/.test(item.attrs)) ok(`Раздел «${view}» отображается, но отключён по умолчанию`);
  else fail(`Пункт «${view}» должен быть отключён по умолчанию`);
}
const navStatusCount = (html.match(/class="nav-status"/g) || []).length;
if (navStatusCount === 2) ok("Для двух закрытых разделов предусмотрены индикаторы"); else fail(`Ожидалось два индикатора закрытых разделов, найдено ${navStatusCount}`);
if (!html.includes("Аудитории</span>") && !navNames.includes("rooms")) ok("Пункт меню «Аудитории» удалён"); else fail("В меню остался пункт аудиторий");
if (!fs.existsSync(path.join(root, "data/rooms.js"))) ok("Справочник data/rooms.js удалён"); else fail("Справочник data/rooms.js должен быть удалён");
for (const file of walk(root)) {
  if (!/\.(?:md|txt)$/i.test(file)) continue;
  const relative = path.relative(root, file).split(path.sep);
  if (relative[0] !== "docs") fail(`Текстовая документация должна находиться в docs/: ${path.relative(root, file)}`);
}
ok("Вся текстовая документация проекта находится внутри docs/");

const files = walk(root);
const jsFiles = files.filter(file => /\.(?:js|mjs)$/.test(file));
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status === 0) ok(`Синтаксис ${path.relative(root, file)}`); else fail(`Синтаксис ${path.relative(root, file)}: ${result.stderr || result.stdout}`);
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/(?:from\s*["']|import\s*\(\s*["'])(\.{1,2}\/[^"']+)["']/g)) {
    const target = path.resolve(path.dirname(file), match[1].split(/[?#]/)[0]);
    if (!fs.existsSync(target)) fail(`${path.relative(root, file)} импортирует отсутствующий файл ${match[1]}`);
  }
}
ok(`Проверен синтаксис ${jsFiles.length} JS/MJS файлов`);

// Проверить CSS url() ресурсы.
for (const file of files.filter(file => file.endsWith(".css"))) {
  const css = fs.readFileSync(file, "utf8");
  for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
    const url = match[1].trim();
    if (/^(?:https?:|data:|#)/i.test(url)) continue;
    if (!fs.existsSync(path.resolve(path.dirname(file), url))) fail(`${path.relative(root, file)}: отсутствует ресурс ${url}`);
  }
}
ok("CSS-ресурсы проверены");

// Проверить дерево факультетов и наличие каждого файла курса.
let facultiesModule;
try {
  facultiesModule = await import(`${pathToFileURL(path.join(root, "data/faculties.js")).href}?check=${Date.now()}`);
  const faculties = facultiesModule.FACULTIES;
  if (!Array.isArray(faculties) || !faculties.length) fail("FACULTIES должен быть непустым массивом");
  else {
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
    if (faculties.length !== expectedNames.length) fail(`Ожидалось ${expectedNames.length} факультетов, найдено ${faculties.length}`);
    else ok(`Загружены все ${expectedNames.length} факультетов`);
    if (JSON.stringify(faculties.map(item => item.name)) === JSON.stringify(expectedNames)) ok("Названия и порядок факультетов соответствуют утверждённому списку");
    else fail("Список или порядок факультетов не совпадает с утверждённым");

    for (const faculty of faculties) {
      const facultyDir = path.join(root, "data/schedule", faculty.id);
      if (!fs.existsSync(facultyDir)) fail(`Нет папки факультета data/schedule/${faculty.id}`);
      if (!faculty.groups.length) {
        for (let course = 1; course <= 4; course++) {
          const rel = `data/schedule/${faculty.id}/group-template/course-${course}.js`;
          if (fs.existsSync(path.join(root, rel))) ok(`Есть шаблон ${rel}`);
          else fail(`Не найден шаблон ${rel}`);
        }
      }
      for (const group of faculty.groups || []) {
        if (!Array.isArray(group.courses) || !group.courses.length || group.courses.some(course => !Number.isInteger(course) || course < 1 || course > 4) || new Set(group.courses).size !== group.courses.length) fail(`Группа ${faculty.id}/${group.id} должна иметь непустой список уникальных курсов от 1 до 4`);
        for (const course of group.courses || []) {
          const rel = `data/schedule/${faculty.id}/${group.id}/course-${course}.js`;
          if (fs.existsSync(path.join(root, rel))) ok(`Есть файл курса ${rel}`); else fail(`Не найден файл курса ${rel}`);
        }
      }
    }
  }
} catch (error) { fail(`Не удалось импортировать faculties.js: ${error.message}`); }

if (fs.existsSync(path.join(root, "data/schedule.js"))) warn("Найден старый data/schedule.js. Он не используется и может вводить в заблуждение; удалите его.");

const navigationSource = read("js/features/navigation.js");
if (navigationSource.includes('makeRow("Версия", APP_VERSION)') && !navigationSource.includes("модульная версия сайта")) ok("В разделе «О нас» показывается только номер версии");
else fail("В разделе «О нас» осталась лишняя подпись к версии");
const scheduleSource = read("js/features/schedule.js");
if (scheduleSource.includes('textContent = weekLabel') && !scheduleSource.includes("getISOWeekNumber")) ok("В интерфейсе показывается только тип недели без её номера");
else fail("В интерфейсе не удалён номер ISO-недели");
const groupSource = read("js/features/groups.js");
if (groupSource.includes("— скоро")) ok("Пустые факультеты получают отметку «— скоро» автоматически");
else fail("Не найдена автоматическая отметка «— скоро» для факультетов без групп");

// Runtime: те же loader-функции, что используются страницей.
try {
  globalThis.window = { location: { href: "http://127.0.0.1:5500/" } };
  const service = await import(`${pathToFileURL(path.join(root, "js/services/data-service.js")).href}?check=${Date.now()}`);
  const data = await service.loadAppData();
  if (data.faculties.length) ok(`Загрузились факультеты: ${data.faculties.length}`); else fail("Нет корректных факультетов");
  if (data.errors.length) data.errors.forEach(issue => fail(`${issue.file}: ${issue.message}`)); else ok("Справочники прошли runtime-проверку");
  if (data.contacts.email === "flaxproduction.corp@gmail.com") ok("Почта проекта установлена корректно"); else fail(`Неверная почта: ${data.contacts.email}`);
  if (data.contacts.telegramChannels.length === 2) ok("Найдены оба Telegram-канала"); else fail("Ожидаются две Telegram-ссылки");
  if (data.features?.teachersEnabled === false && data.features?.announcementsEnabled === false) ok("Преподаватели и объявления закрыты настройками по умолчанию");
  else fail("Ожидается отключённое состояние разделов в data/features.js");
  if (!Object.hasOwn(data, "rooms")) ok("Загрузка не зависит от справочника аудиторий"); else fail("В объекте данных остался удалённый справочник аудиторий");
  let loadedScheduleLessonCount = 0;
  let loadedScheduleFileCount = 0;
  for (const faculty of data.faculties) for (const group of faculty.groups) for (const course of group.courses) {
    const result = await service.loadCourseSchedule({ facultyId: faculty.id, groupId: group.id, course }, data.faculties);
    if (result.errors.length) result.errors.forEach(issue => fail(`${issue.file}: ${issue.message}`));
    else {
      loadedScheduleFileCount += 1;
      loadedScheduleLessonCount += result.lessons.length;
      ok(`Загружен и проверен курс ${faculty.id}/${group.id}/${course} (${result.lessons.length} занятий)`);
    }
  }
  if (loadedScheduleFileCount === 28) ok("Загружены все 28 файлов расписания физики и ИТ"); else fail(`Ожидалось 28 файлов расписания, загружено ${loadedScheduleFileCount}`);
  if (loadedScheduleLessonCount === 569) ok("Загружены 569 занятий: расписания группы Ф очищены по запросу"); else fail(`Ожидалось 569 активных занятий после очистки Ф, загружено ${loadedScheduleLessonCount}`);
  if (data.weekSettings.oddIsoWeek === "below") ok("Нечётная ISO-неделя настроена как неделя под чертой"); else fail("Для текущего расписания oddIsoWeek должен быть below");
  const physicsGroups = data.faculties.find(item => item.id === "physics-it")?.groups || [];
  const fSubgroups = physicsGroups.filter(group => group.id.startsWith("f-"));
  if (fSubgroups.length === 0 && physicsGroups.some(group => group.id === "f" && group.name === "Ф")) ok("Оставлена одна обычная группа Ф без подгрупп"); else fail(`Ожидалась одна группа Ф без подгрупп; найдено подгрупп: ${fSubgroups.length}`);
  const fLessons = loadedScheduleLessonCount - 569;
  if (fLessons === 0) ok("Расписание обычной группы Ф оставлено пустым"); else fail(`В расписании Ф остались ${fLessons} занятий`);
  const pfCourse1 = await service.loadCourseSchedule({ facultyId: "physics-it", groupId: "pf", course: 1 }, data.faculties);
  const agilaCount = pfCourse1.lessons.filter(item => item.subject === "АГИЛА").length;
  if (agilaCount === 3) ok("Все три записи аналитической геометрии и линейной алгебры переименованы в АГИЛА"); else fail(`Ожидалось 3 занятия АГИЛА в ПФ, 1 курс; найдено ${agilaCount}`);
  const mechanics = pfCourse1.lessons.filter(item => item.subject === "Механика" && item.teacher === "Хахомов С.А.");
  if (mechanics.length === 2) ok("Две записи механики закреплены за Хахомовым С.А."); else fail(`Ожидалось 2 записи Механика — Хахомов С.А.; найдено ${mechanics.length}`);
  // Поле room остаётся частью записи урока и хранится как обычная строка.
  const sample = await service.normalizeCourseSchedule({
    monday: [{ time: "10:45 – 12:20", subject: "Тест", room: "Ауд. 6-28", teacher: "Иванов И.И.", week: "top" }]
  }, { facultyId: "physics-it", groupId: "pf", course: 1 });
  if (sample.lessons[0]?.room === "Ауд. 6-28") ok("Поле room в занятии сохранено как свободный текст"); else fail("Поле room не сохранило значение занятия");
  const shortHour = await service.normalizeCourseSchedule({ monday: [{ time: "9:00 – 10:35", subject: "Ранняя пара", week: "both" }] }, { facultyId: "physics-it", groupId: "as", course: 1 });
  if (!shortHour.errors.length && shortHour.lessons[0]?.start === "09:00") ok("Время с однозначным часом принимается и корректно нормализуется для сортировки"); else fail("Время 9:00 – 10:35 не прошло проверку");
} catch (error) { fail(`Runtime-загрузка завершилась ошибкой: ${error.stack || error.message}`); }

console.log(`\nПРОВЕРКА ПРОЕКТА v${packageJson.version}\nУспешно: ${passed.length}\nОшибок: ${errors.length}\nПредупреждений: ${warnings.length}`);
if (errors.length) { console.error("\nОШИБКИ:\n" + errors.map(item => `- ${item}`).join("\n")); process.exitCode = 1; }
else console.log("\nВсе проверки проекта пройдены.");
if (warnings.length) console.warn("\nПРЕДУПРЕЖДЕНИЯ:\n" + warnings.map(item => `- ${item}`).join("\n"));
