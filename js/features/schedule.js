/* Отображение расписания выбранного курса и дня. */
import { getLessons } from "../services/data-service.js";
import {
  dateFormatter, shortDateFormatter, weekdayFormatter, capitalize,
  pluralLessons, getISOWeekType
} from "../utils/date-utils.js";

function createMetaItem(symbol, text, className) {
  const item = document.createElement("div");
  item.className = `lesson-meta-item ${className}`;
  if (!text) item.classList.add("is-empty");

  const icon = document.createElement("span");
  icon.className = "meta-symbol";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = symbol;

  const value = document.createElement("span");
  value.className = "meta-value";
  value.textContent = text || "—";
  item.append(icon, value);
  return item;
}

function formatRoom(room) {
  const value = String(room || "").trim();
  if (!value) return "";
  return /^ауд\.?\s*/i.test(value) ? value : `Ауд. ${value}`;
}

function createLessonCard(lesson) {
  const card = document.createElement("article");
  card.className = "lesson-card";
  card.title = lesson.subject || "Занятие";

  const time = document.createElement("div");
  time.className = "lesson-time";
  time.textContent = lesson.time;

  const main = document.createElement("div");
  main.className = "lesson-main";
  if (lesson.sourceGroup) {
    const sourceGroup = document.createElement("span");
    sourceGroup.className = "lesson-source-group";
    sourceGroup.textContent = lesson.sourceGroup;
    main.append(sourceGroup);
  }
  const subject = document.createElement("div");
  subject.className = "lesson-subject";
  subject.textContent = lesson.subject;
  main.append(subject);

  // Аудитория и преподаватель всегда занимают свои колонки.
  // Даже если поле пустое, ячейка остаётся на месте — строки всех карточек
  // сохраняют одинаковое выравнивание.
  const room = createMetaItem("⌖", formatRoom(lesson.room), "lesson-room");
  const teacher = createMetaItem("♟", String(lesson.teacher || "").trim(), "lesson-teacher");

  card.append(time, main, room, teacher);
  return card;
}

export function renderSchedule({ data, date, selection, query, groupNames }) {
  document.querySelector("#dayTitle").textContent = capitalize(dateFormatter.format(date));
  document.querySelector("#selectedDateLabel").textContent = shortDateFormatter.format(date);
  const isoWeekType = getISOWeekType(date, data.weekSettings?.oddIsoWeek === "below" ? "below" : "above");
  const weekLabel = isoWeekType === "above" ? "Над чертой" : "Под чертой";
  document.querySelector("#weekTypeLabel").textContent = weekLabel;
  document.querySelector("#todayLabel").textContent = `${weekdayFormatter.format(date).toLocaleUpperCase("ru-RU")} • ${groupNames.faculty.toLocaleUpperCase("ru-RU")}`;

  const sourceNotice = document.querySelector("#sourceNotice");
  const list = document.querySelector("#lessonList");
  const emptyState = document.querySelector("#emptyState");
  const emptyTitle = document.querySelector("#emptyTitle");
  const emptyDescription = document.querySelector("#emptyDescription");

  if (!selection?.groupId || !selection?.course) {
    sourceNotice.classList.add("hidden");
    list.replaceChildren();
    list.classList.add("hidden");
    emptyState.classList.remove("hidden");
    emptyTitle.textContent = "Для этого факультета пока не добавлены группы";
    emptyDescription.textContent = "Для этого факультета пока не добавлены учебные группы. Можно выбрать другой факультет.";
    document.querySelector("#lessonCount").textContent = "—";
    return;
  }

  if (data.scheduleLoading) {
    sourceNotice.classList.remove("hidden");
    sourceNotice.textContent = "Загружаю расписание выбранного курса…";
    list.replaceChildren();
    list.classList.add("hidden");
    emptyState.classList.remove("hidden");
    emptyTitle.textContent = "Загрузка расписания";
    emptyDescription.textContent = "Пожалуйста, подождите.";
    document.querySelector("#lessonCount").textContent = "Загрузка…";
    return;
  }

  const normalizedQuery = String(query || "").trim().toLocaleLowerCase("ru-RU");
  const allLessons = getLessons(data, { date });
  const lessons = allLessons.filter(lesson => [lesson.subject, lesson.teacher, lesson.room, lesson.time, lesson.sourceGroup]
    .join(" ").toLocaleLowerCase("ru-RU").includes(normalizedQuery));

  document.querySelector("#lessonCount").textContent = `${lessons.length} ${pluralLessons(lessons.length)}`;
  list.replaceChildren(...lessons.map(createLessonCard));
  list.classList.toggle("hidden", lessons.length === 0);
  emptyState.classList.toggle("hidden", lessons.length !== 0);

  if (data.scheduleError) {
    sourceNotice.classList.remove("hidden");
    sourceNotice.textContent = data.scheduleError;
    emptyTitle.textContent = "Не удалось загрузить расписание";
    emptyDescription.textContent = "Проверьте путь к файлу курса, его имя и экспорт SCHEDULE. Подробности доступны в Console (F12).";
    return;
  }

  sourceNotice.classList.add("hidden");
  if (lessons.length === 0) {
    if (!data.schedule.length) {
      emptyTitle.textContent = "Расписание пока не заполнено";
      emptyDescription.textContent = "Для выбранного курса расписание пока не заполнено.";
    } else if (!allLessons.length) {
      emptyTitle.textContent = "На этот день занятий нет";
      emptyDescription.textContent = "";
    } else {
      emptyTitle.textContent = "Ничего не найдено";
      emptyDescription.textContent = "Измените поисковый запрос или выберите другой день в календаре.";
    }
  }
}
