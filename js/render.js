// Отрисовка интерфейса. Все пользовательские данные вставляются через textContent, а не innerHTML.
import { $, minutesFromTime, pluralRu } from "./utils.js";
import { addDays, formatLongDate, formatWeekRange, fullWeek, getCycleWeek, getAcademicWeekNumber, toISODate, weekdayName, weekdayShort } from "./calendar.js";
import { allGroups, allPeople, lessonsForDate, lessonsForWeek } from "./data.js";

const LABELS = {
  university: { unit: "Факультет / подразделение", group: "Учебная группа", people: "Преподаватели", person: "Преподаватель", subject: "Дисциплина", groupPlural: "групп", peoplePlural: "преподавателей" }
};
const COLORS = ["#e8a45f", "#55bf83", "#7788e8", "#d763cf", "#59bfd1", "#e66f78", "#a58bda"];
const GLYPHS = ["✦", "⌘", "✣", "◈", "✧", "＋", "◎"];

export function labelsFor(data) { return LABELS.university; }

export function renderProfile(data, prefs) {
  const labels = labelsFor(data);
  const unitSelect = $("unitSelect");
  const groupSelect = $("groupSelect");
  const people = allPeople(data);
  const selectedUnit = data.units.find(unit => unit.id === prefs.unitId) || data.units[0];
  const groups = selectedUnit?.groups || [];

  $("workspaceName").textContent = data.organization.name;
  $("workspaceSubtitle").textContent = data.organization.subtitle;
  $("workspaceMark").textContent = "G"; // Монограмма FLAX GSU фиксирована и не зависит от названия университета.
  $("userMiniTitle").textContent = data.organization.name;
  $("userMiniSubtitle").textContent = data.organization.subtitle;
  $("userAvatar").textContent = "G";

  $("unitLabel").textContent = labels.unit;
  $("groupLabel").textContent = labels.group;
  $("teacherLabel").textContent = labels.person;
  $("peopleNavLabel").textContent = labels.people;
  $("peopleTitle").textContent = labels.people;
  $("statGroupLabel").textContent = labels.group;
  $("statPeopleLabel").textContent = labels.people;
  $("eventTitleLabel").textContent = `Название ${labels.subject.toLocaleLowerCase("ru-RU")}`;
  $("eventPersonLabel").textContent = `${labels.person} / ответственный`;
  $("eventGroupLabel").textContent = `${labels.group} / план`;
  $("newUnitLabel").textContent = `${labels.unit} / категория (необязательно)`;
  $("newGroupLabel").textContent = `Название: ${labels.group.toLocaleLowerCase("ru-RU")}`;

  replaceOptions(unitSelect, data.units.map(unit => [unit.id, unit.name]), selectedUnit?.id);
  replaceOptions(groupSelect, groups.map(group => [group.id, group.name]), prefs.groupId);
  // Показываем только те фильтры, для которых уже есть данные.
  $("unitField").hidden = prefs.mode === "teacher" || data.units.length === 0;
  $("groupField").hidden = prefs.mode === "teacher" || groups.length === 0;
  replaceOptions($("teacherSelect"), people.map(person => [person.name, person.name]), prefs.teacher);
  $("teacherField").hidden = prefs.mode !== "teacher";
  $("switchViewButton").textContent = prefs.mode === "teacher" ? "Показать расписание по группе" : `Показать расписание по ${labels.person.toLocaleLowerCase("ru-RU")}`;
  $("switchViewButton").hidden = people.length === 0 && prefs.mode !== "teacher";
  $("cycleControl").hidden = !data.settings.weekCycle;
  $("weekStatusDetail").textContent = data.settings.weekCycle ? "Учебная неделя · под/над чертой" : "Обычная неделя";
}

function replaceOptions(select, items, selectedValue) {
  const current = selectedValue && items.some(([value]) => value === selectedValue) ? selectedValue : items[0]?.[0];
  select.replaceChildren(...items.map(([value, label]) => {
    const option = document.createElement("option"); option.value = value; option.textContent = label; return option;
  }));
  select.value = current || "";
}

