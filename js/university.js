// СПРАВОЧНИК ГГУ. Адреса внешних страниц собраны здесь, чтобы их можно было обновлять в одном месте.
// Ссылки ведут на университетские сайты, страницы факультетов и справочные ресурсы.
export const UNIVERSITY_URLS = {
  home: "https://gsu.by/",
  timetable: "https://gsu.by/ru/timetable",
  telegram: "https://t.me/francisk_skorina_gsu",
  creatorTelegram: "https://t.me/FlaxProduction",
  studentCabinet: "https://students.gsu.by/",
  personalPages: "https://gsu.by/ru/personal-pages",
  phonebook: "https://gsu.by/ru/phonebook",
  management: "https://gsu.by/ru/management-structure"
};

// Список факультетов отражает структуру университета.
// У геолого-географического факультета отдельная ссылка на заочную форму в общем списке не обнаружена.
export const FACULTIES = [
  { id: "biology", name: "Биологический факультет", url: "https://biology.gsu.by/index.php/class_schedule", modalities: ["Дневная", "Заочная — уточнить"], note: "Расписания курсов, зачётов, экзаменов и магистратуры." },
  { id: "geo", name: "Геолого-географический факультет", url: "https://geography.gsu.by/disciplines", modalities: ["Дневная", "Заочная — уточнить"], note: "Расписания по геологии, туризму, географии, геоэкологии и магистратуре." },
  { id: "history", name: "Факультет истории и межкультурных коммуникаций", url: "https://history.gsu.by/class_schedule", modalities: ["Дневная", "Заочная"], note: "Основное расписание, лекционная неделя и материалы для магистратуры." },
  { id: "foreign-languages", name: "Факультет иностранных языков", url: "https://drive.google.com/drive/folders/1AGHQtu5IXI7rN6xor5ozTBXlde2eYzZv?usp=gmail", partTimeUrl: "https://drive.google.com/drive/folders/14cAhI-YMzN3JiApHNFw3ZW6s4c6oG3gm", modalities: ["Дневная", "Заочная"], note: "Папка с материалами факультета в Google Drive." },
  { id: "math", name: "Факультет математики и технологий программирования", url: "https://math.gsu.by/node/89", partTimeUrl: "https://drive.google.com/drive/folders/1msuyUppLtKoTzNTAfYmq1cCYOXT5bGkO?usp=sharing", modalities: ["Дневная", "Заочная"], note: "Основное расписание, лекционная неделя, магистратура и заочная форма." },
  { id: "psychology", name: "Факультет психологии и педагогики", url: "https://psi.gsu.by/disciplines", modalities: ["Дневная", "Заочная — уточнить"], note: "Основное расписание, лекционная неделя и графики образовательного процесса." },
  { id: "physics-it", name: "Факультет физики и информационных технологий", url: "https://drive.google.com/drive/folders/1q6c14mhEu1aZUDxzgGaoiQRIFVUAWpuD", partTimeUrl: "https://old.gsu.by/physfac/index.php/component/remository/?func=select&id=475", modalities: ["Дневная", "Заочная"], note: "Папка с материалами факультета в Google Drive." },
  { id: "physical-culture", name: "Факультет физической культуры", url: "https://fk.gsu.by/node/385", partTimeUrl: "https://docs.gsu.by/DocLib9/Forms/AllItems.aspx?FolderCTID=0x0120003603ACADD0EB9D41959A535ABD041227&RootFolder=%2FDocLib9%2F%D0%97%D0%B0%D0%BE%D1%87%D0%BD%D0%B0%D1%8F+%D1%84%D0%BE%D1%80%D0%BC%D0%B0+%D0%BE%D0%B1%D1%80%D0%B0%D0%B7%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D1%8F%2F%D0%A0%D0%B0%D1%81%D0%BF%D0%B8%D1%81%D0%B0%D0%BD%D0%B8%D0%B5+%D0%B7%D0%B0%D0%BD%D1%8F%D1%82%D0%B8%D0%B9&View=%7BE90A38C6-21EC-4434-B534-9EE6E194F386%7D", modalities: ["Дневная", "Заочная"], note: "Файлы расписаний по курсам, направлениям и магистратуре." },
  { id: "philology", name: "Филологический факультет", url: "https://philology.gsu.by/index.php/ru/studentam/materialy-k-uchebnomu-protsessu", modalities: ["Дневная", "Заочная"], note: "Материалы к учебному процессу, расписание занятий и сессий." },
  { id: "economics", name: "Экономический факультет", url: "https://economics.gsu.by/?page_id=924", partTimeUrl: "https://drive.google.com/drive/folders/1A9mR2uNlXSJ7rfGka3uFDvqNtb0B86Jg?usp=sharing", modalities: ["Дневная", "Заочная"], note: "Основное расписание, лекционная неделя, магистратура, экзамены и отдельная папка заочной формы." },
  { id: "law", name: "Юридический факультет", url: "https://law.gsu.by/index.php/ru/obrazovatelnyj-protsess/studentam/dnevnaya-forma-obucheniya/raspisaniye", partTimeUrl: "https://law.gsu.by/index.php/ru/obrazovatelnyj-protsess/studentam/studentam-zaochnaya-forma-obucheniya/raspisanie", modalities: ["Дневная", "Заочная"], note: "Страница расписания юридического факультета." }
];

