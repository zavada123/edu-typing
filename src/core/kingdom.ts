/**
 * «Клавішне королівство»: a real-time strategy game controlled by typing. Words hang over the gold mine, the forest,
 * the barracks and the castle; typing a word gives that order. The student holds the castle until dawn against
 * goblins coming down the road. Goblins are never killed: beaten, they run back to the forest.
 *
 * Pure and deterministic: the state moves in fixed ticks (`tickKingdom`) and changes on each key (`pressKingdom`).
 * The same seed and the same keys at the same ticks give the same game, so a recorded game can be replayed
 * (a "ghost" opponent) or checked on a server.
 *
 * Road coordinates: x from 0 (the castle) to ROAD_END (the goblin camp).
 */

export const TICK_MS = 50
const TICK_S = TICK_MS / 1000

export const ROAD_END = 100
/** Goblins that reach this x hit the castle. */
export const CASTLE_FRONT = 12
const ARCHER_X = 9
export const TOWER_X = 22
const CAMP_X = ROAD_END - 4

export type CommandKind = "gold" | "wood" | "warrior" | "archer" | "tower" | "repair" | "shield"

export interface Cost {
  readonly gold: number
  readonly wood: number
}

export interface CommandInfo {
  readonly title: string
  readonly cost: Cost
  /** Shortest and longest word for this order: big orders take long words. */
  readonly length: readonly [number, number]
}

export const COMMANDS: Readonly<Record<CommandKind, CommandInfo>> = {
  gold: { title: "Копати золото", cost: { gold: 0, wood: 0 }, length: [2, 4] },
  wood: { title: "Рубати дрова", cost: { gold: 0, wood: 0 }, length: [2, 4] },
  warrior: { title: "Найняти мечника", cost: { gold: 5, wood: 0 }, length: [4, 6] },
  archer: { title: "Найняти лучника", cost: { gold: 4, wood: 2 }, length: [4, 6] },
  tower: { title: "Збудувати вежу", cost: { gold: 0, wood: 8 }, length: [5, 8] },
  repair: { title: "Полагодити замок", cost: { gold: 0, wood: 3 }, length: [4, 7] },
  shield: { title: "Чарівний щит", cost: { gold: 6, wood: 4 }, length: [6, 12] }
}

const GOLD_PER_WORD = 2
const WOOD_PER_WORD = 2
const REPAIR_HP = 5
const SHIELD_S = 8
/** Each wrong key while typing an order delays that order. */
export const MISTAKE_DELAY_MS = 300
const MAX_WARRIORS = 5
const MAX_ARCHERS = 3

const CASTLE_HP = 20
const WARRIOR = { hp: 8, dps: 2, speed: 7, reach: 4 } as const
const ARCHER = { range: 45, cooldownS: 1.4, damage: 1 } as const
const TOWER = { range: 40, cooldownS: 1, damage: 1 } as const

export type GoblinKind = "torch" | "tnt"
const GOBLINS: Readonly<Record<GoblinKind, { readonly hp: number; readonly speed: number; readonly dps: number }>> = {
  torch: { hp: 3, speed: 4.5, dps: 1 },
  tnt: { hp: 5, speed: 3, dps: 2 }
}

export interface KingdomOptions {
  /** Seconds until dawn: hold the castle this long to win. */
  readonly durationS: number
  /** Seconds between goblins at the start and at the end of the night. */
  readonly spawnS: readonly [number, number]
  readonly firstGoblinS: number
}

export const KINGDOM_LEVELS = {
  easy: { durationS: 120, spawnS: [11, 5], firstGoblinS: 15 },
  normal: { durationS: 150, spawnS: [7, 1.6], firstGoblinS: 10 },
  hard: { durationS: 180, spawnS: [4, 0.6], firstGoblinS: 8 }
} as const satisfies Readonly<Record<string, KingdomOptions>>

export interface Slot {
  readonly kind: CommandKind
  readonly word: string
}

export interface KingdomUnit {
  readonly id: number
  readonly kind: "warrior" | "archer"
  readonly x: number
  readonly hp: number
  readonly cooldownS: number
  /** True while it hits a goblin, for the animation. */
  readonly fighting: boolean
}

export interface Goblin {
  readonly id: number
  readonly kind: GoblinKind
  readonly x: number
  readonly hp: number
  readonly fighting: boolean
}

export type EffectKind = "arrow" | "fled" | "fallen" | "gold" | "wood" | "built" | "repaired" | "shield" | "hit"

