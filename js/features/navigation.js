/* Навигация, разделы справочников, объявления и страница «О нас». */
import { APP_VERSION } from "../app-config.js";
import { getVisibleAnnouncements } from "../services/data-service.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEGRAM_RE = /^https:\/\/t\.me\/[A-Za-z0-9_+/?=-]+$/i;

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeRow(first, second) {
  const row = makeElement("div", "simple-row");
  row.append(makeElement("strong", "", first), makeElement("span", "", second || "Не указано"));
  return row;
}

function makeNote(text, className = "simple-empty-note") {
  return makeElement("p", className, text);
}

function makeAboutLink({ title, url, icon = "↗", hint = "Открыть ссылку" }) {
  const link = makeElement("a", "about-link");
  const safeUrl = String(url || "").trim();
  const isConfigured = TELEGRAM_RE.test(safeUrl);
  if (isConfigured) {
    link.href = safeUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `${title}. ${hint}`);
  } else {
    link.classList.add("is-unconfigured");
    link.setAttribute("aria-disabled", "true");
    link.title = "Ссылка временно недоступна";
    link.addEventListener("click", event => event.preventDefault());
  }
  const iconElement = makeElement("span", "about-link-icon", icon);
  iconElement.setAttribute("aria-hidden", "true");
  const copy = makeElement("span", "about-link-copy");
  copy.append(
    makeElement("strong", "", title),
    makeElement("small", "", isConfigured ? hint : "Ссылка временно недоступна")
  );
  const arrow = makeElement("span", "about-link-arrow", isConfigured ? "↗" : "＋");
  arrow.setAttribute("aria-hidden", "true");
  link.append(iconElement, copy, arrow);
  return link;
}

function makeSectionTitle(text) {
  return makeElement("h3", "about-section-title", text);
}

function renderAboutPage(panel, data) {
  const heading = makeElement("h2", "", "О нас");
  const intro = makeElement("p", "", "Электронное расписание занятий. Здесь собраны полезные ссылки и способы связаться с командой проекта.");
  const details = makeElement("div", "simple-list about-details");
  details.append(
    makeRow("Версия", APP_VERSION),
    makeRow("Учебная иерархия", "Факультет → группа → курс"),
    makeRow("Данные", "Учебная информация и справочники проекта")
  );

  const channelsSection = makeElement("section", "about-section");
  channelsSection.append(makeSectionTitle("Наши Telegram-каналы"));
  const channelList = makeElement("div", "about-links-list");
  const channels = data.contacts.telegramChannels || [];
  channels.forEach(channel => channelList.append(makeAboutLink({
    title: channel.title, url: channel.url, icon: "➤", hint: "Перейти в Telegram"
  })));
  if (!channels.length) channelList.append(makeNote("Telegram-каналы временно недоступны."));
  channelsSection.append(channelList);

  const contactIssues = data.errors.filter(issue => issue.key === "contacts");
  const contactWarnings = data.warnings.filter(issue => issue.key === "contacts");
  [...contactIssues, ...contactWarnings].forEach(issue => {
    const warning = makeElement("div", issue.level === "warning" ? "data-diagnostic" : "data-diagnostic data-diagnostic-error",
      `${issue.file}: ${issue.message}`);
    channelsSection.append(warning);
  });

  const feedback = makeElement("section", "about-feedback");
  const feedbackTitle = makeElement("h3", "", "Нашли ошибку?");
  const feedbackText = makeElement("p", "");
  feedbackText.append(document.createTextNode("Напишите нам на почту: "));
  const email = String(data.contacts.email || "").trim();
  const emailLink = makeElement("a", "about-email-link", EMAIL_RE.test(email) ? email : "Адрес временно недоступен");
  if (EMAIL_RE.test(email)) emailLink.href = `mailto:${email}`;
  else {
    emailLink.setAttribute("aria-disabled", "true");
    emailLink.title = "Почтовый адрес временно недоступен";
    emailLink.addEventListener("click", event => event.preventDefault());
  }
  feedbackText.append(emailLink);
  feedback.append(feedbackTitle, feedbackText);
  contactIssues.forEach(issue => feedback.append(makeNote(`${issue.file}: ${issue.message}`, "data-source-note")));

  panel.append(heading, intro, details, channelsSection, feedback);
}