export function renderNavigation(page) {
  document.querySelectorAll("[data-page]").forEach(button => {
    const active = button.dataset.page === page || (page === "admin" && button.dataset.page === "settings");
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
  });
  document.querySelectorAll("[data-view]").forEach(view => { view.hidden = view.dataset.view !== page; });
  const titles = {
    timetable: ["Расписание", "Расписание учебных групп и сводный просмотр по преподавателям."],
    university: ["Факультеты и службы", "Страницы факультетов, учебные сервисы и полезные ресурсы ГГУ."],
    people: [labelsPagePeople(), "Преподаватели, указанные в расписании групп и дополнительных занятиях."],
    settings: ["Настройки", "Настройте начало учебного цикла и отображение расписания."],
    admin: ["Панель управления", "Обзор, пространство, факультеты, кафедры, группы и расписание."]
  };
  const [title, description] = titles[page] || titles.timetable;
  $("pageTitle").textContent = title;
  $("pageDescription").textContent = description;
  $("pageEyebrow").textContent = `FLAX GSU / ${page === "settings" ? "НАСТРОЙКИ" : page === "admin" ? "АДМИНИСТРИРОВАНИЕ" : "ПЛАНИРОВЩИК"}`;
  $("searchInput").hidden = page !== "timetable";
  const searchBox = $("searchBox"); if (searchBox) searchBox.hidden = page !== "timetable";
}
function labelsPagePeople() { return $("peopleNavLabel")?.textContent || "Участники"; }

