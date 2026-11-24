import { describe, expect, it } from "vitest"
import { lessons } from "./lessons.ts"
import { formatStudioPlace, parseStudioPlace, type StudioPlace } from "./place.ts"

const firstLesson = lessons[0]?.id ?? ""
const lastLesson = lessons[lessons.length - 1]?.id ?? ""

describe("parseStudioPlace", () => {
  it("reads every kind of place, with or without ?", () => {
    expect(parseStudioPlace("?tab=course")).toEqual({ tab: "course" })
    expect(parseStudioPlace("tab=test")).toEqual({ tab: "test" })
    expect(parseStudioPlace(`?lesson=${firstLesson}`)).toEqual({ tab: "lesson", lesson: firstLesson })
    expect(parseStudioPlace("?x=1&game=kingdom")).toEqual({ tab: "games", game: "kingdom" })
    expect(parseStudioPlace("?tab=hotkeys")).toEqual({ tab: "hotkeys" })
    expect(parseStudioPlace("?hotkeys=hk-undo")).toEqual({ tab: "hotkeys", lesson: "hk-undo" })
  })

  it("gives undefined for no place, unknown lessons, games and tabs", () => {
    expect(parseStudioPlace("")).toBeUndefined()
    expect(parseStudioPlace("?x=1")).toBeUndefined()
    expect(parseStudioPlace("?lesson=no-such-lesson")).toBeUndefined()
    expect(parseStudioPlace("?game=chess")).toBeUndefined()
    expect(parseStudioPlace("?hotkeys=hk-nothing")).toBeUndefined()
    expect(parseStudioPlace("?tab=other")).toBeUndefined()
  })
})

describe("formatStudioPlace", () => {
  it("gives parameters that parseStudioPlace reads back", () => {
    const places: ReadonlyArray<StudioPlace> = [
      { tab: "lesson", lesson: lastLesson },
      { tab: "games", game: "balloons" },
      { tab: "test" },
      { tab: "hotkeys" },
      { tab: "hotkeys", lesson: "hk-copy" }
    ]
    for (const place of places) expect(parseStudioPlace(new URLSearchParams(formatStudioPlace(place)).toString())).toEqual(place)
  })

  it("gives no parameters for the lesson map", () => {
    expect(formatStudioPlace({ tab: "course" })).toEqual({})
  })
})
