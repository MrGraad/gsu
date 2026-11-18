// ТОЧКА ВХОДА приложения: связывает загрузку данных, состояние, события и отрисовку.
import { $, makeId, showToast } from "./utils.js";
import { addDays, getCycleWeek, parseDate, toISODate } from "./calendar.js";
import { loadDefaultData, normalizeData, validateData, mergeDefaultOfficialGroups as mergeDefaultGroups, allGroups, allPeople, findGroup, findLesson } from "./data.js";
import { readSavedData, saveData, readPrefs, savePrefs, clearSavedData } from "./storage.js";
import { renderProfile, renderNavigation, renderCalendar, renderLessons, renderPeople, renderOverview, fillSettingsForm } from "./render.js";
import { openLessonEditor, readLessonForm, closeLessonEditor, updateOnceDateVisibility } from "./editor.js";
import { initTelegram, selectionHaptic } from "./telegram.js";
import { renderUniversityHub } from "./university.js";
import { initTheme } from "./theme.js";
import { verifyAdminPassword } from "./admin-auth.js";

let data;
let defaultData; // исходные данные нужны для восстановления базового расписания группы.
let adminUnlocked = false; // статус администратора живёт только до перезагрузки вкладки.
let editorMode = "admin"; // admin — базовое расписание, personal — дополнительное событие текущего посетителя.
let adminGroupFilter = "all";
let adminSearchTerm = "";
let adminTab = "overview"; // Внутренняя вкладка панели администратора.
let prefs = {
  page: "timetable", mode: "group", unitId: null, groupId: null,
  teacher: "", selectedDate: toISODate(new Date()), calendarView: "week"
};

// Восстанавливает последний выбор, но подстраивает его под актуальные группы и участников.
function normalizePrefs() {
  // Переводим сохранённый выбор из старых отдельных подгрупп на общую группу.
  const legacyGroupMap = {
    "official-xls-f-23-1": "official-xls-f-23", "official-xls-f-23-2": "official-xls-f-23",
    "official-xls-f-33-1": "official-xls-f-33", "official-xls-f-33-2": "official-xls-f-33",
    "official-xls-f-33-3": "official-xls-f-33", "official-xls-f-33-4": "official-xls-f-33", "official-xls-f-33-5": "official-xls-f-33",
    "official-xls-f-43-1": "official-xls-f-43", "official-xls-f-43-2": "official-xls-f-43", "official-xls-f-43-3": "official-xls-f-43"
  };
  if (legacyGroupMap[prefs.groupId]) { prefs.groupId = legacyGroupMap[prefs.groupId]; prefs.unitId = "physics-it"; }
  const firstUnit = data.units[0];
  const selectedUnit = data.units.find(unit => unit.id === prefs.unitId) || firstUnit;
  prefs.unitId = selectedUnit?.id || null;
  const selectedGroup = selectedUnit?.groups.find(group => group.id === prefs.groupId) || selectedUnit?.groups[0];
  prefs.groupId = selectedGroup?.id || null;
  if (prefs.mode !== "teacher") prefs.mode = "group";
  if (prefs.mode === "teacher" && (!prefs.teacher || !allPeople(data).some(person => person.name === prefs.teacher))) prefs.mode = "group";
  if (!parseDate(prefs.selectedDate)) prefs.selectedDate = toISODate(new Date());
  if (!["week", "month"].includes(prefs.calendarView)) prefs.calendarView = "week";
  if (!["timetable", "university", "people", "settings", "admin"].includes(prefs.page)) prefs.page = "timetable";
  // После перезагрузки панель не открывается по сохранённому состоянию: войти в неё можно только из настроек.
  if (prefs.page === "admin") prefs.page = "settings";
}

// Записывает и само расписание, и настройки интерфейса в браузер.
function saveAll() {
  const ok = saveData(data);
  savePrefs(prefs);
  $("savedIndicator").title = ok ? "Изменения сохранены" : "Не удалось сохранить изменения";
  $("savedIndicator").style.background = ok ? "var(--success)" : "var(--danger)";
}


// Обновляет все представления приложения после любого изменения данных или фильтра.
function renderAll() {
  renderProfile(data, prefs);
  renderNavigation(prefs.page);
  // Настройки пространства и резервные копии находятся только внутри закрытой админ-панели.
  ["settingsExportButton", "settingsImportButton", "resetButton"]
    .forEach(id => { const element = $(id); if (element) element.hidden = !adminUnlocked; });
  renderCalendar(prefs.selectedDate, data, prefs, chooseDate);
  renderLessons(data, prefs, prefs.selectedDate, $("searchInput").value);
  renderPeople(data, chooseTeacher);
  renderOverview(data, prefs, prefs.selectedDate);
  renderUniversityHub(data);
  fillSettingsForm(data);
  renderAdminPanel();
  // Обновляем заголовок вкладки брендом FLAX GSU.
  document.title = "FLAX GSU — расписание ГГУ имени Ф. Скорины";
}

