import type { Key, Layout } from "../core/index.ts"

interface Props {
  readonly layout: Layout
  /** Physical code of the key to press next, e.g. "KeyF". */
  readonly target?: string | undefined
  /** "ShiftLeft" or "ShiftRight" when the next character needs Shift. */
  readonly shift?: string | undefined
  readonly wrong?: boolean
  /** Tap on a key types its character: the fallback for phones without a keyboard. */
  readonly onTap?: (char: string) => void
}

/** Keys with a bump for the index fingers. */
const BUMPS = new Set(["KeyF", "KeyJ"])

const label = (key: Key): string => (key.base.toUpperCase() !== key.base ? key.base.toUpperCase() : key.base)

/** On-screen keyboard: fingers by colour, the next key highlighted. */
export const Keyboard = ({ layout, target, shift, wrong = false, onTap }: Props) => {
  const keyClass = (code: string, finger: string, extra = "") =>
    [
      "edu-kb-key",
      `edu-kb-${finger}`,
      code === target || code === shift ? "edu-kb-target" : "",
      wrong && code === target ? "edu-kb-wrong" : "",
      extra
    ]
      .filter(Boolean)
      .join(" ")

  const charKey = (key: Key) => (
    <button
      key={key.code}
      type="button"
      tabIndex={-1}
      className={keyClass(key.code, key.finger, key.code === "Space" ? "edu-kb-space" : "")}
      onPointerDown={(e) => {
        e.preventDefault()
        onTap?.(key.base)
      }}
    >
      {key.code === "Space" ? "" : label(key)}
      {BUMPS.has(key.code) && <span className="edu-kb-bump" aria-hidden="true" />}
    </button>
  )

  const shiftKey = (code: "ShiftLeft" | "ShiftRight") => (
    <span key={code} className={keyClass(code, code === "ShiftLeft" ? "leftPinky" : "rightPinky", "edu-kb-wide")}>
      Shift
    </span>
  )

  const [digits, top, home, bottom, space] = layout.rows
  return (
    <div className="edu-kb" aria-hidden="true">
      <div className="edu-kb-row">{digits?.map(charKey)}</div>
      <div className="edu-kb-row edu-kb-indent1">{top?.map(charKey)}</div>
      <div className="edu-kb-row edu-kb-indent2">{home?.map(charKey)}</div>
      <div className="edu-kb-row">
        {shiftKey("ShiftLeft")}
        {bottom?.map(charKey)}
        {shiftKey("ShiftRight")}
      </div>
      <div className="edu-kb-row">{space?.map(charKey)}</div>
    </div>
  )
}
