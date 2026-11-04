import { COMMANDS, type CommandKind, MISTAKE_DELAY_MS, ROAD_END, TICK_MS } from "./kingdom.ts"

/**
 * Duel of «Клавішне королівство»: two players, two castles at the ends of one road. Both type the same words in
 * the same order; gold and wood hire warriors that march on the other castle, archers and a tower on the walls
 * shoot the warriors that come. The first to break the other castle wins; at the end of time, the stronger castle.
 *
 * Built for a network game in lockstep: the state changes only through `applyDuelInput` and `tickDuel`, both pure.
 * A server stamps every key with a tick and sends all keys to both players; each browser applies them at that
 * tick and gets the same game. Nothing here is random after the seed.
 *
 * Road: x from 0 (castle of player 0) to ROAD_END (castle of player 1).
 */

export type DuelSide = 0 | 1

/** One key: a lower-case character, or `cancel` (Escape) to drop the word being typed. */
export type DuelKey = string

export interface DuelInput {
  readonly tick: number
  readonly side: DuelSide
  readonly key: DuelKey
}

export const DUEL_CANCEL = "cancel"
export const DUEL_SECONDS = 180
export const DUEL_CASTLE_HP = 30

const TICK_S = TICK_MS / 1000
const CASTLE_FRONT = 12
const WALL = 9
const TOWER = 22
const WARRIOR = { hp: 8, dps: 2, speed: 7, reach: 4 } as const
const ARCHER = { range: 45, cooldownS: 1.4, damage: 1 } as const
const TOWER_SHOT = { range: 40, cooldownS: 1, damage: 1 } as const
const MAX_WARRIORS = 6
const MAX_ARCHERS = 3
const GOLD_PER_WORD = 2
const WOOD_PER_WORD = 2
const REPAIR_HP = 5
const SHIELD_S = 6
const SIEGE_DPS = 1
const EFFECT_TICKS = 20

/** Orders in a duel: no goblins, so the tower and the shield guard against the other player. */
export const DUEL_ORDERS: readonly CommandKind[] = ["gold", "wood", "warrior", "archer", "tower", "shield"]

const ticksOf = (s: number): number => Math.round((s * 1000) / TICK_MS)
export const DUEL_TICKS = ticksOf(DUEL_SECONDS)

/** Road x of a point `d` steps from the castle of `side`. */
export const roadOf = (side: DuelSide, d: number): number => (side === 0 ? d : ROAD_END - d)

export interface DuelUnit {
  readonly id: number
  readonly kind: "warrior" | "archer"
  /** Distance from its own castle. */
  readonly d: number
  readonly hp: number
  readonly cooldownS: number
  readonly fighting: boolean
}

export interface DuelSlot {
  readonly kind: CommandKind
  readonly word: string
  /** How many words this order has had: the next word is `words[kind][count]`. */
  readonly count: number
}

export interface DuelPlayer {
  readonly gold: number
  readonly wood: number
  readonly castleHp: number
  readonly shieldUntil: number
  readonly towerBuilt: boolean
  readonly towerCooldownS: number
  readonly slots: readonly DuelSlot[]
  readonly target: CommandKind | undefined
  readonly typed: number
  readonly targetMistakes: number
  readonly pending: ReadonlyArray<{ readonly kind: CommandKind; readonly atTick: number }>
  readonly units: readonly DuelUnit[]
  readonly typedKeys: number
  readonly mistakes: number
  readonly orders: number
  readonly notice: { readonly text: string; readonly tick: number } | undefined
}

export type DuelEffectKind = "arrow" | "fallen" | "gold" | "wood" | "built" | "siege"

export interface DuelEffect {
  readonly id: number
  readonly side: DuelSide
  readonly kind: DuelEffectKind
  /** Road x. */
  readonly x: number
  readonly toX?: number
  readonly born: number
}