/** Something to animate for a moment: the UI draws it while `tick - born` is small. */
export interface Effect {
  readonly id: number
  readonly kind: EffectKind
  readonly x: number
  readonly toX?: number
  readonly born: number
}

export interface PendingOrder {
  readonly kind: CommandKind
  readonly atTick: number
}

export interface KingdomStats {
  /** Correct keys. */
  readonly typed: number
  readonly mistakes: number
  readonly orders: number
  readonly repelled: number
}

export interface KingdomState {
  readonly options: KingdomOptions
  readonly pool: readonly string[]
  readonly tick: number
  readonly seed: number
  readonly nextId: number
  readonly gold: number
  readonly wood: number
  readonly castleHp: number
  readonly shieldUntil: number
  readonly towerBuilt: boolean
  readonly towerCooldownS: number
  readonly slots: readonly Slot[]
  readonly target: CommandKind | undefined
  readonly typed: number
  readonly targetMistakes: number
  readonly pending: readonly PendingOrder[]
  readonly units: readonly KingdomUnit[]
  readonly goblins: readonly Goblin[]
  readonly effects: readonly Effect[]
  readonly nextGoblinTick: number
  readonly stats: KingdomStats
  readonly over: "won" | "lost" | undefined
  /** Why the last key did nothing, for a hint: "need gold", "too many archers"… */
  readonly notice: { readonly text: string; readonly tick: number } | undefined
}

export const CASTLE_MAX_HP = CASTLE_HP
const EFFECT_TICKS = 20

// ── Seeded random, kept in the state so the game can be saved and replayed. ──

const nextRandom = (seed: number): readonly [number, number] => {
  const a = (seed + 0x6d2b79f5) >>> 0
  let t = a
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a]
}

const secondsToTicks = (s: number): number => Math.round((s * 1000) / TICK_MS)

// ── Words over the orders. ──

const fits = (word: string, [min, max]: readonly [number, number]) => word.length >= min && word.length <= max

/**
 * A word for an order. Every word on screen must start with its own letter: the first key picks the order.
 * Falls back to any free word when no word of the right length is left.
 */
const pickWord = (pool: readonly string[], kind: CommandKind, others: readonly Slot[], seed: number): readonly [string, number] => {
  const taken = new Set(others.map((o) => o.word[0]))
  const free = pool.filter((w) => w.length > 0 && !taken.has(w[0]))
  const sized = free.filter((w) => fits(w, COMMANDS[kind].length))
  const from = sized.length > 0 ? sized : free
  const [r, next] = nextRandom(seed)
  return [from[Math.floor(r * from.length)] ?? "", next]
}

const SLOT_ORDER: readonly CommandKind[] = ["gold", "wood", "warrior", "archer", "tower", "shield"]

export const newKingdom = (pool: readonly string[], options: KingdomOptions, seed: number): KingdomState => {
  let s = seed >>> 0
  const slots: Slot[] = []
  for (const kind of SLOT_ORDER) {
    const [word, next] = pickWord(pool, kind, slots, s)
    s = next
    slots.push({ kind, word })
  }
  return {
    options,
    pool,
    tick: 0,
    seed: s,
    nextId: 1,
    gold: 3,
    wood: 0,
    castleHp: CASTLE_HP,
    shieldUntil: 0,
    towerBuilt: false,
    towerCooldownS: 0,
    slots,
    target: undefined,
    typed: 0,
    targetMistakes: 0,
    pending: [],
    units: [],
    goblins: [],
    effects: [],
    nextGoblinTick: secondsToTicks(options.firstGoblinS),
    stats: { typed: 0, mistakes: 0, orders: 0, repelled: 0 },
    over: undefined,
    notice: undefined
  }
}

// ── Orders. ──

/** Why the order cannot be given now, or undefined when it can. */
export const blockedReason = (s: KingdomState, kind: CommandKind): string | undefined => {
  const cost = COMMANDS[kind].cost
  if (s.gold < cost.gold) return "Бракує золота"
  if (s.wood < cost.wood) return "Бракує дров"
  const count = (k: KingdomUnit["kind"]) => s.units.filter((u) => u.kind === k).length
  if (kind === "warrior" && count("warrior") >= MAX_WARRIORS) return "Усі мечники вже в полі"
  if (kind === "archer" && count("archer") >= MAX_ARCHERS) return "На стінах немає місця"
  if (kind === "repair" && s.castleHp >= CASTLE_HP) return "Замок цілий"
  if (kind === "shield" && s.shieldUntil > s.tick) return "Щит уже стоїть"
  return undefined
}

