// Создание и редактирование событий. Здесь сосредоточена работа с формой диалога.
import { $, makeId, minutesFromTime, showToast } from "./utils.js";
import { WEEKDAYS } from "./utils.js";
import { allGroups } from "./data.js";

function fillSelect(select, options, selected) {
  select.replaceChildren(...options.map(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
  }));
  if (selected) select.value = selected;
}

export function openLessonEditor({ data, prefs, selectedDate, lesson = null }) {
  const form = $("lessonForm");
  const dialog = $("lessonDialog");
  const groups = allGroups(data);
  const defaultGroupId = lesson?.groupId || prefs.groupId || groups[0]?.id || "";

  form.reset();
  form.elements.lessonId.value = lesson?.id || "";
  form.elements.title.value = lesson?.title || "";
  form.elements.type.value = lesson?.type || "Лекция";
  form.elements.day.value = String(lesson?.day || (new Date(`${selectedDate}T12:00:00`).getDay() || 7));
  form.elements.start.value = lesson?.start || data.settings.defaultStart || "09:00";
  form.elements.end.value = lesson?.end || data.settings.defaultEnd || "10:35";
  form.elements.teacher.value = lesson?.teacher || "";
  form.elements.location.value = lesson?.location || "";
  form.elements.notes.value = lesson?.notes || "";
  form.elements.date.value = lesson?.date || selectedDate;
  const repeat = lesson?.date ? "once" : lesson?.week === 1 ? "odd" : lesson?.week === 2 ? "even" : "all";
  form.elements.repeat.value = repeat;
  // Если цикл чётности выключен, соответствующие варианты повтора недоступны.
  for (const option of form.elements.repeat.options) {
    if (option.value === "odd" || option.value === "even") option.disabled = !data.settings.weekCycle;
  }
  if (!data.settings.weekCycle && (form.elements.repeat.value === "odd" || form.elements.repeat.value === "even")) {
    form.elements.repeat.value = "all";
  }

  const daySelect = $("eventDay");
  fillSelect(daySelect, WEEKDAYS.map((name, index) => [String(index + 1), name]), String(lesson?.day || (new Date(`${selectedDate}T12:00:00`).getDay() || 7)));
  fillSelect($("eventGroup"), groups.map(group => [group.id, `${group.unitName} · ${group.name}`]), defaultGroupId);
  $("eventGroupField").hidden = prefs.mode !== "teacher" && groups.length <= 1;
  $("dialogTitle").textContent = lesson ? "Редактировать событие" : "Новое событие";
  $("dialogEyebrow").textContent = "ВАШЕ РАСПИСАНИЕ";
  $("formError").hidden = true;
  updateOnceDateVisibility();

  if (!dialog.open) dialog.showModal();
  form.elements.title.focus();
}

export function updateOnceDateVisibility() {
  const isOnce = $("lessonForm").elements.repeat.value === "once";
  $("onceDateField").hidden = !isOnce;
  $("lessonForm").elements.date.required = isOnce;
}

export function readLessonForm(data) {
  const form = $("lessonForm");
  const values = Object.fromEntries(new FormData(form).entries());
  const start = values.start;
  const end = values.end;
  if (minutesFromTime(end) <= minutesFromTime(start)) {
    throw new Error("Время окончания должно быть позже времени начала.");
  }
  const targetGroup = allGroups(data).find(group => group.id === values.groupId);
  if (!targetGroup) throw new Error("Сначала создайте учебную группу в разделе «Группы и кафедры».");

  return {
    id: values.lessonId || makeId(),
    title: values.title.trim(),
    type: values.type.trim() || "Занятие",
    day: Number(values.day),
    start, end,
    teacher: values.teacher.trim(),
    location: values.location.trim(),
    notes: values.notes.trim(),
    week: values.repeat === "odd" ? 1 : values.repeat === "even" ? 2 : 0,
    ...(values.repeat === "once" ? { date: values.date } : {}),
    unitId: targetGroup.unitId,
    groupId: targetGroup.id
  };
}

export function closeLessonEditor() {
  $("lessonDialog").close();
}