// Общая точка сохранения: не нужно отдельно обновлять экран в каждом обработчике.
function updateAndRender(message = "Изменения сохранены") {
  saveAll(); selectionHaptic(); renderAll();
  if (message) showToast(message);
}

// Переключает календарь на конкретный день, выбранный в недельной полосе.
function chooseDate(isoDate) {
  prefs.selectedDate = isoDate;
  prefs.page = "timetable";
  updateAndRender("");
}

// Передвигает выбранную дату ровно на неделю назад или вперёд.
function shiftWeek(amount) {
  const current = parseDate(prefs.selectedDate);
  prefs.selectedDate = toISODate(addDays(current, amount * 7));
  updateAndRender("");
}

// Кнопки назад/вперёд двигают календарь на неделю или месяц в зависимости от выбранного режима.
function shiftCalendar(amount) {
  const current = parseDate(prefs.selectedDate);
  if (prefs.calendarView === "month") {
    const target = new Date(current.getFullYear(), current.getMonth() + amount, 1, 12);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(current.getDate(), lastDay));
    prefs.selectedDate = toISODate(target);
  } else {
    prefs.selectedDate = toISODate(addDays(current, amount * 7));
  }
  updateAndRender("");
}

// Переключатель "Неделя / Месяц" меняет только представление календаря, не данные расписания.
function setCalendarView(view) {
  if (!["week", "month"].includes(view)) return;
  prefs.calendarView = view;
  updateAndRender("");
}

// Для перехода между чётной и нечётной неделями сохраняет тот же день недели.
function chooseCycle(target) {
  if (!data.settings.weekCycle) return;
  const date = parseDate(prefs.selectedDate);
  if (getCycleWeek(data.settings.semesterStart, date) === target) return;
  const next = addDays(date, 7);
  const candidate = getCycleWeek(data.settings.semesterStart, next) === target ? next : addDays(date, -7);
  prefs.selectedDate = toISODate(candidate);
  updateAndRender("");
}

// Переключает раздел бокового меню и закрывает мобильное меню после выбора.
function switchPage(page) {
  prefs.page = page;
  updateAndRender("");
  if (window.innerWidth <= 680) {
    $("sidebar").classList.remove("is-open");
    $("mobileMenuButton").setAttribute("aria-expanded", "false");
    $("mobileMenuButton").setAttribute("aria-label", "Открыть меню");
  }
}

// Открывает расписание одного преподавателя/ведущего по всем его группам.
function chooseTeacher(name) {
  prefs.mode = "teacher"; prefs.teacher = name; prefs.page = "timetable";
  updateAndRender("");
}

// Переключает общий просмотр между группой/планом и выбранным ответственным.
function chooseGroupMode() {
  if (prefs.mode === "teacher") prefs.mode = "group";
  else if (allGroups(data).length) prefs.mode = "teacher";
  if (prefs.mode === "teacher") {
    const teachers = allPeople(data).map(person => person.name);
    prefs.teacher = teachers[0] || "";
  }
  updateAndRender("");
}

// Открывает форму базового занятия. Эту операцию может выполнять только администратор.
function openNewLesson() {
  if (!adminUnlocked) { showToast("Базовое расписание изменяется только администратором.", true); return; }
  if (!allGroups(data).length) {
    showToast("Сначала создайте учебную группу в разделе «Группы и кафедры». ", true);
    prefs.page = "admin"; adminTab = "structure"; renderAll(); return;
  }
  editorMode = "admin";
  openLessonEditor({ data, prefs, selectedDate: prefs.selectedDate });
  $("dialogEyebrow").textContent = "БАЗОВОЕ РАСПИСАНИЕ · АДМИНИСТРАТОР";
}

