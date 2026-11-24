import { useEffect, useRef, useState } from "react"
import {
  combosOf,
  comboCodes,
  type EditTask,
  editState,
  hotkeyAccuracy,
  hotkeyById,
  type HotkeyLesson,
  hotkeyOf,
  hotkeyStars,
  isModifierOnly,
  LAYOUTS,
  type LayoutId,
  matches,
  type Platform,
  type PressTask,
  quizOptions,
  type QuizTask,
  tasksFor
} from "../core/index.ts"
import { HotkeyKeys, HotkeyText } from "./HotkeyParts.tsx"
import { Keyboard } from "./Keyboard.tsx"

export interface HotkeyReport {
  readonly lessonId: string
  readonly mistakes: number
  readonly accuracy: number
  readonly stars: 1 | 2 | 3
}

interface StepProps {
  readonly platform: Platform
  /** The task is done: go on. */
  readonly onDone: () => void
  readonly onMistake: () => void
}

/** Pause after a right press, so the student sees the green check. */
const NEXT_DELAY_MS = 700

/** Keys the page lets the browser handle itself: F5, F12 and the rest. */
const isFunctionKey = (code: string): boolean => /^F\d+$/u.test(code)

/** Keys that the on-screen keyboard has: letters, digits, Backspace and the modifiers. */
const onKeyboard = (code: string): boolean => /^(Key|Digit)/u.test(code) || code === "Backspace"

const PressStep = ({ task, platform, layout, onDone, onMistake }: StepProps & { readonly task: PressTask; readonly layout: LayoutId }) => {
  const hotkey = hotkeyById(task.hotkey)
  const [state, setState] = useState<"wait" | "right" | "wrong">("wait")
  const [say, setSay] = useState("")
  const [held, setHeld] = useState<ReadonlySet<string>>(new Set())
  const done = useRef(false)
  const first = combosOf(hotkey, platform)[0] ?? ""

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isFunctionKey(e.code)) return
      e.preventDefault()
      setHeld((h) => new Set(h).add(e.code))
      if (done.current || e.repeat || isModifierOnly(e)) return
      if (matches(e, hotkey, platform)) {
        done.current = true
        setState("right")
        setSay(hotkey.done ?? `${hotkey.name}!`)
        window.setTimeout(onDone, NEXT_DELAY_MS)
        return
      }
      onMistake()
      setState("wrong")
      const other = hotkeyOf(e, platform)
      const noMods = !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey
      setSay(
        other
          ? `Це «${other.name}». А треба «${hotkey.name}».`
          : noMods && first.includes("+")
            ? "Спершу затисни першу клавішу, а тоді, не відпускаючи, натисни другу."
            : "Не та комбінація. Подивись на клавіші вгорі."
      )
    }
    const up = (e: KeyboardEvent) =>
      setHeld((h) => {
        const next = new Set(h)
        next.delete(e.code)
        return next
      })
    const clear = () => setHeld(new Set())
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    window.addEventListener("blur", clear)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
      window.removeEventListener("blur", clear)
    }
  }, [hotkey, platform, first, onDone, onMistake])

  const codes = comboCodes(first)
  const showKeyboard = platform === "pc" && codes.every((c) => onKeyboard(c) || /^(Control|Shift|Alt|Meta)/u.test(c))
  return (
    <div className="edu-hk-step">
      <p className="edu-hk-ask">Натисни: «{hotkey.name}»</p>
      <div className={`edu-hk-target edu-hk-${state}`}>
        <HotkeyKeys id={hotkey.id} platform={platform} big />
      </div>
      <p className={`edu-hk-say edu-hk-say-${state}`} aria-live="polite">
        {state === "right" ? `✓ ${say}` : say || hotkey.about}
      </p>
      {showKeyboard && <Keyboard layout={LAYOUTS[layout]} marks={new Set(codes)} pressed={held} />}
    </div>
  )
}

