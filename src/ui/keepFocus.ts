import { type RefObject, useEffect } from "react"

/** The trainer that had the focus last. Keys typed out of any trainer go to it. */
let owner: object | null = null

const EDITABLE = "input, textarea, select, [contenteditable=''], [contenteditable='true']"

const isEditable = (target: EventTarget | null): boolean => target instanceof Element && target.closest(EDITABLE) !== null

/** A key that types a character: not a shortcut, not Enter, Tab or an arrow. */
const isTypingKey = (e: KeyboardEvent): boolean => !e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1

/**
 * Keeps the typing in the trainer box when the focus goes out of it: after a click on the page, on the
 * "На весь екран" button, on a tab of the studio. A typing key pressed out of any text field goes to the box (the box
 * gets the focus and the key), so the child does not lose the text. With several trainers on a page, the keys go to
 * the one that had the focus last. Enter, Tab and shortcuts keep their usual work.
 */
export const useKeepTypingFocus = (box: RefObject<HTMLElement | null>): void => {
  useEffect(() => {
    const el = box.current
    if (el === null) return undefined
    const token = {}
    const claim = () => {
      owner = token
    }
    if (el.contains(document.activeElement)) claim()
    const onKey = (e: KeyboardEvent) => {
      if (owner !== token || e.defaultPrevented || !isTypingKey(e)) return
      if ((e.target instanceof Node && el.contains(e.target)) || isEditable(e.target)) return
      e.preventDefault()
      el.focus({ preventScroll: true })
      el.dispatchEvent(new KeyboardEvent("keydown", { key: e.key, code: e.code, shiftKey: e.shiftKey, bubbles: true, cancelable: true }))
    }
    el.addEventListener("focusin", claim)
    window.addEventListener("keydown", onKey)
    return () => {
      el.removeEventListener("focusin", claim)
      window.removeEventListener("keydown", onKey)
      if (owner === token) owner = null
    }
  }, [box])
}
