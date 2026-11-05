import {
  DUEL_CASTLE_HP,
  type DuelEffect,
  type DuelPlayer,
  type DuelSide,
  type DuelState,
  type DuelUnit,
  duelBlocked
} from "../../core/duel.ts"
import { type CommandKind, TICK_MS } from "../../core/kingdom.ts"
import { drawGround, drawHpBar, drawWordLabel, HP_BAR_COLORS, LANE_Y, laneOffset, orderCaption, type Painter, painter, roadX } from "./draw.ts"

/**
 * The duel field as one player sees it: their castle on the left (blue), the other castle on the right (red),
 * whichever side of the road they hold. Only the player's own words are shown.
 */

const OWN_LABEL_AT: Readonly<Record<CommandKind, readonly [number, number]>> = {
  shield: [140, 34],
  archer: [140, 100],
  warrior: [140, 418],
  gold: [500, 42],
  wood: [720, 42],
  tower: [roadX(22) + 40, 150],
  repair: [roadX(22) + 40, 150]
}

const MINE_X = 500
const TREES_X = 700

interface View {
  readonly s: DuelState
  readonly me: DuelSide
  /** Road x as seen by this player: own castle at 0. */
  readonly x: (roadX: number) => number
  readonly paint: Painter
  readonly ms: number
}

const other = (side: DuelSide): DuelSide => (side === 0 ? 1 : 0)

const drawCastles = (ctx: CanvasRenderingContext2D, v: View) => {
  const mine = v.s.players[v.me]
  const theirs = v.s.players[other(v.me)]
  v.paint(ctx, mine.castleHp <= 0 ? "castle-destroyed" : "castle-blue", 140, 300, { scale: 0.72 })
  v.paint(ctx, theirs.castleHp <= 0 ? "castle-destroyed" : "castle-red", 1024 - 120, 300, { scale: 0.72 })
  v.paint(ctx, mine.towerBuilt ? "tower-blue" : "tower-construction", roadX(22), 250, { scale: 0.6 })
  if (theirs.towerBuilt) v.paint(ctx, "tower-red", roadX(78), 250, { scale: 0.6 })
  for (const [p, cx] of [[mine, 140], [theirs, 1024 - 120]] as const) {
    if (p.castleHp > 0 && p.castleHp < 10) v.paint(ctx, "fire", cx - 45, 230, { clip: "play", timeMs: v.ms, scale: 0.6 })
    if (p.shieldUntil > v.s.tick) {
      ctx.save()
      ctx.globalAlpha = 0.55 + 0.1 * Math.sin(v.s.tick / 3)
      ctx.beginPath()
      ctx.ellipse(cx, 230, 130, 120, 0, 0, Math.PI * 2)
      ctx.fillStyle = "rgb(147 197 253 / 0.35)"
      ctx.fill()
      ctx.lineWidth = 4
      ctx.strokeStyle = "#60a5fa"
      ctx.stroke()
      ctx.restore()
    }
  }
}

const drawScenery = (ctx: CanvasRenderingContext2D, v: View) => {
  const recent = (kind: DuelEffect["kind"]) => v.s.effects.some((e) => e.side === v.me && e.kind === kind && (v.s.tick - e.born) * TICK_MS < 600)
  v.paint(ctx, recent("gold") ? "gold-mine-active" : "gold-mine", MINE_X, 190, { scale: 0.75 })
  v.paint(ctx, "pawn", MINE_X - 90, 205, { clip: recent("gold") ? "build" : "idle", timeMs: v.ms, scale: 0.75 })
  for (const [i, x] of [TREES_X, TREES_X + 70].entries()) v.paint(ctx, "tree", x, 200 - i * 16, { clip: "idle", timeMs: v.ms + i * 200, scale: 0.6 })
  v.paint(ctx, "pawn", TREES_X - 60, 220, { clip: recent("wood") ? "chop" : "idle", timeMs: v.ms, scale: 0.75 })
  v.paint(ctx, "sheep", 470, 428, { clip: "idle", timeMs: v.ms, scale: 0.5 })
}

const drawUnits = (ctx: CanvasRenderingContext2D, v: View, side: DuelSide, p: DuelPlayer) => {
  const own = side === v.me
  const archers = p.units.filter((u) => u.kind === "archer")
  const sorted = [...p.units].sort((a, b) => laneOffset(a.id) - laneOffset(b.id))
  for (const u of sorted) drawUnit(ctx, v, own, u, archers.findIndex((a) => a.id === u.id))
}

