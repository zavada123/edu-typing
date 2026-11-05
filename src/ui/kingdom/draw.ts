import {
  blockedReason,
  CASTLE_MAX_HP,
  type CommandKind,
  COMMANDS,
  type Cost,
  type Effect,
  type Goblin,
  goblinMaxHp,
  type KingdomState,
  type KingdomUnit,
  nightProgress,
  SIEGE_X,
  TICK_MS,
  TOWER_X,
  WARRIOR_MAX_HP
} from "../../core/kingdom.ts"
import { type SheetName, SHEETS } from "./sheets.ts"

/** The field in canvas pixels: 16 × 7 cells of the 64-pixel Tiny Swords grid. */
export const FIELD = { width: 1024, height: 448 } as const
const CELL = 64

/** Height of the bar with gold, wood and time over the field, inside the same canvas. */
export const HUD_HEIGHT = 44
/** The whole canvas: the bar on top, the field under it. */
export const CANVAS = { width: FIELD.width, height: FIELD.height + HUD_HEIGHT } as const

/** What the bar over the field shows: resources on the left, time in the middle, the score or names on the right. */
export interface Hud {
  readonly gold: number
  readonly wood: number
  /** More counters after gold and wood, as [icon, value]. */
  readonly more: ReadonlyArray<readonly [string, string]>
  readonly time: string
  readonly timeCaption: string
  readonly right: string
}

/** Draws the bar over the field. */
export const drawHud = (ctx: CanvasRenderingContext2D, hud: Hud) => {
  ctx.save()
  const gradient = ctx.createLinearGradient(0, 0, 0, HUD_HEIGHT)
  gradient.addColorStop(0, "#5b3a1e")
  gradient.addColorStop(1, "#3f2712")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, CANVAS.width, HUD_HEIGHT)
  ctx.fillStyle = "#c08a4a"
  ctx.fillRect(0, HUD_HEIGHT - 3, CANVAS.width, 3)
  ctx.textBaseline = "middle"
  const mid = HUD_HEIGHT / 2 - 1
  const chip = (x: number, icon: string, value: string): number => {
    ctx.font = "700 20px system-ui, sans-serif"
    const w = ctx.measureText(value).width + 52
    ctx.fillStyle = "rgb(0 0 0 / 0.28)"
    ctx.beginPath()
    ctx.roundRect(x, 7, w, HUD_HEIGHT - 17, 13)
    ctx.fill()
    ctx.font = "18px system-ui, sans-serif"
    // A colour emoji takes the alpha of the fill.
    ctx.fillStyle = "#ffffff"
    ctx.fillText(icon, x + 10, mid)
    ctx.font = "700 20px system-ui, sans-serif"
    ctx.fillStyle = "#fde68a"
    ctx.fillText(value, x + 40, mid)
    return x + w + 10
  }
  const chips: ReadonlyArray<readonly [string, string]> = [[COST_ICONS.gold, String(hud.gold)], [COST_ICONS.wood, String(hud.wood)], ...hud.more]
  chips.reduce((x, [icon, value]) => chip(x, icon, value), 12)
  ctx.font = "500 14px system-ui, sans-serif"
  const caption = `${hud.timeCaption} `
  const captionW = ctx.measureText(caption).width
  ctx.font = "800 22px system-ui, sans-serif"
  const timeW = ctx.measureText(hud.time).width
  const left = CANVAS.width / 2 - (captionW + timeW) / 2
  ctx.font = "500 14px system-ui, sans-serif"
  ctx.fillStyle = "#f5deb3"
  ctx.fillText(caption, left, mid)
  ctx.font = "800 22px system-ui, sans-serif"
  ctx.fillStyle = "#ffffff"
  ctx.fillText(hud.time, left + captionW, mid)
  ctx.font = "700 16px system-ui, sans-serif"
  ctx.fillStyle = "#f5deb3"
  ctx.fillText(hud.right, CANVAS.width - 14 - ctx.measureText(hud.right).width, mid)
  ctx.restore()
}

/** Draws the field under the bar: everything inside `draw` uses field coordinates. */
export const underHud = (ctx: CanvasRenderingContext2D, draw: () => void) => {
  ctx.save()
  ctx.translate(0, HUD_HEIGHT)
  draw()
  ctx.restore()
}

