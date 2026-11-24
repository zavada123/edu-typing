import { useState } from "react"
import "./hotkeys.css"
import "./studio.css"
import {
  combosOf,
  HOTKEYS,
  type HotkeyLesson,
  hotkeyLessons,
  type LayoutId,
  type Platform,
  type Progress,
  recordHotkeyLesson,
  tasksFor
} from "../core/index.ts"
import { HotkeyKeys, usePlatform } from "./HotkeyParts.tsx"
import { type HotkeyReport, HotkeyTrainer } from "./HotkeyTrainer.tsx"

interface Props {
  readonly layout: LayoutId
  readonly progress: Progress
  readonly onProgress: (change: (p: Progress) => Progress) => void
  /** The lesson to open at once (a link to one lesson). */
  readonly initialLesson?: HotkeyLesson | undefined
  /** The opened lesson, or `undefined` back on the list. */
  readonly onLessonChange?: ((lesson: HotkeyLesson | undefined) => void) | undefined
  readonly onLessonComplete?: ((report: HotkeyReport) => void) | undefined
}

const CARD_KEYS = 3

/** The first few shortcuts of a lesson, for its card. */
const keysOf = (lesson: HotkeyLesson, platform: Platform): readonly string[] =>
  [...new Set(tasksFor(lesson, platform).flatMap((t) => (t.kind === "edit" ? t.needs : [t.hotkey])))].slice(0, CARD_KEYS)

const Stars = ({ count }: { readonly count: number }) => (
  <span className="edu-course-stars" aria-label={`Зірок: ${count} з 3`}>
    {"★".repeat(count)}
    <span className="edu-typing-stars-off">{"★".repeat(3 - count)}</span>
  </span>
)

/** Shortcut lessons: Ctrl+C, Ctrl+V, Ctrl+Z and the rest, and a cheat sheet of all of them. */
export const HotkeysView = ({ layout, progress, onProgress, initialLesson, onLessonChange, onLessonComplete }: Props) => {
  const platform = usePlatform()
  const [lesson, setLesson] = useState<HotkeyLesson | undefined>(initialLesson)
  const [run, setRun] = useState(0)

  const open = (l: HotkeyLesson) => {
    setLesson(l)
    setRun((n) => n + 1)
    onLessonChange?.(l)
  }
  const close = () => {
    setLesson(undefined)
    onLessonChange?.(undefined)
  }
  const onComplete = (report: HotkeyReport) => {
    onProgress((p) => recordHotkeyLesson(p, report.lessonId, report.stars, report.accuracy))
    onLessonComplete?.(report)
  }

  if (lesson) {
    const following = hotkeyLessons[hotkeyLessons.findIndex((l) => l.id === lesson.id) + 1]
    return (
      <div className="edu-course">
        <div className="edu-course-bar">
          <button type="button" className="edu-btn edu-btn-ghost" onClick={close}>
            ← До гарячих клавіш
          </button>
        </div>
        <HotkeyTrainer
          key={`${lesson.id}-${run}`}
          lesson={lesson}
          platform={platform}
          layout={layout}
          onComplete={onComplete}
          onNext={following ? () => open(following) : undefined}
        />
      </div>
    )
  }

  const left = hotkeyLessons.find((l) => !progress.lessons[l.id])
  const started = hotkeyLessons.some((l) => progress.lessons[l.id])
  const first = left ?? hotkeyLessons[0]
  return (
    <div className="edu-course">
      <p className="edu-course-note">
        Гарячі клавіші роблять те саме, що мишка, але вдвічі швидше. Для цих завдань потрібна справжня клавіатура. Деякі комбінації
        браузер забирає собі (наприклад, <HotkeyKeys id="closeTab" platform={platform} /> закриє вкладку), тому їх ми не натискаємо, а
        тільки вчимо, що вони роблять.
      </p>
      {first && (
        <div className="edu-course-bar">
          <button type="button" className="edu-btn" onClick={() => open(first)}>
            {!started ? "Почати з першого уроку" : left ? `Продовжити: ${first.title}` : "Усі уроки пройдено! Почати знову"}
          </button>
        </div>
      )}
      <section className="edu-course-unit">
        <h3>Уроки</h3>
        <ol className="edu-course-lessons">
          {hotkeyLessons.map((l) => {
            const best = progress.lessons[l.id]
            return (
              <li key={l.id}>
                <button type="button" className={["edu-course-lesson", best ? "edu-course-done" : ""].join(" ")} onClick={() => open(l)}>
                  <span className="edu-course-title">{l.title}</span>
                  <span className="edu-hk-card-keys">
                    {keysOf(l, platform).map((id) => (
                      <HotkeyKeys key={id} id={id} platform={platform} all={false} />
                    ))}
                  </span>
                  {best && <Stars count={best.stars} />}
                </button>
              </li>
            )
          })}
        </ol>
      </section>
      <details className="edu-course-unit edu-hk-sheet">
        <summary>Шпаргалка: усі комбінації</summary>
        <table>
          <tbody>
            {HOTKEYS.filter((h) => combosOf(h, platform).length > 0).map((h) => (
              <tr key={h.id}>
                <td>
                  <HotkeyKeys id={h.id} platform={platform} />
                </td>
                <th scope="row">{h.name}</th>
                <td>
                  {h.about}
                  {h.browser && <small> Тут не натискаємо: її забирає браузер або система.</small>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
