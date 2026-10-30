import { describe, expect, test } from "vitest"
import {
  lowestLetter,
  newBalloons,
  newLetterfall,
  pressBalloons,
  pressLetterfall,
  stepBalloons,
  stepLetterfall,
  type BalloonsState,
  type LetterfallState
} from "./games.ts"
import { seededRandom } from "./random.ts"

describe("letterfall", () => {
  test("spawns a letter at the top and moves it down", () => {
    const random = seededRandom(1)
    const s1 = stepLetterfall(newLetterfall(), 16, ["а"], random)
    expect(s1.letters).toHaveLength(1)
    expect(s1.letters[0]?.y).toBe(0)
    const s2 = stepLetterfall(s1, 1000, ["а"], random)
    expect(s2.letters[0]?.y).toBeCloseTo(0.1)
  })

  test("a landed letter costs a life; no lives ends the game", () => {
    const s: LetterfallState = { ...newLetterfall(), lives: 1, spawnInMs: 99_999, letters: [{ id: 1, char: "а", x: 0.5, y: 0.99 }] }
    const next = stepLetterfall(s, 1000, ["а"], seededRandom(1))
    expect(next.lives).toBe(0)
    expect(next.over).toBe(true)
  })

  test("a press catches the lowest matching letter and gives points", () => {
    const s: LetterfallState = {
      ...newLetterfall(),
      letters: [
        { id: 1, char: "а", x: 0.2, y: 0.3 },
        { id: 2, char: "а", x: 0.6, y: 0.7 },
        { id: 3, char: "о", x: 0.4, y: 0.9 }
      ]
    }
    expect(lowestLetter(s)?.id).toBe(3)
    const next = pressLetterfall(s, "а")
    expect(next.letters.map((l) => l.id)).toEqual([1, 3])
    expect(next.points).toBe(10)
    expect(next.combo).toBe(1)
  })

  test("a wrong press resets the combo", () => {
    const s: LetterfallState = { ...newLetterfall(), combo: 4 }
    expect(pressLetterfall(s, "ж")).toMatchObject({ combo: 0, misses: 1 })
  })

  test("the level grows every 10 caught letters", () => {
    const s: LetterfallState = { ...newLetterfall(), caught: 9, letters: [{ id: 1, char: "а", x: 0, y: 0 }] }
    expect(pressLetterfall(s, "а").level).toBe(2)
  })
})

describe("balloons", () => {
  const twoBalloons: BalloonsState = {
    ...newBalloons(),
    spawnInMs: 99_999,
    balloons: [
      { id: 1, word: "кіт", x: 0.2, y: 0.5, color: 0 },
      { id: 2, word: "сад", x: 0.6, y: 0.8, color: 1 }
    ]
  }

  test("the first letter picks the balloon, the full word pops it", () => {
    const s1 = pressBalloons(twoBalloons, "с")
    expect(s1).toMatchObject({ targetId: 2, typed: 1 })
    const s2 = pressBalloons(pressBalloons(s1, "а"), "д")
    expect(s2.balloons.map((b) => b.id)).toEqual([1])
    expect(s2).toMatchObject({ targetId: undefined, typed: 0, popped: 1, points: 3 })
  })

  test("a wrong letter is a mistake and keeps the typed part", () => {
    const s = pressBalloons(pressBalloons(twoBalloons, "к"), "о")
    expect(s).toMatchObject({ targetId: 1, typed: 1, mistakes: 1 })
  })

  test("an escaped balloon costs a life and drops the target", () => {
    const s: BalloonsState = { ...pressBalloons(twoBalloons, "к"), balloons: [{ id: 1, word: "кіт", x: 0.2, y: 0.01, color: 0 }] }
    const next = stepBalloons(s, 1000, ["сад"], seededRandom(2))
    expect(next.lives).toBe(4)
    expect(next.targetId).toBeUndefined()
  })

  test("new balloons never share the first letter with one in the air", () => {
    const s: BalloonsState = { ...newBalloons(), balloons: [{ id: 1, word: "кіт", x: 0.5, y: 0.5, color: 0 }] }
    const next = stepBalloons(s, 16, ["кит", "сад"], seededRandom(3))
    expect(next.balloons.map((b) => b.word)).toEqual(["кіт", "сад"])
  })
})
