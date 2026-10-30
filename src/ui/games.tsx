import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react"
import "./studio.css"
import {
  BALLOON_COLORS,
  type BalloonsState,
  findKey,
  isWrongLayout,
  type LayoutId,
  LAYOUTS,
  type LetterfallState,
  lowestLetter,
  newBalloons,
  newLetterfall,
  pressBalloons,
  pressLetterfall,
  type Progress,
  recordGame,
  seededRandom,
  stepBalloons,
  stepLetterfall,
  WORDS,
  wordsWithin
} from "../core/index.ts"
import { Keyboard } from "./Keyboard.tsx"

export type GameId = "letterfall" | "balloons"

/** Longest frame step: after a background tab the game must not jump forward. */
const MAX_FRAME_MS = 100

/** Calls `tick(dt)` on every animation frame while `running`. */
const useFrames = (running: boolean, tick: (dtMs: number) => void) => {
  const tickRef = useRef(tick)
  tickRef.current = tick
  useEffect(() => {
    if (!running) return undefined
    let last = performance.now()
    let id = requestAnimationFrame(function frame(t) {
      tickRef.current(Math.min(MAX_FRAME_MS, t - last))
      last = t
      id = requestAnimationFrame(frame)
    })
    return () => cancelAnimationFrame(id)
  }, [running])
}

interface ShellProps {
  readonly title: string
  readonly rules: string
  readonly phase: "start" | "play" | "pause" | "over"
  readonly points: number
  readonly lives: number
  readonly level: number
  readonly best: number
  readonly wrongLayout: string | undefined
  readonly options: ReactNode
  readonly field: ReactNode
  readonly below: ReactNode
  readonly onStart: () => void
  readonly onKey: (char: string) => void
  readonly onBlur: () => void
  readonly fieldClass: string
}

const LIVES_ICON = "❤"

/** Frame shared by both games: score line, field, start / pause / game over overlay, key input. */
const GameShell = (p: ShellProps) => {
  const boxRef = useRef<HTMLDivElement>(null)
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return
    e.preventDefault()
    if (p.phase === "play") p.onKey(e.key)
  }
  const start = () => {
    p.onStart()
    boxRef.current?.focus({ preventScroll: true })
  }
  return (
    <div
      className="edu-game"
      ref={boxRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      // Focus moving inside the game (from the start button to the field) is not leaving it.
      onBlur={(e) => {
        if (!(e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget))) p.onBlur()
      }}
    >
      <header className="edu-typing-head">
        <strong>{p.title}</strong>
        <span className="edu-typing-stats">
          Очки {p.points} · рівень {p.level} · <span className="edu-game-lives">{LIVES_ICON.repeat(p.lives)}</span>
        </span>
      </header>
      <div className={`edu-game-field ${p.fieldClass}`}>
        {p.field}
        {p.phase !== "play" && (
          <div className="edu-game-overlay">
            {p.phase === "over" && (
              <p className="edu-typing-verdict">
                Гру закінчено: {p.points} очок{p.points > 0 && p.points >= p.best ? " — новий рекорд!" : ""}
              </p>
            )}
            {p.phase === "pause" && <p className="edu-typing-verdict">Пауза</p>}
            {p.phase === "start" && <p className="edu-game-rules">{p.rules}</p>}
            {p.phase !== "pause" && p.options}
            <button type="button" className="edu-btn" onClick={start}>
              {p.phase === "pause" ? "Продовжити" : p.phase === "over" ? "Грати ще" : "Почати гру"}
            </button>
            {p.best > 0 && <p className="edu-course-note">Рекорд: {p.best}</p>}
          </div>
        )}
      </div>
      <p className="edu-typing-next" role="status">
        {p.wrongLayout ? `Перемкни мову клавіатури на ${p.wrongLayout} (Alt+Shift або Win+Пробіл).` : " "}
      </p>
      {p.below}
    </div>
  )
}

const LAYOUT_GENITIVE: Readonly<Record<LayoutId, string>> = { uk: "українську", en: "англійську" }

/** Letter sets for Letterfall: rows of the keyboard or the letters the student learned. */
const letterRows = (layout: LayoutId): ReadonlyArray<{ readonly id: string; readonly label: string; readonly chars: string[] }> => {
  const rows = LAYOUTS[layout].rows
  const letters = (r: number) => (rows[r] ?? []).map((k) => k.base).filter((c) => c.toUpperCase() !== c.toLowerCase())
  return [
    { id: "home", label: "Основний ряд", chars: letters(2) },
    { id: "top", label: "Верхній ряд", chars: letters(1) },
    { id: "bottom", label: "Нижній ряд", chars: letters(3) },
    { id: "all", label: "Усі літери", chars: [...letters(1), ...letters(2), ...letters(3)] }
  ]
}

interface GameProps {
  readonly layout: LayoutId
  readonly progress: Progress
  readonly onProgress: (change: (p: Progress) => Progress) => void
  /** Letters the student knows from the course: the default letter set. */
  readonly learned: ReadonlySet<string>
}

type Phase = ShellProps["phase"]

const MIN_LEARNED = 4