// Дополнительные занятия доступны всем посетителям. Они маркируются origin=personal,
// сохраняются только в браузере этого посетителя и не изменяют базовые занятия.
function openPersonalLesson(found = null) {
  const groups = allGroups(data);
  if (!groups.length) { showToast("Пока нет групп, к которым можно добавить занятие.", true); return; }

  if (found) {
    if (found.lesson.origin !== "personal") { showToast("Базовые занятия нельзя изменять в пользовательском режиме.", true); return; }
    prefs.unitId = found.unit.id;
    prefs.groupId = found.group.id;
  } else {
    const current = findGroup(data, prefs.unitId, prefs.groupId);
    if (!current) {
      const first = groups[0];
      prefs.unitId = first.unitId;
      prefs.groupId = first.id;
    }
  }

  prefs.mode = "group";
  editorMode = "personal";
  openLessonEditor({
    data, prefs, selectedDate: prefs.selectedDate,
    lesson: found ? { ...found.lesson, unitId: found.unit.id, groupId: found.group.id } : null
  });
  $("dialogEyebrow").textContent = "ДОПОЛНИТЕЛЬНОЕ ЗАНЯТИЕ · ЛИЧНАЯ ЗАПИСЬ";
  $("dialogTitle").textContent = found ? "Изменить дополнительное занятие" : "Добавить дополнительное занятие";
}

// Сохраняет базовую запись (администратор) или пользовательское дополнительное событие.
function handleLessonSubmit(event) {
  event.preventDefault();
  const mode = editorMode;
  if (mode === "admin" && !adminUnlocked) { closeLessonEditor(); showToast("Базовое расписание может менять только администратор.", true); return; }
  try {
    const lesson = readLessonForm(data);
    const old = lesson.id ? findLesson(data, lesson.id) : null;

    // Пользовательский интерфейс не может перезаписать базовую или администраторскую запись.
    if (mode === "personal" && old && old.lesson.origin !== "personal") {
      throw new Error("Можно изменять только дополнительные занятия, добавленные пользователями.");
    }
    if (mode === "personal") lesson.origin = "personal";

    if (old) {
      // Сохраняем служебные поля базовой записи или дополнительного события.
      for (const key of ["origin", "validFrom", "validTo", "sourceId", "subgroup", "createdAt"]) {
        if (old.lesson[key] !== undefined && lesson[key] === undefined) lesson[key] = old.lesson[key];
      }
      old.group.lessons = old.group.lessons.filter(item => item.id !== lesson.id);
    }
    if (mode === "personal") lesson.origin = "personal";

    const target = findGroup(data, lesson.unitId, lesson.groupId);
    if (!target) throw new Error("Не удалось найти выбранную группу или план.");
    delete lesson.unitId; delete lesson.groupId;
    target.group.lessons.push(lesson);
    closeLessonEditor();
    prefs.mode = "group"; prefs.unitId = target.unit.id; prefs.groupId = target.group.id;
    prefs.page = mode === "admin" ? "admin" : "timetable";
    if (mode === "admin") adminTab = "lessons";
    adminGroupFilter = target.group.id;
    editorMode = "admin";
    updateAndRender(mode === "personal" ? (old ? "Дополнительное занятие обновлено" : "Дополнительное занятие добавлено только в этом браузере") : (old ? "Базовое занятие обновлено" : "Базовое занятие добавлено"));
  } catch (error) {
    $("formError").textContent = error.message;
    $("formError").hidden = false;
  }
}

// Обычный посетитель может изменить или удалить только свои дополнительные записи.
function handlePersonalLessonAction(event) {
  const button = event.target.closest("[data-personal-action]");
  if (!button) return;
  const found = findLesson(data, button.dataset.id);
  if (!found || found.lesson.origin !== "personal") {
    showToast("Дополнительная запись не найдена или недоступна.", true);
    return;
  }
  if (button.dataset.personalAction === "edit") {
    openPersonalLesson(found);
  } else if (button.dataset.personalAction === "delete") {
    if (!window.confirm(`Удалить дополнительное занятие «${found.lesson.title}»?`)) return;
    found.group.lessons = found.group.lessons.filter(item => item.id !== found.lesson.id);
    updateAndRender("Дополнительное занятие удалено");
  }
}


// Переключает только внутренние разделы админ-панели. Публичная навигация их не показывает.
function switchAdminTab(tab) {
  if (!adminUnlocked) return;
  const allowed = ["overview", "lessons", "space", "structure"];
  if (!allowed.includes(tab)) return;
  adminTab = tab;
  renderAdminTabs();
}

function renderAdminTabs() {
  document.querySelectorAll("[data-admin-tab]").forEach(button => {
    const active = button.dataset.adminTab === adminTab;
    button.setAttribute("aria-pressed", String(active));
    button.classList.toggle("is-active", active);
  });
  document.querySelectorAll("[data-admin-panel]").forEach(panel => {
    panel.hidden = panel.dataset.adminPanel !== adminTab;
  });
}

