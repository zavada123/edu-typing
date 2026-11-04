import { useEffect, useRef, useState } from "react"
import {
  advanceDuel,
  applyDuelInput,
  DUEL_CANCEL,
  DUEL_CASTLE_HP,
  DUEL_TICKS,
  type DuelInput,
  type DuelKey,
  duelResult,
  type DuelResult,
  type DuelSide,
  type DuelState,
  isWrongLayout,
  type LayoutId,
  newDuel,
  TICK_MS,
  WORDS
} from "../../core/index.ts"
import { GameShell, LAYOUT_GENITIVE } from "../games.tsx"
import { FIELD } from "./draw.ts"
import { drawDuel } from "./duelDraw.ts"

export interface DuelGameProps {
  readonly layout: LayoutId
  /** The same seed in both browsers: it picks the words. */
  readonly seed: number
  /** Which castle is this player's. */
  readonly side: DuelSide
  /** Names of player 0 and player 1. */
  readonly names: readonly [string, string]
  /** Every key the server confirmed, in the order it sent them; the list only grows. */
  readonly inputs: readonly DuelInput[]
  /** The last tick the server confirmed: the duel is played up to it. */
  readonly upTo: number
  /** Each key of this player: send it to the server. */
  readonly onKey: (key: DuelKey) => void
  /** Called once when the duel ends in this browser. */
  readonly onOver?: (result: DuelResult) => void
  /** The button on the end screen. */
  readonly onExit: () => void
  /** The other player has left: this player wins. */
  readonly opponentLeft?: boolean
}

const RULES = "Два замки на одній дорозі, слова в обох однакові. Друкуй накази: золото й дрова наймають мечників, які йдуть ламати замок суперника."

const formatTime = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

const NOTICE_MS = 1500

/**
 * «Клавішне королівство» against another person. The host page connects to the server and passes the confirmed
 * keys in; this component plays them in lockstep and shows this player's own keys at once, before the server
 * confirms them.
 */
export const DuelGame = (p: DuelGameProps) => {
  const pool = WORDS[p.layout]
  const confirmed = useRef<{ state: DuelState; used: number }>({ state: newDuel(pool, p.seed), used: 0 })
  // Own keys sent but not yet back from the server.
  const pending = useRef<DuelKey[]>([])
  const [, redraw] = useState(0)
  const [wrongLayout, setWrongLayout] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const reported = useRef(false)

  const fresh = p.inputs.slice(confirmed.current.used)
  if (fresh.length > 0 || p.upTo > confirmed.current.state.tick) {
    const own = fresh.filter((x) => x.side === p.side).length
    pending.current = pending.current.slice(own)
    confirmed.current = { state: advanceDuel(confirmed.current.state, fresh, p.upTo), used: p.inputs.length }
  }
  const base = confirmed.current.state
  const shown = pending.current.reduce((s, key) => applyDuelInput(s, { side: p.side, key }), base)
  const over = base.over !== undefined || p.opponentLeft === true

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d")
    if (ctx) drawDuel(ctx, shown, p.side, () => redraw((n) => n + 1))
  })

  useEffect(() => {
    if (!over || reported.current) return
    reported.current = true
    const result = duelResult(base, p.side)
    p.onOver?.(p.opponentLeft && base.over === undefined ? { ...result, won: true, draw: false } : result)
  })

  const send = (key: DuelKey) => {
    if (over) return
    pending.current = [...pending.current, key]
    p.onKey(key)
    redraw((n) => n + 1)
  }

  const onKey = (char: string) => {
    const lower = char.toLowerCase()
    const wrong = isWrongLayout(p.layout, pool[0] ?? "", lower)
    setWrongLayout(wrong)
    if (!wrong) send(lower)
  }

  const me = shown.players[p.side]
  const them = shown.players[p.side === 0 ? 1 : 0]
  const myName = p.names[p.side]
  const theirName = p.names[p.side === 0 ? 1 : 0]
  const result = duelResult(base, p.side)
  const leftS = ((DUEL_TICKS - base.tick) * TICK_MS) / 1000
  const notice = me.notice && (shown.tick - me.notice.tick) * TICK_MS < NOTICE_MS ? me.notice.text : undefined
  const won = result.won || (p.opponentLeft === true && base.over === undefined)
  return (
    <GameShell
      title={`${myName} проти ${theirName}`}
      rules={RULES}
      phase={over ? "over" : "play"}
      points={0}
      lives={0}
      level={1}
      best={0}
      autoFocus
      againLabel="Вийти"
      wrongLayout={wrongLayout ? LAYOUT_GENITIVE[p.layout] : undefined}
      fieldClass="edu-kingdom"
      stats={
        <>
          🪙 {me.gold} · 🪵 {me.wood} · Мій замок {Math.ceil(me.castleHp)}/{DUEL_CASTLE_HP} · {theirName}: {Math.ceil(them.castleHp)}/{DUEL_CASTLE_HP} · {formatTime(leftS)}
        </>
      }
      verdict={
        <p className="edu-typing-verdict">
          {p.opponentLeft && base.over === undefined ? "Суперник вийшов із бою. Перемога!" : won ? "Перемога! Замок суперника впав." : result.draw ? "Нічия." : "Поразка. Спробуй ще раз!"}
          <br />
          <small>
            {result.cpm} зн/хв · точність {result.accuracy}% · наказів: {result.orders}
          </small>
        </p>
      }
      onStart={p.onExit}
      onBlur={() => undefined}
      onKey={onKey}
      onCancel={() => send(DUEL_CANCEL)}
      options={null}
      field={
        <>
          <canvas
            ref={canvas}
            className="edu-kingdom-canvas"
            width={FIELD.width}
            height={FIELD.height}
            aria-label={`Бій. Мої накази: ${me.slots.map((o) => o.word).join(", ")}`}
            data-words={me.slots.map((o) => `${o.kind}:${o.word}`).join(" ")}
          />
          {notice && !over && <span className="edu-kingdom-notice">{notice}</span>}
        </>
      }
      below={null}
    />
  )
}
