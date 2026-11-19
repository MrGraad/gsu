/* Поиск по предмету, преподавателю, аудитории и времени выбранного дня. */
export function initSearch(onSearch, onActivateSchedule) {
  const input = document.querySelector("#searchInput");
  if (!input) throw new Error("В index.html отсутствует поле #searchInput.");
  input.addEventListener("input", () => {
    onActivateSchedule();
    onSearch(input.value);
  });
  document.addEventListener("keydown", event => {
    const activeTag = document.activeElement?.tagName;
    if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(activeTag)) {
      event.preventDefault(); input.focus();
    }
    if (event.key === "Escape" && document.activeElement === input) {
      input.value = ""; onSearch(""); input.blur();
    }
  });
}
