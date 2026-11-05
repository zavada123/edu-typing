import { describe, expect, test } from "vitest"
import {
  advanceDuel,
  applyDuelInput,
  DUEL_CANCEL,
  DUEL_CASTLE_HP,
  DUEL_FORGE_LEVELS,
  DUEL_WARRIOR_HP,
  duelSkipKey,
  duelCost,
  DUEL_ORDERS,
  DUEL_TICKS,
  duelBlocked,
  type DuelInput,
  duelResult,
  type DuelSide,
  type DuelState,
  duelWords,
  newDuel,
  tickDuel
} from "./duel.ts"
import { TICK_MS } from "./kingdom.ts"
import { WORDS } from "./words.ts"

const POOL = WORDS.uk
const start = (seed = 1) => newDuel(POOL, seed)
const wordOf = (s: DuelState, side: DuelSide, kind: string) => s.players[side].slots.find((o) => o.kind === kind)?.word ?? ""
const type = (s: DuelState, side: DuelSide, word: string) => [...word].reduce((acc, key) => applyDuelInput(acc, { side, key }), s)
const ticks = (s: DuelState, n: number) => Array.from({ length: n }).reduce<DuelState>((acc) => tickDuel(acc), s)

describe("duel words", () => {
  test("orders never share a first letter, so the first key picks one order", () => {
    const words = duelWords(POOL, 3)
    const firsts = DUEL_ORDERS.map((k) => new Set((words[k] ?? []).map((w) => w[0])))
    for (const [i, a] of firsts.entries()) for (const b of firsts.slice(i + 1)) expect([...a].filter((x) => b.has(x))).toEqual([])
  })

  test("both players get the same words in the same order, however they play", () => {
    let s = start()
    s = type(s, 0, wordOf(s, 0, "gold"))
    s = type(s, 0, wordOf(s, 0, "wood"))
    s = type(s, 1, wordOf(s, 1, "wood"))
    s = type(s, 1, wordOf(s, 1, "gold"))
    expect(s.players[0].slots).toEqual(s.players[1].slots)
  })
})

describe("duel orders", () => {
  test("a word gives the order only to the player who typed it", () => {
    const s = type(start(), 1, wordOf(start(), 1, "gold"))
    expect(s.players[1].gold).toBe(5)
    expect(s.players[0].gold).toBe(3)
  })

  test("a mistake counts and delays the order", () => {
    const s0 = start()
    const word = wordOf(s0, 0, "gold")
    let s = applyDuelInput(s0, { side: 0, key: word[0] ?? "" })
    s = applyDuelInput(s, { side: 0, key: "ї" })
    s = type(s, 0, word.slice(1))
    expect(s.players[0].mistakes).toBe(1)
    expect(s.players[0].gold).toBe(3)
    expect(ticks(s, 10).players[0].gold).toBe(5)
  })

  test("cancel drops the word being typed", () => {
    const s = applyDuelInput(start(), { side: 0, key: wordOf(start(), 0, "gold")[0] ?? "" })
    expect(applyDuelInput(s, { side: 0, key: DUEL_CANCEL }).players[0].target).toBeUndefined()
  })

  test("a click gives another word for one order, the same next word in both browsers", () => {
    const s0 = start()
    const word = wordOf(s0, 0, "gold")
    const s = applyDuelInput(s0, { side: 0, key: duelSkipKey("gold") })
    expect(wordOf(s, 0, "gold")).not.toBe(word)
    expect(wordOf(applyDuelInput(s0, { side: 1, key: duelSkipKey("gold") }), 1, "gold")).toBe(wordOf(s, 0, "gold"))
    expect(wordOf(s, 1, "gold")).toBe(word)
    expect(s.players[0].mistakes).toBe(0)
  })

  test("another word drops the word being typed", () => {
    const s0 = start()
    const s = applyDuelInput(s0, { side: 0, key: wordOf(s0, 0, "wood")[0] ?? "" })
    expect(applyDuelInput(s, { side: 0, key: duelSkipKey("wood") }).players[0].target).toBeUndefined()
  })

  test("no word has a letter that many keyboards lack", () => {
    const words = Object.values(duelWords(POOL, 5)).flat()
    expect(words.some((w) => w.includes("ґ"))).toBe(false)
  })

  test("orders cost gold and wood", () => {
    const s = start()
    expect(duelBlocked(s, 0, "warrior")).toBe("Бракує золота")
    expect(duelBlocked(s, 0, "tower")).toBe("Бракує дров")
  })
})

