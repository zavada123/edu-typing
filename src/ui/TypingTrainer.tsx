import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import {
  createSession,
  expectedChar,
  findKey,
  isFinished,
  isWrongLayout,
  LAYOUTS,
  press,
  result,
  score,
  shiftSide,
  stop,
  type Finger,
  type Lesson,
  type Result,
  type Score,
  type Session
} from "../core/index.ts"
import { Keyboard } from "./Keyboard.tsx"
import "./typing.css"

/** What the host app gets after a finished run. */
export interface Report extends Result, Score {
  readonly lessonId: string
  /** "touch" means the student tapped the on-screen keys: fine for a demo, not for a grade. */
  readonly input: "keyboard" | "touch"
}

interface Props {
  readonly lesson: Lesson
  readonly onComplete?: (report: Report) => void
  /** Bigger text and keys for grades 1–4. */
  readonly large?: boolean
  /** Timed run (speed test): the run ends when the time is up, even in the middle of the text. */
  readonly timeLimitMs?: number
  /** Error rate 0–1 by key code: paints the keys where the student often makes mistakes. */
  readonly heat?: ReadonlyMap<string, number>
}

const FINGER_NAMES: Readonly<Record<Finger, string>> = {
  leftPinky: "лівий мізинець",
  leftRing: "лівий безіменний",
  leftMiddle: "лівий середній",
  leftIndex: "лівий вказівний",
  rightIndex: "правий вказівний",
  rightMiddle: "правий середній",
  rightRing: "правий безіменний",
  rightPinky: "правий мізинець",
  thumb: "великий палець"
}

const LIVE_TICK_MS = 500

const showChar = (c: string): string => (c === " " ? "пробіл" : `«${c}»`)

/** Long texts (a timed test) show only a window around the cursor. */
const WINDOW_BEFORE = 40
const WINDOW_AFTER = 220

const textWindow = (text: string, position: number): [number, number] => {
  if (text.length <= WINDOW_BEFORE + WINDOW_AFTER) return [0, text.length]
  const from = Math.max(0, text.lastIndexOf(" ", Math.max(0, position - WINDOW_BEFORE)) + 1)
  return [Math.min(from, position), Math.min(text.length, position + WINDOW_AFTER)]
}

const formatClock = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}

