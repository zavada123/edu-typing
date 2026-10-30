import { describe, expect, test } from "vitest"
import { createSession, expectedChar, isFinished, press, result, stop } from "./session.ts"

const typeAll = (text: string, chars: string, stepMs = 100) =>
  [...chars].reduce((s, c, i) => press(s, c, i * stepMs), createSession(text))

describe("press", () => {
  test("moves the cursor only after the right character", () => {
    const wrong = press(createSession("ао"), "в", 0)
    expect(wrong.position).toBe(0)
    expect(wrong.lastWrong).toBe(true)
    const right = press(wrong, "а", 50)
    expect(right.position).toBe(1)
    expect(right.lastWrong).toBe(false)
    expect(expectedChar(right)).toBe("о")
  })

  test("counts mistakes per expected character", () => {
    const s = typeAll("ао", "вваоо")
    expect(s.mistakes).toBe(2)
    expect(s.mistakesByChar).toEqual({ а: 2 })
  })

  test("does not mutate the previous state", () => {
    const start = createSession("а")
    press(start, "в", 0)
    expect(start.mistakes).toBe(0)
    expect(start.mistakesByChar).toEqual({})
  })

  test("finishes on the last correct character and ignores later presses", () => {
    const done = typeAll("ао", "ао")
    expect(isFinished(done)).toBe(true)
    expect(press(done, "x", 999)).toBe(done)
  })

  test("rejects an empty text", () => {
    expect(() => createSession("")).toThrow()
  })
})

describe("result", () => {
  test("is zero before the first press", () => {
    const r = result(createSession("ао"), 1000)
    expect(r).toMatchObject({ cpm: 0, wpm: 0, accuracy: 100, durationMs: 0 })
  })

  test("computes speed from the first to the last press", () => {
    // 11 correct presses, 100 ms apart: 1 second from first to last.
    const s = typeAll("аааааааааа ", "аааааааааа ")
    const r = result(s, 99_999)
    expect(r.durationMs).toBe(1000)
    expect(r.cpm).toBe(660)
    expect(r.wpm).toBe(132)
  })

  test("accuracy is the share of correct presses", () => {
    const r = result(typeAll("аааа", "авааа"), 1000)
    expect(r.mistakes).toBe(1)
    expect(r.accuracy).toBe(80)
  })
})

describe("stop", () => {
  test("ends a started run and keeps the typed part", () => {
    const s = stop(press(press(createSession("абв"), "а", 0), "б", 30_000), 60_000)
    expect(isFinished(s)).toBe(true)
    expect(result(s, 99_999)).toMatchObject({ cpm: 2, chars: 2, durationMs: 60_000 })
  })

  test("does nothing before the first press", () => {
    const s = createSession("абв")
    expect(stop(s, 1000)).toBe(s)
  })
})
