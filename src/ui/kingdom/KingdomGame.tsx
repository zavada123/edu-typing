import { useEffect, useRef, useState } from "react"
import {
  advanceKingdom,
  CASTLE_MAX_HP,
  COMMANDS,
  cancelKingdomTarget,
  isWrongLayout,
  KINGDOM_LEVELS,
  type KingdomState,
  kingdomResult,
  newKingdom,
  nightProgress,
  pressKingdom,
  TICK_MS,
  recordGame,
  easyToType,
  type CommandKind,
  skipKingdomWord,
  WORDS,
  wordsWithin
} from "../../core/index.ts"
import { type GameProps, GameShell, LAYOUT_GENITIVE, type Phase, useFrames } from "../games.tsx"
import { buttonAt, CANVAS, type CanvasButton, canvasPoint, drawKingdom, type Hud } from "./draw.ts"

type LevelId = keyof typeof KINGDOM_LEVELS

const LEVELS: ReadonlyArray<{ readonly id: LevelId; readonly label: string }> = [
  { id: "easy", label: "Легка ніч" },
  { id: "normal", label: "Звичайна ніч" },
  { id: "hard", label: "Довга ніч" }
]

/** Enough words with different first letters for all six orders. */
const MIN_POOL = 40

const RULES =
  "Ти юний чарівник, і до світанку треба вберегти замок від гоблінів. Мечники, яким нема з ким битися, йдуть ламати табір гоблінів: зруйнуєш його — переможеш ще до світанку. Над копальнею, лісом і замком висять слова: надрукуй слово, і наказ виконається. Золото й дрова наймають мечників і лучників, будують вежу і ставлять чарівний щит. Помилка не скасовує наказ, але сповільнює його. Esc скидає слово."

const formatTime = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

const NOTICE_MS = 1500

/** «Клавішне королівство»: hold the castle until dawn by typing orders. */
export const KingdomGame = ({ layout, progress, onProgress, learned }: GameProps) => {
  const all = WORDS[layout].filter((w) => w === w.toLowerCase() && w.length > 1 && easyToType(w))
  const mine = wordsWithin(layout, learned).filter((w) => w === w.toLowerCase() && w.length > 1 && easyToType(w))
  const pool = mine.length >= MIN_POOL ? mine : all
  const [level, setLevel] = useState<LevelId>("easy")
  const [state, setState] = useState<KingdomState>(() => newKingdom(pool, KINGDOM_LEVELS.easy, 1))
  const [phase, setPhase] = useState<Phase>("start")
  const [wrongLayout, setWrongLayout] = useState(false)
  const carry = useRef(0)
  const canvas = useRef<HTMLCanvasElement>(null)
  const buttons = useRef<ReadonlyArray<CanvasButton<CommandKind>>>([])
  const [, redraw] = useState(0)
  const best = progress.games.kingdom ?? 0

  useFrames(phase === "play", (dt) =>
    setState((s) => {
      const [next, left] = advanceKingdom(s, dt, carry.current)
      carry.current = left
      return next
    })
  )

  const result = kingdomResult(state)
  const leftS = KINGDOM_LEVELS[level].durationS * (1 - nightProgress(state))
  const hud: Hud = { gold: state.gold, wood: state.wood, more: [], time: formatTime(leftS), timeCaption: "До світанку", right: `Очки ${result.points}` }

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d")
    if (ctx) buttons.current = drawKingdom(ctx, state, hud, () => redraw((n) => n + 1))
  })

  useEffect(() => {
    if (!state.over || phase !== "play") return
    setPhase("over")
    onProgress((p) => recordGame(p, "kingdom", kingdomResult(state).points))
  }, [state, phase, onProgress])

  const onKey = (char: string) => {
    const lower = char.toLowerCase()
    const wrong = isWrongLayout(layout, pool[0] ?? "", lower)
    setWrongLayout(wrong)
    if (!wrong) setState((s) => pressKingdom(s, lower))
  }

  const hit = (e: { readonly clientX: number; readonly clientY: number }) => {
    if (!canvas.current || phase !== "play") return undefined
    const [x, y] = canvasPoint(canvas.current, e.clientX, e.clientY)
    return buttonAt(buttons.current, x, y)
  }
  const notice = state.notice && (state.tick - state.notice.tick) * TICK_MS < NOTICE_MS ? state.notice.text : undefined
  return (
    <GameShell
      title="Клавішне королівство"
      rules={RULES}
      phase={phase}
      points={result.points}
      lives={0}
      level={1}
      best={best}
      wrongLayout={wrongLayout ? LAYOUT_GENITIVE[layout] : undefined}
      fieldClass="edu-kingdom"
      fullscreen
      stats={<span className="edu-visually-hidden">Замок {Math.ceil(state.castleHp)}/{CASTLE_MAX_HP}, табір гоблінів {Math.ceil(state.campHp)}/{state.options.campHp}</span>}
      verdict={
        <p className="edu-typing-verdict">
          {result.campBroken ? "Табір гоблінів зруйновано! Перемога." : result.won ? "Світанок! Замок вистояв." : "Гобліни захопили замок."} {"★".repeat(result.stars)}
          <br />
          <small>
            {result.points} очок · прогнано гоблінів: {result.repelled} · {result.cpm} зн/хв · точність {result.accuracy}%
            {result.points > 0 && result.points >= best ? " — новий рекорд!" : ""}
          </small>
        </p>
      }
      onStart={() => {
        if (phase !== "pause") {
          carry.current = 0
          setState(newKingdom(pool, KINGDOM_LEVELS[level], Date.now()))
        }
        setPhase("play")
      }}
      onBlur={() => setPhase((p) => (p === "play" ? "pause" : p))}
      onKey={onKey}
      onCancel={() => setState(cancelKingdomTarget)}
      options={
        <span role="radiogroup" aria-label="Складність" className="edu-seg">
          {LEVELS.map((l) => (
            <button key={l.id} type="button" role="radio" aria-checked={l.id === level} onClick={() => setLevel(l.id)}>
              {l.label}
            </button>
          ))}
        </span>
      }
      field={
        <>
          <canvas ref={canvas} className="edu-kingdom-canvas"
            onClick={(e) => {
              const button = hit(e)
              if (button) setState((st) => skipKingdomWord(st, button.id))
            }}
            onMouseMove={(e) => e.currentTarget.style.setProperty("cursor", hit(e) ? "pointer" : "")} width={CANVAS.width} height={CANVAS.height} aria-label={`Замок і дорога. Накази: ${state.slots.map((o) => `${o.word} (${COMMANDS[o.kind].title.toLowerCase()})`).join(", ")}`}
            data-words={state.slots.map((o) => `${o.kind}:${o.word}`).join(" ")} />
          {notice && phase === "play" && <span className="edu-kingdom-notice">{notice}</span>}
        </>
      }
      below={null}
    />
  )
}