// Сервисы для студентов: доступ к учебным материалам, библиотеке и органам самоуправления.
export const STUDENT_RESOURCES = [
  { title: "Личный кабинет студента", description: "Личный кабинет для студентов дневной формы обучения.", url: "https://students.gsu.by/", tag: "Личный кабинет" },
  { title: "Общее расписание ГГУ", description: "Расписания факультетов и лекционная неделя.", url: "https://gsu.by/ru/timetable", tag: "Расписание" },
  { title: "Каталог учебных дисциплин", description: "Каталог дисциплин университета.", url: "https://gsu.by/ru/catalog_of_disciplines", tag: "Учёба" },
  { title: "Дистанционное обучение", description: "Университетский раздел дистанционного обучения.", url: "https://gsu.by/ru/distance-learning", tag: "Учёба" },
  { title: "Виртуальный университет", description: "Электронная образовательная среда университета.", url: "https://virtet.gsu.by/", tag: "Онлайн-обучение" },
  { title: "Электронные документы ГГУ", description: "Университетский электронный документооборот и материалы.", url: "https://docs.gsu.by/", tag: "Документы" },
  { title: "Корпоративная почта", description: "Почтовый сервис университета.", url: "https://uinfo.gsu.by/", tag: "Коммуникация" },
  { title: "Библиотека ГГУ", description: "Библиотечные и электронные ресурсы университета.", url: "https://library.gsu.by/", tag: "Библиотека" },
  { title: "Магистратура", description: "Информация и материалы для магистрантов.", url: "https://gsu.by/ru/magistracy", tag: "Обучение" },
  { title: "Аспирантура", description: "Информация о послевузовском образовании.", url: "https://nis.gsu.by/?page_id=127", tag: "Обучение" },
  { title: "Студенческий совет", description: "Студенческое самоуправление университета.", url: "https://ivr.gsu.by/?q=studsovet", tag: "Самоуправление" },
  { title: "Молодёжные инициативы", description: "Информация о молодёжных инициативах и студенческом активе.", url: "https://ivr.gsu.by/omiss", tag: "Студенческая жизнь" },
  { title: "Спортивный клуб", description: "Спортивная жизнь и деятельность спортивного клуба ГГУ.", url: "https://ivr.gsu.by/?q=sport-club", tag: "Спорт" },
  { title: "Профсоюз студентов", description: "Профсоюзный комитет студентов.", url: "https://profkomstud.gsu.by/", tag: "Поддержка студентов" },
  { title: "Психологические консультации", description: "Информация о консультациях психолога для обучающихся.", url: "https://ivr.gsu.by/content/konsultacii-psihologa", tag: "Поддержка" }
];

