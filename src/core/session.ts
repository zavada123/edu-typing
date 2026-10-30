/**
 * One run through an exercise text. Works like Ratatype: the cursor moves only
 * after the right character, every wrong press counts as a mistake.
 * All functions are pure and return a new state.
 */
export interface Session {
  readonly text: string
  /** How many characters are typed correctly; the next expected one is text[position]. */
  readonly position: number
  readonly mistakes: number
  /** Mistakes per expected character, e.g. { "а": 2 }. */
  readonly mistakesByChar: Readonly<Record<string, number>>
  /** The last press was wrong: the UI shows the current character in red. */
  readonly lastWrong: boolean
  readonly startedAt?: number
  readonly finishedAt?: number
}

export interface Result {
  /** Correct characters per minute. */
  readonly cpm: number
  /** Words per minute, one word = 5 characters. */
  readonly wpm: number
  /** Share of correct presses, 0–100. */
  readonly accuracy: number
  readonly mistakes: number
  readonly mistakesByChar: Readonly<Record<string, number>>
  readonly chars: number
  readonly durationMs: number
}

const MS_PER_MINUTE = 60_000
const CHARS_PER_WORD = 5

export const createSession = (text: string): Session => {
  if (text.length === 0) throw new Error("Текст вправи порожній")
  return { text, position: 0, mistakes: 0, mistakesByChar: {}, lastWrong: false }
}

export const expectedChar = (s: Session): string | undefined => s.text[s.position]

export const isFinished = (s: Session): boolean => s.finishedAt !== undefined

/** Apply one typed character. The clock starts at the first press. */
export const press = (s: Session, char: string, now: number): Session => {
  const expected = expectedChar(s)
  if (expected === undefined || isFinished(s)) return s
  const startedAt = s.startedAt ?? now
  if (char !== expected) {
    return {
      ...s,
      startedAt,
      mistakes: s.mistakes + 1,
      mistakesByChar: { ...s.mistakesByChar, [expected]: (s.mistakesByChar[expected] ?? 0) + 1 },
      lastWrong: true
    }
  }
  const position = s.position + 1
  const done = position === s.text.length
  return done
    ? { ...s, startedAt, position, lastWrong: false, finishedAt: now }
    : { ...s, startedAt, position, lastWrong: false }
}

const round1 = (n: number): number => Math.round(n * 10) / 10

/** Speed and accuracy so far; `now` is used while the run is not finished. */
export const result = (s: Session, now: number): Result => {
  const end = s.finishedAt ?? now
  const durationMs = s.startedAt === undefined ? 0 : Math.max(0, Math.round(end - s.startedAt))
  const minutes = durationMs / MS_PER_MINUTE
  const cpm = minutes > 0 ? Math.round(s.position / minutes) : 0
  const presses = s.position + s.mistakes
  return {
    cpm,
    wpm: round1(cpm / CHARS_PER_WORD),
    accuracy: presses > 0 ? round1((s.position / presses) * 100) : 100,
    mistakes: s.mistakes,
    mistakesByChar: s.mistakesByChar,
    chars: s.position,
    durationMs
  }
}

/** End the run early, e.g. when the time of a timed test is up. A run that has not started stays as it is. */
export const stop = (s: Session, now: number): Session =>
  s.startedAt === undefined || isFinished(s) ? s : { ...s, finishedAt: now, lastWrong: false }
