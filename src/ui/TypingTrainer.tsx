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

/** Typing exercise: text, live speed, on-screen keyboard, result at the end. */
export const TypingTrainer = ({ lesson, onComplete, large = false }: Props) => {
  const layout = LAYOUTS[lesson.layout]
  const [session, setSession] = useState<Session>(() => createSession(lesson.text))
  const [now, setNow] = useState(() => performance.now())
  const [wrongLayout, setWrongLayout] = useState(false)
  const [usedTouch, setUsedTouch] = useState(false)
  const [report, setReport] = useState<Report>()
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => boxRef.current?.focus(), [])

  const running = session.startedAt !== undefined && !isFinished(session)
  useEffect(() => {
    if (!running) return undefined
    const id = window.setInterval(() => setNow(performance.now()), LIVE_TICK_MS)
    return () => window.clearInterval(id)
  }, [running])

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
    if (isFinished(next)) {
      const r = result(next, t)
      const done: Report = { ...r, ...score(r, lesson.goal), lessonId: lesson.id, input: touchUsed ? "touch" : "keyboard" }
      setReport(done)
      onComplete?.(done)
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return
    e.preventDefault()
    type(e.key, false)
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
  const rootClass = large ? "edu-typing edu-typing-large" : "edu-typing"

  return (
    <div className={rootClass} ref={boxRef} tabIndex={0} onKeyDown={onKeyDown}>
      <header className="edu-typing-head">
        <strong>{lesson.title}</strong>
        <span className="edu-typing-stats">
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
            <span className="edu-typing-done">{session.text.slice(0, session.position)}</span>
            {expected !== undefined && (
              <span className={session.lastWrong ? "edu-typing-current edu-typing-current-wrong" : "edu-typing-current"}>
                {expected === " " ? "␣" : expected}
              </span>
            )}
            <span>{session.text.slice(session.position + 1)}</span>
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
