/**
 * Keyboard shortcuts: Ctrl+C, Ctrl+V, Ctrl+Z and the rest. The student learns them in three kinds of tasks: press a
 * shortcut, edit a text in a real text field with shortcuts, or answer what a shortcut does.
 *
 * A browser keeps some shortcuts for itself (Ctrl+W closes the tab, Ctrl+T opens one, Ctrl+N a window): a page cannot
 * stop them, so the trainer never asks to press them and only asks what they do.
 */

/** Windows and Linux use Ctrl; a Mac uses Cmd (⌘) and Option (⌥). */
export type Platform = "pc" | "mac"

/** One key press with modifiers, as a KeyboardEvent gives it. `code` is the physical key, so any layout works. */
export interface Combo {
  readonly ctrl: boolean
  readonly shift: boolean
  readonly alt: boolean
  readonly meta: boolean
  readonly code: string
}

/** The fields of a KeyboardEvent the trainer reads. */
export interface KeyEventLike {
  readonly ctrlKey: boolean
  readonly shiftKey: boolean
  readonly altKey: boolean
  readonly metaKey: boolean
  readonly code: string
}

export interface Hotkey {
  readonly id: string
  /** What it does, short: "Копіювати". */
  readonly name: string
  /** A sentence for the student: where it helps. */
  readonly about: string
  /** Combos on Windows and Linux, the first one is shown; e.g. ["Ctrl+Y", "Ctrl+Shift+Z"]. */
  readonly pc: readonly string[]
  /** Combos on a Mac; empty when the shortcut has no Mac version. */
  readonly mac: readonly string[]
  /** What the trainer shows after a right press of a shortcut that does nothing on the page (save, find, print). */
  readonly done?: string
  /** The browser takes this shortcut first: the trainer only asks what it does. */
  readonly browser?: true
}

const hk = (id: string, name: string, about: string, pc: readonly string[], mac: readonly string[], extra: Partial<Hotkey> = {}): Hotkey => ({
  id,
  name,
  about,
  pc,
  mac,
  ...extra
})

