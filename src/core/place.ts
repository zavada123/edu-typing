import { hotkeyLessons } from "./hotkeys.ts"
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
  | { readonly tab: "hotkeys"; readonly lesson?: string }

const isGameId = (text: string): text is GameId => GAME_IDS.some((g) => g === text)

/** Address parameters of a place: `?lesson=<id>`, `?game=<id>`, `?hotkeys=<id>` or `?tab=test|hotkeys`. */
export const PLACE_PARAMS = ["lesson", "game", "hotkeys", "tab"] as const

/**
 * The place of an address query (`location.search`): `?lesson=<lesson id>`, `?game=<game id>`, `?hotkeys=<shortcut
 * lesson id>`, `?tab=test`, `?tab=hotkeys` or `?tab=course`. No parameter or an unknown lesson or game gives `undefined`.
 */
export const parseStudioPlace = (search: string): StudioPlace | undefined => {
  const params = new URLSearchParams(search)
  const lesson = params.get("lesson")
  if (lesson !== null) return lessons.some((l) => l.id === lesson) ? { tab: "lesson", lesson } : undefined
  const game = params.get("game")
  if (game !== null) return isGameId(game) ? { tab: "games", game } : undefined
  const hotkeys = params.get("hotkeys")
  if (hotkeys !== null) return hotkeyLessons.some((l) => l.id === hotkeys) ? { tab: "hotkeys", lesson: hotkeys } : undefined
  const tab = params.get("tab")
  if (tab === "test") return { tab: "test" }
  if (tab === "hotkeys") return { tab: "hotkeys" }
  if (tab === "course") return { tab: "course" }
  return undefined
}

/**
 * The address parameters of a place; `parseStudioPlace` reads them back. The lesson map has none. The host page sets
 * them and deletes the other names of `PLACE_PARAMS`.
 */
export const formatStudioPlace = (place: StudioPlace): Readonly<Record<string, string>> => {
  switch (place.tab) {
    case "course":
      return {}
    case "lesson":
      return { lesson: place.lesson }
    case "games":
      return { game: place.game }
    case "test":
      return { tab: "test" }
    case "hotkeys":
      return place.lesson === undefined ? { tab: "hotkeys" } : { hotkeys: place.lesson }
  }
}
