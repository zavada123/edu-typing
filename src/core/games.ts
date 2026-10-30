import { pick, type Random } from "./random.ts"

/**
 * Two arcade games for typing practice. Pure state machines: the UI calls `step` on each
 * animation frame and `press…` on each key, and draws the state.
 * Coordinates: x and y from 0 to 1 across the playing field, y = 0 is the top.
 */

const START_LIVES = 5

// ── Letterfall: letters fall from the sky, press the key before a letter lands. ──

export interface FallingLetter {
  readonly id: number
  readonly char: string
  readonly x: number
  readonly y: number
}

export interface LetterfallState {
  readonly letters: readonly FallingLetter[]
  readonly nextId: number
  readonly lives: number
  readonly points: number
  readonly caught: number
  readonly misses: number
  /** Correct presses in a row: each one adds a bonus point. */
  readonly combo: number
  readonly level: number
  readonly spawnInMs: number
  readonly over: boolean
}

export const LETTERFALL_PER_LEVEL = 10

export const newLetterfall = (): LetterfallState => ({
  letters: [],
  nextId: 1,
  lives: START_LIVES,
  points: 0,
  caught: 0,
  misses: 0,
  combo: 0,
  level: 1,
  spawnInMs: 0,
  over: false
})

/** Field heights per second: a letter needs about 10 s to land on level 1, 5 s on level 6. */
const fallSpeed = (level: number): number => 0.08 + 0.02 * level
const fallSpawnMs = (level: number): number => Math.max(450, 1900 - 150 * level)

export const stepLetterfall = (s: LetterfallState, dtMs: number, chars: readonly string[], random: Random): LetterfallState => {
  if (s.over) return s
  const dy = (fallSpeed(s.level) * dtMs) / 1000
  const moved = s.letters.map((l) => ({ ...l, y: l.y + dy }))
  const landed = moved.filter((l) => l.y >= 1).length
  let letters = moved.filter((l) => l.y < 1)
  let nextId = s.nextId
  let spawnInMs = s.spawnInMs - dtMs
  if (spawnInMs <= 0) {
    const char = pick(chars, random)
    if (char !== undefined) letters = [...letters, { id: nextId, char, x: 0.05 + random() * 0.9, y: 0 }]
    nextId += 1
    spawnInMs = fallSpawnMs(s.level)
  }
  const lives = Math.max(0, s.lives - landed)
  return { ...s, letters, nextId, spawnInMs, lives, combo: landed > 0 ? 0 : s.combo, over: lives === 0 }
}

/** The lowest letter is caught first: it is the most urgent one. */
export const pressLetterfall = (s: LetterfallState, char: string): LetterfallState => {
  if (s.over) return s
  const target = s.letters.filter((l) => l.char === char).sort((a, b) => b.y - a.y)[0]
  if (!target) return { ...s, misses: s.misses + 1, combo: 0 }
  const caught = s.caught + 1
  return {
    ...s,
    letters: s.letters.filter((l) => l.id !== target.id),
    caught,
    combo: s.combo + 1,
    points: s.points + 10 * s.level + s.combo,
    level: 1 + Math.floor(caught / LETTERFALL_PER_LEVEL)
  }
}

/** The letter to catch next: the lowest one. The UI lights its key. */
export const lowestLetter = (s: LetterfallState): FallingLetter | undefined => [...s.letters].sort((a, b) => b.y - a.y)[0]

// ── Balloons: words float up; type a word to pop its balloon before it flies away. ──

export interface Balloon {
  readonly id: number
  readonly word: string
  readonly x: number
  readonly y: number
  /** Index into the colour palette of the UI. */
  readonly color: number
}

export interface BalloonsState {
  readonly balloons: readonly Balloon[]
  readonly nextId: number
  /** The balloon the student is typing now, and how many of its letters are typed. */
  readonly targetId: number | undefined
  readonly typed: number
  readonly lives: number
  readonly points: number
  readonly popped: number
  readonly mistakes: number
  readonly level: number
  readonly spawnInMs: number
  readonly over: boolean
}

export const BALLOONS_PER_LEVEL = 5
export const BALLOON_COLORS = 6
const MAX_BALLOONS = 6

export const newBalloons = (): BalloonsState => ({
  balloons: [],
  nextId: 1,
  targetId: undefined,
  typed: 0,
  lives: START_LIVES,
  points: 0,
  popped: 0,
  mistakes: 0,
  level: 1,
  spawnInMs: 0,
  over: false
})

const riseSpeed = (level: number): number => 0.05 + 0.01 * level
const riseSpawnMs = (level: number): number => Math.max(1300, 3400 - 200 * level)

export const stepBalloons = (s: BalloonsState, dtMs: number, words: readonly string[], random: Random): BalloonsState => {
  if (s.over) return s
  const dy = (riseSpeed(s.level) * dtMs) / 1000
  const moved = s.balloons.map((b) => ({ ...b, y: b.y - dy }))
  const gone = moved.filter((b) => b.y <= 0)
  let balloons = moved.filter((b) => b.y > 0)
  const targetGone = gone.some((b) => b.id === s.targetId)
  let nextId = s.nextId
  let spawnInMs = s.spawnInMs - dtMs
  if (spawnInMs <= 0 && balloons.length < MAX_BALLOONS) {
    // A new word must not start like a word already in the air: the first letter picks the balloon.
    const free = words.filter((w) => !balloons.some((b) => b.word[0] === w[0]))
    const word = pick(free, random)
    if (word !== undefined) {
      balloons = [...balloons, { id: nextId, word, x: 0.08 + random() * 0.84, y: 1, color: nextId % BALLOON_COLORS }]
      nextId += 1
    }
    spawnInMs = riseSpawnMs(s.level)
  }
  const lives = Math.max(0, s.lives - gone.length)
  return {
    ...s,
    balloons,
    nextId,
    spawnInMs,
    lives,
    over: lives === 0,
    ...(targetGone ? { targetId: undefined, typed: 0 } : {})
  }
}

export const pressBalloons = (s: BalloonsState, char: string): BalloonsState => {
  if (s.over) return s
  const target =
    s.balloons.find((b) => b.id === s.targetId) ??
    s.balloons.filter((b) => b.word[0] === char).sort((a, b) => a.y - b.y)[0]
  if (!target || target.word[s.targetId === target.id ? s.typed : 0] !== char) {
    return { ...s, mistakes: s.mistakes + 1 }
  }
  const typed = (s.targetId === target.id ? s.typed : 0) + 1
  if (typed < target.word.length) return { ...s, targetId: target.id, typed }
  const popped = s.popped + 1
  return {
    ...s,
    balloons: s.balloons.filter((b) => b.id !== target.id),
    targetId: undefined,
    typed: 0,
    popped,
    points: s.points + target.word.length * s.level,
    level: 1 + Math.floor(popped / BALLOONS_PER_LEVEL)
  }
}