export const HOTKEYS: readonly Hotkey[] = [
  hk("copy", "Копіювати", "Запам'ятовує виділене, текст лишається на місці.", ["Ctrl+C"], ["Cmd+C"]),
  hk("paste", "Вставити", "Вставляє те, що скопіював або вирізав, туди, де курсор.", ["Ctrl+V"], ["Cmd+V"]),
  hk("cut", "Вирізати", "Забирає виділене, щоб вставити деінде.", ["Ctrl+X"], ["Cmd+X"]),
  hk("selectAll", "Виділити все", "Виділяє весь текст у полі чи документі.", ["Ctrl+A"], ["Cmd+A"]),
  hk("undo", "Скасувати", "Повертає, як було до останньої дії.", ["Ctrl+Z"], ["Cmd+Z"]),
  hk("redo", "Повторити", "Повертає те, що скасував.", ["Ctrl+Y", "Ctrl+Shift+Z"], ["Cmd+Shift+Z"]),
  hk("home", "На початок рядка", "Курсор стрибає на початок рядка.", ["Home"], ["Cmd+ArrowLeft"]),
  hk("end", "У кінець рядка", "Курсор стрибає в кінець рядка.", ["End"], ["Cmd+ArrowRight"]),
  hk("wordLeft", "На слово ліворуч", "Курсор перестрибує ціле слово ліворуч.", ["Ctrl+ArrowLeft"], ["Alt+ArrowLeft"]),
  hk("wordRight", "На слово праворуч", "Курсор перестрибує ціле слово праворуч.", ["Ctrl+ArrowRight"], ["Alt+ArrowRight"]),
  hk("selectLeft", "Виділити літеру ліворуч", "Тримай Shift і тисни стрілку: виділення росте на літеру.", ["Shift+ArrowLeft"], ["Shift+ArrowLeft"]),
  hk("selectWordLeft", "Виділити слово ліворуч", "Виділяє ціле слово ліворуч від курсора.", ["Ctrl+Shift+ArrowLeft"], ["Alt+Shift+ArrowLeft"]),
  hk("selectToEnd", "Виділити до кінця рядка", "Виділяє все від курсора до кінця рядка.", ["Shift+End"], ["Cmd+Shift+ArrowRight"]),
  hk("deleteWord", "Видалити слово ліворуч", "Стирає ціле слово перед курсором.", ["Ctrl+Backspace"], ["Alt+Backspace"]),
  hk("deleteWordRight", "Видалити слово праворуч", "Стирає ціле слово після курсора.", ["Ctrl+Delete"], ["Alt+Delete"]),
  hk("docStart", "На початок тексту", "Курсор стрибає на самий початок тексту.", ["Ctrl+Home"], ["Cmd+ArrowUp"]),
  hk("docEnd", "У кінець тексту", "Курсор стрибає в самий кінець тексту.", ["Ctrl+End"], ["Cmd+ArrowDown"]),
  hk("save", "Зберегти", "Зберігає документ, щоб робота не загубилась.", ["Ctrl+S"], ["Cmd+S"], { done: "💾 Документ збережено" }),
  hk("find", "Знайти", "Відкриває пошук слова на сторінці чи в документі.", ["Ctrl+F"], ["Cmd+F"], { done: "🔍 Відкрито пошук" }),
  hk("print", "Друкувати", "Відкриває вікно друку.", ["Ctrl+P"], ["Cmd+P"], { done: "🖨️ Відкрито друк" }),
  hk("bold", "Жирний", "Робить виділений текст жирним у Word чи Google Документах.", ["Ctrl+B"], ["Cmd+B"], { done: "Текст став **жирним**" }),
  hk("italic", "Курсив", "Робить виділений текст похилим.", ["Ctrl+I"], ["Cmd+I"], { done: "Текст став похилим" }),
  hk("underline", "Підкреслити", "Підкреслює виділений текст.", ["Ctrl+U"], ["Cmd+U"], { done: "Текст підкреслено" }),
  hk("newTab", "Нова вкладка", "Відкриває нову вкладку браузера.", ["Ctrl+T"], ["Cmd+T"], { browser: true }),
  hk("closeTab", "Закрити вкладку", "Закриває вкладку, яку зараз видно.", ["Ctrl+W"], ["Cmd+W"], { browser: true }),
  hk("reopenTab", "Повернути закриту вкладку", "Відкриває знову вкладку, яку закрив щойно.", ["Ctrl+Shift+T"], ["Cmd+Shift+T"], { browser: true }),
  hk("nextTab", "Наступна вкладка", "Перемикає на вкладку праворуч.", ["Ctrl+Tab"], ["Ctrl+Tab"], { browser: true }),
  hk("switchWindow", "Перемкнути вікно", "Перемикає між відкритими програмами.", ["Alt+Tab"], ["Cmd+Tab"], { browser: true }),
  hk("closeWindow", "Закрити програму", "Закриває вікно програми.", ["Alt+F4"], ["Cmd+Q"], { browser: true }),
  hk("desktop", "Показати робочий стіл", "Ховає всі вікна й показує робочий стіл.", ["Win+D"], [], { browser: true }),
  hk("lock", "Заблокувати комп'ютер", "Блокує комп'ютер, коли відходиш: без пароля ніхто не зайде.", ["Win+L"], ["Ctrl+Cmd+Q"], { browser: true }),
  hk("screenshot", "Знімок частини екрана", "Дає вибрати частину екрана й копіює знімок.", ["Win+Shift+S"], ["Cmd+Shift+4"], { browser: true }),
  hk("taskManager", "Диспетчер завдань", "Показує програми, що працюють, і закриває ту, що зависла.", ["Ctrl+Shift+Escape"], ["Cmd+Alt+Escape"], { browser: true })
]

const BY_ID = new Map(HOTKEYS.map((h) => [h.id, h]))

export const hotkeyById = (id: string): Hotkey => {
  const h = BY_ID.get(id)
  if (!h) throw new Error(`Немає гарячої клавіші ${id}`)
  return h
}

/** Names in combo strings → physical key codes. One letter or digit is a key of its own. */
const NAMED_CODES: Readonly<Record<string, string>> = {
  Backspace: "Backspace",
  Delete: "Delete",
  Home: "Home",
  End: "End",
  Tab: "Tab",
  Escape: "Escape",
  Enter: "Enter",
  Space: "Space",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  F4: "F4"
}

