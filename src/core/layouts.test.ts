import { describe, expect, test } from "vitest"
import { EN, findKey, isWrongLayout, LAYOUTS, shiftSide, UK } from "./layouts.ts"
import { lessons } from "./lessons.ts"

describe("layouts", () => {
  test("both layouts have the same physical keys", () => {
    const codes = (l: typeof UK) => l.rows.flat().map((k) => k.code)
    expect(codes(UK)).toEqual(codes(EN))
    expect(codes(UK)).toHaveLength(48)
  })

  test("home row is ФІВА ОЛДЖ and ASDF JKL;", () => {
    const home = (l: typeof UK) => l.rows.flat().filter((k) => k.home).map((k) => k.base).join("")
    expect(home(UK)).toBe("фіваолдж")
    expect(home(EN)).toBe("asdfjkl;")
  })

  test("finds the key, finger and Shift for a character", () => {
    expect(findKey(UK, "а")).toMatchObject({ key: { code: "KeyF", finger: "leftIndex" }, shift: false })
    expect(findKey(UK, "Ж")).toMatchObject({ key: { code: "Semicolon", finger: "rightPinky" }, shift: true })
    expect(findKey(UK, "ґ")?.key.code).toBe("Backslash")
    expect(findKey(UK, "'")?.key.code).toBe("Backquote")
    expect(findKey(UK, " ")?.key.finger).toBe("thumb")
    expect(findKey(EN, "й")).toBeUndefined()
  })

  test("Shift is on the other hand", () => {
    expect(shiftSide("leftIndex")).toBe("ShiftRight")
    expect(shiftSide("rightPinky")).toBe("ShiftLeft")
  })

  test("detects the wrong system language", () => {
    expect(isWrongLayout("uk", "а", "f")).toBe(true)
    expect(isWrongLayout("uk", "а", "в")).toBe(false)
    expect(isWrongLayout("uk", " ", "f")).toBe(false)
    expect(isWrongLayout("en", "f", "а")).toBe(true)
  })
})

describe("lessons", () => {
  test("ids are unique", () => {
    const ids = lessons.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test.each(lessons.map((l) => [l.id, l] as const))("%s uses only keys of its layout", (_, lesson) => {
    const missing = [...lesson.text].filter((c) => !findKey(LAYOUTS[lesson.layout], c))
    expect(missing).toEqual([])
  })

  test.each(lessons.filter((l) => l.id.includes("home")).map((l) => [l.id, l] as const))(
    "%s stays on the home row",
    (_, lesson) => {
      const layout = LAYOUTS[lesson.layout]
      const off = [...lesson.text].filter((c) => {
        const k = findKey(layout, c)?.key
        return k !== undefined && !k.home && k.code !== "Space"
      })
      expect(off).toEqual([])
    }
  )
})