/** Road x (0…100) to canvas x. */
export const roadX = (x: number): number => 150 + x * 8.5
export const LANE_Y = 336
const ROAD_ROWS = [4, 5] as const

const images = new Map<string, HTMLImageElement>()

/** The picture, or null while it loads; `onLoad` asks for one more frame when it arrives. */
export const image = (src: string, onLoad: () => void): HTMLImageElement | null => {
  const known = images.get(src)
  if (known) return known.complete && known.naturalWidth > 0 ? known : null
  const img = new Image()
  img.addEventListener("load", onLoad, { once: true })
  img.src = src
  images.set(src, img)
  return null
}

interface SpriteOptions {
  readonly clip?: string
  /** Time in ms for the clip's frame. */
  readonly timeMs?: number
  readonly scale?: number
  readonly mirror?: boolean
  readonly alpha?: number
  /** A fixed frame instead of the clip's time. */
  readonly frameIndex?: number
}

export type Painter = (ctx: CanvasRenderingContext2D, name: SheetName, x: number, y: number, o?: SpriteOptions) => void

export const painter =
  (onLoad: () => void): Painter =>
  (ctx, name, x, y, o = {}) => {
    const sheet = SHEETS[name]
    const img = image(sheet.src, onLoad)
    if (!img) return
    const clips: Readonly<Record<string, { readonly frames: readonly number[]; readonly fps: number }>> = sheet.clips
    const clip = o.clip ? clips[o.clip] : undefined
    const frame = o.frameIndex ?? (clip ? (clip.frames[Math.floor(((o.timeMs ?? 0) / 1000) * clip.fps) % clip.frames.length] ?? 0) : 0)
    const [fw, fh] = sheet.frame
    const sx = (frame % sheet.columns) * fw
    const sy = Math.floor(frame / sheet.columns) * fh
    const scale = o.scale ?? 1
    const [ax, ay] = sheet.anchor
    ctx.save()
    ctx.globalAlpha = o.alpha ?? 1
    ctx.translate(x, y)
    if (o.mirror) ctx.scale(-1, 1)
    ctx.drawImage(img, sx, sy, fw, fh, -ax * scale, -ay * scale, fw * scale, fh * scale)
    ctx.restore()
  }

const drawTile = (ctx: CanvasRenderingContext2D, col: number, row: number, x: number, y: number, onLoad: () => void) => {
  const img = image(SHEETS.ground.src, onLoad)
  if (img) ctx.drawImage(img, col * CELL, row * CELL, CELL, CELL, x, y, CELL, CELL)
}

/** Grass everywhere and a sandy road from the castle to the goblin camp. */
export const drawGround = (ctx: CanvasRenderingContext2D, onLoad: () => void) => {
  ctx.fillStyle = "#6bb35d"
  ctx.fillRect(0, 0, FIELD.width, FIELD.height)
  for (let y = 0; y < FIELD.height / CELL; y++) for (let x = 0; x < FIELD.width / CELL; x++) drawTile(ctx, 1, 1, x * CELL, y * CELL, onLoad)
  const [top, bottom] = ROAD_ROWS
  const ROAD_START = 3
  for (let x = ROAD_START; x < FIELD.width / CELL; x++) {
    const col = x === ROAD_START ? 5 : 6
    drawTile(ctx, col, 0, x * CELL, top * CELL, onLoad)
    drawTile(ctx, col, 2, x * CELL, bottom * CELL, onLoad)
  }
}

/** Where the word of each order hangs, in canvas pixels (the centre of the label). */
const LABEL_AT: Readonly<Record<CommandKind, readonly [number, number]>> = {
  shield: [140, 34],
  archer: [140, 100],
  warrior: [140, 418],
  gold: [520, 42],
  wood: [800, 42],
  tower: [roadX(TOWER_X) + 90, 205],
  repair: [roadX(TOWER_X) + 90, 205],
  // Orders of the duel only; the night against goblins never shows them.
  forge: [400, 418],
  ranger: [660, 418]
}

export const COST_ICONS = { gold: "🪙", wood: "🪵" } as const