// Справочники для преподавателей и сотрудников университета.
export const STAFF_RESOURCES = [
  { title: "Персональные страницы сотрудников", description: "Персональные страницы преподавателей и сотрудников.", url: "https://gsu.by/ru/personal-pages", tag: "Сотрудникам" },
  { title: "Телефонный справочник ГГУ", description: "Контакты подразделений и сотрудников университета.", url: "https://gsu.by/ru/phonebook", tag: "Контакты" },
  { title: "Структура управления", description: "Органы управления и структура университета.", url: "https://gsu.by/ru/management-structure", tag: "Администрация" },
  { title: "Учебно-методический отдел", description: "Организация и методическое сопровождение учебного процесса.", url: "https://gsu.by/ru/curriculum-and-instruction-department", tag: "Учебный процесс" },
  { title: "Отдел кадров", description: "Кадровые вопросы и информация для работников университета.", url: "https://gsu.by/ru/personnel-department", tag: "Кадры" },
  { title: "Бухгалтерия", description: "Информация бухгалтерии университета.", url: "https://gsu.by/ru/accounting-office", tag: "Финансы" },
  { title: "Планово-экономический отдел", description: "Планово-экономические вопросы университета.", url: "https://gsu.by/ru/planning-and-economic-department", tag: "Экономика" },
  { title: "Охрана труда", description: "Требования и организационные материалы по охране труда.", url: "https://gsu.by/ru/labour-protection-office", tag: "Безопасность" },
  { title: "Центр информационных технологий", description: "ИТ-поддержка и информационные технологии университета.", url: "https://gsu.by/ru/information_technology_center", tag: "ИТ" },
  { title: "Канцелярия / документационное обеспечение", description: "Документационное обеспечение и регистрация документов.", url: "https://gsu.by/ru/office-of-the-registrar", tag: "Документы" },
  { title: "Система видеоконференций", description: "Университетский сервис видеоконференций.", url: "https://bigbluebutton.gsu.by/", tag: "Связь" }
];

// Другие подтверждённые университетские институты, центры и службы.
export const UNIVERSITY_UNITS = [
  { title: "Институт Конфуция при ГГУ", description: "Институт и международные образовательные проекты.", url: "https://confucius.gsu.by/", category: "Институт" },
  { title: "Институт повышения квалификации и переподготовки", description: "Дополнительное профессиональное образование.", url: "https://gsu.by/ru/institute-of-continuing-education", category: "Институт" },
  { title: "Кабинет русской лингвокультуры", description: "Университетская образовательная и культурная площадка.", url: "https://gsu.by/ru/taxonomy/term/397", category: "Кабинет" },
  { title: "Центр инженерного образования, охраны труда и промышленной безопасности", description: "Инженерное образование и вопросы безопасности.", url: "https://centr-ot.gsu.by/", category: "Центр" },
  { title: "Научно-исследовательский физико-химический институт", description: "Научно-исследовательская структура университета.", url: "https://nis.gsu.by/?page_id=379", category: "Институт" },
  { title: "Отдел идеологической и воспитательной работы", description: "Информация о воспитательной и общественной деятельности.", url: "https://ivr.gsu.by/?q=uvrm", category: "Отдел" },
  { title: "Приёмная комиссия", description: "Поступление, специальности и информация для абитуриентов.", url: "https://abiturient.gsu.by/", category: "Абитуриентам" },
  { title: "Отдел молодёжных инициатив и студенческого самоуправления", description: "Студенческие инициативы и формы самоуправления.", url: "https://ivr.gsu.by/omiss", category: "Студенческая жизнь" },
  { title: "Спортивный клуб ГГУ", description: "Университетская спортивная организация.", url: "https://ivr.gsu.by/?q=sport-club", category: "Спорт" },
  { title: "Профсоюзный комитет студентов", description: "Общественная организация студентов университета.", url: "https://profkomstud.gsu.by/", category: "Общественная организация" }
];

// Время пар опубликовано на странице учебного процесса экономического факультета.
// Интервалы используются как подсказка в форме; сверяйте локальные изменения конкретного факультета.
export const BELL_SCHEDULE = [
  [1, "09:00", "09:45–50", "10:35"], [2, "10:45", "11:30–35", "12:20"],
  [3, "12:40", "13:25–30", "14:15"], [4, "14:35", "15:20–25", "16:10"],
  [5, "16:30", "17:15–20", "18:05"], [6, "18:15", "19:00–05", "19:50"]
];