const addEffect = (s: KingdomState, kind: EffectKind, x: number, toX?: number): KingdomState => ({
  ...s,
  nextId: s.nextId + 1,
  effects: [...s.effects, { id: s.nextId, kind, x, born: s.tick, ...(toX === undefined ? {} : { toX }) }]
})

const addUnit = (s: KingdomState, kind: KingdomUnit["kind"]): KingdomState => ({
  ...s,
  nextId: s.nextId + 1,
  units: [...s.units, { id: s.nextId, kind, x: kind === "archer" ? ARCHER_X : CASTLE_FRONT - 2, hp: WARRIOR.hp, cooldownS: 0, fighting: false }]
})

/** Carries out an order whose word was typed. The cost was paid when the word was finished. */
const carryOut = (s: KingdomState, kind: CommandKind): KingdomState => {
  switch (kind) {
    case "gold":
      return addEffect({ ...s, gold: s.gold + GOLD_PER_WORD }, "gold", 0)
    case "wood":
      return addEffect({ ...s, wood: s.wood + WOOD_PER_WORD }, "wood", 0)
    case "warrior":
    case "archer":
      return addUnit(s, kind)
    case "tower":
      return addEffect({ ...s, towerBuilt: true }, "built", TOWER_X)
    case "repair":
      return addEffect({ ...s, castleHp: Math.min(CASTLE_HP, s.castleHp + REPAIR_HP) }, "repaired", 0)
    case "shield":
      return addEffect({ ...s, shieldUntil: s.tick + secondsToTicks(SHIELD_S) }, "shield", 0)
  }
}

/** A new word for the finished order; the tower order turns into repairs once the tower stands. */
const refreshSlot = (s: KingdomState, kind: CommandKind): KingdomState => {
  const nextKind: CommandKind = kind === "tower" ? "repair" : kind
  const others = s.slots.filter((o) => o.kind !== kind)
  const [word, seed] = pickWord(s.pool, nextKind, others, s.seed)
  return { ...s, seed, slots: s.slots.map((o) => (o.kind === kind ? { kind: nextKind, word } : o)) }
}

const notice = (s: KingdomState, text: string): KingdomState => ({ ...s, notice: { text, tick: s.tick } })

/** One key from the student. Lower-case letters only; the UI handles layout checks. */
export const pressKingdom = (s: KingdomState, char: string): KingdomState => {
  if (s.over) return s
  const mistake = (m: KingdomState): KingdomState => ({
    ...m,
    targetMistakes: m.target ? m.targetMistakes + 1 : 0,
    stats: { ...m.stats, mistakes: m.stats.mistakes + 1 }
  })
  if (s.target === undefined) {
    const slot = s.slots.find((o) => o.word[0] === char)
    if (!slot) return mistake(s)
    const reason = blockedReason(s, slot.kind)
    if (reason) return notice(s, reason)
    return finishIfDone({ ...s, target: slot.kind, typed: 1, targetMistakes: 0, stats: { ...s.stats, typed: s.stats.typed + 1 } })
  }
  const slot = s.slots.find((o) => o.kind === s.target)
  if (!slot || slot.word[s.typed] !== char) return mistake(s)
  return finishIfDone({ ...s, typed: s.typed + 1, stats: { ...s.stats, typed: s.stats.typed + 1 } })
}

const finishIfDone = (s: KingdomState): KingdomState => {
  const slot = s.slots.find((o) => o.kind === s.target)
  if (!slot || s.typed < slot.word.length) return s
  // Resources may have run out while the word was typed.
  const reason = blockedReason(s, slot.kind)
  if (reason) return notice({ ...s, target: undefined, typed: 0, targetMistakes: 0 }, reason)
  const cost = COMMANDS[slot.kind].cost
  const delay = Math.ceil((s.targetMistakes * MISTAKE_DELAY_MS) / TICK_MS)
  const paid: KingdomState = {
    ...s,
    gold: s.gold - cost.gold,
    wood: s.wood - cost.wood,
    target: undefined,
    typed: 0,
    targetMistakes: 0,
    notice: undefined,
    stats: { ...s.stats, orders: s.stats.orders + 1 },
    pending: delay > 0 ? [...s.pending, { kind: slot.kind, atTick: s.tick + delay }] : s.pending
  }
  // The slot gets its next word now, so a delayed tower is not offered twice.
  const refreshed = refreshSlot(paid, slot.kind)
  return delay > 0 ? refreshed : carryOut(refreshed, slot.kind)
}

