const Storage = {
  KEYS: {
    CATEGORY: 'uniflow_selected_category',
    GROUP: 'uniflow_selected_group',
    THEME: 'uniflow_theme',
    NOTES: 'uniflow_notes'
  },

  saveCategory(category) {
    localStorage.setItem(this.KEYS.CATEGORY, category);
  },

  getCategory(defaultCategory = 'students') {
    return localStorage.getItem(this.KEYS.CATEGORY) || defaultCategory;
  },

  saveGroup(group) {
    localStorage.setItem(this.KEYS.GROUP, group);
  },

  getGroup(defaultGroup = 'GROUP_1') {
    return localStorage.getItem(this.KEYS.GROUP) || defaultGroup;
  },

  saveTheme(theme) {
    localStorage.setItem(this.KEYS.THEME, theme);
  },

  getTheme() {
    return localStorage.getItem(this.KEYS.THEME) || 'light';
  },

  getNotes() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.NOTES)) || {};
    } catch {
      return {};
    }
  },

  saveNote(lessonKey, text) {
    const notes = this.getNotes();
    notes[lessonKey] = text;
    localStorage.setItem(this.KEYS.NOTES, JSON.stringify(notes));
  }
};