/** Typing exercise: text, live speed, on-screen keyboard, result at the end. */
export const TypingTrainer = ({ lesson, onComplete, large = false, timeLimitMs, heat }: Props) => {
  const layout = LAYOUTS[lesson.layout]
  const [session, setSession] = useState<Session>(() => createSession(lesson.text))
  const [now, setNow] = useState(() => performance.now())
  const [wrongLayout, setWrongLayout] = useState(false)
  const [usedTouch, setUsedTouch] = useState(false)
  const [report, setReport] = useState<Report>()
  const [pressed, setPressed] = useState<ReadonlySet<string>>(new Set())
  const boxRef = useRef<HTMLDivElement>(null)

  // preventScroll: the trainer may sit low on a long page; focus must not jump there.
  useEffect(() => boxRef.current?.focus({ preventScroll: true }), [])

  const running = session.startedAt !== undefined && !isFinished(session)
  useEffect(() => {
    if (!running) return undefined
    const id = window.setInterval(() => setNow(performance.now()), timeLimitMs === undefined ? LIVE_TICK_MS : LIVE_TICK_MS / 5)
    return () => window.clearInterval(id)
  }, [running, timeLimitMs])

  const complete = (next: Session, t: number, touchUsed: boolean) => {
    const r = result(next, t)
    const done: Report = { ...r, ...score(r, lesson.goal), lessonId: lesson.id, input: touchUsed ? "touch" : "keyboard" }
    setReport(done)
    onComplete?.(done)
  }

  // Timed test: stop the run when the time is up.
  const timeUp = running && timeLimitMs !== undefined && session.startedAt !== undefined && now - session.startedAt >= timeLimitMs
  useEffect(() => {
    if (!timeUp || session.startedAt === undefined || timeLimitMs === undefined) return
    const end = session.startedAt + timeLimitMs
    const next = stop(session, end)
    setSession(next)
    complete(next, end, usedTouch)
    // complete() only reads the current props; running it once per time-up is enough.
  }, [timeUp])

  const type = (char: string, touch: boolean) => {
    if (isFinished(session)) return
    const expected = expectedChar(session)
    if (expected !== undefined && isWrongLayout(lesson.layout, expected, char)) {
      setWrongLayout(true)
      return
    }
    setWrongLayout(false)
    const t = performance.now()
    const next = press(session, char, t)
    const touchUsed = usedTouch || touch
    setSession(next)
    setUsedTouch(touchUsed)
    setNow(t)
    if (isFinished(next)) complete(next, t, touchUsed)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code && !pressed.has(e.code)) setPressed(new Set([...pressed, e.code]))
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return
    e.preventDefault()
    type(e.key, false)
  }

  const onKeyUp = (e: KeyboardEvent) => {
    if (!pressed.has(e.code)) return
    setPressed(new Set([...pressed].filter((c) => c !== e.code)))
  }

  const restart = () => {
    setSession(createSession(lesson.text))
    setReport(undefined)
    setUsedTouch(false)
    setWrongLayout(false)
    boxRef.current?.focus()
  }

  const expected = expectedChar(session)
  const target = expected === undefined ? undefined : findKey(layout, expected)
  const live = result(session, now)
  const [from, to] = textWindow(session.text, session.position)
  const left = timeLimitMs === undefined ? undefined : timeLimitMs - (session.startedAt === undefined ? 0 : now - session.startedAt)
  const rootClass = large ? "edu-typing edu-typing-large" : "edu-typing"

  return (
    <div className={rootClass} ref={boxRef} tabIndex={0} onKeyDown={onKeyDown} onKeyUp={onKeyUp} onBlur={() => setPressed(new Set())}>
      <header className="edu-typing-head">
        <strong>{lesson.title}</strong>
        <span className="edu-typing-stats">
          {left !== undefined && <b className="edu-typing-clock">{formatClock(left)} · </b>}
          {live.cpm} зн/хв · точність {live.accuracy}% · помилок {live.mistakes}
        </span>
      </header>

      {report ? (
        <ResultView report={report} lesson={lesson} onRestart={restart} />
      ) : (
        <>
          <p className="edu-typing-hint">
            {session.startedAt === undefined ? lesson.hint : " "}
          </p>
          <p className="edu-typing-text" aria-label={lesson.text}>
            {from > 0 && <span className="edu-typing-more">… </span>}
            <span className="edu-typing-done">{session.text.slice(from, session.position)}</span>
            {expected !== undefined && (
              <span className={session.lastWrong ? "edu-typing-current edu-typing-current-wrong" : "edu-typing-current"}>
                {expected === " " ? "␣" : expected}
              </span>
            )}
            <span>{session.text.slice(session.position + 1, to)}</span>
            {to < session.text.length && <span className="edu-typing-more"> …</span>}
          </p>
          <p className="edu-typing-next" role="status">
            {wrongLayout
              ? "Перемкни мову клавіатури на " + (lesson.layout === "uk" ? "українську" : "англійську") + " (Alt+Shift або Win+Пробіл)."
              : target && expected !== undefined
                ? `Натисни ${showChar(expected)}: ${FINGER_NAMES[target.key.finger]}` +
                  (target.shift ? `, ${shiftSide(target.key.finger) === "ShiftLeft" ? "лівий" : "правий"} Shift` : "")
                : " "}
          </p>
        </>
      )}

      <Keyboard
        layout={layout}
        target={report ? undefined : target?.key.code}
        shift={report || !target?.shift ? undefined : shiftSide(target.key.finger)}
        wrong={session.lastWrong}
        pressed={pressed}
        heat={report ? undefined : heat}
        onTap={(c) => type(target?.shift && c === target.key.base ? target.key.shift : c, true)}
      />
    </div>
  )
}

interface ResultProps {
  readonly report: Report
  readonly lesson: Lesson
  readonly onRestart: () => void
}

const TOP_MISTAKES = 3

const ResultView = ({ report, lesson, onRestart }: ResultProps) => {
  const worst = Object.entries(report.mistakesByChar)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_MISTAKES)
  return (
    <section className="edu-typing-result">
      <p className="edu-typing-stars" aria-label={`Зірок: ${report.stars} з 3`}>
        {"★".repeat(report.stars)}
        <span className="edu-typing-stars-off">{"★".repeat(3 - report.stars)}</span>
      </p>
      <p className="edu-typing-verdict">{report.passed ? "Вправу виконано!" : "Ще трохи потренуйся"}</p>
      <ul className="edu-typing-numbers">
        <li>
          <b>{report.cpm}</b> зн/хв <small>потрібно {lesson.goal.minCpm}</small>
        </li>
        <li>
          <b>{report.accuracy}%</b> точність <small>потрібно {lesson.goal.minAccuracy}%</small>
        </li>
        <li>
          <b>{Math.round(report.durationMs / 1000)}</b> с
        </li>
      </ul>
      {worst.length > 0 && (
        <p className="edu-typing-worst">Найбільше помилок: {worst.map(([c, n]) => `${showChar(c)} ×${n}`).join(", ")}</p>
      )}
      {report.input === "touch" && (
        <p className="edu-typing-worst">Вправу набрано на екранних клавішах. Для оцінки потрібна справжня клавіатура.</p>
      )}
      <button type="button" className="edu-typing-again" onClick={onRestart}>
        Ще раз
      </button>
    </section>
  )
}