const drawUnit = (ctx: CanvasRenderingContext2D, v: View, own: boolean, u: DuelUnit, wallPlace: number) => {
  const t = v.ms + u.id * 70
  if (u.kind === "archer") {
    const x = own ? 70 + wallPlace * 55 : 1024 - 190 + wallPlace * 55
    v.paint(ctx, own ? "archer" : "archer-red", x, 198, { clip: u.cooldownS > 1 ? "shoot" : "idle", timeMs: t, scale: 0.55, mirror: !own })
    return
  }
  // Distance from its own castle, seen from this player's side of the road.
  const x = roadX(own ? u.d : 100 - u.d)
  v.paint(ctx, own ? "warrior" : "warrior-red", x, LANE_Y + laneOffset(u.id), { clip: u.fighting ? "attack" : "run", timeMs: t, scale: 0.6, mirror: !own })
}

const drawEffect = (ctx: CanvasRenderingContext2D, v: View, e: DuelEffect) => {
  const ms = (v.s.tick - e.born) * TICK_MS
  const fade = Math.max(0, 1 - ms / 1000)
  switch (e.kind) {
    case "arrow": {
      const flight = Math.min(1, ms / 250)
      if (flight >= 1) return
      const from = roadX(v.x(e.x))
      const to = roadX(v.x(e.toX ?? e.x))
      const y = 190 + (LANE_Y - 40 - 190) * flight - Math.sin(flight * Math.PI) * 30
      v.paint(ctx, "arrow", from + (to - from) * flight, y, { scale: 0.7, mirror: to < from })
      return
    }
    case "fallen":
      v.paint(ctx, "explosion", roadX(v.x(e.x)), LANE_Y, { clip: "play", timeMs: ms, scale: 0.5, alpha: fade })
      return
    case "siege":
      v.paint(ctx, "explosion", e.side === v.me ? 200 : 1024 - 180, 260, { clip: "play", timeMs: ms, scale: 0.45, alpha: fade })
      return
    case "gold":
      if (e.side === v.me) v.paint(ctx, "gold", MINE_X, 140 - ms * 0.04, { scale: 0.6, alpha: fade })
      return
    case "wood":
      if (e.side === v.me) v.paint(ctx, "wood", TREES_X, 150 - ms * 0.04, { scale: 0.6, alpha: fade })
      return
    case "built":
      v.paint(ctx, "explosion", roadX(v.x(e.x)), 240, { clip: "play", timeMs: ms, scale: 0.6, alpha: fade })
      return
  }
}

const drawLabels = (ctx: CanvasRenderingContext2D, v: View) => {
  const p = v.s.players[v.me]
  for (const slot of p.slots) {
    const [cx, cy] = OWN_LABEL_AT[slot.kind]
    const active = p.target === slot.kind
    drawWordLabel(ctx, {
      cx,
      cy,
      word: slot.word,
      typed: active ? p.typed : 0,
      active,
      blocked: !active && duelBlocked(v.s, v.me, slot.kind) !== undefined,
      caption: orderCaption(slot.kind)
    })
  }
}

/** Draws the duel for player `me`. `onLoad` asks for another frame when a picture arrives. */
export const drawDuel = (ctx: CanvasRenderingContext2D, s: DuelState, me: DuelSide, onLoad: () => void) => {
  const v: View = { s, me, x: (x) => (me === 0 ? x : 100 - x), paint: painter(onLoad), ms: s.tick * TICK_MS }
  ctx.imageSmoothingEnabled = false
  drawGround(ctx, onLoad)
  drawScenery(ctx, v)
  drawCastles(ctx, v)
  drawUnits(ctx, v, other(me), s.players[other(me)])
  drawUnits(ctx, v, me, s.players[me])
  for (const e of s.effects) drawEffect(ctx, v, e)
  drawHpBar(ctx, 140, 150, s.players[me].castleHp, DUEL_CASTLE_HP, HP_BAR_COLORS.own)
  drawHpBar(ctx, 1024 - 120, 150, s.players[other(me)].castleHp, DUEL_CASTLE_HP, HP_BAR_COLORS.enemy)
  drawLabels(ctx, v)
}