const codeOf = (name: string): string => {
  const named = NAMED_CODES[name]
  if (named) return named
  if (/^[A-Z]$/u.test(name)) return `Key${name}`
  if (/^[0-9]$/u.test(name)) return `Digit${name}`
  throw new Error(`Невідома клавіша ${name}`)
}

/** "Ctrl+Shift+Z" → a combo. Cmd and Win are the same Meta key on different keyboards. */
export const parseCombo = (text: string): Combo => {
  const parts = text.split("+")
  const key = parts[parts.length - 1] ?? ""
  const mods = new Set(parts.slice(0, -1))
  return {
    ctrl: mods.has("Ctrl"),
    shift: mods.has("Shift"),
    alt: mods.has("Alt"),
    meta: mods.has("Cmd") || mods.has("Win"),
    code: codeOf(key)
  }
}

/** Combos of the shortcut on the platform; the first is the one to show. */
export const combosOf = (h: Hotkey, platform: Platform): readonly string[] => (platform === "mac" ? h.mac : h.pc)

const MODIFIER_CODES = new Set([
  "ControlLeft",
  "ControlRight",
  "ShiftLeft",
  "ShiftRight",
  "AltLeft",
  "AltRight",
  "MetaLeft",
  "MetaRight",
  "OSLeft",
  "OSRight",
  "CapsLock"
])

/** A press of Ctrl, Shift, Alt or Cmd alone: the student is still holding the combo, it is not a mistake. */
export const isModifierOnly = (e: KeyEventLike): boolean => MODIFIER_CODES.has(e.code)

export const sameCombo = (e: KeyEventLike, c: Combo): boolean =>
  e.code === c.code && e.ctrlKey === c.ctrl && e.shiftKey === c.shift && e.altKey === c.alt && e.metaKey === c.meta

/** Does the press match the shortcut on the platform (any of its combos)? */
export const matches = (e: KeyEventLike, h: Hotkey, platform: Platform): boolean =>
  combosOf(h, platform).some((text) => sameCombo(e, parseCombo(text)))

/** The shortcut of the press, if it is one the trainer knows. */
export const hotkeyOf = (e: KeyEventLike, platform: Platform): Hotkey | undefined => HOTKEYS.find((h) => matches(e, h, platform))

const KEY_LABELS: Readonly<Record<string, Readonly<Record<Platform, string>>>> = {
  Ctrl: { pc: "Ctrl", mac: "⌃ Control" },
  Cmd: { pc: "Win", mac: "⌘ Cmd" },
  Win: { pc: "⊞ Win", mac: "⌘ Cmd" },
  Alt: { pc: "Alt", mac: "⌥ Option" },
  Shift: { pc: "⇧ Shift", mac: "⇧ Shift" },
  ArrowLeft: { pc: "←", mac: "←" },
  ArrowRight: { pc: "→", mac: "→" },
  ArrowUp: { pc: "↑", mac: "↑" },
  ArrowDown: { pc: "↓", mac: "↓" },
  Escape: { pc: "Esc", mac: "Esc" },
  Backspace: { pc: "⟵ Backspace", mac: "⌫ Delete" },
  Delete: { pc: "Delete", mac: "⌦ Fn+Delete" }
}

/** The keys of a combo as printed on the keycaps: "Ctrl+Shift+Z" → ["Ctrl", "⇧ Shift", "Z"]. */
export const comboLabels = (text: string, platform: Platform): readonly string[] =>
  text.split("+").map((part) => KEY_LABELS[part]?.[platform] ?? part)

/** Physical keys to light on the on-screen keyboard; the modifiers on both sides. */
export const comboCodes = (text: string): readonly string[] => {
  const c = parseCombo(text)
  return [
    ...(c.ctrl ? ["ControlLeft", "ControlRight"] : []),
    ...(c.shift ? ["ShiftLeft", "ShiftRight"] : []),
    ...(c.alt ? ["AltLeft"] : []),
    ...(c.meta ? ["MetaLeft", "MetaRight"] : []),
    c.code
  ]
}