// Показывает структуру подразделений и групп. Так администратор видит, куда добавляет данные.
function renderStructurePanel() {
  const select = $("structureUnitSelect");
  const list = $("adminStructureList");
  if (!select || !list) return;
  const current = prefs.unitId;
  select.replaceChildren(...data.units.map(unit => {
    const option = document.createElement("option");
    option.value = unit.id; option.textContent = unit.name; return option;
  }));
  select.value = data.units.some(unit => unit.id === current) ? current : (data.units[0]?.id || "");
  $("adminUnitCount").textContent = String(data.units.length);

  const cards = data.units.map(unit => {
    const card = document.createElement("article"); card.className = "admin-structure-card";
    const heading = document.createElement("div"); heading.className = "admin-structure-heading";
    const name = document.createElement("strong"); name.textContent = unit.name;
    const count = document.createElement("span"); count.textContent = `${unit.groups.length} ${unit.groups.length === 1 ? "группа" : unit.groups.length >= 2 && unit.groups.length <= 4 ? "группы" : "групп"}`;
    heading.append(name); heading.append(count); card.append(heading);
    if (unit.groups.length) {
      const chips = document.createElement("div"); chips.className = "admin-group-chips";
      unit.groups.forEach(group => {
        const chip = document.createElement("button"); chip.type = "button"; chip.className = "admin-group-chip";
        chip.textContent = group.name; chip.dataset.openGroup = group.id; chip.dataset.unitId = unit.id;
        chip.title = `Открыть расписание группы ${group.name}`; chips.append(chip);
      });
      card.append(chips);
    } else {
      const empty = document.createElement("p"); empty.className = "empty-inline"; empty.textContent = "Группы ещё не добавлены."; card.append(empty);
    }
    list.append(card);
    return card;
  });
  list.replaceChildren(...cards);
}

function createUnit(event) {
  event.preventDefault();
  if (!adminUnlocked) { showToast("Создавать подразделения может только администратор.", true); return; }
  const name = $("newUnitName").value.trim();
  if (!name) { showToast("Введите название подразделения или кафедры.", true); return; }
  const exists = data.units.some(unit => unit.name.toLocaleLowerCase("ru-RU") === name.toLocaleLowerCase("ru-RU"));
  if (exists) { showToast("Такое подразделение уже существует.", true); return; }
  const unit = { id: makeId(), name, groups: [] };
  data.units.push(unit); prefs.unitId = unit.id; prefs.groupId = null;
  $("unitCreateForm").reset(); adminTab = "structure";
  updateAndRender("Подразделение создано");
}

// --- Панель администратора -------------------------------------------------
// В обычном расписании карточки доступны только для просмотра. Все операции
// добавления, редактирования и удаления собраны здесь в одном закрытом разделе.
function getAdminSelectedGroup() {
  const id = $("adminGroupSelect")?.value || adminGroupFilter;
  if (id === "all") return null;
  const unit = data.units.find(item => item.groups.some(group => group.id === id));
  return unit ? findGroup(data, unit.id, id) : null;
}