export const costText = (kind: CommandKind, cost: Cost = COMMANDS[kind].cost): string => {
  const { gold, wood } = cost
  return [gold > 0 ? `${gold}${COST_ICONS.gold}` : "", wood > 0 ? `${wood}${COST_ICONS.wood}` : ""].filter(Boolean).join(" ")
}

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

export interface WordLabel {
  readonly cx: number
  readonly cy: number
  readonly word: string
  readonly typed: number
  readonly active: boolean
  readonly blocked: boolean
  readonly caption: string
}

/** A round button on the canvas, in canvas pixels: the mouse finds it by its centre and radius. */
export interface CanvasButton<K> {
  readonly id: K
  readonly x: number
  readonly y: number
  readonly r: number
}

/** The button that a click at canvas point (x, y) hits. */
export const buttonAt = <K>(buttons: ReadonlyArray<CanvasButton<K>>, x: number, y: number): CanvasButton<K> | undefined =>
  buttons.find((b) => (b.x - x) ** 2 + (b.y - y) ** 2 <= (b.r + 4) ** 2)

/** Canvas pixels of a click on a canvas that CSS stretched to another size. */
export const canvasPoint = (canvas: HTMLCanvasElement, clientX: number, clientY: number): readonly [number, number] => {
  const box = canvas.getBoundingClientRect()
  return [((clientX - box.left) / box.width) * canvas.width, ((clientY - box.top) / box.height) * canvas.height]
}

const REFRESH_R = 13

/** The «another word» button on the corner of a word label. */
const drawRefresh = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, REFRESH_R, 0, Math.PI * 2)
  ctx.fillStyle = "#ffffff"
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = "#2563eb"
  ctx.stroke()
  ctx.font = "700 17px system-ui, sans-serif"
  ctx.fillStyle = "#2563eb"
  ctx.textBaseline = "middle"
  ctx.fillText("↻", x - ctx.measureText("↻").width / 2, y + 1)
  ctx.restore()
}

/**
 * The word of an order: typed letters green, the rest dark; faded when the order cannot be given now. A small
 * button on its corner gives another word; the result is where that button is, in field pixels.
 */
export const drawWordLabel = (ctx: CanvasRenderingContext2D, l: WordLabel): readonly [number, number] => {
  const { cx, cy, word, typed, active, blocked, caption } = l
  ctx.save()
  ctx.font = "700 26px system-ui, sans-serif"
  const done = word.slice(0, typed)
  const rest = word.slice(typed)
  const wordWidth = ctx.measureText(word).width
  ctx.font = "500 13px system-ui, sans-serif"
  const width = Math.max(wordWidth, ctx.measureText(caption).width) + 24
  const height = 52
  ctx.globalAlpha = blocked ? 0.55 : 1
  roundRect(ctx, cx - width / 2, cy - height / 2, width, height, 10)
  ctx.fillStyle = active ? "#fef9c3" : "rgb(255 255 255 / 0.94)"
  ctx.fill()
  ctx.lineWidth = active ? 3 : 1.5
  ctx.strokeStyle = active ? "#ca8a04" : "rgb(15 23 42 / 0.25)"
  ctx.stroke()
  ctx.font = "700 26px system-ui, sans-serif"
  ctx.textBaseline = "alphabetic"
  const left = cx - wordWidth / 2
  ctx.fillStyle = "#16a34a"
  ctx.fillText(done, left, cy + 4)
  ctx.fillStyle = blocked ? "#64748b" : "#0f172a"
  ctx.fillText(rest, left + ctx.measureText(done).width, cy + 4)
  ctx.font = "500 13px system-ui, sans-serif"
  ctx.fillStyle = "#475569"
  ctx.fillText(caption, cx - ctx.measureText(caption).width / 2, cy + 20)
  ctx.restore()
  const button = [cx + width / 2 - 2, cy - height / 2 + 2] as const
  drawRefresh(ctx, button[0], button[1])
  return button
}

/** The «another word» buttons of the labels, moved from field pixels to canvas pixels (under the bar). */
export const refreshButtons = <K>(at: ReadonlyArray<readonly [K, readonly [number, number]]>): ReadonlyArray<CanvasButton<K>> =>
  at.map(([id, [x, y]]) => ({ id, x, y: y + HUD_HEIGHT, r: REFRESH_R }))

