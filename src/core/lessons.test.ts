import { describe, expect, test } from "vitest"
import { score } from "./lessons.ts"
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