function renderAdminPanel() {
  const login = $("adminLoginPanel");
  const tools = $("adminToolsPanel");
  if (!login || !tools) return;
  login.hidden = adminUnlocked;
  tools.hidden = !adminUnlocked;
  if (!adminUnlocked) return;
  renderAdminTabs();
  renderStructurePanel();

  const select = $("adminGroupSelect");
  if (select) {
    const previous = adminGroupFilter;
    const groups = allGroups(data);
    const options = [["all", "Все факультеты и группы"], ...groups.map(group => [group.id, `${group.unitName} · ${group.name}`])];
    select.replaceChildren(...options.map(([value, label]) => {
      const option = document.createElement("option"); option.value = value; option.textContent = label; return option;
    }));
    select.value = options.some(([value]) => value === previous) ? previous : "all";
    adminGroupFilter = select.value;
  }

  const query = adminSearchTerm.trim().toLocaleLowerCase("ru-RU");
  const all = [];
  for (const unit of data.units) for (const group of unit.groups) {
    if (adminGroupFilter !== "all" && group.id !== adminGroupFilter) continue;
    for (const lesson of group.lessons) {
      const haystack = [lesson.title, lesson.subgroup, lesson.teacher, lesson.location, lesson.type, group.name, unit.name].join(" ").toLocaleLowerCase("ru-RU");
      if (!query || haystack.includes(query)) all.push({ unit, group, lesson });
    }
  }
  all.sort((a,b) => (a.lesson.day - b.lesson.day) || a.lesson.start.localeCompare(b.lesson.start) || a.lesson.title.localeCompare(b.lesson.title, "ru"));
  const officialCount = data.units.flatMap(unit => unit.groups.flatMap(group => group.lessons)).filter(lesson => lesson.origin === "official").length
    + (data.teacherSchedules || []).reduce((sum, schedule) => sum + schedule.lessons.filter(lesson => lesson.origin === "official").length, 0);
  $("adminSummary").textContent = `${all.length} занятий в списке групп · ${officialCount} защищённых базовых записей (включая отдельные графики преподавателей) · ${allGroups(data).length} групп`;

  const rows = all.map(({unit, group, lesson}) => {
    const row = document.createElement("article"); row.className = "admin-lesson-row";
    const info = document.createElement("div"); info.className = "admin-lesson-info";
    const title = document.createElement("strong"); title.textContent = lesson.title;
    const meta = document.createElement("span");
    const dayName = lesson.date ? new Intl.DateTimeFormat("ru-RU", {day:"numeric",month:"short",year:"numeric"}).format(new Date(`${lesson.date}T12:00:00`)) : ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"][lesson.day - 1];
    meta.textContent = `${unit.name} · ${group.name} · ${dayName} · ${lesson.start}–${lesson.end} · ${lesson.subgroup ? lesson.subgroup + " · " : ""}${lesson.teacher || "преподаватель не указан"} · ${lesson.location || "аудитория не указана"}`;
    const badge = document.createElement("small"); badge.className = lesson.origin === "official" ? "admin-origin official" : "admin-origin local";
    badge.textContent = lesson.origin === "official" ? "Основное расписание" : "Дополнительное занятие";
    info.append(title, meta, badge);
    const actions = document.createElement("div"); actions.className = "admin-row-actions";
    const edit = document.createElement("button"); edit.type = "button"; edit.className = "button button-secondary button-small"; edit.dataset.adminAction = "edit"; edit.dataset.id = lesson.id; edit.textContent = "Изменить";
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "button button-danger button-small"; remove.dataset.adminAction = "delete"; remove.dataset.id = lesson.id; remove.textContent = "Удалить";
    actions.append(edit, remove); row.append(info, actions); return row;
  });
  $("adminLessonList").replaceChildren(...rows);
  if (!rows.length) {
    const empty = document.createElement("p"); empty.className = "admin-empty";
    empty.textContent = query ? "По запросу ничего не найдено." : "В выбранной группе пока нет занятий. Можно добавить событие или восстановить базовую версию.";
    $("adminLessonList").replaceChildren(empty);
  }
  $("adminClearGroupButton").disabled = adminGroupFilter === "all";
  $("adminRestoreGroupButton").disabled = adminGroupFilter === "all";
  $("adminDeleteOfficialButton").textContent = `Удалить все базовые занятия (${officialCount})`;
}

async function loginAdmin(event) {
  event.preventDefault();
  const error = $("adminLoginError"); error.hidden = true;
  try {
    const ok = await verifyAdminPassword($("adminPassword").value);
    if (!ok) throw new Error("Неверный пароль администратора.");
    adminUnlocked = true; $("adminPassword").value = ""; adminSearchTerm = "";
    adminTab = "overview";
    adminGroupFilter = prefs.groupId || "all";
    renderAll(); showToast("Доступ администратора открыт");
  } catch (err) {
    error.textContent = err.message || "Не удалось проверить пароль."; error.hidden = false;
  }
}

function handleAdminLessonAction(event) {
  if (!adminUnlocked) return;
  const button = event.target.closest("[data-admin-action]");
  if (!button) return;
  const found = findLesson(data, button.dataset.id);
  if (!found) { showToast("Занятие не найдено. Обновите список.", true); return; }
  if (button.dataset.adminAction === "edit") {
    prefs.unitId = found.unit.id; prefs.groupId = found.group.id; prefs.mode = "group";
    openLessonEditor({ data, prefs, selectedDate: prefs.selectedDate, lesson: { ...found.lesson, unitId: found.unit.id, groupId: found.group.id } });
  } else if (button.dataset.adminAction === "delete") {
    if (!window.confirm(`Удалить занятие «${found.lesson.title}» из группы «${found.group.name}»?`)) return;
    found.group.lessons = found.group.lessons.filter(item => item.id !== found.lesson.id);
    updateAndRender("Занятие удалено из расписания");
  }
}

