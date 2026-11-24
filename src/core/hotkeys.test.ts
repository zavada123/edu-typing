import { describe, expect, test } from "vitest"
import {
  comboCodes,
  comboLabels,
  editState,
  type EditTask,
  hotkeyAccuracy,
  hotkeyById,
  hotkeyLessons,
  hotkeyOf,
  HOTKEYS,
  hotkeyStars,
  isModifierOnly,
  type KeyEventLike,
  matches,
  parseCombo,
  promptParts,
  quizOptions,
  tasksFor
} from "./hotkeys.ts"
import { emptyProgress, recordHotkeyLesson } from "./progress.ts"

const key = (code: string, mods: Partial<KeyEventLike> = {}): KeyEventLike => ({
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  metaKey: false,
  code,
  ...mods
})

describe("combos", () => {
  test("parses modifiers and the physical key", () => {
    expect(parseCombo("Ctrl+Shift+Z")).toEqual({ ctrl: true, shift: true, alt: false, meta: false, code: "KeyZ" })
    expect(parseCombo("Cmd+ArrowLeft")).toEqual({ ctrl: false, shift: false, alt: false, meta: true, code: "ArrowLeft" })
    expect(parseCombo("Home").code).toBe("Home")
    expect(() => parseCombo("Ctrl+Щ")).toThrow()
  })

  test("matches by the physical key, so Ctrl+C works in the Ukrainian layout too", () => {
    const copy = hotkeyById("copy")
    // In ЙЦУКЕН the key C types «с», but its code is still KeyC.
    expect(matches(key("KeyC", { ctrlKey: true }), copy, "pc")).toBe(true)
    expect(matches(key("KeyC"), copy, "pc")).toBe(false)
    expect(matches(key("KeyC", { ctrlKey: true, shiftKey: true }), copy, "pc")).toBe(false)
    expect(matches(key("KeyC", { metaKey: true }), copy, "mac")).toBe(true)
    expect(matches(key("KeyC", { ctrlKey: true }), copy, "mac")).toBe(false)
  })

  test("any of several combos counts: redo is Ctrl+Y or Ctrl+Shift+Z", () => {
    const redo = hotkeyById("redo")
    expect(matches(key("KeyY", { ctrlKey: true }), redo, "pc")).toBe(true)
    expect(matches(key("KeyZ", { ctrlKey: true, shiftKey: true }), redo, "pc")).toBe(true)
    expect(hotkeyOf(key("KeyZ", { ctrlKey: true }), "pc")?.id).toBe("undo")
    expect(hotkeyOf(key("KeyQ", { ctrlKey: true }), "pc")).toBeUndefined()
  })

  test("modifier keys alone are not a press", () => {
    expect(isModifierOnly(key("ControlLeft", { ctrlKey: true }))).toBe(true)
    expect(isModifierOnly(key("KeyV", { ctrlKey: true }))).toBe(false)
  })

  test("labels follow the platform", () => {
    expect(comboLabels("Ctrl+Shift+Z", "pc")).toEqual(["Ctrl", "⇧ Shift", "Z"])
    expect(comboLabels("Cmd+C", "mac")).toEqual(["⌘ Cmd", "C"])
    expect(comboCodes("Ctrl+V")).toEqual(["ControlLeft", "ControlRight", "KeyV"])
  })

  test("every shortcut parses on both platforms, and no two shortcuts share a combo", () => {
    for (const platform of ["pc", "mac"] as const) {
      const seen = new Map<string, string>()
      for (const h of HOTKEYS) {
        for (const text of platform === "pc" ? h.pc : h.mac) {
          const c = parseCombo(text)
          const id = JSON.stringify(c)
          expect(seen.get(id), `${text} у ${h.id} і ${seen.get(id)}`).toBeUndefined()
          seen.set(id, h.id)
        }
      }
    }
  })
})

