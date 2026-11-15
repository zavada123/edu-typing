import { useEffect, useState } from "react"

/** The box is on the whole screen now; follows the browser, also when Esc leaves the full screen. */
export const useFullscreen = (box: { readonly current: HTMLElement | null }) => {
  const [on, setOn] = useState(false)
  // Known only in the browser: on the server and in the first render the button is not shown.
  const [available, setAvailable] = useState(false)
  useEffect(() => setAvailable(document.fullscreenEnabled === true), [])
  useEffect(() => {
    const sync = () => setOn(document.fullscreenElement !== null && document.fullscreenElement === box.current)
    document.addEventListener("fullscreenchange", sync)
    return () => document.removeEventListener("fullscreenchange", sync)
  }, [box])
  const toggle = () => {
    if (on) void document.exitFullscreen().catch(() => undefined)
    else void box.current?.requestFullscreen().catch(() => undefined)
    box.current?.focus({ preventScroll: true })
  }
  return { on, toggle, available }
}