describe("duel battle", () => {
  const rich = (s: DuelState): DuelState => ({ ...s, players: [{ ...s.players[0], gold: 99, wood: 99 }, { ...s.players[1], gold: 99, wood: 99 }] })

  test("the forge makes warriors stronger, also those already on the road, up to its last level", () => {
    let s = rich(start())
    s = type(s, 0, wordOf(s, 0, "warrior"))
    s = type(s, 0, wordOf(s, 0, "forge"))
    expect(s.players[0].forge).toBe(1)
    expect(s.players[0].units[0]?.maxHp).toBe(DUEL_WARRIOR_HP + 2)
    s = type(s, 0, wordOf(s, 0, "warrior"))
    expect(s.players[0].units[1]?.hp).toBe(DUEL_WARRIOR_HP + 2)
    const first = duelCost(s, 0, "forge")
    expect(first.gold).toBeGreaterThan(10)
    for (let i = 1; i < DUEL_FORGE_LEVELS; i++) s = type(s, 0, wordOf(s, 0, "forge"))
    expect(duelBlocked(s, 0, "forge")).toBe("Кузня вже найкраща")
  })

  test("a forged warrior beats a plain one", () => {
    let s = rich(start())
    s = type(s, 0, wordOf(s, 0, "forge"))
    s = type(s, 0, wordOf(s, 0, "warrior"))
    s = type(s, 1, wordOf(s, 1, "warrior"))
    s = ticks(s, 200)
    expect(s.players[0].units.filter((u) => u.kind === "warrior")).toHaveLength(1)
    expect(s.players[1].units.filter((u) => u.kind === "warrior")).toHaveLength(0)
  })

  test("the forge opens archers that march and shoot the castle from afar", () => {
    let s = rich(start())
    expect(duelBlocked(s, 0, "ranger")).toBe("Спершу збудуй кузню")
    s = type(s, 0, wordOf(s, 0, "forge"))
    s = type(s, 0, wordOf(s, 0, "ranger"))
    const ranger = s.players[0].units.find((u) => u.kind === "ranger")
    expect(ranger).toBeDefined()
    s = ticks(s, 400)
    expect(s.players[1].castleHp).toBeLessThan(DUEL_CASTLE_HP)
    const far = s.players[0].units.find((u) => u.kind === "ranger")
    expect(far?.d).toBeLessThan(100 - 12)
  })

  test("archers on the road are targets for the other side", () => {
    let s = rich(start())
    s = type(s, 0, wordOf(s, 0, "forge"))
    s = type(s, 0, wordOf(s, 0, "ranger"))
    s = type(s, 1, wordOf(s, 1, "warrior"))
    s = ticks(s, 400)
    expect(s.players[0].units.some((u) => u.kind === "ranger")).toBe(false)
  })

  test("a warrior marches to the other castle and breaks it", () => {
    let s = rich(start())
    s = type(s, 0, wordOf(s, 0, "warrior"))
    s = ticks(s, 400)
    expect(s.players[1].castleHp).toBeLessThan(DUEL_CASTLE_HP)
    expect(s.players[0].castleHp).toBe(DUEL_CASTLE_HP)
  })

  test("warriors of both sides fight in the middle", () => {
    let s = rich(start())
    s = type(s, 0, wordOf(s, 0, "warrior"))
    s = type(s, 1, wordOf(s, 1, "warrior"))
    s = ticks(s, 120)
    expect(s.players[0].units.some((u) => u.fighting)).toBe(true)
  })

  test("the shield keeps the castle whole", () => {
    let s = rich(start())
    s = type(s, 0, wordOf(s, 0, "warrior"))
    s = ticks(s, 180)
    s = type(s, 1, wordOf(s, 1, "shield"))
    const before = s.players[1].castleHp
    expect(ticks(s, 40).players[1].castleHp).toBe(before)
  })

  test("the first broken castle loses", () => {
    const s0 = start()
    const s: DuelState = { ...s0, players: [s0.players[0], { ...s0.players[1], castleHp: 0 }] }
    expect(tickDuel(s).over).toBe(0)
  })

  test("at the end of time the stronger castle wins, equal castles draw", () => {
    const s0 = { ...start(), tick: DUEL_TICKS - 1 }
    expect(tickDuel(s0).over).toBe("draw")
    const hurt: DuelState = { ...s0, players: [{ ...s0.players[0], castleHp: 10 }, s0.players[1]] }
    expect(tickDuel(hurt).over).toBe(1)
  })
})