describe("lessons", () => {
  test("ids are unique, start with hk- and fit the lesson records of the progress", () => {
    const ids = hotkeyLessons.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^hk-[a-z0-9-]+$/u)
  })

  test("every task names a known shortcut; the page is never asked to catch a browser shortcut", () => {
    for (const lesson of hotkeyLessons) {
      expect(lesson.tasks.length).toBeGreaterThan(0)
      promptParts(lesson.hint)
      for (const t of lesson.tasks) {
        if (t.kind === "edit") {
          promptParts(t.prompt)
          for (const id of t.needs) expect(hotkeyById(id).browser).toBeUndefined()
        } else if (t.kind === "press") expect(hotkeyById(t.hotkey).browser).toBeUndefined()
        else expect(hotkeyById(t.hotkey).browser).toBe(true)
      }
    }
  })

  test("edit tasks start away from the target and the selection fits the text", () => {
    for (const t of hotkeyLessons.flatMap((l) => l.tasks)) {
      if (t.kind !== "edit") continue
      if (!t.changeFirst) expect(editState(t, t.start, new Set(t.needs), true)).toBe("working")
      if (t.select) {
        expect(t.select[0]).toBeLessThanOrEqual(t.select[1])
        expect(t.select[1]).toBeLessThanOrEqual(t.start.length)
      }
    }
  })

  test("a Mac skips shortcuts it does not have", () => {
    const windows = hotkeyLessons.find((l) => l.id === "hk-windows")
    if (!windows) throw new Error("no hk-windows")
    expect(tasksFor(windows, "pc").length).toBe(windows.tasks.length)
    expect(tasksFor(windows, "mac").some((t) => t.kind === "quiz" && t.hotkey === "desktop")).toBe(false)
  })

  test("quiz options hold the right answer among four different names", () => {
    const windows = hotkeyLessons.find((l) => l.id === "hk-windows")
    if (!windows) throw new Error("no hk-windows")
    for (const t of windows.tasks) {
      if (t.kind !== "quiz") continue
      const options = quizOptions(windows, t.hotkey)
      expect(options).toHaveLength(4)
      expect(new Set(options).size).toBe(4)
      expect(options).toContain(hotkeyById(t.hotkey).name)
    }
    const firsts = windows.tasks.flatMap((t) => (t.kind === "quiz" ? [quizOptions(windows, t.hotkey)[0] === hotkeyById(t.hotkey).name] : []))
    expect(firsts.every(Boolean)).toBe(false)
  })

  test("prompts split into text and shortcuts", () => {
    expect(promptParts("Натисни {copy}, потім {paste}.")).toEqual([
      { text: "Натисни " },
      { hotkey: "copy" },
      { text: ", потім " },
      { hotkey: "paste" },
      { text: "." }
    ])
    expect(() => promptParts("{nothing}")).toThrow()
  })
})

describe("edit tasks", () => {
  const task: EditTask = { kind: "edit", prompt: "", start: "Котик ", target: "Котик Котик Котик", needs: ["copy", "paste"] }

  test("spaces do not count, the text and the keys do", () => {
    expect(editState(task, "Котик ", new Set(), false)).toBe("working")
    expect(editState(task, "КотикКотик Котик\n", new Set(["copy", "paste"]), true)).toBe("done")
    // Pasted with the mouse: the text is right, the keys are not.
    expect(editState(task, "Котик Котик Котик", new Set(["copy"]), true)).toBe("needKeys")
  })

  test("an undo task needs the text to change first", () => {
    const undo: EditTask = { ...task, start: "Текст", target: "Текст", needs: ["undo"], changeFirst: true }
    expect(editState(undo, "Текст", new Set(["undo"]), false)).toBe("working")
    expect(editState(undo, "Текст", new Set(["undo"]), true)).toBe("done")
  })
})

describe("score", () => {
  test("stars by mistakes", () => {
    expect([0, 1, 2, 3, 10].map(hotkeyStars)).toEqual([3, 2, 2, 1, 1])
  })

  test("accuracy is the share of right answers", () => {
    expect(hotkeyAccuracy(9, 1)).toBe(90)
    expect(hotkeyAccuracy(0, 0)).toBe(100)
  })

  test("the best run of a lesson is kept: stars first, then accuracy", () => {
    const one = recordHotkeyLesson(emptyProgress, "hk-copy", 2, 80)
    expect(one.lessons["hk-copy"]).toEqual({ stars: 2, cpm: 0, accuracy: 80 })
    expect(recordHotkeyLesson(one, "hk-copy", 1, 100)).toBe(one)
    expect(recordHotkeyLesson(one, "hk-copy", 2, 90).lessons["hk-copy"]?.accuracy).toBe(90)
  })
})
