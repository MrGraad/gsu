/*
 * ДОСТУПНОСТЬ РАЗДЕЛОВ САЙТА.
 *
 * false — пункт меню отображается серым и не открывается.
 * true  — пункт становится активным.
 *
 * Чтобы открыть преподавателей, поменяйте teachersEnabled на true.
 * Объявления можно будет включить таким же способом, когда раздел будет готов.
 */
export const FEATURES = Object.freeze({
  teachersEnabled: false,
  announcementsEnabled: false
});
