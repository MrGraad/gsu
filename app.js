const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

// Автоматический расчёт текущей недели (1-я неделя = 'bottom', 2-я = 'top')
function getCurrentWeekType() {
  const start = new Date(SEMESTER_START);
  const now = new Date();
  const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;
  return weekNumber % 2 === 1 ? 'bottom' : 'top';
}

// Проверяем, что сохранённые раздел и группа реально существуют в data.js
const initialCategory = scheduleData[Storage.getCategory()] ? Storage.getCategory() : menuCategories[0].id;
const availableItems = Object.keys(scheduleData[initialCategory] || {});
const savedGroup = Storage.getGroup();
const initialGroup = availableItems.includes(savedGroup) ? savedGroup : availableItems[0];

// Текущее состояние интерфейса
let state = {
  view: 'home',
  category: initialCategory,
  group: initialGroup,
  day: 1,
  week: getCurrentWeekType(),
  search: '',
  isMenuOpen: false
};

// Применение сохранённой темы
function initTheme() {
  const savedTheme = Storage.getTheme();
  const htmlEl = document.documentElement;
  if (savedTheme === 'dark') {
    htmlEl.classList.remove('light');
    htmlEl.classList.add('dark');
  } else {
    htmlEl.classList.remove('dark');
    htmlEl.classList.add('light');
  }
}

function toggleTheme() {
  const htmlEl = document.documentElement;
  const isDark = htmlEl.classList.toggle('dark');
  htmlEl.classList.toggle('light', !isDark);
  Storage.saveTheme(isDark ? 'dark' : 'light');
}

function openView(viewName) {
  state.view = viewName;
  document.getElementById('homeView').classList.toggle('hidden', viewName !== 'home');
  document.getElementById('scheduleView').classList.toggle('hidden', viewName !== 'schedule');
  window.scrollTo(0, 0);
  render();
}

function renderHomeTiles() {
  const grid = document.getElementById('homeTilesGrid');
  grid.innerHTML = homeTiles.map(tile => {
    if (tile.active) {
      return `
        <button onclick="handleAction('${tile.action}')"
                class="aspect-square rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 hover:opacity-90 active:scale-95 p-4 flex flex-col items-center justify-center gap-3 shadow-sm transition">
          ${tile.icon ? `<i data-lucide="${tile.icon}" class="w-8 h-8 stroke-[1.75]"></i>` : ''}
          <span class="font-bold text-base sm:text-lg text-center">${tile.title}</span>
        </button>
      `;
    }
    return `
      <button onclick="handleAction('${tile.action}')"
              class="aspect-square rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 active:scale-95 p-4 flex flex-col items-center justify-center gap-2 transition">
        <span class="px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm">
          ${tile.title}
        </span>
      </button>
    `;
  }).join('');
}

function renderBottomNav() {
  const nav = document.getElementById('bottomNavBar');
  nav.innerHTML = bottomNavItems.map(item => `
    <button onclick="handleAction('${item.action}', '${item.url || ''}')"
            class="py-3 px-1 flex flex-col items-center justify-center gap-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition">
      ${item.icon ? `<i data-lucide="${item.icon}" class="w-5 h-5"></i>` : ''}
      <span class="text-[11px] font-medium truncate max-w-full">${item.title}</span>
    </button>
  `).join('');
}

function handleAction(action, url = '') {
  if (action === 'schedule') {
    openView('schedule');
  } else if (action === 'telegram') {
    // Находим элемент telegram в bottomNavItems, чтобы забрать список каналов
    const tgItem = bottomNavItems.find(item => item.id === 'telegram');
    const channels = tgItem?.channels || [];

    const buttonsHtml = channels.map(ch => `
      <a href="${ch.url}" target="_blank" rel="noopener noreferrer"
         class="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
        <div>
          <div class="font-semibold text-slate-900 dark:text-slate-100">${ch.name}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400">${ch.desc}</div>
        </div>
        <i data-lucide="external-link" class="w-4 h-4 text-slate-400"></i>
      </a>
    `).join('');

    openModal('Наши Telegram-каналы', `<div class="space-y-2">${buttonsHtml}</div>`);
  } else if (action === 'link' && url) {
    if (tg?.openTelegramLink && url.includes('t.me')) {
      tg.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  } else if (action === 'settings') {
    openModal('Настройки', `
      <div class="flex items-center justify-between">
        <span>Тёмная тема</span>
        <button onclick="toggleTheme()" class="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium">
          Переключить
        </button>
      </div>
    `);
  } else {
    openModal('Раздел в разработке', 'Эта кнопка пока не активна.');
  }
}

function openModal(title, htmlContent) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = htmlContent;
  document.getElementById('infoModal').classList.remove('hidden');
  lucide.createIcons();
}

function closeModal() {
  document.getElementById('infoModal').classList.add('hidden');
}