/** Press the shortcut. */
export interface PressTask {
  readonly kind: "press"
  readonly hotkey: string
}

/**
 * Change a text in a text field with shortcuts. Done when the text is the target (spaces do not count) and the student
 * pressed every shortcut of `needs`.
 */
export interface EditTask {
  readonly kind: "edit"
  /** `{copy}` in the text shows the keys of that shortcut on the student's platform. */
  readonly prompt: string
  readonly start: string
  /** Selection at the start: [from, to]; the same numbers put the cursor there. Default: cursor at the end. */
  readonly select?: readonly [number, number]
  readonly target: string
  /** Shortcut ids to use. */
  readonly needs: readonly string[]
  /** The text must change and come back to the target (undo): a field left as it was does not count. */
  readonly changeFirst?: true
}

/** What does the shortcut do? For shortcuts the browser keeps: they are not pressed. */
export interface QuizTask {
  readonly kind: "quiz"
  readonly hotkey: string
}

export type HotkeyTask = PressTask | EditTask | QuizTask

export interface HotkeyLesson {
  /** Starts with "hk-": the result goes to the lesson records of the progress. */
  readonly id: string
  readonly title: string
  /** Shortcuts in braces, as in `EditTask.prompt`. */
  readonly hint: string
  readonly tasks: readonly HotkeyTask[]
}

const press = (...ids: readonly string[]): readonly PressTask[] => ids.map((hotkey) => ({ kind: "press", hotkey }))
const quiz = (...ids: readonly string[]): readonly QuizTask[] => ids.map((hotkey) => ({ kind: "quiz", hotkey }))
const edit = (task: Omit<EditTask, "kind">): EditTask => ({ kind: "edit", ...task })