function externalCard(item, className = "resource-card") {
  const card = document.createElement("a");
  card.className = className; card.href = item.url; card.target = "_blank"; card.rel = "noopener noreferrer";
  const tag = document.createElement("span"); tag.className = "resource-tag"; tag.textContent = item.tag || item.category || "ГГУ";
  const title = document.createElement("strong"); title.textContent = item.title || item.name;
  const description = document.createElement("span"); description.className = "resource-description"; description.textContent = item.description || item.note || "Ресурс университета.";
  const arrow = document.createElement("span"); arrow.className = "resource-arrow"; arrow.textContent = "↗"; arrow.setAttribute("aria-hidden", "true");
  card.append(tag, title, description, arrow);
  return card;
}

// Карточки формируются через textContent, поэтому данные безопасно отображаются как обычный текст.
// Каталог факультетов и сервисов отображается прямо в этой вкладке; внешние сайты
// открываются в новой вкладке, чтобы не перегружать интерфейс расписания.
export function renderUniversityHub(data) {
  document.querySelectorAll("[data-telegram-link]").forEach(link => { link.href = UNIVERSITY_URLS.telegram; });
  const faculties = FACULTIES.map((faculty, index) => {
    const card = document.createElement("article"); card.className = "faculty-card";
    const top = document.createElement("div"); top.className = "faculty-card-top";
    const number = document.createElement("span"); number.className = "faculty-index"; number.textContent = String(index + 1).padStart(2, "0");
    const badges = document.createElement("div"); badges.className = "faculty-badges";
    faculty.modalities.forEach(name => { const badge = document.createElement("span"); badge.className = "modality-badge"; badge.textContent = name; badges.append(badge); });
    top.append(number, badges);
    const title = document.createElement("h3"); title.textContent = faculty.name;
    const note = document.createElement("p"); note.textContent = faculty.note;
    // Показываем, какие группы этого факультета уже есть в календаре FLAX GSU.
    const localUnit = (data?.units || []).find(unit => unit.id === faculty.id);
    const localGroups = localUnit?.groups || [];
    const localInfo = document.createElement("p"); localInfo.className = "faculty-local-info";
    localInfo.textContent = localGroups.length
      ? `В календаре FLAX GSU: ${localGroups.length} ${localGroups.length === 1 ? "группа" : localGroups.length >= 2 && localGroups.length <= 4 ? "группы" : "групп"}`
      : "Группы этого факультета пока не добавлены в календарь FLAX GSU.";
    const actions = document.createElement("div"); actions.className = "faculty-actions";
    const link = document.createElement("a"); link.className = "button button-primary button-small"; link.href = faculty.url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = "Страница факультета ↗";
    actions.append(link);
    if (faculty.partTimeUrl) {
      const partTime = document.createElement("a"); partTime.className = "button button-secondary button-small"; partTime.href = faculty.partTimeUrl; partTime.target = "_blank"; partTime.rel = "noopener noreferrer"; partTime.textContent = "Заочная форма ↗";
      actions.append(partTime);
    }
    const local = document.createElement("button"); local.className = "button button-quiet button-small"; local.type = "button"; local.dataset.useUnit = faculty.id; local.textContent = localGroups.length ? `Открыть группы (${localGroups.length})` : "Групп пока нет"; local.disabled = localGroups.length === 0;
    actions.append(local); card.append(top, title, note, localInfo, actions); return card;
  });
  document.querySelector("#facultiesGrid")?.replaceChildren(...faculties);
  document.querySelector("#studentResourcesGrid")?.replaceChildren(...STUDENT_RESOURCES.map(item => externalCard(item)));
  document.querySelector("#staffResourcesGrid")?.replaceChildren(...STAFF_RESOURCES.map(item => externalCard(item)));
  document.querySelector("#universityUnitsGrid")?.replaceChildren(...UNIVERSITY_UNITS.map(item => externalCard(item)));
  const bells = BELL_SCHEDULE.map(([number, start, middle, end]) => {
    const card = document.createElement("div"); card.className = "bell-card";
    const title = document.createElement("strong"); title.textContent = `${number}-я пара`;
    const time = document.createElement("span"); time.textContent = `${start} – ${middle} – ${end}`;
    card.append(title, time); return card;
  });
  document.querySelector("#bellScheduleGrid")?.replaceChildren(...bells.map(node => node.cloneNode(true)));
  document.querySelector("#bellQuickGrid")?.replaceChildren(...bells);
}
