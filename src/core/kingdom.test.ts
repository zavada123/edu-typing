import { describe, expect, test } from "vitest"
import {
  advanceKingdom,
  CASTLE_FRONT,
  CASTLE_MAX_HP,
  cancelKingdomTarget,
  KINGDOM_LEVELS,
  type KingdomState,
  kingdomResult,
  MISTAKE_DELAY_MS,
  newKingdom,
  pressKingdom,
  TICK_MS,
  tickKingdom
} from "./kingdom.ts"
import { WORDS } from "./words.ts"

const POOL = WORDS.uk.filter((w) => w === w.toLowerCase())
const start = (seed = 1): KingdomState => newKingdom(POOL, KINGDOM_LEVELS.normal, seed)

const wordOf = (s: KingdomState, kind: string): string => s.slots.find((o) => o.kind === kind)?.word ?? ""
const typeWord = (s: KingdomState, word: string): KingdomState => [...word].reduce(pressKingdom, s)
const ticks = (s: KingdomState, n: number): KingdomState => Array.from({ length: n }).reduce<KingdomState>((acc) => tickKingdom(acc), s)

describe("kingdom words", () => {
  test("every order on screen starts with its own letter", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const firsts = start(seed).slots.map((o) => o.word[0])
      expect(new Set(firsts).size).toBe(firsts.length)
    }
  })

  test("short words dig gold, long words cast spells", () => {
    const s = start()
    expect(wordOf(s, "gold").length).toBeLessThanOrEqual(4)
    expect(wordOf(s, "shield").length).toBeGreaterThanOrEqual(6)
  })
})

describe("kingdom orders", () => {
  test("typing the word over the mine gives gold and a new word", () => {
    const s = start()
    const word = wordOf(s, "gold")
    const next = typeWord(s, word)
    expect(next.gold).toBe(s.gold + 2)
    expect(next.stats.orders).toBe(1)
    expect(next.stats.typed).toBe(word.length)
    expect(next.target).toBeUndefined()
    const firsts = next.slots.map((o) => o.word[0])
    expect(new Set(firsts).size).toBe(firsts.length)
  })

  test("the first letter picks the order and the next letters must follow its word", () => {
    const s = start()
    const word = wordOf(s, "wood")
    const picked = pressKingdom(s, word[0] ?? "")
    expect(picked.target).toBe("wood")
    const wrong = pressKingdom(picked, "ї")
    expect(wrong.stats.mistakes).toBe(1)
    expect(wrong.typed).toBe(1)
  })

  test("a mistake delays the order instead of cancelling it", () => {
    const s = start()
    const word = wordOf(s, "gold")
    const withMistake = typeWord(pressKingdom(pressKingdom(s, word[0] ?? ""), "ї"), word.slice(1))
    expect(withMistake.gold).toBe(s.gold)
    expect(withMistake.pending).toHaveLength(1)
    const later = ticks(withMistake, MISTAKE_DELAY_MS / TICK_MS)
    expect(later.gold).toBe(s.gold + 2)
    expect(later.pending).toHaveLength(0)
  })

  test("an order you cannot pay for is not picked and says why", () => {
    const s = { ...start(), gold: 0 }
    const next = pressKingdom(s, wordOf(s, "warrior")[0] ?? "")
    expect(next.target).toBeUndefined()
    expect(next.notice?.text).toBe("Бракує золота")
    expect(next.stats.mistakes).toBe(0)
  })

  test("a hired warrior costs gold and walks out of the castle", () => {
    const s = { ...start(), gold: 10 }
    const hired = typeWord(s, wordOf(s, "warrior"))
    expect(hired.gold).toBe(5)
    expect(hired.units).toHaveLength(1)
    const walked = ticks(hired, 20)
    expect(walked.units[0]?.x).toBeGreaterThan(hired.units[0]?.x ?? 0)
  })

  test("once the tower stands, its word repairs the castle", () => {
    const s = { ...start(), wood: 20 }
    const built = typeWord(s, wordOf(s, "tower"))
    expect(built.towerBuilt).toBe(true)
    expect(built.slots.some((o) => o.kind === "repair")).toBe(true)
    expect(built.slots.some((o) => o.kind === "tower")).toBe(false)
    const hurt = { ...built, castleHp: 10 }
    expect(typeWord(hurt, wordOf(hurt, "repair")).castleHp).toBe(15)
  })

  test("Escape drops the word being typed", () => {
    const s = start()
    const picked = pressKingdom(s, wordOf(s, "gold")[0] ?? "")
    expect(cancelKingdomTarget(picked).target).toBeUndefined()
  })
})

describe("kingdom night", () => {
  test("goblins come down the road and hit an unguarded castle", () => {
    const s = ticks(start(), 20 * 1000 / TICK_MS)
    expect(s.goblins.length + s.stats.repelled).toBeGreaterThan(0)
    const atGate: KingdomState = { ...start(), goblins: [{ id: 99, kind: "torch", x: CASTLE_FRONT, hp: 3, fighting: false }] }
    expect(ticks(atGate, 20).castleHp).toBeLessThan(CASTLE_MAX_HP)
  })

  test("the shield keeps the castle whole", () => {
    const s: KingdomState = { ...start(), gold: 10, wood: 10, goblins: [{ id: 99, kind: "tnt", x: CASTLE_FRONT, hp: 5, fighting: false }] }
    const shielded = typeWord(s, wordOf(s, "shield"))
    expect(ticks(shielded, 40).castleHp).toBe(CASTLE_MAX_HP)
  })

  test("archers drive goblins back, and a beaten goblin runs away", () => {
    let s: KingdomState = { ...start(), gold: 20, wood: 20 }
    s = typeWord(s, wordOf(s, "archer"))
    s = { ...s, goblins: [{ id: 99, kind: "torch", x: 40, hp: 1, fighting: false }] }
    const later = ticks(s, 10)
    expect(later.goblins.find((g) => g.id === 99)).toBeUndefined()
    expect(later.stats.repelled).toBe(1)
    expect(later.effects.some((e) => e.kind === "fled")).toBe(true)
  })

  test("the castle falls when its strength runs out", () => {
    const s: KingdomState = { ...start(), castleHp: 0.01, goblins: [{ id: 99, kind: "tnt", x: CASTLE_FRONT, hp: 5, fighting: false }] }
    const over = tickKingdom(s)
    expect(over.over).toBe("lost")
    expect(kingdomResult(over).stars).toBe(0)
  })

  test("holding until dawn wins", () => {
    const s: KingdomState = { ...start(), tick: (KINGDOM_LEVELS.normal.durationS * 1000) / TICK_MS - 1, goblins: [] }
    const over = tickKingdom(s)
    expect(over.over).toBe("won")
    expect(kingdomResult(over).stars).toBe(3)
  })

  test("the same seed and keys replay the same game", () => {
    const play = () => {
      let s = start(7)
      let carry = 0
      for (let i = 0; i < 300; i++) {
        ;[s, carry] = advanceKingdom(s, 33, carry)
        if (i % 25 === 0) s = typeWord(s, wordOf(s, "gold"))
      }
      return s
    }
    expect(play()).toEqual(play())
  })
})

describe("kingdom result", () => {
  test("counts speed and accuracy from the keys", () => {
    const s = start()
    const word = wordOf(s, "gold")
    const typed = pressKingdom(typeWord(s, word), "ї")
    const minute = { ...typed, tick: 60_000 / TICK_MS }
    const r = kingdomResult(minute)
    expect(r.cpm).toBe(word.length)
    expect(r.accuracy).toBe(Math.round((word.length / (word.length + 1)) * 100))
  })
})