export const hotkeyLessons: readonly HotkeyLesson[] = [
  {
    id: "hk-copy",
    title: "Копіювати і вставити",
    hint: "Тримай першу клавішу і, не відпускаючи, натисни другу: {copy} копіює, {paste} вставляє. Спершу виділи, потім копіюй.",
    tasks: [
      ...press("copy", "paste", "copy", "paste", "paste"),
      edit({
        prompt: "Слово «Котик» уже виділено. Скопіюй його {copy}, клацни в кінець рядка й встав двічі {paste}. Має вийти «Котик Котик Котик».",
        start: "Котик ",
        select: [0, 5],
        target: "Котик Котик Котик",
        needs: ["copy", "paste"]
      }),
      edit({
        prompt: "Скопіюй ім'я «Оля» з першого рядка і встав його в другий, після «Привіт,». Виділити слово можна подвійним клацанням.",
        start: "Ім'я: Оля\nПривіт, !",
        target: "Ім'я: Оля\nПривіт, Оля!",
        needs: ["copy", "paste"]
      })
    ]
  },
  {
    id: "hk-cut",
    title: "Вирізати і перенести",
    hint: "{cut} забирає виділене, а {paste} ставить його туди, де курсор. Так переносять слова й речення.",
    tasks: [
      ...press("cut", "paste", "cut", "copy", "paste"),
      edit({
        prompt: "Дні переплутались. Слово «середа» вже виділено: виріж його {cut}, клацни в кінець рядка й встав {paste}.",
        start: "понеділок середа вівторок",
        select: [10, 16],
        target: "понеділок вівторок середа",
        needs: ["cut", "paste"]
      }),
      edit({
        prompt: "Переклади числа по порядку: виріж «три» і встав перед «чотири».",
        start: "один два чотири три п'ять",
        target: "один два три чотири п'ять",
        needs: ["cut", "paste"]
      })
    ]
  },
  {
    id: "hk-select-all",
    title: "Виділити все",
    hint: "{selectAll} виділяє весь текст. Що надрукуєш далі, замінить виділене.",
    tasks: [
      ...press("selectAll", "copy", "selectAll", "cut"),
      edit({
        prompt: "Цей текст треба замінити цілком. Виділи все {selectAll} і просто надрукуй «Привіт».",
        start: "Дуже довгий і нудний текст, який нікому не потрібен. Його треба прибрати.",
        target: "Привіт",
        needs: ["selectAll"]
      }),
      edit({
        prompt: "Зроби з одного рядка два однакові: виділи все {selectAll}, скопіюй {copy}, натисни {end}, щоб зняти виділення, і встав {paste}.",
        start: "Раз, два, три.",
        target: "Раз, два, три.Раз, два, три.",
        needs: ["selectAll", "copy", "paste"]
      })
    ]
  },
  {
    id: "hk-undo",
    title: "Скасувати і повторити",
    hint: "{undo} рятує, коли щось пішло не так: повертає крок назад. {redo} повертає скасоване.",
    tasks: [
      ...press("undo", "redo", "undo", "undo", "redo"),
      edit({
        prompt: "Виділи весь текст {selectAll} і натисни Delete. Ой! Тепер поверни текст: {undo}.",
        start: "Важливий текст, який не можна загубити.",
        target: "Важливий текст, який не можна загубити.",
        needs: ["selectAll", "undo"],
        changeFirst: true
      }),
      edit({
        prompt: "Допиши « спить», щоб вийшло «Кіт спить». Скасуй це {undo}, а тоді поверни {redo}.",
        start: "Кіт",
        target: "Кіт спить",
        needs: ["undo", "redo"]
      })
    ]
  },
  {
    id: "hk-cursor",
    title: "Курсор без мишки",
    hint: "{home} і {end} стрибають на початок і в кінець рядка, {wordRight} перестрибує ціле слово.",
    tasks: [
      ...press("home", "end", "wordLeft", "wordRight", "docStart", "docEnd"),
      edit({
        prompt: "Курсор у кінці рядка. Натисни {home}, щоб стрибнути на початок, і надрукуй «Добрий ».",
        start: "ранок!",
        target: "Добрий ранок!",
        needs: ["home"]
      }),
      edit({
        prompt: "Курсор на початку. Натисни {wordRight} двічі, щоб перестрибнути два слова, і допиши «дуже ».",
        start: "Сьогодні було весело.",
        select: [0, 0],
        target: "Сьогодні було дуже весело.",
        needs: ["wordRight"]
      })
    ]
  },
  {
    id: "hk-select",
    title: "Виділяти клавішами",
    hint: "Shift зі стрілкою виділяє по літері, а {selectWordLeft} виділяє цілими словами.",
    tasks: [
      ...press("selectLeft", "selectWordLeft", "selectToEnd", "selectWordLeft"),
      edit({
        prompt: "Курсор у кінці. Виділи останнє слово {selectWordLeft} і надрукуй замість нього «тепло».",
        start: "Сьогодні холодно",
        target: "Сьогодні тепло",
        needs: ["selectWordLeft"]
      }),
      edit({
        prompt: "Постав курсор перед словом «зайвий» і натисни {selectToEnd}: виділиться все до кінця рядка. Потім натисни Delete.",
        start: "Цей рядок закінчується тут. зайвий хвіст",
        select: [0, 0],
        target: "Цей рядок закінчується тут.",
        needs: ["selectToEnd"]
      })
    ]
  },
  {
    id: "hk-delete",
    title: "Швидко видаляти",
    hint: "{deleteWord} стирає ціле слово ліворуч, {deleteWordRight} — праворуч. Не треба тиснути Backspace десять разів.",
    tasks: [
      ...press("deleteWord", "deleteWordRight", "deleteWord"),
      edit({
        prompt: "Курсор стоїть після зайвого «дуже». Зітри його одним натиском {deleteWord}.",
        start: "Я дуже дуже люблю читати",
        select: [11, 11],
        target: "Я дуже люблю читати",
        needs: ["deleteWord"]
      }),
      edit({
        prompt: "Курсор стоїть перед словом «завтра». Зітри його й наступне слово двома натисками {deleteWordRight}.",
        start: "Ми підемо завтра ввечері в кіно",
        select: [10, 10],
        target: "Ми підемо в кіно",
        needs: ["deleteWordRight"]
      })
    ]
  },
  {
    id: "hk-file",
    title: "Зберегти, знайти, надрукувати",
    hint: "Ці клавіші працюють майже в кожній програмі. {save} натискай часто, щоб робота не загубилась.",
    tasks: press("save", "find", "print", "save", "find", "save")
  },
  {
    id: "hk-format",
    title: "Жирний, курсив, підкреслення",
    hint: "У Word і Google Документах: виділи слово й натисни {bold}, {italic} або {underline}. Повторний натиск знімає оформлення.",
    tasks: press("bold", "italic", "underline", "bold", "underline", "italic")
  },
  {
    id: "hk-windows",
    title: "Вкладки і вікна",
    hint: "Ці клавіші браузер і Windows забирають собі, тому тут їх не натискаємо, а тільки вчимо, що вони роблять.",
    tasks: quiz("newTab", "closeTab", "reopenTab", "nextTab", "switchWindow", "closeWindow", "desktop", "lock", "screenshot", "taskManager")
  },
  {
    id: "hk-review",
    title: "Повторення: усе разом",
    hint: "Усі клавіші вперемішку. Спробуй без помилок, щоб отримати три зірки.",
    tasks: [
      ...press("copy", "selectAll", "undo", "paste", "cut", "save", "end", "redo", "home", "deleteWord", "find", "selectWordLeft", "copy", "paste"),
      edit({
        prompt: "Зроби з «друк сліпий» «сліпий друк»: виділи «сліпий», виріж {cut} і встав {paste} на початок рядка {home}.",
        start: "друк сліпий",
        target: "сліпий друк",
        needs: ["cut", "paste", "home"]
      })
    ]
  }
]