export interface DuelState {
  readonly tick: number
  readonly nextId: number
  /** Word lists per order, the same for both players. */
  readonly words: Readonly<Record<string, readonly string[]>>
  readonly players: readonly [DuelPlayer, DuelPlayer]
  readonly effects: readonly DuelEffect[]
  /** The winner, `draw`, or undefined while the duel goes on. */
  readonly over: DuelSide | "draw" | undefined
}

// ── Words. ──

const nextRandom = (seed: number): readonly [number, number] => {
  const a = (seed + 0x6d2b79f5) >>> 0
  let t = a
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a]
}

const WORDS_PER_ORDER = 400

/**
 * The first letters are shared out between the orders, so two orders never start with the same letter and every
 * order can have its own fixed list: both players then get the same words in the same order, however they play.
 */
export const duelWords = (pool: readonly string[], seed: number): Readonly<Record<string, readonly string[]>> => {
  const clean = [...new Set(pool.filter((w) => w.length > 1 && w === w.toLowerCase()))]
  const letters = [...new Set(clean.map((w) => w[0] ?? ""))].sort()
  // Short orders get the letters with the most short words: they come up most often.
  const byShort = [...letters].sort((a, b) => count(clean, b, 2, 4) - count(clean, a, 2, 4) || a.localeCompare(b))
  const owner = new Map<string, CommandKind>()
  byShort.forEach((letter, i) => owner.set(letter, DUEL_ORDERS[i % DUEL_ORDERS.length] ?? "gold"))
  let s = seed >>> 0
  const out: Record<string, string[]> = {}
  for (const kind of DUEL_ORDERS) {
    const own = clean.filter((w) => owner.get(w[0] ?? "") === kind)
    const [min, max] = COMMANDS[kind].length
    const sized = own.filter((w) => w.length >= min && w.length <= max)
    const from = sized.length >= 3 ? sized : own
    const list: string[] = []
    for (let i = 0; i < WORDS_PER_ORDER && from.length > 0; i++) {
      const [r, next] = nextRandom(s)
      s = next
      list.push(from[Math.floor(r * from.length)] ?? "")
    }
    out[kind] = list
  }
  return out
}

const count = (words: readonly string[], letter: string, min: number, max: number) =>
  words.filter((w) => w[0] === letter && w.length >= min && w.length <= max).length

const wordAt = (words: DuelState["words"], kind: CommandKind, n: number): string => {
  const list = words[kind] ?? []
  return list[n % Math.max(1, list.length)] ?? ""
}

// ── Start. ──

const newPlayer = (words: DuelState["words"]): DuelPlayer => ({
  gold: 3,
  wood: 0,
  castleHp: DUEL_CASTLE_HP,
  shieldUntil: 0,
  towerBuilt: false,
  towerCooldownS: 0,
  slots: DUEL_ORDERS.map((kind) => ({ kind, word: wordAt(words, kind, 0), count: 1 })),
  target: undefined,
  typed: 0,
  targetMistakes: 0,
  pending: [],
  units: [],
  typedKeys: 0,
  mistakes: 0,
  orders: 0,
  notice: undefined
})

export const newDuel = (pool: readonly string[], seed: number): DuelState => {
  const words = duelWords(pool, seed)
  return { tick: 0, nextId: 1, words, players: [newPlayer(words), newPlayer(words)], effects: [], over: undefined }
}

// ── Keys. ──

const setPlayer = (s: DuelState, side: DuelSide, p: DuelPlayer): DuelState => ({
  ...s,
  players: side === 0 ? [p, s.players[1]] : [s.players[0], p]
})

const effect = (s: DuelState, side: DuelSide, kind: DuelEffectKind, x: number, toX?: number): DuelState => ({
  ...s,
  nextId: s.nextId + 1,
  effects: [...s.effects, { id: s.nextId, side, kind, x, born: s.tick, ...(toX === undefined ? {} : { toX }) }]
})

