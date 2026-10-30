import type { LayoutId } from "./layouts.ts"
import type { Goal, Lesson } from "./lessons.ts"
import { pick, type Random, shuffle } from "./random.ts"
import { TEST_SENTENCES, wordsWithin } from "./words.ts"

const PRACTICE_GOAL: Goal = { minCpm: 60, minAccuracy: 92 }
const MIN_WORDS = 6

/** A drill of letter pairs when the word bank has too few words for these keys. */
const drill = (letters: readonly string[], count: number, random: Random): string[] =>
  Array.from({ length: count }, () => {
    const a = pick(letters, random) ?? ""
    const b = pick(letters, random) ?? ""
    return `${a}${b}${a}`
  })

/**
 * A fresh exercise from the keys the student knows. Weak keys come up three times more often,
 * like adaptive trainers do: practice goes where the mistakes are.
 */
export const practiceText = (
  layout: LayoutId,
  known: ReadonlySet<string>,
  weak: readonly string[],
  random: Random,
  wordCount: number
): string => {
  const pool = wordsWithin(layout, known).filter((w) => w.length > 1 && w.toLowerCase() === w)
  const letters = [...known].filter((c) => c.toUpperCase() !== c.toLowerCase())
  if (pool.length < MIN_WORDS) return drill(letters, wordCount, random).join(" ")
  const withWeak = pool.filter((w) => weak.some((c) => w.includes(c)))
  const words = Array.from({ length: wordCount }, () => {
    const useWeak = withWeak.length > 0 && random() < 0.75
    return pick(useWeak ? withWeak : pool, random) ?? ""
  })
  return words.join(" ")
}

export const practiceLesson = (layout: LayoutId, known: ReadonlySet<string>, weak: readonly string[], random: Random): Lesson => ({
  id: `${layout}-practice`,
  layout,
  title: weak.length > 0 ? `Тренування складних клавіш: ${weak.join(" ").toUpperCase()}` : "Вільне тренування",
  hint:
    weak.length > 0
      ? "Тут більше слів із клавішами, на яких ти найчастіше помиляєшся."
      : "Слова лише з тих літер, які ти вже вивчив.",
  text: practiceText(layout, known, weak, random, 18),
  goal: PRACTICE_GOAL,
  newKeys: ""
})

/** Text for a timed test: sentences in random order, long enough that nobody runs out of text. */
export const testText = (layout: LayoutId, random: Random, minChars: number): string => {
  const out: string[] = []
  let length = 0
  while (length < minChars) {
    for (const s of shuffle(TEST_SENTENCES[layout], random)) {
      out.push(s)
      length += s.length + 1
      if (length >= minChars) break
    }
  }
  return out.join(" ")
}