export function renderCalendar(selectedISO, data, prefs, onPick) {
  const selectedDate = new Date(`${selectedISO}T12:00:00`);
  const todayISO = toISODate(new Date());
  const isMonth = prefs.calendarView === "month";
  const viewButtons = document.querySelectorAll("[data-calendar-view]");
  viewButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.calendarView === (isMonth ? "month" : "week"))));
  $("weekStrip").hidden = isMonth;
  $("monthCalendar").hidden = !isMonth;
  $("calendarEyebrow").textContent = isMonth ? "КАЛЕНДАРЬ НА МЕСЯЦ" : "НЕДЕЛЬНЫЙ ОБЗОР";

  if (isMonth) {
    // Сетка всегда начинается с понедельника и содержит 6 полных недель,
    // чтобы высота календаря не менялась между месяцами.
    const firstOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12);
    const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = addDays(firstOfMonth, -mondayOffset);
    const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
    $("weekRange").textContent = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(selectedDate);
    const cells = days.map(date => {
      const iso = toISODate(date);
      const inMonth = date.getMonth() === selectedDate.getMonth();
      const lessons = lessonsForDate(data, prefs, date);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "month-day";
      button.classList.toggle("is-outside", !inMonth);
      button.classList.toggle("is-selected", iso === selectedISO);
      button.classList.toggle("is-today", iso === todayISO);
      button.classList.toggle("has-lessons", lessons.length > 0);
      button.setAttribute("aria-pressed", String(iso === selectedISO));
      button.setAttribute("aria-label", `${formatLongDate(date)} · ${lessons.length} ${pluralRu(lessons.length, "занятие", "занятия", "занятий")}`);
      const number = document.createElement("span"); number.className = "month-day-number"; number.textContent = String(date.getDate());
      const count = document.createElement("span"); count.className = "month-day-count";
      count.textContent = lessons.length ? String(lessons.length) : "";
      button.append(number, count);
      button.addEventListener("click", () => onPick(iso));
      return button;
    });
    $("monthDays").replaceChildren(...cells);
    $("prevWeekButton").setAttribute("aria-label", "Предыдущий месяц");
    $("nextWeekButton").setAttribute("aria-label", "Следующий месяц");
    $("prevWeekButton").title = "Предыдущий месяц";
    $("nextWeekButton").title = "Следующий месяц";
    $("weekStatus").textContent = "Выбранный месяц";
  } else {
    const activeDays = Math.min(7, Math.max(1, Number(data.settings.activeDays) || 7));
    const days = fullWeek(selectedDate).slice(0, activeDays);
    $("weekDays").style.gridTemplateColumns = `repeat(${activeDays}, minmax(0, 1fr))`;
    const buttons = days.map(date => {
      const iso = toISODate(date);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "date-button";
      button.classList.toggle("is-selected", iso === selectedISO);
      button.classList.toggle("is-today", iso === todayISO);
      button.setAttribute("aria-pressed", String(iso === selectedISO));
      button.setAttribute("aria-label", formatLongDate(date));
      const month = document.createElement("span"); month.className = "date-month";
      month.textContent = iso === todayISO ? "Сегодня" : new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(date).replace(".", "");
      const number = document.createElement("span"); number.className = "date-number"; number.textContent = String(date.getDate());
      const weekday = document.createElement("span"); weekday.className = "date-weekday"; weekday.textContent = weekdayShort(date.getDay() || 7);
      button.append(month, number, weekday);
      button.addEventListener("click", () => onPick(iso));
      return button;
    });
    $("weekDays").replaceChildren(...buttons);
    const isCurrentWeek = formatWeekRange(new Date()) === formatWeekRange(selectedDate);
    $("weekStatus").textContent = isCurrentWeek ? "Текущая неделя" : "Выбранная неделя";
    $("prevWeekButton").setAttribute("aria-label", "Предыдущая неделя");
    $("nextWeekButton").setAttribute("aria-label", "Следующая неделя");
    $("prevWeekButton").title = "Предыдущая неделя";
    $("nextWeekButton").title = "Следующая неделя";
  }

  const week = getCycleWeek(data.settings.semesterStart, selectedDate);
  const academicWeek = getAcademicWeekNumber(data.settings.semesterStart, selectedDate);
  if (!isMonth) {
    $("weekRange").textContent = academicWeek && academicWeek > 0
      ? `${formatWeekRange(selectedDate)} · ${academicWeek}-я учебная неделя`
      : formatWeekRange(selectedDate);
  }
  $("oddWeekButton").setAttribute("aria-pressed", String(week === 1));
  $("evenWeekButton").setAttribute("aria-pressed", String(week === 2));
  if (data.settings.weekCycle) {
    const side = week === 1 ? "под чертой" : "над чертой";
    $("weekStatusDetail").textContent = academicWeek && academicWeek > 0 ? `${academicWeek}-я · ${side}` : side;
    $("oddWeekButton").title = "Учебные недели под чертой";
    $("evenWeekButton").title = "Учебные недели над чертой";
  } else {
    $("weekStatusDetail").textContent = "Без чередования недель";
  }
}
function colorForType(type) {
  let sum = 0; for (const char of String(type || "")) sum = (sum + char.charCodeAt(0)) % 997;
  return COLORS[sum % COLORS.length];
}
function glyphForType(type) {
  const text = String(type || "").toLocaleLowerCase("ru-RU");
  if (text.includes("лаб")) return "⌘";
  if (text.includes("практ")) return "✣";
  if (text.includes("встреч") || text.includes("консульт")) return "◈";
  if (text.includes("трен")) return "↗";
  return GLYPHS[Math.abs(text.length) % GLYPHS.length];
}
function isCurrent(lesson, date) {
  if (toISODate(new Date()) !== toISODate(date)) return false;
  const now = new Date(); const current = now.getHours() * 60 + now.getMinutes();
  return current >= minutesFromTime(lesson.start) && current <= minutesFromTime(lesson.end);
}

