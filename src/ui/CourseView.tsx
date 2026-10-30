import { useState } from "react"
import "./studio.css"
import {
  heatByCode,
  isUnlocked,
  learnedKeys,
  LAYOUTS,
  type LayoutId,
  type Lesson,
  lessons,
  nextLesson,
  practiceLesson,
  type Progress,
  recordLesson,
  score,
  seededRandom,
  units,
  weakKeys
} from "../core/index.ts"
import { Keyboard } from "./Keyboard.tsx"
import { type Report, TypingTrainer } from "./TypingTrainer.tsx"

interface Props {
  readonly layout: LayoutId
  readonly progress: Progress
  readonly onProgress: (change: (p: Progress) => Progress) => void
  readonly large: boolean
  readonly onLessonComplete?: ((report: Report) => void) | undefined
}

const WEAK_LIMIT = 5

const Stars = ({ count }: { readonly count: number }) => (
  <span className="edu-course-stars" aria-label={`Зірок: ${count} з 3`}>
    {"★".repeat(count)}
    <span className="edu-typing-stars-off">{"★".repeat(3 - count)}</span>
  </span>
)

/** The lesson map: units, stars, the next lesson, and practice of weak keys. */
export const CourseView = ({ layout, progress, onProgress, large, onLessonComplete }: Props) => {
  const [lesson, setLesson] = useState<Lesson>()
  const [run, setRun] = useState(0)
  const [passed, setPassed] = useState(false)

  const open = (l: Lesson) => {
    setLesson(l)
    setPassed(false)
    setRun((n) => n + 1)
  }

  const weak = weakKeys(progress, WEAK_LIMIT)
  const heat = heatByCode(progress, layout)
  const next = nextLesson(progress, layout)

  const onComplete = (report: Report) => {
    if (!lesson) return
    if (report.input === "keyboard") {
      onProgress((p) => recordLesson(p, lesson, report, score(report, lesson.goal)))
    }
    setPassed(report.passed)
    onLessonComplete?.(report)
  }

  if (lesson) {
    const index = lessons.findIndex((l) => l.id === lesson.id)
    const following = lessons[index + 1]
    const hasNext = following !== undefined && following.layout === lesson.layout
    return (
      <div className="edu-course">
        <div className="edu-course-bar">
          <button type="button" className="edu-btn edu-btn-ghost" onClick={() => setLesson(undefined)}>
            ← До уроків
          </button>
          {passed && hasNext && (
            <button type="button" className="edu-btn" onClick={() => open(following)}>
              Наступний урок →
            </button>
          )}
        </div>
        <TypingTrainer key={`${lesson.id}-${run}`} lesson={lesson} large={large} heat={heat} onComplete={onComplete} />
      </div>
    )
  }

  return (
    <div className="edu-course">
      <div className="edu-course-bar">
        {next && (
          <button type="button" className="edu-btn" onClick={() => open(next)}>
            {Object.keys(progress.lessons).length === 0 ? "Почати з першого уроку" : `Продовжити: ${next.title}`}
          </button>
        )}
        <button
          type="button"
          className="edu-btn edu-btn-ghost"
          onClick={() => open(practiceLesson(layout, learnedKeys(progress, layout), weak, seededRandom(Date.now())))}
        >
          {weak.length > 0 ? "Тренувати складні клавіші" : "Вільне тренування"}
        </button>
      </div>

      {units
        .filter((u) => u.layout === layout)
        .map((u) => (
          <section key={u.id} className="edu-course-unit">
            <h3>{u.title}</h3>
            <ol className="edu-course-lessons">
              {u.lessons.map((l) => {
                const best = progress.lessons[l.id]
                const locked = !isUnlocked(progress, l.id)
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      className={["edu-course-lesson", locked ? "edu-course-locked" : "", best ? "edu-course-done" : ""].join(" ")}
                      onClick={() => open(l)}
                      title={locked ? "Радимо спершу пройти попередній урок" : l.hint}
                    >
                      <span className="edu-course-title">
                        {locked && <span aria-label="Ще не відкрито">🔒 </span>}
                        {l.title}
                      </span>
                      {best ? <Stars count={best.stars} /> : <span className="edu-course-goal">{l.goal.minCpm} зн/хв</span>}
                    </button>
                  </li>
                )
              })}
            </ol>
          </section>
        ))}

      {heat.size > 0 && (
        <section className="edu-course-unit">
          <h3>Твої складні клавіші</h3>
          <p className="edu-course-note">
            {weak.length > 0
              ? `Найчастіше помилки на: ${weak.map((c) => c.toUpperCase()).join(", ")}. Що червоніша клавіша, то більше помилок.`
              : "Помилок майже немає. Так тримати!"}
          </p>
          <Keyboard layout={LAYOUTS[layout]} heat={heat} />
        </section>
      )}
    </div>
  )
}