/** Drops the word being typed (Escape or Backspace), to pick another order. */
export const cancelKingdomTarget = (s: KingdomState): KingdomState => ({ ...s, target: undefined, typed: 0, targetMistakes: 0 })

// ── The night: one fixed tick. ──

const spawnGoblin = (s: KingdomState): KingdomState => {
  if (s.tick < s.nextGoblinTick) return s
  const progress = s.tick / secondsToTicks(s.options.durationS)
  const [r1, seed1] = nextRandom(s.seed)
  const [r2, seed2] = nextRandom(seed1)
  const kind: GoblinKind = r1 < 0.25 + progress * 0.35 ? "tnt" : "torch"
  const [from, to] = s.options.spawnS
  const gapS = from + (to - from) * progress
  // ±30 % so the goblins do not march like a metronome.
  const nextGoblinTick = s.tick + Math.max(1, secondsToTicks(gapS * (0.7 + 0.6 * r2)))
  return {
    ...s,
    seed: seed2,
    nextId: s.nextId + 1,
    nextGoblinTick,
    goblins: [...s.goblins, { id: s.nextId, kind, x: CAMP_X, hp: GOBLINS[kind].hp, fighting: false }]
  }
}

const nearestGoblin = (goblins: readonly Goblin[], x: number, range: number): Goblin | undefined =>
  goblins.filter((g) => g.x >= x && g.x - x <= range).sort((a, b) => a.x - b.x)[0]

/** Archers and the tower: each shot takes one hit point off the nearest goblin in range. */
const shoot = (s: KingdomState): KingdomState => {
  let out = s
  const damage = new Map<number, number>()
  const hit = (from: number, goblin: Goblin, points: number) => {
    damage.set(goblin.id, (damage.get(goblin.id) ?? 0) + points)
    out = addEffect(out, "arrow", from, goblin.x)
  }
  const alive = () => out.goblins.filter((g) => g.hp - (damage.get(g.id) ?? 0) > 0)
  const units = out.units.map((u) => {
    if (u.kind !== "archer") return u
    const cooldownS = Math.max(0, u.cooldownS - TICK_S)
    const goblin = cooldownS === 0 ? nearestGoblin(alive(), u.x, ARCHER.range) : undefined
    if (!goblin) return { ...u, cooldownS }
    hit(u.x, goblin, ARCHER.damage)
    return { ...u, cooldownS: ARCHER.cooldownS }
  })
  out = { ...out, units }
  if (out.towerBuilt) {
    const cooldownS = Math.max(0, out.towerCooldownS - TICK_S)
    const goblin = cooldownS === 0 ? nearestGoblin(alive(), TOWER_X, TOWER.range) : undefined
    if (goblin) hit(TOWER_X, goblin, TOWER.damage)
    out = { ...out, towerCooldownS: goblin ? TOWER.cooldownS : cooldownS }
  }
  return { ...out, goblins: out.goblins.map((g) => ({ ...g, hp: g.hp - (damage.get(g.id) ?? 0) })) }
}

/** Warriors walk to the goblins and fight them; goblins fight warriors in their way or hit the castle. */
const melee = (s: KingdomState): KingdomState => {
  const warriors = s.units.filter((u) => u.kind === "warrior")
  const goblinDamage = new Map<number, number>()
  const warriorDamage = new Map<number, number>()
  const movedWarriors = warriors.map((w) => {
    const foe = nearestGoblin(s.goblins, w.x - 1, WARRIOR.reach + 1)
    if (foe) {
      goblinDamage.set(foe.id, (goblinDamage.get(foe.id) ?? 0) + WARRIOR.dps * TICK_S)
      return { ...w, fighting: true }
    }
    return { ...w, fighting: false, x: Math.min(CAMP_X - 6, w.x + WARRIOR.speed * TICK_S) }
  })
  let castleDamage = 0
  const goblins = s.goblins.map((g) => {
    const blocker = movedWarriors.filter((w) => g.x >= w.x - 1 && g.x - w.x <= WARRIOR.reach).sort((a, b) => b.x - a.x)[0]
    const stats = GOBLINS[g.kind]
    if (blocker) {
      warriorDamage.set(blocker.id, (warriorDamage.get(blocker.id) ?? 0) + stats.dps * TICK_S)
      return { ...g, fighting: true, hp: g.hp - (goblinDamage.get(g.id) ?? 0) }
    }
    if (g.x <= CASTLE_FRONT) {
      castleDamage += stats.dps * TICK_S
      return { ...g, fighting: true, hp: g.hp - (goblinDamage.get(g.id) ?? 0) }
    }
    return { ...g, fighting: false, x: Math.max(CASTLE_FRONT, g.x - stats.speed * TICK_S), hp: g.hp - (goblinDamage.get(g.id) ?? 0) }
  })
  const shielded = s.shieldUntil > s.tick
  const units = s.units.map((u) => {
    const moved = movedWarriors.find((w) => w.id === u.id)
    return moved ? { ...moved, hp: moved.hp - (warriorDamage.get(u.id) ?? 0) } : u
  })
  return { ...s, goblins, units, castleHp: shielded ? s.castleHp : s.castleHp - castleDamage }
}