function renderTeachersPage(panel, data) {
  const heading = makeElement("h2", "", "Преподаватели");
  const list = makeElement("div", "simple-list teachers-list");
  const teacherIssues = data.errors.filter(issue => issue.key === "teachers");
  const teacherWarnings = data.warnings.filter(issue => issue.key === "teachers");
  const countText = makeElement("p", "data-source-note", `Преподавателей: ${data.teachers.length}`);
  const toolbar = makeElement("div", "teachers-toolbar");
  const search = document.createElement("input");
  search.type = "search";
  search.className = "teachers-search";
  search.placeholder = "Найти преподавателя или предмет…";
  search.setAttribute("aria-label", "Поиск преподавателя или предмета");
  toolbar.append(search);
  const refresh = makeElement("button", "secondary-action", "Перечитать файл");
  refresh.type = "button";
  refresh.addEventListener("click", () => {
    if (typeof window.RASPISANIE_REFRESH_DATA === "function") window.RASPISANIE_REFRESH_DATA();
  });
  toolbar.append(refresh);

  const rows = makeElement("div", "teachers-results");
  const sortedTeachers = [...data.teachers].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const renderRows = () => {
    const query = search.value.trim().toLocaleLowerCase("ru-RU");
    const matches = sortedTeachers.filter(teacher => `${teacher.name} ${teacher.subject}`.toLocaleLowerCase("ru-RU").includes(query));
    rows.replaceChildren();
    if (!matches.length) rows.append(makeNote(data.teachers.length ? "По вашему запросу преподаватели не найдены." : "Справочник преподавателей пока пуст."));
    matches.forEach(teacher => rows.append(makeRow(teacher.name, teacher.subject)));
  };
  search.addEventListener("input", renderRows);
  renderRows();
  list.append(countText, toolbar, rows);
  [...teacherIssues, ...teacherWarnings].forEach(issue => {
    list.append(makeElement("div", issue.level === "warning" ? "data-diagnostic" : "data-diagnostic data-diagnostic-error",
      `${issue.file}: ${issue.message}`));
  });
  panel.append(heading, list);
}

function formatAnnouncementDate(value) {
  if (!value) return "Дата не указана";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(year, month - 1, day));
}

function renderAnnouncementsPage(panel, data, selection) {
  const heading = makeElement("h2", "", "Объявления");
  const intro = makeElement("p", "", "Важная информация об изменениях в расписании, переносах и учебном процессе.");
  const list = makeElement("div", "announcements-list");
  const announcements = getVisibleAnnouncements(data, selection);
  const labels = {
    info: "Информация",
    important: "Важно",
    change: "Изменение",
    cancellation: "Отмена занятия"
  };
  if (!data.announcements.length) {
    list.append(makeNote("Объявлений пока нет."));
  } else if (!announcements.length) {
    list.append(makeNote("Объявлений для выбранных факультета, группы и курса пока нет."));
  } else {
    announcements.forEach(item => {
      const card = makeElement("article", `announcement-card announcement-${item.type}`);
      const meta = makeElement("div", "announcement-meta");
      meta.append(makeElement("span", `announcement-type announcement-type-${item.type}`, labels[item.type] || labels.info));
      meta.append(makeElement("time", "announcement-date", formatAnnouncementDate(item.date)));
      const title = makeElement("h3", "announcement-title", item.title);
      const message = makeElement("p", "announcement-message", item.message);
      card.append(meta, title, message);
      if (item.facultyId || item.groupId || item.course) {
        const audience = makeElement("p", "announcement-audience", "Для выбранной учебной группы");
        card.append(audience);
      }
      list.append(card);
    });
  }
  data.errors.filter(issue => issue.key === "announcements").forEach(issue => list.append(makeElement("div", "data-diagnostic data-diagnostic-error", `${issue.file}: ${issue.message}`)));
  data.warnings.filter(issue => issue.key === "announcements").forEach(issue => list.append(makeElement("div", "data-diagnostic", `${issue.file}: ${issue.message}`)));
  panel.append(heading, intro, list);
}

