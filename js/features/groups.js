/*
 * Селекторы учебной иерархии: факультет → группа → курс.
 * Факультеты без заведённых групп показываются в списке, но выбор
 * группы и курса остаётся заблокированным до заполнения data/faculties.js.
 */
import { STORAGE_KEYS } from "../app-config.js";

function readSavedSelection() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.selection);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("[Расписание] Не удалось прочитать сохранённый выбор:", error);
    return null;
  }
}

function saveSelection(selection) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.selection, JSON.stringify(selection));
  } catch (error) {
    console.warn("[Расписание] Не удалось сохранить выбор факультета:", error);
  }
}

function fillSelect(select, options, selectedValue, getLabel, getValue, emptyLabel) {
  select.replaceChildren();
  if (!options.length) {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = emptyLabel;
    placeholder.selected = true;
    select.append(placeholder);
    select.disabled = true;
    return;
  }

  options.forEach(option => {
    const element = document.createElement("option");
    element.value = String(getValue(option));
    element.textContent = getLabel(option);
    select.append(element);
  });

  const hasValue = options.some(option => String(getValue(option)) === String(selectedValue));
  select.value = hasValue ? String(selectedValue) : String(getValue(options[0]));
  select.disabled = options.length === 1;
}

export function initGroupSelectors(faculties, onChange) {
  const facultySelect = document.querySelector("#facultySelect");
  const groupSelect = document.querySelector("#groupSelect");
  const courseSelect = document.querySelector("#courseSelect");

  if (!facultySelect || !groupSelect || !courseSelect) {
    throw new Error("В index.html отсутствует один из селекторов факультета, группы или курса.");
  }
  if (!Array.isArray(faculties) || !faculties.length) {
    throw new Error("Справочник факультетов пуст: проверьте data/faculties.js.");
  }

  const saved = readSavedSelection() || {};
  let currentFaculty = faculties.find(item => item.id === saved.facultyId) || faculties[0];
  // Совместимость с предыдущими версиями: пять ID Ф-подгрупп
  // объединены в одну обычную группу "Ф". Сохраняем выбор пользователя.
  const isLegacyFSubgroup = currentFaculty.id === "physics-it" && /^f-[1-5]$/.test(String(saved.groupId || ""));
  const migratedGroupId = isLegacyFSubgroup ? "f" : saved.groupId;
  let currentGroup = currentFaculty.groups.find(item => item.id === migratedGroupId) || currentFaculty.groups[0] || null;
  let currentCourse = currentGroup
    ? (currentGroup.courses.includes(Number(saved.course)) ? Number(saved.course) : currentGroup.courses[0])
    : null;

  function renderFacultyOptions() {
    // Факультет без зарегистрированных групп остаётся видимым,
    // но помечается как «скоро». Метка исчезает автоматически,
    // как только в data/faculties.js добавят настоящую группу.
    fillSelect(
      facultySelect,
      faculties,
      currentFaculty.id,
      item => item.groups.length ? item.name : `${item.name} — скоро`,
      item => item.id,
      "Факультеты не найдены"
    );
  }

  function renderGroupOptions() {
    const groups = currentFaculty.groups || [];
    fillSelect(groupSelect, groups, currentGroup?.id, item => item.name, item => item.id, "Группы пока не добавлены");
  }

  function renderCourseOptions() {
    const courses = currentGroup?.courses || [];
    fillSelect(courseSelect, courses, currentCourse, item => `${item} курс`, item => item, "Сначала добавьте группу");
  }

  function getSelection() {
    return {
      facultyId: currentFaculty.id,
      groupId: currentGroup?.id || "",
      course: currentCourse || null
    };
  }

  function getNames() {
    return {
      faculty: currentFaculty.name,
      group: currentGroup?.name || "Группы не добавлены",
      course: currentCourse
    };
  }

  function publishChange() {
    const selection = getSelection();
    saveSelection(selection);
    onChange(selection);
  }

  facultySelect.addEventListener("change", () => {
    currentFaculty = faculties.find(item => item.id === facultySelect.value) || faculties[0];
    currentGroup = currentFaculty.groups[0] || null;
    currentCourse = currentGroup?.courses[0] ?? null;
    renderGroupOptions();
    renderCourseOptions();
    publishChange();
  });

  groupSelect.addEventListener("change", () => {
    currentGroup = currentFaculty.groups.find(item => item.id === groupSelect.value) || currentFaculty.groups[0] || null;
    currentCourse = currentGroup?.courses[0] ?? null;
    renderCourseOptions();
    publishChange();
  });

  courseSelect.addEventListener("change", () => {
    if (!currentGroup) return;
    currentCourse = Number(courseSelect.value);
    publishChange();
  });

  renderFacultyOptions();
  renderGroupOptions();
  renderCourseOptions();

  return { getSelection, getNames };
}
