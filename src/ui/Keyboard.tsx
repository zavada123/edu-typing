import { EN, UK, type Finger, type Key, type Layout } from "../core/index.ts"

interface Props {
  readonly layout: Layout
  /** Physical code of the key to press next, e.g. "KeyF". */
  readonly target?: string | undefined
  /** "ShiftLeft" or "ShiftRight" when the next character needs Shift. */
  readonly shift?: string | undefined
  readonly wrong?: boolean
  /** Physical keys held down right now: drawn pressed. */
  readonly pressed?: ReadonlySet<string>
  /** Tap on a key types its character: the fallback for phones without a keyboard. */
  readonly onTap?: (char: string) => void
  /** Error rate 0–1 by key code: the key gets a red glow, stronger for more mistakes. */
  readonly heat?: ReadonlyMap<string, number> | undefined
}

/** A key that types nothing: Tab, Shift, Ctrl… Width in key units, a row is 15 units. */
interface Modifier {
  readonly code: string
  readonly label: string
  readonly width: number
  readonly finger?: Finger
}

const mod = (code: string, label: string, width: number, finger?: Finger): Modifier =>
  finger ? { code, label, width, finger } : { code, label, width }

/** Modifiers at the start and end of each row, as on a standard 104-key keyboard. */
const ROW_EDGES: readonly (readonly [readonly Modifier[], readonly Modifier[]])[] = [
  [[], [mod("Backspace", "⟵ Backspace", 2, "rightPinky")]],
  [[mod("Tab", "Tab ⇥", 1.5, "leftPinky")], []],
  [[mod("CapsLock", "Caps Lock", 1.75, "leftPinky")], [mod("Enter", "Enter ↵", 2.25, "rightPinky")]],
  [[mod("ShiftLeft", "⇧ Shift", 2.25, "leftPinky")], [mod("ShiftRight", "⇧ Shift", 2.75, "rightPinky")]],
  [
    [mod("ControlLeft", "Ctrl", 1.25), mod("MetaLeft", "⊞", 1.25), mod("AltLeft", "Alt", 1.25)],
    [mod("AltRight", "Alt Gr", 1.25), mod("MetaRight", "⊞", 1.25), mod("ContextMenu", "☰", 1.25), mod("ControlRight", "Ctrl", 1.25)]
  ]
]

/** Character keys wider than one unit. */
const WIDTHS: Readonly<Record<string, number>> = { Backslash: 1.5, Space: 6.25 }

/** Keys with a bump for the index fingers. */
const BUMPS = new Set(["KeyF", "KeyJ"])

const isLetter = (c: string): boolean => c.toUpperCase() !== c.toLowerCase()

/** Real keyboard look: keycaps with Latin and Cyrillic, fingers as a coloured strip. */
export const Keyboard = ({ layout, target, shift, wrong = false, pressed, onTap, heat }: Props) => {
  const other = layout.id === "uk" ? EN : UK
  const otherByCode = new Map(other.rows.flat().map((k) => [k.code, k]))

  // 25% wrong presses is already a very hard key: full colour.
  const heatOf = (code: string): number => Math.min(1, (heat?.get(code) ?? 0) * 4)

  const capClass = (code: string, finger: Finger | undefined, extra: string) =>
    [
      "edu-kb-key",
      finger ? `edu-kb-${finger}` : "edu-kb-nofinger",
      code === target || code === shift ? "edu-kb-target" : "",
      wrong && code === target ? "edu-kb-wrong" : "",
      pressed?.has(code) ? "edu-kb-down" : "",
      extra
    ]
      .filter(Boolean)
      .join(" ")

  const legend = (key: Key) => {
    if (key.code === "Space") return null
    const second = otherByCode.get(key.code)
    if (isLetter(key.base)) {
      // Like printed Ukrainian keyboards: Latin in the corner, the active alphabet big.
      return (
        <>
          <span className="edu-kb-main">{key.base.toUpperCase()}</span>
          {second && isLetter(second.base) && <span className="edu-kb-alt">{second.base.toUpperCase()}</span>}
        </>
      )
    }
    return (
      <>
        <span className="edu-kb-top">{key.shift}</span>
        <span className="edu-kb-bottom">{key.base}</span>
      </>
    )
  }

  const charKey = (key: Key) => (
    <div key={key.code} className="edu-kb-slot" style={{ width: `calc(${WIDTHS[key.code] ?? 1} * var(--edu-kb-u))` }}>
      <button
        type="button"
        tabIndex={-1}
        className={capClass(key.code, key.finger, [isLetter(key.base) ? "edu-kb-letter" : "", heatOf(key.code) > 0 ? "edu-kb-hot" : ""].join(" "))}
        style={heatOf(key.code) > 0 ? { ["--edu-kb-heat" as string]: String(heatOf(key.code)) } : undefined}
        onPointerDown={(e) => {
          e.preventDefault()
          onTap?.(key.base)
        }}
      >
        {legend(key)}
        {BUMPS.has(key.code) && <span className="edu-kb-bump" aria-hidden="true" />}
      </button>
    </div>
  )

  const modKey = (m: Modifier) => (
    <div key={m.code} className="edu-kb-slot" style={{ width: `calc(${m.width} * var(--edu-kb-u))` }}>
      <span className={capClass(m.code, m.finger, "edu-kb-mod")}>{m.label}</span>
    </div>
  )

  return (
    <div className="edu-kb" aria-hidden="true">
      <div className="edu-kb-case">
        {layout.rows.map((row, r) => {
          const [left = [], right = []] = ROW_EDGES[r] ?? []
          return (
            <div className="edu-kb-row" key={r}>
              {left.map(modKey)}
              {row.map(charKey)}
              {right.map(modKey)}
            </div>
          )
        })}
      </div>
      <ul className="edu-kb-legend">
        <li className="edu-kb-leftPinky">мізинці</li>
        <li className="edu-kb-leftRing">безіменні</li>
        <li className="edu-kb-leftMiddle">середні</li>
        <li className="edu-kb-leftIndex">лівий вказівний</li>
        <li className="edu-kb-rightIndex">правий вказівний</li>
        <li className="edu-kb-thumb">великі</li>
      </ul>
    </div>
  )
}