/** Letters fall like rain; catch each by pressing its key before it reaches the ground. */
export const LetterfallGame = ({ layout, progress, onProgress, learned }: GameProps) => {
  const learnedLetters = [...learned].filter((c) => c.toUpperCase() !== c.toLowerCase())
  const sets = [
    ...(learnedLetters.length >= MIN_LEARNED ? [{ id: "learned", label: "Мої літери", chars: learnedLetters }] : []),
    ...letterRows(layout)
  ]
  const [setId, setSetId] = useState(sets[0]?.id ?? "home")
  const [state, setState] = useState<LetterfallState>(newLetterfall)
  const [phase, setPhase] = useState<Phase>("start")
  const [wrongLayout, setWrongLayout] = useState(false)
  const random = useRef(seededRandom(Date.now()))
  const chars = sets.find((s) => s.id === setId)?.chars ?? []
  const best = progress.games.letterfall ?? 0

  useFrames(phase === "play", (dt) => setState((s) => stepLetterfall(s, dt, chars, random.current)))

  useEffect(() => {
    if (!state.over || phase !== "play") return
    setPhase("over")
    onProgress((p) => recordGame(p, "letterfall", state.points))
  }, [state.over, state.points, phase, onProgress])

  const onKey = (char: string) => {
    const lower = char.toLowerCase()
    const wrong = isWrongLayout(layout, chars[0] ?? "", lower)
    setWrongLayout(wrong)
    if (!wrong) setState((s) => pressLetterfall(s, lower))
  }

  const target = lowestLetter(state)
  return (
    <GameShell
      title="Літеропад"
      rules="Літери падають з неба. Натисни клавішу з літерою, поки вона не впала на землю. Кожні 10 спійманих літер — новий рівень і швидший дощ."
      phase={phase}
      points={state.points}
      lives={state.lives}
      level={state.level}
      best={best}
      wrongLayout={wrongLayout ? LAYOUT_GENITIVE[layout] : undefined}
      fieldClass="edu-fall"
      onStart={() => {
        if (phase !== "pause") setState(newLetterfall())
        setPhase("play")
      }}
      onBlur={() => setPhase((p) => (p === "play" ? "pause" : p))}
      onKey={onKey}
      options={
        <span role="radiogroup" aria-label="Які літери" className="edu-seg">
          {sets.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={s.id === setId} onClick={() => setSetId(s.id)}>
              {s.label}
            </button>
          ))}
        </span>
      }
      field={state.letters.map((l) => (
        <span
          key={l.id}
          className={l.id === target?.id ? "edu-fall-letter edu-fall-next" : "edu-fall-letter"}
          style={{ left: `${l.x * 100}%`, top: `${l.y * 100}%` }}
        >
          {l.char.toUpperCase()}
        </span>
      ))}
      below={<Keyboard layout={LAYOUTS[layout]} target={phase === "play" && target ? findKey(LAYOUTS[layout], target.char)?.key.code : undefined} />}
    />
  )
}

const MIN_WORDS = 10
const MAX_WORD_LENGTH = { short: 4, long: 12 } as const

/** Words float up on balloons; type a word to pop its balloon before it flies away. */
export const BalloonsGame = ({ layout, progress, onProgress, learned }: GameProps) => {
  const all = WORDS[layout].filter((w) => w.toLowerCase() === w && w.length > 1)
  const mine = wordsWithin(layout, learned).filter((w) => w.toLowerCase() === w && w.length > 1)
  const sets = [
    ...(mine.length >= MIN_WORDS ? [{ id: "learned", label: "Мої літери", words: mine }] : []),
    { id: "short", label: "Короткі слова", words: all.filter((w) => w.length <= MAX_WORD_LENGTH.short) },
    { id: "all", label: "Усі слова", words: all.filter((w) => w.length <= MAX_WORD_LENGTH.long) }
  ]
  const [setId, setSetId] = useState(sets[0]?.id ?? "short")
  const [state, setState] = useState<BalloonsState>(newBalloons)
  const [phase, setPhase] = useState<Phase>("start")
  const [wrongLayout, setWrongLayout] = useState(false)
  const random = useRef(seededRandom(Date.now()))
  const words = sets.find((s) => s.id === setId)?.words ?? []
  const best = progress.games.balloons ?? 0

  useFrames(phase === "play", (dt) => setState((s) => stepBalloons(s, dt, words, random.current)))

  useEffect(() => {
    if (!state.over || phase !== "play") return
    setPhase("over")
    onProgress((p) => recordGame(p, "balloons", state.points))
  }, [state.over, state.points, phase, onProgress])

  const onKey = (char: string) => {
    const lower = char.toLowerCase()
    const wrong = isWrongLayout(layout, words[0]?.[0] ?? "", lower)
    setWrongLayout(wrong)
    if (!wrong) setState((s) => pressBalloons(s, lower))
  }

  return (
    <GameShell
      title="Повітряні кульки"
      rules="Кульки зі словами летять угору. Набери слово, щоб лопнути кульку, поки вона не відлетіла. Перша літера обирає кульку."
      phase={phase}
      points={state.points}
      lives={state.lives}
      level={state.level}
      best={best}
      wrongLayout={wrongLayout ? LAYOUT_GENITIVE[layout] : undefined}
      fieldClass="edu-balloons"
      onStart={() => {
        if (phase !== "pause") setState(newBalloons())
        setPhase("play")
      }}
      onBlur={() => setPhase((p) => (p === "play" ? "pause" : p))}
      onKey={onKey}
      options={
        <span role="radiogroup" aria-label="Які слова" className="edu-seg">
          {sets.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={s.id === setId} onClick={() => setSetId(s.id)}>
              {s.label}
            </button>
          ))}
        </span>
      }
      field={state.balloons.map((b) => {
        const typed = b.id === state.targetId ? state.typed : 0
        return (
          <span
            key={b.id}
            className={`edu-balloon edu-balloon-${b.color % BALLOON_COLORS}${typed > 0 ? " edu-balloon-target" : ""}`}
            style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%` }}
          >
            <span className="edu-balloon-word">
              <span className="edu-balloon-typed">{b.word.slice(0, typed)}</span>
              {b.word.slice(typed)}
            </span>
          </span>
        )
      })}
      below={null}
    />
  )
}
