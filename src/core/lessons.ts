import type { LayoutId } from "./layouts.ts"
import type { Result } from "./session.ts"

export interface Goal {
  /** Minimal speed, characters per minute. */
  readonly minCpm: number
  /** Minimal accuracy, percent. */
  readonly minAccuracy: number
}

export interface Lesson {
  readonly id: string
  readonly layout: LayoutId
  readonly title: string
  /** What to tell the student before the start. */
  readonly hint: string
  readonly text: string
  readonly goal: Goal
}

export interface Score {
  readonly passed: boolean
  /** 0–3: 1 for meeting the goal, +1 for 1.5× speed, +1 for 98% accuracy. */
  readonly stars: 0 | 1 | 2 | 3
}

const BONUS_SPEED = 1.5
const BONUS_ACCURACY = 98

/** Did the run meet the lesson goal, and how many stars it earns. */
export const score = (r: Result, goal: Goal): Score => {
  const passed = r.cpm >= goal.minCpm && r.accuracy >= goal.minAccuracy
  if (!passed) return { passed, stars: 0 }
  const fast = r.cpm >= goal.minCpm * BONUS_SPEED ? 1 : 0
  const accurate = r.accuracy >= BONUS_ACCURACY ? 1 : 0
  return { passed, stars: (1 + fast + accurate) as Score["stars"] }
}

const BEGINNER: Goal = { minCpm: 40, minAccuracy: 90 }
const HOME_ROW: Goal = { minCpm: 60, minAccuracy: 92 }

export const lessons: readonly Lesson[] = [
  {
    id: "uk-home-1",
    layout: "uk",
    title: "Основний ряд: А і О",
    hint: "Поклади вказівні пальці на клавіші А і О: на них є горбики. Великий палець — на пробілі.",
    text: "ааа ооо ааа ооо ао оа ао оа аоа оао аа оо ао оа",
    goal: BEGINNER
  },
  {
    id: "uk-home-2",
    layout: "uk",
    title: "Основний ряд: В і Л",
    hint: "Середні пальці лежать на В і Л. Після кожної літери повертай палець на місце.",
    text: "ввв ллл вл лв ава оло вал лав вола лава ало вал",
    goal: BEGINNER
  },
  {
    id: "uk-home-3",
    layout: "uk",
    title: "Основний ряд: І і Д",
    hint: "Безіменні пальці лежать на І і Д.",
    text: "ііі ддд ід ді від дід віл дало вода лід далі ліва",
    goal: BEGINNER
  },
  {
    id: "uk-home-4",
    layout: "uk",
    title: "Основний ряд: Ф і Ж",
    hint: "Мізинці лежать на Ф і Ж. Тепер усі вісім пальців на своїх місцях.",
    text: "ффф жжж фж жф жало вожді фал жвава ждала дожді",
    goal: BEGINNER
  },
  {
    id: "uk-home-words",
    layout: "uk",
    title: "Слова з основного ряду",
    hint: "Друкуй рівно, не поспішай. Точність важливіша за швидкість.",
    text: "вода діло лава жвава лід дідові відділ вола ждала ліва фал",
    goal: HOME_ROW
  },
  {
    id: "uk-home-caps",
    layout: "uk",
    title: "Великі літери",
    hint: "Shift натискай мізинцем іншої руки: для «О» — лівий Shift, для «В» — правий.",
    text: "Вода Лава Діло Ліда Віл Алла Ода Дід Вова Жало",
    goal: BEGINNER
  },
  {
    id: "en-home-1",
    layout: "en",
    title: "Home row: F and J",
    hint: "Поклади вказівні пальці на F і J: на них є горбики.",
    text: "fff jjj fj jf fjf jfj ff jj fj jf fjj jff",
    goal: BEGINNER
  },
  {
    id: "en-home-words",
    layout: "en",
    title: "Home row words",
    hint: "Усі вісім пальців на ASDF JKL;. Друкуй рівно.",
    text: "dad sad lad all fall ask flask salad alfalfa lads adds",
    goal: HOME_ROW
  }
]
