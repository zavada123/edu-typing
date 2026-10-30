import type { LayoutId } from "./layouts.ts"
import type { Random } from "./random.ts"

export type CertificateLevel = "bronze" | "silver" | "gold" | "platinum"

export interface LevelRule {
  readonly level: CertificateLevel
  readonly title: string
  readonly minCpm: number
  readonly minAccuracy: number
}

/**
 * Levels for school students, in characters per minute. Lower than adult norms
 * (Ratatype silver is 40 wpm ≈ 200 cpm): a 5th grader with 60 cpm is a good start.
 * Highest first.
 */
export const LEVELS: readonly LevelRule[] = [
  { level: "platinum", title: "Платиновий", minCpm: 220, minAccuracy: 98 },
  { level: "gold", title: "Золотий", minCpm: 150, minAccuracy: 96 },
  { level: "silver", title: "Срібний", minCpm: 100, minAccuracy: 94 },
  { level: "bronze", title: "Бронзовий", minCpm: 60, minAccuracy: 90 }
]

/** Allowed test durations. A run shorter than one minute does not give a certificate. */
export const TEST_DURATIONS_MS: readonly number[] = [60_000, 180_000]

/** The highest level the result reaches, or undefined when it reaches none. */
export const certificateLevel = (cpm: number, accuracy: number): LevelRule | undefined =>
  LEVELS.find((l) => cpm >= l.minCpm && accuracy >= l.minAccuracy)

/** What the next level needs: shown after a test to motivate one more try. */
export const nextLevel = (cpm: number, accuracy: number): LevelRule | undefined => {
  const current = certificateLevel(cpm, accuracy)
  const index = current ? LEVELS.indexOf(current) : LEVELS.length
  return LEVELS[index - 1]
}

export interface Certificate {
  readonly name: string
  readonly level: LevelRule
  readonly cpm: number
  readonly wpm: number
  readonly accuracy: number
  readonly durationMs: number
  readonly layout: LayoutId
  readonly date: string
  /** Number printed on the certificate, e.g. "ET-26-7KQ4M2". For reference only: nothing checks it. */
  readonly number: string
}

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
const NAME_MAX = 60

/** Clean the student name: trim, collapse spaces, limit the length. */
export const cleanName = (name: string): string => name.replace(/\s+/g, " ").trim().slice(0, NAME_MAX)

export const certificateNumber = (date: Date, random: Random): string => {
  const code = Array.from({ length: 6 }, () => ALPHABET[Math.floor(random() * ALPHABET.length)]).join("")
  return `ET-${String(date.getFullYear()).slice(2)}-${code}`
}