/** Why `side` cannot give the order now, or undefined when it can. */
export const duelBlocked = (s: DuelState, side: DuelSide, kind: CommandKind): string | undefined => {
  const p = s.players[side]
  const cost = COMMANDS[kind].cost
  if (p.gold < cost.gold) return "Бракує золота"
  if (p.wood < cost.wood) return "Бракує дров"
  const units = (k: DuelUnit["kind"]) => p.units.filter((u) => u.kind === k).length
  if (kind === "warrior" && units("warrior") >= MAX_WARRIORS) return "Усі мечники вже в полі"
  if (kind === "archer" && units("archer") >= MAX_ARCHERS) return "На стінах немає місця"
  if (kind === "repair" && p.castleHp >= DUEL_CASTLE_HP) return "Замок цілий"
  if (kind === "shield" && p.shieldUntil > s.tick) return "Щит уже стоїть"
  return undefined
}

const carryOut = (s: DuelState, side: DuelSide, kind: CommandKind): DuelState => {
  const p = s.players[side]
  switch (kind) {
    case "gold":
      return effect(setPlayer(s, side, { ...p, gold: p.gold + GOLD_PER_WORD }), side, "gold", roadOf(side, 30))
    case "wood":
      return effect(setPlayer(s, side, { ...p, wood: p.wood + WOOD_PER_WORD }), side, "wood", roadOf(side, 40))
    case "warrior":
    case "archer": {
      const unit: DuelUnit = { id: s.nextId, kind, d: kind === "archer" ? WALL : CASTLE_FRONT - 2, hp: WARRIOR.hp, cooldownS: 0, fighting: false }
      return { ...setPlayer(s, side, { ...p, units: [...p.units, unit] }), nextId: s.nextId + 1 }
    }
    case "tower":
      return effect(setPlayer(s, side, { ...p, towerBuilt: true }), side, "built", roadOf(side, TOWER))
    case "repair":
      return setPlayer(s, side, { ...p, castleHp: Math.min(DUEL_CASTLE_HP, p.castleHp + REPAIR_HP) })
    case "shield":
      return setPlayer(s, side, { ...p, shieldUntil: s.tick + ticksOf(SHIELD_S) })
  }
}

const notice = (p: DuelPlayer, tick: number, text: string): DuelPlayer => ({ ...p, notice: { text, tick } })

const finishWord = (s: DuelState, side: DuelSide): DuelState => {
  const p = s.players[side]
  const slot = p.slots.find((o) => o.kind === p.target)
  if (!slot || p.typed < slot.word.length) return s
  const reason = duelBlocked(s, side, slot.kind)
  const reset = { ...p, target: undefined, typed: 0, targetMistakes: 0 }
  if (reason) return setPlayer(s, side, notice(reset, s.tick, reason))
  const cost = COMMANDS[slot.kind].cost
  const delay = Math.ceil((p.targetMistakes * MISTAKE_DELAY_MS) / TICK_MS)
  const nextKind: CommandKind = slot.kind === "tower" ? "repair" : slot.kind
  // Repairs take the tower's words and letters, so the lists stay the same for both players.
  const list: CommandKind = slot.kind === "repair" ? "tower" : slot.kind
  const refreshed: DuelSlot = { kind: nextKind, word: wordAt(s.words, list, slot.count), count: slot.count + 1 }
  const paid: DuelPlayer = {
    ...reset,
    gold: p.gold - cost.gold,
    wood: p.wood - cost.wood,
    orders: p.orders + 1,
    notice: undefined,
    slots: p.slots.map((o) => (o === slot ? refreshed : o)),
    pending: delay > 0 ? [...p.pending, { kind: slot.kind, atTick: s.tick + delay }] : p.pending
  }
  const next = setPlayer(s, side, paid)
  return delay > 0 ? next : carryOut(next, side, slot.kind)
}

