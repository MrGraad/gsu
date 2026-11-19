/*
 * ШАБЛОН РАСПИСАНИЯ КУРСА.
 * После копирования папки group-template переименуйте её в ID реальной группы
 * и добавьте эту группу в data/faculties.js.
 *
 * Формат одного занятия:
 * {
 *   time: '10:45 – 12:20',
 *   subject: 'Математический анализ (Лекция)',
 *   room: 'Ауд. 6-28',
 *   teacher: 'Немилостива В.А.',
 *   week: 'top' // 'top' — над чертой; 'bottom' — под чертой; 'both' — каждую неделю
 * }
 *
 * Добавляйте занятия в массив нужного дня. Не удаляйте export const SCHEDULE.
 */
export const SCHEDULE = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: []
};