function createLessonCard(lesson, date, mode) {
  const card = document.createElement("article");
  const color = colorForType(lesson.type);
  const current = isCurrent(lesson, date);
  card.className = `lesson-card${current ? " is-current" : ""}`;
  card.style.setProperty("--lesson-color", color);
  const icon = document.createElement("span"); icon.className = "lesson-icon"; icon.textContent = glyphForType(lesson.type); icon.setAttribute("aria-hidden", "true");
  const title = document.createElement("strong"); title.className = "lesson-subject"; title.textContent = lesson.title;
  const type = document.createElement("span"); type.className = "lesson-type"; type.textContent = lesson.type;
  // Если предмет относится к отдельной подгруппе, показываем это сразу в карточке.
  const subgroup = lesson.subgroup ? document.createElement("span") : null;
  if (subgroup) { subgroup.className = "lesson-subgroup"; subgroup.textContent = lesson.subgroup; }
  const time = document.createElement("span"); time.className = "lesson-time"; time.textContent = `${lesson.start} – ${lesson.end}`;
  const person = document.createElement("span"); person.className = "lesson-person"; person.textContent = mode === "teacher" ? lesson.groupName : (lesson.teacher || "Ответственный не указан");
  const location = document.createElement("span"); location.className = "lesson-location"; location.textContent = lesson.location || lesson.unitName;
  card.append(icon, title, type);
  if (subgroup) card.append(subgroup);
  card.append(time, person, location);
  // Только пользовательские дополнительные записи получают кнопки изменения/удаления.
  let personalActions = null;
  if (lesson.origin === "personal") {
    personalActions = document.createElement("div");
    personalActions.className = "lesson-actions personal-lesson-actions";
    const edit = document.createElement("button");
    edit.type = "button"; edit.className = "lesson-action";
    edit.dataset.personalAction = "edit"; edit.dataset.id = lesson.id;
    edit.textContent = "Изменить";
    const remove = document.createElement("button");
    remove.type = "button"; remove.className = "lesson-action delete";
    remove.dataset.personalAction = "delete"; remove.dataset.id = lesson.id;
    remove.textContent = "Удалить";
    personalActions.append(edit, remove);
  }
  if (lesson.notes) {
    const note = document.createElement("span"); note.className = "lesson-notes"; note.textContent = lesson.notes;
    card.append(note);
  }
  if (current) { const badge = document.createElement("span"); badge.className = "now-badge"; badge.textContent = "СЕЙЧАС"; card.append(badge); }
  if (personalActions) card.append(personalActions);
  // Базовые карточки доступны только для просмотра; дополнительные записи имеют собственные действия.
  return card;
}

export function renderLessons(data, prefs, selectedISO, searchTerm = "") {
  const date = new Date(`${selectedISO}T12:00:00`);
  const allLessons = lessonsForDate(data, prefs, date);
  const query = searchTerm.trim().toLocaleLowerCase("ru-RU");
  const lessons = allLessons.filter(lesson => !query || [lesson.title, lesson.type, lesson.subgroup, lesson.teacher, lesson.location, lesson.groupName, lesson.unitName].join(" ").toLocaleLowerCase("ru-RU").includes(query));
  const cards = lessons.map(lesson => createLessonCard(lesson, date, prefs.mode));
  // Базовые занятия доступны посетителю только для просмотра; свои дополнения он может менять отдельно.
  $("lessonGrid").replaceChildren(...cards);
  $("emptyState").hidden = allLessons.length > 0 || query.length > 0;
  if (query && lessons.length === 0) $("emptyState").hidden = false;
  const selectedUnit = data.units.find(unit => unit.id === prefs.unitId);
  const hasGroups = allGroups(data).length > 0;
  $("addPersonalLessonButton").hidden = !hasGroups;
  $("emptyAddButton").hidden = !hasGroups;
  $("emptyAddButton").textContent = "＋ Добавить дополнительное занятие";
  $("emptyUniversityButton").hidden = hasGroups || Boolean(query);
  $("dayTitle").textContent = `${weekdayName(date.getDay() || 7)}, ${formatLongDate(date)}`;
  $("dayDescription").textContent = prefs.mode === "teacher" ? "Занятия выбранного преподавателя" : "Занятия выбранной группы и ваши дополнительные события";
  $("dayCount").replaceChildren();
  const number = document.createElement("strong"); number.textContent = String(lessons.length);
  const caption = document.createElement("span"); caption.textContent = pluralRu(lessons.length, "событие", "события", "событий");
  $("dayCount").append(number, caption);
  if (query && lessons.length === 0) {
    $("emptyState").querySelector("strong").textContent = "Ничего не найдено";
    $("emptyState").querySelector("p").textContent = "Попробуйте изменить поисковый запрос.";
    $("emptyAddButton").hidden = true;
    $("emptyUniversityButton").hidden = true;
  } else {
    $("emptyState").querySelector("strong").textContent = "Пока ничего не запланировано";
    $("emptyState").querySelector("p").textContent = hasGroups ? "Добавьте дополнительное занятие. Оно сохранится только в этом браузере и не изменит основные пары вашей группы." : "Выберите факультет и учебную группу, чтобы посмотреть расписание.";
    $("addPersonalLessonButton").hidden = !hasGroups;
  $("emptyAddButton").hidden = !hasGroups;
  $("emptyAddButton").textContent = "＋ Добавить дополнительное занятие";
    $("emptyUniversityButton").hidden = hasGroups;
  }
}