// Отрисовка выпадающего меню (3 полоски) и бейджика текущего раздела
function renderMenu() {
  const dropdown = document.getElementById('menuDropdown');
  const badge = document.getElementById('currentRoleBadge');

  const activeCategory = menuCategories.find(c => c.id === state.category);
  if (badge && activeCategory) {
    badge.textContent = activeCategory.name;
  }

  dropdown.innerHTML = menuCategories.map(cat => {
    const isActive = cat.id === state.category;
    return `
      <button onclick="changeCategory('${cat.id}')"
              class="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left transition
              ${isActive 
                ? 'bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}">
        ${cat.icon ? `<i data-lucide="${cat.icon}" class="w-4 h-4 shrink-0"></i>` : ''}
        <span>${cat.name}</span>
      </button>
    `;
  }).join('');

  dropdown.classList.toggle('hidden', !state.isMenuOpen);
}

// Автоматическое заполнение выпадающего списка <select> под выбранный раздел
function renderGroupSelect() {
  const select = document.getElementById('groupSelect');
  const categoryData = scheduleData[state.category] || {};
  const keys = Object.keys(categoryData);

  select.innerHTML = keys.map(key => `
    <option value="${key}">${categoryData[key].title || key}</option>
  `).join('');

  select.value = state.group;
}

// Отрисовка кнопок «Над / Под чертой»
function renderWeekToggle() {
  const topBtn = document.getElementById('weekTopBtn');
  const bottomBtn = document.getElementById('weekBottomBtn');

  const activeClasses = ['bg-slate-900', 'text-white', 'dark:bg-white', 'dark:text-slate-950'];
  const inactiveClasses = ['text-slate-600', 'dark:text-slate-400'];

  if (state.week === 'top') {
    topBtn.classList.add(...activeClasses);
    topBtn.classList.remove(...inactiveClasses);
    bottomBtn.classList.remove(...activeClasses);
    bottomBtn.classList.add(...inactiveClasses);
  } else {
    bottomBtn.classList.add(...activeClasses);
    bottomBtn.classList.remove(...inactiveClasses);
    topBtn.classList.remove(...activeClasses);
    topBtn.classList.add(...inactiveClasses);
  }
}

// Отрисовка кнопок дней недели
function renderTabs() {
  const container = document.getElementById('dayTabs');
  container.innerHTML = days.map(d => `
    <button onclick="changeDay(${d.id})" 
            class="px-4 py-2 rounded-lg text-sm font-medium border transition
            ${state.day === d.id 
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-transparent' 
              : 'border-slate-300 dark:border-slate-700'}">
      ${d.name}
    </button>
  `).join('');
}

// Отрисовка карточек расписания
function renderCards() {
  const container = document.getElementById('scheduleContainer');
  const lessons = scheduleData[state.category]?.[state.group]?.days?.[state.day] || [];

  const byWeek = lessons.filter(item => !item.week || item.week === 'all' || item.week === state.week);

  const filtered = byWeek.filter(item => 
    item.subject.toLowerCase().includes(state.search.toLowerCase()) ||
    item.teacher.toLowerCase().includes(state.search.toLowerCase()) ||
    item.room.toLowerCase().includes(state.search.toLowerCase())
  );

  if (filtered.length === 0) {
    container.innerHTML = `<p class="text-sm text-slate-500 col-span-full">Занятий нет.</p>`;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const weekBadge = item.week === 'top' 
      ? '<span class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">Над чертой</span>'
      : item.week === 'bottom'
      ? '<span class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">Под чертой</span>'
      : '';

    return `
      <article class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
        <div class="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>${item.time}</span>
          ${weekBadge}
        </div>
        <h3 class="font-bold text-base">${item.subject}</h3>
        <div class="text-xs text-slate-500">${item.room} · ${item.teacher}</div>
      </article>
    `;
  }).join('');
}

// Переключение раздела из бургер-меню
function changeCategory(categoryId) {
  state.category = categoryId;
  state.isMenuOpen = false;
  Storage.saveCategory(categoryId);

  const firstKey = Object.keys(scheduleData[categoryId] || {})[0] || '';
  state.group = firstKey;
  Storage.saveGroup(firstKey);

  render();
}

function changeDay(dayId) {
  state.day = dayId;
  render();
}

function changeWeek(weekType) {
  state.week = weekType;
  render();
}

function render() {
  renderHomeTiles();
  renderBottomNav();
  renderMenu();
  renderGroupSelect();
  renderWeekToggle();
  renderTabs();
  renderCards();
  lucide.createIcons();
}

// Слушатели событий
document.getElementById('groupSelect').addEventListener('change', (e) => {
  state.group = e.target.value;
  Storage.saveGroup(state.group);
  renderCards();
});

document.getElementById('searchInput').addEventListener('input', (e) => {
  state.search = e.target.value;
  renderCards();
});

document.getElementById('menuToggle').addEventListener('click', (e) => {
  e.stopPropagation();
  state.isMenuOpen = !state.isMenuOpen;
  renderMenu();
  lucide.createIcons();
});

document.addEventListener('click', (e) => {
  const wrapper = document.getElementById('menuWrapper');
  if (state.isMenuOpen && wrapper && !wrapper.contains(e.target)) {
    state.isMenuOpen = false;
    renderMenu();
  }
});

// Запуск
initTheme();
render();