function adminClearGroup() {
  if (!adminUnlocked) return;
  const group = getAdminSelectedGroup();
  if (!group) { showToast("Сначала выберите конкретную группу, а не общий список.", true); return; }
  const count = group.group.lessons.length;
  if (!count) { showToast("В этой группе уже нет занятий."); return; }
  if (!window.confirm(`Удалить все ${count} занятий группы «${group.group.name}»? Сама группа останется в списке.`)) return;
  group.group.lessons = [];
  updateAndRender(`Расписание группы «${group.group.name}» очищено`);
}

function adminRestoreGroup() {
  if (!adminUnlocked) return;
  const target = getAdminSelectedGroup();
  if (!target) { showToast("Сначала выберите конкретную группу.", true); return; }
  const original = findGroup(defaultData, target.unit.id, target.group.id);
  if (!original || !original.group.lessons.length) { showToast("В базовой версии пока нет занятий для этой группы.", true); return; }
  if (!window.confirm(`Заменить текущее расписание «${target.group.name}» базовой версией? Все локальные изменения этой группы будут потеряны.`)) return;
  target.group.lessons = JSON.parse(JSON.stringify(original.group.lessons));
  updateAndRender("Базовая версия расписания восстановлена");
}

function adminDeleteAllOfficial() {
  if (!adminUnlocked) return;
  const count = data.units.reduce((sum, unit) => sum + unit.groups.reduce((gSum, group) => gSum + group.lessons.filter(lesson => lesson.origin === "official").length, 0), 0)
    + (data.teacherSchedules || []).reduce((sum, schedule) => sum + schedule.lessons.filter(lesson => lesson.origin === "official").length, 0);
  if (!count) { showToast("Базовых занятий уже нет."); return; }
  if (!window.confirm(`Удалить все ${count} базовых занятий? Локальные дополнительные занятия и группы сохранятся.`)) return;
  for (const unit of data.units) for (const group of unit.groups) group.lessons = group.lessons.filter(lesson => lesson.origin !== "official");
  for (const schedule of data.teacherSchedules || []) schedule.lessons = schedule.lessons.filter(lesson => lesson.origin !== "official");
  updateAndRender(`Удалено импортированных занятий: ${count}`);
}

function logoutAdmin() {
  adminUnlocked = false; prefs.page = "settings"; renderAll(); showToast("Вы вышли из панели администратора");
}

// Создаёт JSON-файл со всем расписанием, чтобы его можно было перенести или сохранить.
function exportData() {
  if (!adminUnlocked) { showToast("Экспорт базы доступен только администратору.", true); return; }
  const payload = { ...data, exportedAt: new Date().toISOString(), exportFormat: "flax-gsu-planner-v3" };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = `flax-gsu-backup-${toISODate(new Date())}.json`;
  document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  showToast("Резервная копия подготовлена");
}

// Проверяет структуру выбранного JSON и заменяет текущие данные импортированными.
async function importData(file) {
  if (!adminUnlocked) { showToast("Импорт доступен только администратору.", true); return; }
  if (!file) return;
  try {
    const defaults = await loadDefaultData();
    const parsed = mergeDefaultGroups(normalizeData(JSON.parse(await file.text())), defaults);
    validateData(parsed);
    data = parsed;
    prefs.mode = "group";
    prefs.unitId = data.units[0]?.id || null;
    prefs.groupId = data.units[0]?.groups[0]?.id || null;
    prefs.page = adminUnlocked ? "admin" : "timetable";
    if (adminUnlocked) adminTab = "lessons";
    saveAll(); renderAll(); showToast("Данные успешно импортированы");
  } catch (error) {
    showToast(`Не удалось импортировать файл: ${error.message}`, true);
  } finally {
    $("importFileInput").value = "";
  }
}

// Загружает исходный комплект из папки data после отдельного подтверждения пользователя.
async function resetData() {
  if (!adminUnlocked) { showToast("Сброс доступен только администратору.", true); return; }
  if (!window.confirm("Восстановить исходный справочник ГГУ? Локальные группы и занятия, сохранённые в этом браузере, будут удалены.")) return;
  try {
    clearSavedData(); data = await loadDefaultData();
    prefs = { page: "timetable", mode: "group", unitId: data.units[0]?.id || null, groupId: null, teacher: "", selectedDate: toISODate(new Date()) };
    saveAll(); renderAll(); showToast("Исходные данные восстановлены");
  } catch (error) { showToast(error.message, true); }
}