export function renderPeople(data, onChoose) {
  const people = allPeople(data);
  $("peopleCount").textContent = String(people.length);
  $("peopleEmpty").hidden = people.length > 0;
  const cards = people.map(person => {
    const button = document.createElement("button"); button.type = "button"; button.className = "person-card"; button.dataset.teacher = person.name;
    const avatar = document.createElement("span"); avatar.className = "person-avatar"; avatar.textContent = person.name.trim().slice(0, 1).toLocaleUpperCase("ru-RU");
    const copy = document.createElement("span"); copy.className = "person-info";
    const name = document.createElement("strong"); name.textContent = person.name;
    const detail = document.createElement("small"); detail.textContent = `${person.lessons} ${pluralRu(person.lessons, "занятие", "занятия", "занятий")} · ${person.groups.join(", ")}`;
    copy.append(name, detail); const arrow = document.createElement("span"); arrow.className = "person-arrow"; arrow.textContent = "›";
    button.append(avatar, copy, arrow); button.addEventListener("click", () => onChoose(person.name)); return button;
  });
  $("peopleGrid").replaceChildren(...cards);
}

export function renderOverview(data, prefs, selectedISO) {
  const selectedDate = new Date(`${selectedISO}T12:00:00`);
  const today = new Date();
  const todayLessons = lessonsForDate(data, prefs, today);
  const weekDates = fullWeek(today);
  const weekLessons = lessonsForWeek(data, prefs, weekDates);
  const groups = allGroups(data);
  const people = allPeople(data);
  $("statToday").textContent = String(todayLessons.length);
  $("statWeek").textContent = String(weekLessons.length);
  $("statGroups").textContent = String(groups.length);
  $("statPeople").textContent = String(people.length);
  $("welcomeTitle").textContent = `${data.organization.name} — всё по плану.`;
  $("welcomeDescription").textContent = "Расписание учебных групп, преподавателей и подразделений ГГУ имени Франциска Скорины.";

  const upcoming = weekLessons.slice().sort((a, b) => a.date.localeCompare(b.date) || minutesFromTime(a.start) - minutesFromTime(b.start)).slice(0, 6);
  const items = upcoming.map(item => {
    const row = document.createElement("div"); row.className = "upcoming-item";
    const time = document.createElement("span"); time.className = "upcoming-time";
    const date = new Date(`${item.date}T12:00:00`);
    time.textContent = `${weekdayShort(date.getDay() || 7)} · ${item.start}`;
    const copy = document.createElement("span"); copy.className = "upcoming-copy";
    const title = document.createElement("strong"); title.textContent = item.title;
    const detail = document.createElement("small"); detail.textContent = `${item.teacher || item.groupName} · ${item.location || item.groupName}`;
    copy.append(title, detail); row.append(time, copy); return row;
  });
  if (!items.length) {
    const empty = document.createElement("p"); empty.className = "empty-inline"; empty.textContent = "На этой неделе пока нет запланированных событий."; items.push(empty);
  }
  $("upcomingList").replaceChildren(...items);
}

export function fillSettingsForm(data) {
  $("profileType").value = "university";
  $("organizationName").value = data.organization.name;
  $("organizationSubtitle").value = data.organization.subtitle;
  $("cycleStart").value = data.settings.semesterStart;
  $("activeDays").value = String(data.settings.activeDays || 7);
  $("weekCycleEnabled").checked = Boolean(data.settings.weekCycle);
}