/** Tasks of the lesson that work on the platform: a Mac has no version of some Windows shortcuts. */
export const tasksFor = (lesson: HotkeyLesson, platform: Platform): readonly HotkeyTask[] =>
  lesson.tasks.filter((t) => t.kind === "edit" || combosOf(hotkeyById(t.hotkey), platform).length > 0)

const QUIZ_OPTIONS = 4

/**
 * Answers to choose from: the right name and three names of other shortcuts of the lesson, in an order that depends on
 * the shortcut, so the right answer is not always first.
 */
export const quizOptions = (lesson: HotkeyLesson, hotkey: string): readonly string[] => {
  const ids = lesson.tasks.flatMap((t) => (t.kind === "quiz" ? [t.hotkey] : []))
  const at = Math.max(0, ids.indexOf(hotkey))
  const picked = Array.from({ length: Math.min(QUIZ_OPTIONS, ids.length) }, (_, i) => ids[(at + i) % ids.length] ?? hotkey)
  const shift = at % picked.length
  return [...picked.slice(picked.length - shift), ...picked.slice(0, picked.length - shift)].map((id) => hotkeyById(id).name)
}

export type PromptPart = { readonly text: string } | { readonly hotkey: string }

/** A prompt split into text and shortcuts: "Натисни {copy}." → text, the copy shortcut, text. */
export const promptParts = (prompt: string): readonly PromptPart[] =>
  prompt
    .split(/\{([a-zA-Z]+)\}/u)
    .map((piece, i): PromptPart => (i % 2 === 1 ? { hotkey: hotkeyById(piece).id } : { text: piece }))
    .filter((part) => !("text" in part) || part.text !== "")

/** Spaces and line breaks do not count: pasting with or without a space is the same. */
const squeeze = (text: string): string => text.replace(/\s+/gu, "")

export type EditState = "working" | "needKeys" | "done"

/**
 * Where the edit task stands: `done`, `needKeys` (the text is right, but some shortcuts were not pressed, e.g. pasted
 * with the mouse), or `working`.
 */
export const editState = (task: EditTask, text: string, used: ReadonlySet<string>, changed: boolean): EditState => {
  if (squeeze(text) !== squeeze(task.target)) return "working"
  if (task.changeFirst && !changed) return "working"
  return task.needs.every((id) => used.has(id)) ? "done" : "needKeys"
}

/** Stars for a lesson: three without mistakes, two for one or two, one for finishing. */
export const hotkeyStars = (mistakes: number): 1 | 2 | 3 => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1)

/** Share of right answers and presses, 0–100. */
export const hotkeyAccuracy = (tasks: number, mistakes: number): number =>
  tasks + mistakes === 0 ? 100 : Math.round((1000 * tasks) / (tasks + mistakes)) / 10