function createStructure(event) {
  event.preventDefault();
  if (!adminUnlocked) { showToast("Создавать группы может только администратор.", true); switchPage("settings"); return; }
  const unitId = $("structureUnitSelect").value;
  const groupName = $("newGroupName").value.trim();
  const unit = data.units.find(item => item.id === unitId);
  if (!unit) { showToast("Сначала выберите факультет или подразделение.", true); return; }
  if (!groupName) { showToast("Введите название учебной группы.", true); return; }
  if (unit.groups.some(group => group.name.toLocaleLowerCase("ru-RU") === groupName.toLocaleLowerCase("ru-RU"))) {
    showToast("Такая группа уже есть в выбранном подразделении.", true); return;
  }
  const group = { id: makeId(), name: groupName, lessons: [] };
  unit.groups.push(group);
  prefs.unitId = unit.id; prefs.groupId = group.id; prefs.mode = "group"; prefs.page = "admin"; adminTab = "structure";
  $("structureForm").reset();
  updateAndRender("Учебная группа создана");
}

// Применяет название пространства, тип организации и правила календарного цикла.
function saveSettings(event) {
  event.preventDefault();
  if (!adminUnlocked) { showToast("Изменять параметры учебного цикла может только администратор.", true); return; }
  data.organization.type = "university";
  data.organization.name = $("organizationName").value.trim() || "ГГУ имени Ф. Скорины";
  data.organization.subtitle = $("organizationSubtitle").value.trim() || "Гомель · 2026/2027";
  data.settings.semesterStart = $("cycleStart").value || data.settings.semesterStart;
  data.settings.weekCycle = $("weekCycleEnabled").checked;
  data.settings.activeDays = Number($("activeDays").value) || 7;
  updateAndRender("Настройки сохранены");
}

