import { describe, expect, test } from "vitest"
import { knownKeys, lessons, score, units } from "./lessons.ts"
import type { Result } from "./session.ts"

const run = (cpm: number, accuracy: number): Result => ({
  cpm,
  wpm: cpm / 5,
  accuracy,
  mistakes: 0,
  mistakesByChar: {},
  chars: 10,
  durationMs: 1000
})
const goal = { minCpm: 40, minAccuracy: 90 }

describe("score", () => {
  test("fails below the speed or accuracy goal", () => {
    expect(score(run(39, 100), goal)).toEqual({ passed: false, stars: 0 })
    expect(score(run(100, 89.9), goal)).toEqual({ passed: false, stars: 0 })
  })

  test("one star for meeting the goal, more for speed and accuracy", () => {
    expect(score(run(40, 90), goal).stars).toBe(1)
    expect(score(run(60, 90), goal).stars).toBe(2)
    expect(score(run(40, 98), goal).stars).toBe(2)
    expect(score(run(60, 99), goal).stars).toBe(3)
  })
})

describe("course", () => {
  test.each(lessons.map((l) => [l.id, l] as const))("%s uses only keys learned so far", (id, lesson) => {
    const known = knownKeys(id)
    const unknown = [...new Set(lesson.text.toLowerCase())].filter((c) => !known.has(c))
    expect(unknown).toEqual([])
  })

  test("every new key is introduced once per layout", () => {
    for (const layout of ["uk", "en"] as const) {
      const all = lessons.filter((l) => l.layout === layout).flatMap((l) => [...l.newKeys])
      expect(new Set(all).size).toBe(all.length)
    }
  })

  test("units hold every lesson in order", () => {
    expect(units.flatMap((u) => u.lessons)).toEqual(lessons)
    expect(units.every((u) => u.lessons.every((l) => l.layout === u.layout))).toBe(true)
  })

  test("the full Ukrainian course covers every letter of the layout", () => {
    const known = knownKeys("uk-texts-rare")
    for (const c of "абвгґдеєжзиіїйклмнопрстуфхцчшщьюя'") expect(known.has(c)).toBe(true)
  })
})