/** One key of one player, applied before the tick it is stamped with. */
export const applyDuelInput = (s: DuelState, input: Pick<DuelInput, "side" | "key">): DuelState => {
  if (s.over !== undefined) return s
  const { side, key } = input
  const p = s.players[side]
  if (key === DUEL_CANCEL) return setPlayer(s, side, { ...p, target: undefined, typed: 0, targetMistakes: 0 })
  const mistake = setPlayer(s, side, { ...p, mistakes: p.mistakes + 1, targetMistakes: p.target ? p.targetMistakes + 1 : 0 })
  if (p.target === undefined) {
    const slot = p.slots.find((o) => o.word[0] === key)
    if (!slot) return mistake
    const reason = duelBlocked(s, side, slot.kind)
    if (reason) return setPlayer(s, side, notice(p, s.tick, reason))
    return finishWord(setPlayer(s, side, { ...p, target: slot.kind, typed: 1, targetMistakes: 0, typedKeys: p.typedKeys + 1 }), side)
  }
  const slot = p.slots.find((o) => o.kind === p.target)
  if (!slot || slot.word[p.typed] !== key) return mistake
  return finishWord(setPlayer(s, side, { ...p, typed: p.typed + 1, typedKeys: p.typedKeys + 1 }), side)
}

// ── One tick of the battle. ──

const enemyOf = (side: DuelSide): DuelSide => (side === 0 ? 1 : 0)

/** Warriors of `foe` as distances from the castle of `side`. */
const foesSeenFrom = (s: DuelState, side: DuelSide): ReadonlyArray<{ readonly id: number; readonly d: number; readonly hp: number }> =>
  s.players[enemyOf(side)].units.filter((u) => u.kind === "warrior").map((u) => ({ id: u.id, d: ROAD_END - u.d, hp: u.hp }))

const nearest = <T extends { readonly d: number }>(list: readonly T[], from: number, range: number): T | undefined =>
  list.filter((f) => f.d >= from - 1 && f.d - from <= range).sort((a, b) => a.d - b.d)[0]

const runPending = (s: DuelState, side: DuelSide): DuelState => {
  const p = s.players[side]
  const due = p.pending.filter((o) => o.atTick <= s.tick)
  if (due.length === 0) return s
  const rest = setPlayer(s, side, { ...p, pending: p.pending.filter((o) => o.atTick > s.tick) })
  return due.reduce<DuelState>((acc, o) => carryOut(acc, side, o.kind), rest)
}

/** Damage each side deals this tick: to enemy units by id, and to the enemy castle. */
interface Hits {
  readonly units: Map<number, number>
  castle: number
}

const fight = (s: DuelState, side: DuelSide, hits: Hits, out: { state: DuelState }): DuelPlayer => {
  const p = s.players[side]
  const foes = foesSeenFrom(s, side)
  const add = (id: number, n: number) => hits.units.set(id, (hits.units.get(id) ?? 0) + n)
  const units = p.units.map((u) => {
    if (u.kind === "archer") {
      const cooldownS = Math.max(0, u.cooldownS - TICK_S)
      const foe = cooldownS === 0 ? nearest(foes, u.d, ARCHER.range) : undefined
      if (!foe) return { ...u, cooldownS }
      add(foe.id, ARCHER.damage)
      out.state = effect(out.state, side, "arrow", roadOf(side, u.d), roadOf(side, foe.d))
      return { ...u, cooldownS: ARCHER.cooldownS }
    }
    const foe = nearest(foes, u.d, WARRIOR.reach)
    if (foe) {
      add(foe.id, WARRIOR.dps * TICK_S)
      return { ...u, fighting: true }
    }
    if (u.d >= ROAD_END - CASTLE_FRONT) {
      hits.castle += SIEGE_DPS * TICK_S
      return { ...u, fighting: true }
    }
    return { ...u, fighting: false, d: Math.min(ROAD_END - CASTLE_FRONT, u.d + WARRIOR.speed * TICK_S) }
  })
  let towerCooldownS = p.towerCooldownS
  if (p.towerBuilt) {
    towerCooldownS = Math.max(0, towerCooldownS - TICK_S)
    const foe = towerCooldownS === 0 ? nearest(foes, TOWER, TOWER_SHOT.range) : undefined
    if (foe) {
      add(foe.id, TOWER_SHOT.damage)
      out.state = effect(out.state, side, "arrow", roadOf(side, TOWER), roadOf(side, foe.d))
      towerCooldownS = TOWER_SHOT.cooldownS
    }
  }
  return { ...p, units, towerCooldownS }
}