export const orderCaption = (kind: CommandKind, cost: Cost = COMMANDS[kind].cost): string =>
  [COMMANDS[kind].title, costText(kind, cost)].filter(Boolean).join(" · ")

const drawLabel = (ctx: CanvasRenderingContext2D, s: KingdomState, kind: CommandKind, word: string): readonly [number, number] => {
  const [cx, cy] = LABEL_AT[kind]
  const active = s.target === kind
  return drawWordLabel(ctx, {
    cx,
    cy,
    word,
    typed: active ? s.typed : 0,
    active,
    blocked: !active && blockedReason(s, kind) !== undefined,
    caption: orderCaption(kind)
  })
}

/** Hit points over a castle or the goblin camp: a bar with the number in it. */
export const drawHpBar = (ctx: CanvasRenderingContext2D, cx: number, y: number, hp: number, max: number, color: string) => {
  const w = 96
  const h = 14
  const x = Math.min(FIELD.width - w - 6, Math.max(6, cx - w / 2))
  const share = Math.max(0, Math.min(1, hp / max))
  ctx.save()
  ctx.fillStyle = "rgb(15 23 42 / 0.65)"
  ctx.beginPath()
  ctx.roundRect(x - 2, y - 2, w + 4, h + 4, 5)
  ctx.fill()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(x, y, w * share, h, 4)
  ctx.fill()
  ctx.font = "700 11px system-ui, sans-serif"
  ctx.fillStyle = "#ffffff"
  const text = `${Math.ceil(hp)}/${max}`
  ctx.fillText(text, x + w / 2 - ctx.measureText(text).width / 2, y + 11)
  ctx.restore()
}

/** A small bar over a fighter: how much of its strength is left. */
export const drawUnitBar = (ctx: CanvasRenderingContext2D, cx: number, y: number, hp: number, max: number, color: string) => {
  const w = 34
  const share = Math.max(0, Math.min(1, hp / max))
  ctx.save()
  ctx.fillStyle = "rgb(15 23 42 / 0.6)"
  ctx.fillRect(cx - w / 2 - 1, y - 1, w + 2, 6)
  ctx.fillStyle = color
  ctx.fillRect(cx - w / 2, y, w * share, 4)
  ctx.restore()
}

/** The archer that stands on a built tower and shoots its arrows. */
export const drawTowerArcher = (
  paint: Painter,
  ctx: CanvasRenderingContext2D,
  sheet: "archer" | "archer-red",
  towerX: number,
  cooldownS: number,
  timeMs: number,
  mirror: boolean
) => paint(ctx, sheet, towerX, TOWER_TOP_Y, { clip: cooldownS > 0.6 ? "shoot" : "idle", timeMs, scale: 0.45, mirror })

/** Where the archer stands on a tower drawn at y 250 with scale 0.6. */
const TOWER_TOP_Y = 150

/** Height of a unit bar over the feet of a fighter on the road. */
export const UNIT_BAR_DY = 62

const CAMP_CX = roadX(98)
const OWN_BAR = "#3b82f6"
const ENEMY_BAR = "#ef4444"
export const HP_BAR_COLORS = { own: OWN_BAR, enemy: ENEMY_BAR } as const

const tickMs = (s: KingdomState) => s.tick * TICK_MS
const age = (s: KingdomState, e: Effect) => (s.tick - e.born) * TICK_MS

/** A little spread across the road so a crowd does not stand in one spot. */
export const laneOffset = (id: number): number => ((id % 3) - 1) * 16

const drawUnit = (ctx: CanvasRenderingContext2D, paint: Painter, s: KingdomState, u: KingdomUnit) => {
  const t = tickMs(s) + u.id * 70
  if (u.kind === "archer") {
    const archers = s.units.filter((a) => a.kind === "archer")
    const place = archers.findIndex((a) => a.id === u.id)
    paint(ctx, "archer", 70 + place * 55, 198, { clip: u.cooldownS > 1 ? "shoot" : "idle", timeMs: t, scale: 0.55 })
    return
  }
  const y = LANE_Y + laneOffset(u.id)
  paint(ctx, "warrior", roadX(u.x), y, { clip: u.fighting ? "attack" : "run", timeMs: t, scale: 0.6 })
  drawUnitBar(ctx, roadX(u.x), y - UNIT_BAR_DY, u.hp, WARRIOR_MAX_HP, OWN_BAR)
}

