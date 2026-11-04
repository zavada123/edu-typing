/**
 * Sprite sheets from Tiny Swords (Update 010) by Pixel Frog, CC0 1.0: https://pixelfrog-assets.itch.io/tiny-swords.
 * Frame sizes, anchors and clips come from the manifest of the same pack in edu-blocks (assets/tiny-swords).
 */

export interface Sheet {
  readonly src: string
  /** Frame size in pixels; a picture without frames is one frame. */
  readonly frame: readonly [number, number]
  readonly columns: number
  /** The point the sprite stands on, in frame pixels. */
  readonly anchor: readonly [number, number]
  readonly clips: Readonly<Record<string, { readonly frames: readonly number[]; readonly fps: number }>>
}

const art = (file: string): string => new URL(`./art/${file}`, import.meta.url).href

export const SHEETS = {
  "archer": { src: art("archer.png"), frame: [192, 192], columns: 8, anchor: [100, 134], clips: {"idle": {"frames": [0, 1, 2, 3, 4, 5], "fps": 10}, "run": {"frames": [8, 9, 10, 11, 12, 13], "fps": 10}, "shoot-up": {"frames": [16, 17, 18, 19, 20, 21, 22, 23], "fps": 10}, "shoot-up-side": {"frames": [24, 25, 26, 27, 28, 29, 30, 31], "fps": 10}, "shoot": {"frames": [32, 33, 34, 35, 36, 37, 38, 39], "fps": 10}, "shoot-down-side": {"frames": [40, 41, 42, 43, 44, 45, 46, 47], "fps": 10}, "shoot-down": {"frames": [48, 49, 50, 51, 52, 53, 54, 55], "fps": 10}} },
  "pawn": { src: art("pawn.png"), frame: [192, 192], columns: 6, anchor: [96, 128], clips: {"idle": {"frames": [0, 1, 2, 3, 4, 5], "fps": 10}, "run": {"frames": [6, 7, 8, 9, 10, 11], "fps": 10}, "build": {"frames": [12, 13, 14, 15, 16, 17], "fps": 10}, "chop": {"frames": [18, 19, 20, 21, 22, 23], "fps": 10}, "carry-idle": {"frames": [24, 25, 26, 27, 28, 29], "fps": 10}, "carry-run": {"frames": [30, 31, 32, 33, 34, 35], "fps": 10}} },
  "warrior": { src: art("warrior.png"), frame: [192, 192], columns: 6, anchor: [102, 136], clips: {"idle": {"frames": [0, 1, 2, 3, 4, 5], "fps": 10}, "run": {"frames": [6, 7, 8, 9, 10, 11], "fps": 10}, "attack": {"frames": [12, 13, 14, 15, 16, 17], "fps": 10}, "attack-2": {"frames": [18, 19, 20, 21, 22, 23], "fps": 10}, "attack-down": {"frames": [24, 25, 26, 27, 28, 29], "fps": 10}, "attack-down-2": {"frames": [30, 31, 32, 33, 34, 35], "fps": 10}, "attack-up": {"frames": [36, 37, 38, 39, 40, 41], "fps": 10}, "attack-up-2": {"frames": [42, 43, 44, 45, 46, 47], "fps": 10}} },
  "goblin-torch": { src: art("goblin-torch.png"), frame: [192, 192], columns: 7, anchor: [89, 133], clips: {"idle": {"frames": [0, 1, 2, 3, 4, 5, 6], "fps": 10}, "run": {"frames": [7, 8, 9, 10, 11, 12], "fps": 10}, "attack": {"frames": [14, 15, 16, 17, 18, 19], "fps": 10}, "attack-down": {"frames": [21, 22, 23, 24, 25, 26], "fps": 10}, "attack-up": {"frames": [28, 29, 30, 31, 32, 33], "fps": 10}} },
  "goblin-tnt": { src: art("goblin-tnt.png"), frame: [192, 192], columns: 7, anchor: [101, 135], clips: {"idle": {"frames": [0, 1, 2, 3, 4, 5], "fps": 10}, "run": {"frames": [7, 8, 9, 10, 11, 12], "fps": 10}, "throw": {"frames": [14, 15, 16, 17, 18, 19, 20], "fps": 10}} },
  "arrow": { src: art("arrow.png"), frame: [64, 64], columns: 1, anchor: [32, 42], clips: {} },
  "dead": { src: art("dead.png"), frame: [128, 128], columns: 7, anchor: [65, 99], clips: {"die": {"frames": [0, 1, 2, 3, 4, 5, 6], "fps": 10}, "fade": {"frames": [7, 8, 9, 10, 11, 12, 13], "fps": 10}} },
  "tree": { src: art("tree.png"), frame: [192, 192], columns: 4, anchor: [98, 178], clips: {"idle": {"frames": [0, 1, 2, 3], "fps": 8}, "hit": {"frames": [4, 5], "fps": 8}, "stump": {"frames": [8], "fps": 8}} },
  "gold-mine": { src: art("gold-mine.png"), frame: [192, 128], columns: 1, anchor: [96, 119], clips: {} },
  "gold-mine-active": { src: art("gold-mine-active.png"), frame: [192, 128], columns: 1, anchor: [96, 126], clips: {} },
  "gold": { src: art("gold.png"), frame: [128, 128], columns: 1, anchor: [66, 99], clips: {} },
  "wood": { src: art("wood.png"), frame: [128, 128], columns: 1, anchor: [65, 103], clips: {} },
  "sheep": { src: art("sheep.png"), frame: [128, 128], columns: 8, anchor: [65, 86], clips: {"idle": {"frames": [0, 1, 2, 3, 4, 5, 6, 7], "fps": 8}, "bounce": {"frames": [8, 9, 10, 11, 12, 13], "fps": 8}} },
  "castle-blue": { src: art("castle-blue.png"), frame: [320, 256], columns: 1, anchor: [160, 250], clips: {} },
  "castle-destroyed": { src: art("castle-destroyed.png"), frame: [320, 256], columns: 1, anchor: [160, 254], clips: {} },
  "tower-blue": { src: art("tower-blue.png"), frame: [128, 256], columns: 1, anchor: [64, 235], clips: {} },
  "tower-construction": { src: art("tower-construction.png"), frame: [128, 256], columns: 1, anchor: [64, 232], clips: {} },
  "goblin-house": { src: art("goblin-house.png"), frame: [128, 192], columns: 1, anchor: [64, 171], clips: {} },
  "explosion": { src: art("explosion.png"), frame: [192, 192], columns: 9, anchor: [96, 149], clips: {"play": {"frames": [0, 1, 2, 3, 4, 5, 6, 7, 8], "fps": 12}} },
  "fire": { src: art("fire.png"), frame: [128, 128], columns: 7, anchor: [64, 114], clips: {"play": {"frames": [0, 1, 2, 3, 4, 5, 6], "fps": 10}} },
  "ground": { src: art("ground.png"), frame: [64, 64], columns: 10, anchor: [32, 64], clips: {} },
} as const satisfies Readonly<Record<string, Sheet>>

export type SheetName = keyof typeof SHEETS