const battle = (s: DuelState): DuelState => {
  const hits: [Hits, Hits] = [{ units: new Map(), castle: 0 }, { units: new Map(), castle: 0 }]
  const out = { state: s }
  const moved: [DuelPlayer, DuelPlayer] = [fight(s, 0, hits[0], out), fight(s, 1, hits[1], out)]
  let state: DuelState = { ...out.state, players: moved }
  for (const side of [0, 1] as const) {
    const p = state.players[side]
    const taken = hits[enemyOf(side)]
    const shielded = p.shieldUntil > state.tick
    const units = p.units.map((u) => ({ ...u, hp: u.hp - (taken.units.get(u.id) ?? 0) }))
    for (const u of units.filter((u) => u.hp <= 0)) state = effect(state, side, "fallen", roadOf(side, u.d))
    if (taken.castle > 0 && !shielded && state.tick % 10 === 0) state = effect(state, side, "siege", roadOf(side, CASTLE_FRONT))
    state = setPlayer(state, side, {
      ...state.players[side],
      units: units.filter((u) => u.hp > 0),
      castleHp: shielded ? p.castleHp : Math.max(0, p.castleHp - taken.castle)
    })
  }
  return { ...state, effects: state.effects.filter((e) => state.tick - e.born < EFFECT_TICKS) }
}

const verdict = (s: DuelState): DuelState["over"] => {
  const [a, b] = s.players
  if (a.castleHp <= 0 && b.castleHp <= 0) return "draw"
  if (a.castleHp <= 0) return 1
  if (b.castleHp <= 0) return 0
  if (s.tick < DUEL_TICKS) return undefined
  if (Math.abs(a.castleHp - b.castleHp) < 0.01) return "draw"
  return a.castleHp > b.castleHp ? 0 : 1
}

export const tickDuel = (s: DuelState): DuelState => {
  if (s.over !== undefined) return s
  const next = battle(runPending(runPending({ ...s, tick: s.tick + 1 }, 0), 1))
  return { ...next, over: verdict(next) }
}

/**
 * Plays the duel forward to `upTo` (a tick the server confirmed), applying each input before its tick.
 * Inputs are sorted by tick, then in the order the server sent them; earlier ticks are ignored.
 */
export const advanceDuel = (s: DuelState, inputs: readonly DuelInput[], upTo: number): DuelState => {
  let state = s
  let i = 0
  const queue = inputs.filter((x) => x.tick > s.tick).sort((a, b) => a.tick - b.tick)
  while (state.tick < upTo && state.over === undefined) {
    const tick = state.tick + 1
    while (i < queue.length && (queue[i]?.tick ?? Infinity) <= tick) {
      const input = queue[i]
      if (input) state = applyDuelInput(state, input)
      i += 1
    }
    state = tickDuel(state)
  }
  return state
}

export interface DuelResult {
  readonly won: boolean
  readonly draw: boolean
  readonly cpm: number
  readonly accuracy: number
  readonly orders: number
}

export const duelResult = (s: DuelState, side: DuelSide): DuelResult => {
  const p = s.players[side]
  const minutes = (s.tick * TICK_MS) / 60_000
  const keys = p.typedKeys + p.mistakes
  return {
    won: s.over === side,
    draw: s.over === "draw",
    cpm: minutes > 0 ? Math.round(p.typedKeys / minutes) : 0,
    accuracy: keys > 0 ? Math.round((p.typedKeys / keys) * 100) : 100,
    orders: p.orders
  }
}