const drawGoblin = (ctx: CanvasRenderingContext2D, paint: Painter, s: KingdomState, g: Goblin) => {
  const name = g.kind === "tnt" ? "goblin-tnt" : "goblin-torch"
  const clip = g.fighting ? (g.kind === "tnt" ? "throw" : "attack") : "run"
  const y = LANE_Y + laneOffset(g.id)
  paint(ctx, name, roadX(g.x), y, { clip, timeMs: tickMs(s) + g.id * 90, scale: 0.6, mirror: true })
  drawUnitBar(ctx, roadX(g.x), y - UNIT_BAR_DY, g.hp, goblinMaxHp(g.kind), ENEMY_BAR)
}

const drawEffect = (ctx: CanvasRenderingContext2D, paint: Painter, s: KingdomState, e: Effect) => {
  const ms = age(s, e)
  const fade = Math.max(0, 1 - ms / 1000)
  switch (e.kind) {
    case "arrow": {
      const flight = Math.min(1, ms / 250)
      if (flight >= 1) return
      const from = e.x <= 10 ? 120 : roadX(e.x)
      const to = roadX(e.toX ?? e.x)
      const x = from + (to - from) * flight
      const y = (e.x <= 10 ? 190 : 120) + (LANE_Y - 40 - (e.x <= 10 ? 190 : 120)) * flight - Math.sin(flight * Math.PI) * 30
      paint(ctx, "arrow", x, y, { scale: 0.7 })
      return
    }
    case "fled":
      // Beaten goblins run back to their camp.
      paint(ctx, "goblin-torch", roadX(e.x) + ms * 0.25, LANE_Y + laneOffset(e.id), { clip: "run", timeMs: ms, scale: 0.6, alpha: fade })
      return
    case "fallen":
      paint(ctx, "explosion", roadX(e.x), LANE_Y, { clip: "play", timeMs: ms, scale: 0.5, alpha: fade })
      return
    case "gold":
      paint(ctx, "gold", 520, 140 - ms * 0.04, { scale: 0.6, alpha: fade })
      return
    case "wood":
      paint(ctx, "wood", 800, 150 - ms * 0.04, { scale: 0.6, alpha: fade })
      return
    case "built":
      paint(ctx, "explosion", roadX(TOWER_X), 240, { clip: "play", timeMs: ms, scale: 0.6, alpha: fade })
      return
    case "repaired":
    case "shield":
    case "hit":
      return
  }
}

const drawScenery = (ctx: CanvasRenderingContext2D, paint: Painter, s: KingdomState) => {
  const t = tickMs(s)
  const recent = (kind: Effect["kind"]) => s.effects.some((e) => e.kind === kind && age(s, e) < 600)
  paint(ctx, "goblin-house", CAMP_CX, 300, { scale: 0.8, alpha: s.campHp <= 0 ? 0.35 : 1 })
  // Warriors at the camp break it: smoke and fire over the house.
  const sieged = s.units.some((u) => u.kind === "warrior" && u.fighting && u.x >= SIEGE_X)
  if (s.campHp > 0 && (sieged || s.campHp < s.options.campHp * 0.3)) {
    paint(ctx, "fire", CAMP_CX - 20, 250, { clip: "play", timeMs: t, scale: 0.55 })
  }
  paint(ctx, recent("gold") ? "gold-mine-active" : "gold-mine", 520, 190, { scale: 0.75 })
  paint(ctx, "pawn", 430, 205, { clip: recent("gold") ? "build" : "idle", timeMs: t, scale: 0.75 })
  for (const [i, x] of [740, 810, 870].entries()) paint(ctx, "tree", x, 200 - (i % 2) * 18, { clip: "idle", timeMs: t + i * 200, scale: 0.6 })
  paint(ctx, "pawn", 690, 220, { clip: recent("wood") ? "chop" : "idle", timeMs: t, scale: 0.75 })
  paint(ctx, "sheep", 420, 428, { clip: "idle", timeMs: t, scale: 0.5 })
  paint(ctx, "sheep", 980, 120, { clip: "idle", timeMs: t + 400, scale: 0.5, mirror: true })
  paint(ctx, s.towerBuilt ? "tower-blue" : "tower-construction", roadX(TOWER_X), 250, { scale: 0.6 })
  if (s.towerBuilt) drawTowerArcher(paint, ctx, "archer", roadX(TOWER_X), s.towerCooldownS, t, false)
  const castleHurt = s.castleHp < CASTLE_MAX_HP * 0.3
  paint(ctx, s.castleHp <= 0 ? "castle-destroyed" : "castle-blue", 140, 300, { scale: 0.72 })
  if (castleHurt && s.castleHp > 0) paint(ctx, "fire", 95, 230, { clip: "play", timeMs: t, scale: 0.6 })
}

