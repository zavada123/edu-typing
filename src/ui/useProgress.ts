import { useCallback, useEffect, useState } from "react"
import { emptyProgress, parseProgress, type Progress } from "../core/index.ts"

export const DEFAULT_STORAGE_KEY = "edu-typing:progress:v1"

const read = (key: string): Progress => {
  try {
    return parseProgress(window.localStorage.getItem(key))
  } catch {
    // Private mode or blocked storage: the student can still practise, progress just is not kept.
    return emptyProgress
  }
}

const write = (key: string, p: Progress): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(p))
  } catch {
    // Same as above: storage is a convenience, not a requirement.
  }
}

/**
 * Progress kept in localStorage. The first render uses empty progress, the stored one comes
 * in an effect: the same markup on the server and in the browser (SSR).
 */
export const useProgress = (storageKey: string = DEFAULT_STORAGE_KEY) => {
  const [progress, setProgress] = useState<Progress>(emptyProgress)

  useEffect(() => setProgress(read(storageKey)), [storageKey])

  const update = useCallback(
    (change: (p: Progress) => Progress) => {
      // Re-read first: another tab may have saved a newer state.
      const next = change(read(storageKey))
      write(storageKey, next)
      setProgress(next)
    },
    [storageKey]
  )

  return [progress, update] as const
}
