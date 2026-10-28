/** Fingers in the standard touch-typing scheme, left pinky to right pinky; thumbs press the space bar. */
export type Finger =
  | "leftPinky"
  | "leftRing"
  | "leftMiddle"
  | "leftIndex"
  | "rightIndex"
  | "rightMiddle"
  | "rightRing"
  | "rightPinky"
  | "thumb"

export type LayoutId = "uk" | "en"

export interface Key {
  /** Physical key, as in KeyboardEvent.code. */
  readonly code: string
  /** Character without Shift. */
  readonly base: string
  /** Character with Shift. */
  readonly shift: string
  readonly finger: Finger
  /** One of the eight keys where the fingers rest (ФІВА ОЛДЖ / ASDF JKL;). */
  readonly home?: true
}

export interface Layout {
  readonly id: LayoutId
  readonly name: string
  readonly rows: readonly (readonly Key[])[]
}

/** Physical codes of the four character rows, left to right. */
const CODES = [
  ["Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal"],
  ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight", "Backslash"],
  ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote"],
  ["KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash"]
] as const

/** Finger for each key, by row and column. Same for every layout: fingers follow the physical keys. */
const FINGERS: readonly (readonly Finger[])[] = [
  ["leftPinky", "leftPinky", "leftRing", "leftMiddle", "leftIndex", "leftIndex", "rightIndex", "rightIndex", "rightMiddle", "rightRing", "rightPinky", "rightPinky", "rightPinky"],
  ["leftPinky", "leftRing", "leftMiddle", "leftIndex", "leftIndex", "rightIndex", "rightIndex", "rightMiddle", "rightRing", "rightPinky", "rightPinky", "rightPinky", "rightPinky"],
  ["leftPinky", "leftRing", "leftMiddle", "leftIndex", "leftIndex", "rightIndex", "rightIndex", "rightMiddle", "rightRing", "rightPinky", "rightPinky"],
  ["leftPinky", "leftRing", "leftMiddle", "leftIndex", "leftIndex", "rightIndex", "rightIndex", "rightMiddle", "rightRing", "rightPinky"]
]

const HOME_CODES = new Set(["KeyA", "KeyS", "KeyD", "KeyF", "KeyJ", "KeyK", "KeyL", "Semicolon"])

/** Each row is written as pairs "base shift" separated by spaces, one pair per key. */
const build = (id: LayoutId, name: string, rows: readonly string[]): Layout => ({
  id,
  name,
  rows: [
    ...rows.map((row, r) =>
      row.split(" ").map((pair, c): Key => {
        const code = CODES[r]?.[c]
        const finger = FINGERS[r]?.[c]
        const [base, shift] = [...pair]
        if (!code || !finger || !base || !shift) throw new Error(`Розкладка ${id}: зайва клавіша в рядку ${r + 1}`)
        return HOME_CODES.has(code) ? { code, base, shift, finger, home: true } : { code, base, shift, finger }
      })
    ),
    [{ code: "Space", base: " ", shift: " ", finger: "thumb" }]
  ]
})

/** Windows "Ukrainian (Enhanced)": apostrophe on the key left of 1, Ґ next to Ї. */
export const UK: Layout = build("uk", "Українська (ЙЦУКЕН)", [
  "'₴ 1! 2\" 3№ 4; 5% 6: 7? 8* 9( 0) -_ =+",
  "йЙ цЦ уУ кК еЕ нН гГ шШ щЩ зЗ хХ їЇ ґҐ",
  "фФ іІ вВ аА пП рР оО лЛ дД жЖ єЄ",
  "яЯ чЧ сС мМ иИ тТ ьЬ бБ юЮ .,"
])

export const EN: Layout = build("en", "English (QWERTY)", [
  "`~ 1! 2@ 3# 4$ 5% 6^ 7& 8* 9( 0) -_ =+",
  "qQ wW eE rR tT yY uU iI oO pP [{ ]} \\|",
  "aA sS dD fF gG hH jJ kK lL ;: '\"",
  "zZ xX cC vV bB nN mM ,< .> /?"
])

export const LAYOUTS: Readonly<Record<LayoutId, Layout>> = { uk: UK, en: EN }

export interface KeyPress {
  readonly key: Key
  readonly shift: boolean
}

/** Which key (and whether Shift) types the character on this layout. */
export const findKey = (layout: Layout, char: string): KeyPress | undefined => {
  for (const row of layout.rows) {
    for (const key of row) {
      if (key.base === char) return { key, shift: false }
      if (key.shift === char) return { key, shift: true }
    }
  }
  return undefined
}

/** Shift is pressed by the hand opposite to the one typing the letter. */
export const shiftSide = (finger: Finger): "ShiftLeft" | "ShiftRight" =>
  finger.startsWith("left") ? "ShiftRight" : "ShiftLeft"

const LATIN = /[a-z]/i
const CYRILLIC = /[а-яіїєґ]/i

/**
 * The student pressed a letter from the other alphabet: the system keyboard is
 * switched to the wrong language. Such presses are not counted as mistakes.
 */
export const isWrongLayout = (layout: LayoutId, expected: string, typed: string): boolean => {
  if (layout === "uk") return CYRILLIC.test(expected) && LATIN.test(typed)
  return LATIN.test(expected) && CYRILLIC.test(typed)
}
