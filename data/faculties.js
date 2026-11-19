/*
 * СПИСОК ФАКУЛЬТЕТОВ И УЧЕБНАЯ ИЕРАРХИЯ.
 * Порядок: факультет → группа → курс.
 *
 * Группы сортируются интерфейсом автоматически по русскому алфавиту.
 * ID группы должен совпадать с именем папки в data/schedule/<facultyId>/.
 * Для добавления курса укажите его номер в массиве courses и создайте course-N.js.
 */
export const FACULTIES = [
  { id: "biology", name: "Биологический факультет", groups: [] },
  { id: "geology-geography", name: "Геолого-географический факультет", groups: [] },
  { id: "history-intercultural-communications", name: "Факультет истории и межкультурных коммуникаций", groups: [] },
  { id: "foreign-languages", name: "Факультет иностранных языков", groups: [] },
  { id: "mathematics-programming-technologies", name: "Факультет математики и технологий программирования", groups: [] },
  { id: "psychology-pedagogy", name: "Факультет психологии и педагогики", groups: [] },
  {
    id: "physics-it",
    name: "Факультет физики и информационных технологий",
    groups: [
      { id: "as", name: "АС", courses: [1, 2, 3, 4] },
      { id: "kb", name: "КБ", courses: [1, 2, 3, 4] },
      { id: "ki", name: "КИ", courses: [1, 2, 3, 4] },
      { id: "kf", name: "КФ", courses: [1, 2, 3, 4] },
      { id: "pf", name: "ПФ", courses: [1, 2, 3, 4] },
      { id: "sb", name: "СБ", courses: [1, 2, 3, 4] },
      { id: "f", name: "Ф", courses: [1, 2, 3, 4] }
    ]
  },
  { id: "physical-education", name: "Факультет физической культуры", groups: [] },
  { id: "philology", name: "Филологический факультет", groups: [] },
  { id: "economics", name: "Экономический факультет", groups: [] },
  { id: "law", name: "Юридический факультет", groups: [] }
];
