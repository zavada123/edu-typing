import { findKey, type LayoutId, LAYOUTS } from "./layouts.ts"
import { knownKeys, lessons, type Lesson, type Score } from "./lessons.ts"
import type { Result } from "./session.ts"

/** Best run of one lesson. */
export interface LessonBest {
  readonly stars: Score["stars"]
  readonly cpm: number
  readonly accuracy: number
}

/** How often a character was typed right and wrong, over all runs. */
export interface KeyStat {
  readonly hits: number
  readonly misses: number
}

/** Everything the student did, kept in the browser. Plain JSON: safe to store and read back. */
export interface Progress {
  readonly lessons: Readonly<Record<string, LessonBest>>
  readonly keys: Readonly<Record<string, KeyStat>>
  /** Best speed test, if any. */
  readonly bestTest?: TestRecord
  /** Best score per game id. */
  readonly games: Readonly<Record<string, number>>
}

export interface TestRecord {
  readonly cpm: number
  readonly accuracy: number
  readonly durationMs: number
  readonly layout: LayoutId
  /** ISO date of the run. */
  readonly date: string
}

export const emptyProgress: Progress = { lessons: {}, keys: {}, games: {} }

const countChars = (text: string): Record<string, number> => {
  const out: Record<string, number> = {}
  for (const c of text.toLowerCase()) if (c !== " ") out[c] = (out[c] ?? 0) + 1
  return out
}

/** Add the typed text and its mistakes to the key statistics. */
export const recordKeys = (p: Progress, typed: string, mistakesByChar: Readonly<Record<string, number>>): Progress => {
  const keys = { ...p.keys }
  for (const [c, n] of Object.entries(countChars(typed))) {
    const old = keys[c] ?? { hits: 0, misses: 0 }
    keys[c] = { ...old, hits: old.hits + n }
  }
  for (const [raw, n] of Object.entries(mistakesByChar)) {
    const c = raw.toLowerCase()
    if (c === " ") continue
    const old = keys[c] ?? { hits: 0, misses: 0 }
    keys[c] = { ...old, misses: old.misses + n }
  }
  return { ...p, keys }
}

/** Keep the best run of the lesson: more stars, then higher speed. */
export const recordLesson = (p: Progress, lesson: Lesson, r: Result, s: Score): Progress => {
  const old = p.lessons[lesson.id]
  const better = !old || s.stars > old.stars || (s.stars === old.stars && r.cpm > old.cpm)
  const withKeys = recordKeys(p, lesson.text.slice(0, r.chars), r.mistakesByChar)
  if (!better) return withKeys
  return { ...withKeys, lessons: { ...withKeys.lessons, [lesson.id]: { stars: s.stars, cpm: r.cpm, accuracy: r.accuracy } } }
}

/** Keep the higher test result; accuracy breaks a tie. */
export const recordTest = (p: Progress, t: TestRecord): Progress => {
  const old = p.bestTest
  const better = !old || t.cpm * t.accuracy > old.cpm * old.accuracy
  return better ? { ...p, bestTest: t } : p
}

export const recordGame = (p: Progress, gameId: string, points: number): Progress =>
  points > (p.games[gameId] ?? 0) ? { ...p, games: { ...p.games, [gameId]: points } } : p

/** A lesson opens when the lesson before it (same layout) is passed. The first lesson is always open. */
export const isUnlocked = (p: Progress, lessonId: string): boolean => {
  const index = lessons.findIndex((l) => l.id === lessonId)
  const lesson = lessons[index]
  if (!lesson) return false
  const before = lessons.slice(0, index).filter((l) => l.layout === lesson.layout)
  const previous = before[before.length - 1]
  return previous === undefined || (p.lessons[previous.id]?.stars ?? 0) > 0
}

/** The first open lesson of the layout that is not passed yet: where "Continue" leads. */
export const nextLesson = (p: Progress, layout: LayoutId): Lesson | undefined => {
  const own = lessons.filter((l) => l.layout === layout)
  return own.find((l) => (p.lessons[l.id]?.stars ?? 0) === 0 && isUnlocked(p, l.id)) ?? own[own.length - 1]
}

/** Characters from all passed lessons of the layout, plus the lesson in progress. */
export const learnedKeys = (p: Progress, layout: LayoutId): ReadonlySet<string> => {
  const current = nextLesson(p, layout)
  return current ? knownKeys(current.id) : new Set()
}

const MIN_TRIES = 5

/** Share of wrong presses, 0–1, for characters typed at least a few times. */
export const errorRates = (p: Progress): ReadonlyMap<string, number> => {
  const out = new Map<string, number>()
  for (const [c, s] of Object.entries(p.keys)) {
    const tries = s.hits + s.misses
    if (tries >= MIN_TRIES) out.set(c, s.misses / tries)
  }
  return out
}

/** Characters with the most mistakes first; only real problems (more than 3% wrong). */
export const weakKeys = (p: Progress, limit: number): readonly string[] =>
  [...errorRates(p)]
    .filter(([, rate]) => rate > 0.03)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([c]) => c)

/** Error rate by physical key code, for the heat map on the keyboard. */
export const heatByCode = (p: Progress, layout: LayoutId): ReadonlyMap<string, number> => {
  const out = new Map<string, number>()
  for (const [c, rate] of errorRates(p)) {
    const k = findKey(LAYOUTS[layout], c)
    if (k) out.set(k.key.code, Math.max(rate, out.get(k.key.code) ?? 0))
  }
  return out
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)

/** Read stored JSON back; anything broken gives an empty progress instead of a crash. */
export const parseProgress = (json: string | null): Progress => {
  if (!json) return emptyProgress
  try {
    const v: unknown = JSON.parse(json)
    if (!isRecord(v) || !isRecord(v.lessons) || !isRecord(v.keys)) return emptyProgress
    const games = isRecord(v.games) ? v.games : {}
    const base = {
      lessons: v.lessons as Progress["lessons"],
      keys: v.keys as Progress["keys"],
      games: games as Progress["games"]
    }
    return isRecord(v.bestTest) ? { ...base, bestTest: v.bestTest as unknown as TestRecord } : base
  } catch {
    return emptyProgress
  }
}
