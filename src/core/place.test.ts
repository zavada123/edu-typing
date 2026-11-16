import { describe, expect, it } from "vitest"
import { lessons } from "./lessons.ts"
import { formatStudioPlace, parseStudioPlace, type StudioPlace } from "./place.ts"

const firstLesson = lessons[0]?.id ?? ""
const lastLesson = lessons[lessons.length - 1]?.id ?? ""

describe("parseStudioPlace", () => {
  it("reads every kind of place, with or without #", () => {
    expect(parseStudioPlace("course")).toEqual({ tab: "course" })
    expect(parseStudioPlace("#test")).toEqual({ tab: "test" })
    expect(parseStudioPlace(`#lesson/${firstLesson}`)).toEqual({ tab: "lesson", lesson: firstLesson })
    expect(parseStudioPlace("games/kingdom")).toEqual({ tab: "games", game: "kingdom" })
  })

  it("gives undefined for unknown lessons, games and other text", () => {
    expect(parseStudioPlace("")).toBeUndefined()
    expect(parseStudioPlace("lesson/no-such-lesson")).toBeUndefined()
    expect(parseStudioPlace("games/chess")).toBeUndefined()
    expect(parseStudioPlace("games/kingdom/extra")).toBeUndefined()
    expect(parseStudioPlace("lesson")).toBeUndefined()
  })
})

describe("formatStudioPlace", () => {
  it("gives text that parseStudioPlace reads back", () => {
    const places: ReadonlyArray<StudioPlace> = [
      { tab: "course" },
      { tab: "lesson", lesson: lastLesson },
      { tab: "games", game: "balloons" },
      { tab: "test" }
    ]
    for (const place of places) expect(parseStudioPlace(formatStudioPlace(place))).toEqual(place)
  })
})
