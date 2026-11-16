import { lessons } from "./lessons.ts"

/** Typing games of the studio. */
export const GAME_IDS = ["letterfall", "balloons", "kingdom"] as const
export type GameId = (typeof GAME_IDS)[number]

/**
 * A place in the studio that a link can open: the lesson map, one lesson, one game, or the test.
 * The host page keeps it in the address, so a teacher can send a link to one lesson or game.
 */
export type StudioPlace =
  | { readonly tab: "course" }
  | { readonly tab: "lesson"; readonly lesson: string }
  | { readonly tab: "games"; readonly game: GameId }
  | { readonly tab: "test" }

const isGameId = (text: string): text is GameId => GAME_IDS.some((g) => g === text)

/**
 * The place of a link text: `course`, `lesson/<lesson id>`, `games/<game id>` or `test` (a leading `#` is allowed).
 * Unknown text gives `undefined`.
 */
export const parseStudioPlace = (text: string): StudioPlace | undefined => {
  const value = text.replace(/^#/, "")
  if (value === "course") return { tab: "course" }
  if (value === "test") return { tab: "test" }
  const [kind, id = "", ...rest] = value.split("/")
  if (rest.length > 0) return undefined
  if (kind === "lesson" && lessons.some((l) => l.id === id)) return { tab: "lesson", lesson: id }
  if (kind === "games" && isGameId(id)) return { tab: "games", game: id }
  return undefined
}

/** The link text of a place; `parseStudioPlace` reads it back. */
export const formatStudioPlace = (place: StudioPlace): string => {
  switch (place.tab) {
    case "course":
      return "course"
    case "lesson":
      return `lesson/${place.lesson}`
    case "games":
      return `games/${place.game}`
    case "test":
      return "test"
  }
}