const drawHpBars = (ctx: CanvasRenderingContext2D, s: KingdomState) => {
  drawHpBar(ctx, 140, 150, s.castleHp, CASTLE_MAX_HP, OWN_BAR)
  drawHpBar(ctx, CAMP_CX, 205, s.campHp, s.options.campHp, ENEMY_BAR)
}

const drawShield = (ctx: CanvasRenderingContext2D, s: KingdomState) => {
  if (s.shieldUntil <= s.tick) return
  const left = (s.shieldUntil - s.tick) * TICK_MS
  ctx.save()
  ctx.globalAlpha = Math.min(1, left / 800) * (0.55 + 0.1 * Math.sin(s.tick / 3))
  ctx.beginPath()
  ctx.ellipse(140, 230, 130, 120, 0, 0, Math.PI * 2)
  ctx.fillStyle = "rgb(147 197 253 / 0.35)"
  ctx.fill()
  ctx.lineWidth = 4
  ctx.strokeStyle = "#60a5fa"
  ctx.stroke()
  ctx.restore()
}

/** Night sky over the field: dark at the start, gone by dawn. */
const drawNight = (ctx: CanvasRenderingContext2D, s: KingdomState) => {
  const dark = 0.42 * (1 - nightProgress(s))
  if (dark <= 0) return
  ctx.fillStyle = `rgb(23 37 84 / ${dark})`
  ctx.fillRect(0, 0, FIELD.width, FIELD.height)
}

/** Draws the bar and the whole field. Call on every animation frame; `onLoad` redraws when a picture arrives. */
export const drawKingdom = (ctx: CanvasRenderingContext2D, s: KingdomState, hud: Hud, onLoad: () => void): ReadonlyArray<CanvasButton<CommandKind>> => {
  drawHud(ctx, hud)
  let at: ReadonlyArray<readonly [CommandKind, readonly [number, number]]> = []
  underHud(ctx, () => {
    at = drawKingdomField(ctx, s, onLoad)
  })
  return refreshButtons(at)
}

const drawKingdomField = (ctx: CanvasRenderingContext2D, s: KingdomState, onLoad: () => void) => {
  const paint = painter(onLoad)
  ctx.imageSmoothingEnabled = false
  drawGround(ctx, onLoad)
  drawScenery(ctx, paint, s)
  // Back to front by road row, so the lower figures stand in front.
  const figures: Array<readonly [number, () => void]> = [
    ...s.goblins.map((g) => [LANE_Y + laneOffset(g.id), () => drawGoblin(ctx, paint, s, g)] as const),
    ...s.units.map((u) => [u.kind === "archer" ? 0 : LANE_Y + laneOffset(u.id), () => drawUnit(ctx, paint, s, u)] as const)
  ]
  for (const [, draw] of figures.sort((a, b) => a[0] - b[0])) draw()
  for (const e of s.effects) drawEffect(ctx, paint, s, e)
  drawShield(ctx, s)
  drawNight(ctx, s)
  drawHpBars(ctx, s)
  return s.slots.map((slot) => [slot.kind, drawLabel(ctx, s, slot.kind, slot.word)] as const)
}