function renderInfoPage(view, panel, data, selection) {
  // Очищаем контейнер перед каждым экраном, чтобы страницы справочника
  // и раздел «О нас» не накапливали старую разметку при навигации.
  panel.replaceChildren();
  if (view === "about") { renderAboutPage(panel, data); return; }
  if (view === "teachers") { renderTeachersPage(panel, data); return; }
  if (view === "announcements") { renderAnnouncementsPage(panel, data, selection); return; }
}

export function initNavigation(onViewChange, initialData, getSelection = () => null) {
  const nav = document.querySelector("#sideNav");
  const scheduleView = document.querySelector("#scheduleView");
  const selectionPanel = document.querySelector("#selectionPanel");
  const simpleView = document.querySelector("#simpleView");
  const pageTitle = document.querySelector("#pageTitle");
  let currentView = "schedule";
  let data = initialData;
  let features = { teachersEnabled: false, announcementsEnabled: false, ...(initialData.features || {}) };

  function syncNavigationAvailability() {
    const definitions = {
      teachers: { enabled: features.teachersEnabled, title: "Преподаватели" },
      announcements: { enabled: features.announcementsEnabled, title: "Объявления" }
    };

    for (const [view, config] of Object.entries(definitions)) {
      const button = nav.querySelector(`[data-view="${view}"]`);
      if (!button) continue;

      button.disabled = !config.enabled;
      button.classList.toggle("nav-link-disabled", !config.enabled);
      button.setAttribute("aria-disabled", String(!config.enabled));
      button.title = config.enabled ? "" : `Раздел «${config.title}» временно недоступен`;

      let status = button.querySelector(".nav-status");
      if (!config.enabled && !status) {
        status = makeElement("span", "nav-status");
        status.setAttribute("aria-hidden", "true");
        button.append(status);
      } else if (config.enabled && status) {
        status.remove();
      }
    }
  }

  function isViewEnabled(view) {
    if (view === "schedule" || view === "about") return true;
    if (view === "teachers") return features.teachersEnabled;
    if (view === "announcements") return features.announcementsEnabled;
    return false;
  }

  function setView(view) {
    if (!isViewEnabled(view)) return;
    currentView = view;
    nav.querySelectorAll("[data-view]").forEach(button => {
      const active = button.dataset.view === view;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
    });
    const isSchedule = view === "schedule";
    scheduleView.classList.toggle("hidden", !isSchedule);
    selectionPanel.classList.toggle("hidden", !isSchedule);
    simpleView.classList.toggle("hidden", isSchedule);
    document.querySelector("#dateInfo").classList.toggle("hidden", !isSchedule);
    if (isSchedule) {
      pageTitle.textContent = "Расписание занятий";
      onViewChange("schedule");
      return;
    }
    const titles = { teachers: "Преподаватели", announcements: "Объявления", about: "О нас" };
    pageTitle.textContent = titles[view];
    document.querySelector("#selectedDateLabel").textContent = "";
    document.querySelector("#weekTypeLabel").textContent = "";
    renderInfoPage(view, simpleView, data, getSelection());
    onViewChange(view);
  }

  syncNavigationAvailability();

  nav.addEventListener("click", event => {
    const button = event.target.closest("[data-view]");
    if (button && !button.disabled && button.getAttribute("aria-disabled") !== "true") {
      setView(button.dataset.view);
    }
  });
  return {
    setView,
    getView: () => currentView,
    updateData(nextData) {
      data = nextData;
      features = { teachersEnabled: false, announcementsEnabled: false, ...(nextData.features || {}) };
      syncNavigationAvailability();
      if (!isViewEnabled(currentView)) {
        setView("schedule");
      } else if (currentView !== "schedule") {
        renderInfoPage(currentView, simpleView, data, getSelection());
      }
    }
  };
}