/** A simple player: types `cpm` keys a minute, picks an order it can pay for. */
const botInputs = (s: DuelState, side: DuelSide, cpm: number, tick: number): DuelInput[] => {
  const every = Math.max(1, Math.round(60_000 / cpm / TICK_MS))
  if (tick % every !== 0) return []
  const p = s.players[side]
  if (p.target) {
    const word = p.slots.find((o) => o.kind === p.target)?.word ?? ""
    return [{ tick, side, key: word[p.typed] ?? "" }]
  }
  const can = (k: string) => p.slots.some((o) => o.kind === k) && duelBlocked(s, side, k as never) === undefined
  const kind = can("warrior") ? "warrior" : can("tower") ? "tower" : can("archer") && p.gold > 8 ? "archer" : p.gold < 5 ? "gold" : "wood"
  return [{ tick, side, key: wordOf(s, side, kind)[0] ?? "" }]
}

const playBots = (cpm0: number, cpm1: number, seed: number) => {
  let s = start(seed)
  while (s.over === undefined) {
    const tick = s.tick + 1
    s = advanceDuel(s, [...botInputs(s, 0, cpm0, tick), ...botInputs(s, 1, cpm1, tick)], tick)
  }
  return s
}

describe("duel as a whole", () => {
  test("the faster typist wins", () => {
    for (const seed of [1, 2, 3]) {
      expect(playBots(150, 90, seed).over).toBe(0)
      expect(playBots(80, 140, seed).over).toBe(1)
    }
  })

  test("the same inputs give the same duel in both browsers", () => {
    const inputs: DuelInput[] = []
    let s = start(9)
    while (s.over === undefined && s.tick < 2000) {
      const tick = s.tick + 1
      const now = [...botInputs(s, 0, 120, tick), ...botInputs(s, 1, 100, tick)]
      inputs.push(...now)
      s = advanceDuel(s, now, tick)
    }
    // The other browser gets the keys in batches and catches up in jumps.
    let other = start(9)
    for (let upTo = 2; upTo <= s.tick; upTo += 2) other = advanceDuel(other, inputs.filter((x) => x.tick > upTo - 2 && x.tick <= upTo), upTo)
    other = advanceDuel(other, inputs.filter((x) => x.tick > other.tick), s.tick)
    expect(other).toEqual(s)
  })

  test("result counts speed and accuracy per player", () => {
    const s = playBots(150, 90, 1)
    expect(duelResult(s, 0).won).toBe(true)
    expect(duelResult(s, 1).won).toBe(false)
    expect(duelResult(s, 0).cpm).toBeGreaterThan(duelResult(s, 1).cpm)
  })
})
