import { describe, expect, test } from "vitest"
import { findKey, LAYOUTS, type LayoutId } from "./layouts.ts"
import { lessons } from "./lessons.ts"
import { TEST_SENTENCES, WORDS } from "./words.ts"

/** Characters a student cannot type with one key press (plus Shift) on this layout. */
const untypable = (layout: LayoutId, text: string): string[] =>
  [...new Set(text)].filter((c) => findKey(LAYOUTS[layout], c) === undefined)

const LAYOUT_IDS: readonly LayoutId[] = ["uk", "en"]

describe("every text can be typed on a plain keyboard", () => {
  test.each(LAYOUT_IDS)("test sentences (%s) have no long dashes, curly quotes or other rare signs", (layout) => {
    expect(untypable(layout, TEST_SENTENCES[layout].join(" "))).toEqual([])
  })

  test.each(LAYOUT_IDS)("word bank (%s) for practice and games", (layout) => {
    expect(untypable(layout, WORDS[layout].join(" "))).toEqual([])
  })

  test.each(lessons.map((l) => [l.id, l] as const))("lesson %s", (_id, lesson) => {
    expect(untypable(lesson.layout, lesson.text)).toEqual([])
  })
})
