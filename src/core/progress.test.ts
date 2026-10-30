import { describe, expect, test } from "vitest"
import { certificateLevel, cleanName, certificateNumber, nextLevel } from "./certificate.ts"
import { practiceText, testText } from "./generate.ts"
import { knownKeys, lessons } from "./lessons.ts"
import {
  emptyProgress,
  heatByCode,
  isUnlocked,
  nextLesson,
  parseProgress,
  recordLesson,
  recordTest,
  weakKeys
} from "./progress.ts"
import { seededRandom } from "./random.ts"
import type { Result } from "./session.ts"

const run = (cpm: number, accuracy: number, chars: number, mistakesByChar: Record<string, number> = {}): Result => ({
  cpm,
  wpm: cpm / 5,
  accuracy,
  mistakes: 0,
  mistakesByChar,
  chars,
  durationMs: 1000
})

const first = lessons[0]
const second = lessons[1]

describe("progress", () => {
  test("the next lesson opens after the previous one is passed", () => {
    if (!first || !second) throw new Error("no lessons")
    expect(isUnlocked(emptyProgress, first.id)).toBe(true)
    expect(isUnlocked(emptyProgress, second.id)).toBe(false)
    const p = recordLesson(emptyProgress, first, run(50, 95, first.text.length), { passed: true, stars: 1 })
    expect(isUnlocked(p, second.id)).toBe(true)
    expect(nextLesson(p, "uk")?.id).toBe(second.id)
  })

  test("the first English lesson is open from the start", () => {
    expect(isUnlocked(emptyProgress, "en-home-1")).toBe(true)
  })

  test("keeps the best run only", () => {
    if (!first) throw new Error("no lessons")
    const good = recordLesson(emptyProgress, first, run(80, 99, 10), { passed: true, stars: 3 })
    const worse = recordLesson(good, first, run(90, 91, 10), { passed: true, stars: 1 })
    expect(worse.lessons[first.id]).toEqual({ stars: 3, cpm: 80, accuracy: 99 })
  })

  test("finds weak keys and paints them on the keyboard", () => {
    if (!first) throw new Error("no lessons")
    const p = recordLesson(emptyProgress, first, run(50, 90, first.text.length, { "о": 6 }), { passed: true, stars: 1 })
    expect(weakKeys(p, 3)[0]).toBe("о")
    expect(heatByCode(p, "uk").get("KeyJ")).toBeGreaterThan(0.2)
  })

  test("keeps the better test", () => {
    const t = { cpm: 120, accuracy: 96, durationMs: 60_000, layout: "uk" as const, date: "2026-10-30" }
    const p = recordTest(recordTest(emptyProgress, t), { ...t, cpm: 90 })
    expect(p.bestTest?.cpm).toBe(120)
  })

  test("reads stored progress back and survives broken JSON", () => {
    const p = { ...emptyProgress, games: { letterfall: 50 } }
    expect(parseProgress(JSON.stringify(p))).toEqual(p)
    expect(parseProgress("{oops")).toEqual(emptyProgress)
    expect(parseProgress(null)).toEqual(emptyProgress)
  })
})

describe("generated texts", () => {
  test("practice uses only known keys and prefers weak ones", () => {
    const known = knownKeys("uk-top-words")
    const text = practiceText("uk", known, ["ш"], seededRandom(7), 30)
    expect([...text].every((c) => known.has(c))).toBe(true)
    const withWeak = text.split(" ").filter((w) => w.includes("ш")).length
    expect(withWeak).toBeGreaterThan(10)
  })

  test("practice falls back to letter drills for the first lessons", () => {
    const known = knownKeys("uk-home-1")
    const text = practiceText("uk", known, [], seededRandom(1), 5)
    expect(text.split(" ")).toHaveLength(5)
    expect([...text].every((c) => known.has(c))).toBe(true)
  })

  test("test text is long enough", () => {
    expect(testText("uk", seededRandom(1), 1500).length).toBeGreaterThanOrEqual(1500)
  })
})

describe("certificate", () => {
  test("picks the highest level the result reaches", () => {
    expect(certificateLevel(59, 99)).toBeUndefined()
    expect(certificateLevel(60, 90)?.level).toBe("bronze")
    expect(certificateLevel(160, 95)?.level).toBe("silver")
    expect(certificateLevel(160, 97)?.level).toBe("gold")
    expect(certificateLevel(300, 99)?.level).toBe("platinum")
  })

  test("names the next level to reach", () => {
    expect(nextLevel(30, 80)?.level).toBe("bronze")
    expect(nextLevel(160, 97)?.level).toBe("platinum")
    expect(nextLevel(300, 99)).toBeUndefined()
  })

  test("cleans the name and makes a readable number", () => {
    expect(cleanName("  Олена   Петренко \n")).toBe("Олена Петренко")
    expect(certificateNumber(new Date(2026, 9, 30), seededRandom(1))).toMatch(/^ET-26-[2-9A-Z]{6}$/)
  })
})
