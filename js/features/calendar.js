/* Календарь и выбор даты. */
import { monthFormatter, sameDate, mondayIndex, dateFromKey, toDateKey } from "../utils/date-utils.js";

export function initCalendar(onDateChange) {
  const monthTitle = document.querySelector("#monthTitle");
  const calendarGrid = document.querySelector("#calendarGrid");
  const previousButton = document.querySelector("#prevMonth");
  const nextButton = document.querySelector("#nextMonth");
  let selectedDate = new Date();
  let visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);

  function render() {
    const year = visibleMonth.getFullYear(), month = visibleMonth.getMonth();
    monthTitle.textContent = monthFormatter.format(visibleMonth);
    const firstDay = new Date(year, month, 1);
    const offset = mondayIndex(firstDay.getDay());
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const previousMonthDays = new Date(year, month, 0).getDate();
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < 42; index += 1) {
      let day, date, isMuted = false;
      if (index < offset) {
        day = previousMonthDays - offset + index + 1;
        date = new Date(year, month - 1, day); isMuted = true;
      } else if (index >= offset + daysInMonth) {
        day = index - offset - daysInMonth + 1;
        date = new Date(year, month + 1, day); isMuted = true;
      } else {
        day = index - offset + 1; date = new Date(year, month, day);
      }
      const button = document.createElement("button");
      button.type = "button"; button.className = "day-cell"; button.textContent = String(day);
      button.dataset.date = toDateKey(date);
      button.setAttribute("aria-label", new Intl.DateTimeFormat("ru-RU", { dateStyle: "full" }).format(date));
      if (isMuted) button.classList.add("muted");
      button.classList.toggle("selected", sameDate(date, selectedDate));
      button.setAttribute("aria-pressed", sameDate(date, selectedDate) ? "true" : "false");
      if (sameDate(date, new Date())) button.classList.add("today");
      fragment.append(button);
    }
    calendarGrid.replaceChildren(fragment);
  }

  calendarGrid.addEventListener("click", event => {
    const button = event.target.closest("button[data-date]");
    if (!button) return;
    selectedDate = dateFromKey(button.dataset.date);
    visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    render(); onDateChange(selectedDate);
  });
  previousButton.addEventListener("click", () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1); render();
  });
  nextButton.addEventListener("click", () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1); render();
  });
  render();

  return {
    getSelectedDate: () => new Date(selectedDate),
    setSelectedDate(date) {
      selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      render(); onDateChange(selectedDate);
    }
  };
}