/** Beaten goblins run home and fallen warriors go back to the castle to rest: nobody dies. */
const sweep = (s: KingdomState): KingdomState => {
  let out = s
  for (const g of s.goblins.filter((g) => g.hp <= 0)) out = addEffect(out, "fled", g.x)
  for (const u of s.units.filter((u) => u.hp <= 0)) out = addEffect(out, "fallen", u.x)
  const repelled = s.goblins.filter((g) => g.hp <= 0).length
  return {
    ...out,
    goblins: out.goblins.filter((g) => g.hp > 0),
    units: out.units.filter((u) => u.hp > 0),
    effects: out.effects.filter((e) => out.tick - e.born < EFFECT_TICKS),
    stats: { ...out.stats, repelled: out.stats.repelled + repelled }
  }
}

const runPending = (s: KingdomState): KingdomState => {
  const due = s.pending.filter((p) => p.atTick <= s.tick)
  if (due.length === 0) return s
  const rest: KingdomState = { ...s, pending: s.pending.filter((p) => p.atTick > s.tick) }
  return due.reduce<KingdomState>((acc, p) => carryOut(acc, p.kind), rest)
}

export const tickKingdom = (s: KingdomState): KingdomState => {
  if (s.over) return s
  const next = sweep(melee(shoot(spawnGoblin(runPending({ ...s, tick: s.tick + 1 })))))
  if (next.castleHp <= 0) return { ...next, castleHp: 0, over: "lost" }
  if (next.tick >= secondsToTicks(s.options.durationS)) return { ...next, over: "won" }
  return next
}

/** Runs the ticks that fit into `ms`, carrying the rest over (pass it back as `carryMs`). */
export const advanceKingdom = (s: KingdomState, ms: number, carryMs: number): readonly [KingdomState, number] => {
  let state = s
  let left = ms + carryMs
  while (left >= TICK_MS && !state.over) {
    state = tickKingdom(state)
    left -= TICK_MS
  }
  return [state, state.over ? 0 : left]
}

// ── Result. ──

/** Share of the night that has passed, 0…1: the sky gets lighter towards dawn. */
export const nightProgress = (s: KingdomState): number => Math.min(1, s.tick / secondsToTicks(s.options.durationS))

export interface KingdomResult {
  readonly won: boolean
  readonly points: number
  readonly stars: 0 | 1 | 2 | 3
  /** Correct keys per minute. */
  readonly cpm: number
  /** Correct keys out of all keys, 0…100. */
  readonly accuracy: number
  readonly repelled: number
  readonly orders: number
}

export const kingdomResult = (s: KingdomState): KingdomResult => {
  const won = s.over === "won"
  const minutes = (s.tick * TICK_MS) / 60_000
  const keys = s.stats.typed + s.stats.mistakes
  const hpShare = s.castleHp / CASTLE_HP
  const stars = !won ? 0 : hpShare >= 0.7 ? 3 : hpShare >= 0.35 ? 2 : 1
  return {
    won,
    points: s.stats.repelled * 10 + s.stats.orders * 2 + (won ? Math.round(s.castleHp) * 5 : 0),
    stars,
    cpm: minutes > 0 ? Math.round(s.stats.typed / minutes) : 0,
    accuracy: keys > 0 ? Math.round((s.stats.typed / keys) * 100) : 100,
    repelled: s.stats.repelled,
    orders: s.stats.orders
  }
}