const EditStep = ({ task, platform, onDone }: StepProps & { readonly task: EditTask }) => {
  const [run, setRun] = useState(0)
  const [text, setText] = useState(task.start)
  const [used, setUsed] = useState<ReadonlySet<string>>(new Set())
  const [changed, setChanged] = useState(false)
  const box = useRef<HTMLTextAreaElement>(null)
  const state = editState(task, text, used, changed)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const [from, to] = task.select ?? [task.start.length, task.start.length]
    el.focus({ preventScroll: true })
    el.setSelectionRange(from, to)
  }, [task, run])

  const restart = () => {
    setRun((n) => n + 1)
    setText(task.start)
    setUsed(new Set())
    setChanged(false)
  }
  const missing = task.needs.filter((id) => !used.has(id))

  return (
    <div className="edu-hk-step">
      <p className="edu-hk-ask">
        <HotkeyText text={task.prompt} platform={platform} />
      </p>
      <textarea
        key={run}
        ref={box}
        className="edu-hk-field"
        defaultValue={task.start}
        rows={3}
        spellCheck={false}
        readOnly={state === "done"}
        aria-label="Текст для редагування"
        onKeyDown={(e) => {
          // The focus stays in the field: the last typed letters must not land on the "Далі" button.
          if (state === "done") {
            if (e.key === "Enter") {
              e.preventDefault()
              onDone()
            }
            return
          }
          const h = hotkeyOf(e.nativeEvent, platform)
          if (!h) return
          // Save, find and print would open the browser's own windows: here they only count.
          if (h.done) e.preventDefault()
          if (!used.has(h.id)) setUsed((u) => new Set(u).add(h.id))
        }}
        onInput={(e) => {
          const value = e.currentTarget.value
          setText(value)
          if (value !== task.start) setChanged(true)
        }}
      />
      <div className="edu-hk-needs">
        Використай:{" "}
        {task.needs.map((id) => (
          <span key={id} className={used.has(id) ? "edu-hk-need edu-hk-need-ok" : "edu-hk-need"}>
            <HotkeyKeys id={id} platform={platform} /> {used.has(id) ? "✓" : ""}
          </span>
        ))}
      </div>
      {state === "needKeys" && (
        <p className="edu-hk-say edu-hk-say-wrong" aria-live="polite">
          Текст правильний, але зроби це клавішами: {missing.map((id) => hotkeyById(id).name.toLowerCase()).join(", ")}. Почни знову і
          спробуй без мишки.
        </p>
      )}
      <div className="edu-course-bar">
        {state === "done" ? (
          <>
            <span className="edu-hk-say edu-hk-say-right">✓ Готово!</span>
            <button type="button" className="edu-btn" onClick={onDone}>
              Далі →
            </button>
            <span className="edu-hk-say">або Enter</span>
          </>
        ) : (
          <button type="button" className="edu-btn edu-btn-ghost" onClick={restart}>
            Почати знову
          </button>
        )}
      </div>
    </div>
  )
}

const QuizStep = ({ task, lesson, platform, onDone, onMistake }: StepProps & { readonly task: QuizTask; readonly lesson: HotkeyLesson }) => {
  const hotkey = hotkeyById(task.hotkey)
  const options = quizOptions(lesson, task.hotkey)
  const [wrong, setWrong] = useState<ReadonlySet<string>>(new Set())
  const [right, setRight] = useState(false)
  const next = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (right) next.current?.focus({ preventScroll: true })
  }, [right])
  const choose = (name: string) => {
    if (right || wrong.has(name)) return
    if (name === hotkey.name) setRight(true)
    else {
      setWrong((w) => new Set(w).add(name))
      onMistake()
    }
  }
  return (
    <div className="edu-hk-step">
      <p className="edu-hk-ask">Що робить ця комбінація?</p>
      <div className="edu-hk-target">
        <HotkeyKeys id={hotkey.id} platform={platform} big />
      </div>
      <div className="edu-hk-options" role="group" aria-label="Відповіді">
        {options.map((name) => (
          <button
            key={name}
            type="button"
            className={["edu-hk-option", wrong.has(name) ? "edu-hk-option-wrong" : "", right && name === hotkey.name ? "edu-hk-option-right" : ""].join(" ")}
            onClick={() => choose(name)}
            disabled={wrong.has(name)}
          >
            {name}
          </button>
        ))}
      </div>
      {right && (
        <>
          <p className="edu-hk-say edu-hk-say-right" aria-live="polite">
            ✓ Так! {hotkey.about} Тут її не натискаємо: її забирає собі браузер або система.
          </p>
          <div className="edu-course-bar">
            <button type="button" className="edu-btn" ref={next} onClick={onDone}>
              Далі →
            </button>
          </div>
        </>
      )}
      {!right && wrong.size > 0 && <p className="edu-hk-say edu-hk-say-wrong">Ні, спробуй ще.</p>}
    </div>
  )
}