// Подключает обработчики ко всем кнопкам и полям. Выполняется один раз при старте.
function bindEvents() {
  document.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => switchPage(button.dataset.page)));
  $("adminLoginForm").addEventListener("submit", loginAdmin);
  $("adminLogoutButton").addEventListener("click", logoutAdmin);
  $("adminGroupSelect").addEventListener("change", event => { adminGroupFilter = event.target.value; renderAdminPanel(); });
  $("adminSearchInput").addEventListener("input", event => { adminSearchTerm = event.target.value; renderAdminPanel(); });
  $("adminLessonList").addEventListener("click", handleAdminLessonAction);
  $("adminAddLessonButton").addEventListener("click", () => {
    if (adminGroupFilter !== "all") {
      const unit = data.units.find(item => item.groups.some(group => group.id === adminGroupFilter));
      const selected = unit ? findGroup(data, unit.id, adminGroupFilter) : null;
      if (selected) { prefs.unitId = selected.unit.id; prefs.groupId = selected.group.id; }
    }
    prefs.mode = "group";
    openNewLesson();
  });
  $("adminClearGroupButton").addEventListener("click", adminClearGroup);
  $("adminRestoreGroupButton").addEventListener("click", adminRestoreGroup);
  $("adminDeleteOfficialButton").addEventListener("click", adminDeleteAllOfficial);
  $("adminExportButton").addEventListener("click", exportData);
  $("adminImportButton").addEventListener("click", () => $("importFileInput").click());
  $("structureForm").addEventListener("submit", createStructure);
  $("unitCreateForm").addEventListener("submit", createUnit);
  document.querySelectorAll("[data-admin-tab]").forEach(button => button.addEventListener("click", () => switchAdminTab(button.dataset.adminTab)));
  // Карточка факультета открывает его реальные группы в пользовательском календаре.
  $("facultiesGrid").addEventListener("click", event => {
    const button = event.target.closest("[data-use-unit]");
    if (!button) return;
    const unit = data.units.find(item => item.id === button.dataset.useUnit);
    if (!unit) return;
    if (!unit.groups.length) { showToast(`В календарь FLAX GSU ещё не перенесены группы факультета «${unit.name}».`, true); return; }
    prefs.unitId = unit.id; prefs.groupId = unit.groups[0].id; prefs.mode = "group"; prefs.page = "timetable";
    updateAndRender(`Открыто расписание: ${unit.name} · ${unit.groups[0].name}`);
  });
  $("adminStructureList").addEventListener("click", event => {
    const button = event.target.closest("[data-open-group]");
    if (!button || !adminUnlocked) return;
    prefs.unitId = button.dataset.unitId; prefs.groupId = button.dataset.openGroup; prefs.mode = "group";
    adminTab = "lessons"; adminGroupFilter = prefs.groupId; renderAll();
  });
  $("structureUnitSelect").addEventListener("change", event => { prefs.unitId = event.target.value; renderStructurePanel(); });
  document.querySelectorAll("[data-open-page]").forEach(button => button.addEventListener("click", () => switchPage(button.dataset.openPage)));
  $("unitSelect").addEventListener("change", event => {
    prefs.unitId = event.target.value;
    const unit = data.units.find(item => item.id === prefs.unitId);
    prefs.groupId = unit?.groups[0]?.id || null; prefs.mode = "group";
    updateAndRender("");
  });
  $("groupSelect").addEventListener("change", event => { prefs.groupId = event.target.value; prefs.mode = "group"; updateAndRender(""); });
  $("teacherSelect").addEventListener("change", event => { prefs.teacher = event.target.value; updateAndRender(""); });
  $("switchViewButton").addEventListener("click", chooseGroupMode);
  $("prevWeekButton").addEventListener("click", () => shiftCalendar(-1));
  $("nextWeekButton").addEventListener("click", () => shiftCalendar(1));
  document.querySelectorAll("[data-calendar-view]").forEach(button => button.addEventListener("click", () => setCalendarView(button.dataset.calendarView)));
  $("todayButton").addEventListener("click", () => chooseDate(toISODate(new Date())));
  $("oddWeekButton").addEventListener("click", () => chooseCycle(1));
  $("evenWeekButton").addEventListener("click", () => chooseCycle(2));
  $("emptyAddButton").addEventListener("click", () => openPersonalLesson());
  $("addPersonalLessonButton").addEventListener("click", () => openPersonalLesson());
  $("emptyUniversityButton").addEventListener("click", () => switchPage("university"));
  $("overviewScheduleButton").addEventListener("click", () => switchPage("timetable"));
  // В пользовательском календаре разрешены действия только с origin=personal.
  $("lessonGrid").addEventListener("click", handlePersonalLessonAction);
  // Единственная видимая точка входа в закрытую панель — кнопка на странице настроек.
  $("openAdminFromSettings").addEventListener("click", () => { adminTab = "overview"; switchPage("admin"); });
  $("lessonForm").addEventListener("submit", handleLessonSubmit);
  $("lessonForm").elements.repeat.addEventListener("change", updateOnceDateVisibility);
  $("closeDialogButton").addEventListener("click", closeLessonEditor);
  $("cancelDialogButton").addEventListener("click", closeLessonEditor);
  $("settingsForm").addEventListener("submit", saveSettings);
  $("resetButton").addEventListener("click", resetData);
  $("settingsExportButton").addEventListener("click", exportData);
  const triggerImport = () => $("importFileInput").click();
  $("settingsImportButton").addEventListener("click", triggerImport);
  $("importFileInput").addEventListener("change", event => importData(event.target.files?.[0]));
  $("searchInput").addEventListener("input", () => renderLessons(data, prefs, prefs.selectedDate, $("searchInput").value));
  $("mobileMenuButton").addEventListener("click", () => {
    const opened = $("sidebar").classList.toggle("is-open");
    $("mobileMenuButton").setAttribute("aria-expanded", String(opened));
    $("mobileMenuButton").setAttribute("aria-label", opened ? "Закрыть меню" : "Открыть меню");
  });
  // Горячая клавиша «/» переводит курсор в поиск, если пользователь не печатает в поле ввода.
  document.addEventListener("keydown", event => {
    if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName) && prefs.page === "timetable") {
      event.preventDefault(); $("searchInput").focus();
    }
  });
}

// Старт приложения: загрузка данных, восстановление состояния и первая отрисовка.
async function init() {
  initTelegram();
  initTheme();
  bindEvents();
  try {
    defaultData = await loadDefaultData();
    data = mergeDefaultGroups(readSavedData(), defaultData);
    validateData(data);
    prefs = { ...prefs, ...(readPrefs() || {}) };
    normalizePrefs();
    renderAll();
    // PWA-кэш позволяет открыть ранее посещённый сайт при временном отсутствии интернета.
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("./sw.js").catch(error => console.warn("Service Worker не зарегистрирован:", error));
    }
  } catch (error) {
    console.error(error);
    $("dayTitle").textContent = "Не удалось загрузить данные";
    $("dayDescription").textContent = error.message;
    $("emptyState").hidden = false;
    $("emptyState").querySelector("strong").textContent = "Проверьте файлы проекта";
    $("emptyState").querySelector("p").textContent = "Запустите сайт через Live Server или GitHub Pages и убедитесь, что папка data находится рядом с index.html.";
  }
}

init();