interface Props {
  readonly lesson: HotkeyLesson
  readonly platform: Platform
  readonly layout: LayoutId
  readonly onComplete: (report: HotkeyReport) => void
  readonly onNext?: (() => void) | undefined
}

/** One shortcut lesson: tasks one by one, then stars. */
export const HotkeyTrainer = ({ lesson, platform, layout, onComplete, onNext }: Props) => {
  const tasks = tasksFor(lesson, platform)
  const [index, setIndex] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [report, setReport] = useState<HotkeyReport>()
  const mistakesRef = useRef(0)

  const onMistake = () => {
    mistakesRef.current += 1
    setMistakes(mistakesRef.current)
  }
  const onDone = () => {
    if (index + 1 < tasks.length) {
      setIndex(index + 1)
      return
    }
    const m = mistakesRef.current
    const r: HotkeyReport = { lessonId: lesson.id, mistakes: m, accuracy: hotkeyAccuracy(tasks.length, m), stars: hotkeyStars(m) }
    setReport(r)
    onComplete(r)
  }
  const again = () => {
    mistakesRef.current = 0
    setMistakes(0)
    setIndex(0)
    setReport(undefined)
  }

  if (report) {
    return (
      <div className="edu-hk">
        <h3 className="edu-hk-title">{lesson.title}</h3>
        <div className="edu-typing-result">
          <div className="edu-typing-stars" aria-label={`Зірок: ${report.stars} з 3`}>
            {"★".repeat(report.stars)}
            <span className="edu-typing-stars-off">{"★".repeat(3 - report.stars)}</span>
          </div>
          <p className="edu-typing-verdict">{report.mistakes === 0 ? "Без жодної помилки!" : `Помилок: ${report.mistakes}. Точність ${report.accuracy}%.`}</p>
        </div>
        <div className="edu-course-bar edu-hk-end">
          <button type="button" className="edu-btn edu-btn-ghost" onClick={again}>
            Пройти ще раз
          </button>
          {onNext && (
            <button type="button" className="edu-btn" onClick={onNext}>
              Наступний урок →
            </button>
          )}
        </div>
      </div>
    )
  }

  const task = tasks[index]
  if (!task) return null
  const step = { platform, onDone, onMistake }
  return (
    <div className="edu-hk">
      <div className="edu-hk-head">
        <h3 className="edu-hk-title">{lesson.title}</h3>
        <span className="edu-typing-stats">
          Завдання {index + 1} з {tasks.length} · помилок: {mistakes}
        </span>
      </div>
      <p className="edu-typing-hint">
        <HotkeyText text={lesson.hint} platform={platform} />
      </p>
      <progress className="edu-hk-progress" max={tasks.length} value={index} />
      {task.kind === "press" && <PressStep key={index} task={task} layout={layout} {...step} />}
      {task.kind === "edit" && <EditStep key={index} task={task} {...step} />}
      {task.kind === "quiz" && <QuizStep key={index} task={task} lesson={lesson} {...step} />}
    </div>
  )
}
