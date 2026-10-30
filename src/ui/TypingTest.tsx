import { useState } from "react"
import "./studio.css"
import {
  type Certificate,
  certificateLevel,
  certificateNumber,
  cleanName,
  type LayoutId,
  type Lesson,
  LEVELS,
  nextLevel,
  type Progress,
  recordKeys,
  recordTest,
  seededRandom,
  TEST_DURATIONS_MS,
  testText
} from "../core/index.ts"
import { CertificateView, printCertificate } from "./CertificateView.tsx"
import { type Report, TypingTrainer } from "./TypingTrainer.tsx"

interface Props {
  readonly layout: LayoutId
  readonly progress: Progress
  readonly onProgress: (change: (p: Progress) => Progress) => void
  readonly large: boolean
  /** Name to put on the certificate; the student can change it. */
  readonly studentName: string
  readonly issuer: string
  /** Called once per issued certificate: the host app may save it to the student account. */
  readonly onCertificate?: ((certificate: Certificate) => void) | undefined
}

/** Enough text for 3 minutes at 400 cpm: nobody runs out of text. */
const TEST_CHARS = 1300

const LEVELS_ASC = [...LEVELS].reverse()

const minutes = (ms: number): number => Math.round(ms / 60_000)

type Stage =
  | { readonly kind: "setup" }
  | { readonly kind: "run"; readonly lesson: Lesson; readonly durationMs: number }
  | { readonly kind: "result"; readonly report: Report; readonly durationMs: number }
  | { readonly kind: "certificate"; readonly certificate: Certificate }

/** Timed speed test. A good result earns a printable certificate. */
export const TypingTest = ({ layout, progress, onProgress, large, studentName, issuer, onCertificate }: Props) => {
  const [stage, setStage] = useState<Stage>({ kind: "setup" })
  const [durationMs, setDurationMs] = useState(TEST_DURATIONS_MS[0] ?? 60_000)
  const [name, setName] = useState(studentName)

  const start = () => {
    const lesson: Lesson = {
      id: `${layout}-test`,
      layout,
      title: `Тест швидкості: ${minutes(durationMs)} хв`,
      hint: "Час піде з першого натиску. Друкуй рівно: точність теж важлива.",
      text: testText(layout, seededRandom(Date.now()), TEST_CHARS),
      goal: { minCpm: 0, minAccuracy: 0 },
      newKeys: ""
    }
    setStage({ kind: "run", lesson, durationMs })
  }

  const onComplete = (lesson: Lesson, report: Report, ms: number) => {
    if (report.input === "keyboard") {
      onProgress((p) =>
        recordTest(recordKeys(p, lesson.text.slice(0, report.chars), report.mistakesByChar), {
          cpm: report.cpm,
          accuracy: report.accuracy,
          durationMs: ms,
          layout,
          date: new Date().toISOString()
        })
      )
    }
    setStage({ kind: "result", report, durationMs: ms })
  }

  const issue = (report: Report, ms: number) => {
    const level = certificateLevel(report.cpm, report.accuracy)
    const clean = cleanName(name)
    if (!level || clean.length === 0) return
    const now = new Date()
    const certificate: Certificate = {
      name: clean,
      level,
      cpm: report.cpm,
      wpm: report.wpm,
      accuracy: report.accuracy,
      durationMs: ms,
      layout,
      date: now.toISOString(),
      number: certificateNumber(now, Math.random)
    }
    onCertificate?.(certificate)
    setStage({ kind: "certificate", certificate })
  }

  if (stage.kind === "run") {
    return (
      <TypingTrainer
        key={stage.lesson.text}
        lesson={stage.lesson}
        large={large}
        timeLimitMs={stage.durationMs}
        onComplete={(r) => onComplete(stage.lesson, r, stage.durationMs)}
      />
    )
  }

  if (stage.kind === "certificate") {
    return (
      <div className="edu-test">
        <CertificateView certificate={stage.certificate} issuer={issuer} />
        <div className="edu-course-bar edu-test-actions">
          <button type="button" className="edu-btn" onClick={printCertificate}>
            Друкувати або зберегти PDF
          </button>
          <button type="button" className="edu-btn edu-btn-ghost" onClick={() => setStage({ kind: "setup" })}>
            Пройти тест ще раз
          </button>
        </div>
      </div>
    )
  }

  if (stage.kind === "result") {
    const { report } = stage
    const level = certificateLevel(report.cpm, report.accuracy)
    const goal = nextLevel(report.cpm, report.accuracy)
    const touch = report.input === "touch"
    return (
      <div className="edu-test edu-typing-result">
        <p className="edu-typing-verdict">{level ? `Рівень «${level.title}»!` : "Ще трохи потренуйся"}</p>
        <ul className="edu-typing-numbers">
          <li>
            <b>{report.cpm}</b> зн/хв <small>{report.wpm} слів/хв</small>
          </li>
          <li>
            <b>{report.accuracy}%</b> точність <small>помилок {report.mistakes}</small>
          </li>
        </ul>
        {goal && (
          <p className="edu-typing-worst">
            Для рівня «{goal.title}» потрібно {goal.minCpm} зн/хв і точність {goal.minAccuracy}%.
          </p>
        )}
        {touch && <p className="edu-typing-worst">Тест набрано на екранних клавішах: для сертифіката потрібна справжня клавіатура.</p>}
        {level && !touch && (
          <form
            className="edu-test-name"
            onSubmit={(e) => {
              e.preventDefault()
              issue(report, stage.durationMs)
            }}
          >
            <label>
              Ім'я та прізвище для сертифіката
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required autoComplete="name" />
            </label>
            <button type="submit" className="edu-btn" disabled={cleanName(name).length === 0}>
              Отримати сертифікат
            </button>
          </form>
        )}
        <div className="edu-course-bar edu-test-actions">
          <button type="button" className="edu-btn edu-btn-ghost" onClick={() => setStage({ kind: "setup" })}>
            Ще раз
          </button>
        </div>
      </div>
    )
  }

  const best = progress.bestTest
  return (
    <div className="edu-test">
      <p>
        Друкуй текст, поки не скінчиться час. Рахуються лише правильні знаки. За добрий результат отримаєш сертифікат, який можна
        надрукувати або зберегти як PDF.
      </p>
      <table className="edu-test-levels">
        <thead>
          <tr>
            <th>Рівень</th>
            <th>Швидкість</th>
            <th>Точність</th>
          </tr>
        </thead>
        <tbody>
          {LEVELS_ASC.map((l) => (
            <tr key={l.level} className={`edu-test-${l.level}`}>
              <td>{l.title}</td>
              <td>від {l.minCpm} зн/хв</td>
              <td>від {l.minAccuracy}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      {best && (
        <p className="edu-course-note">
          Твій найкращий результат: {best.cpm} зн/хв, точність {best.accuracy}%.
        </p>
      )}
      <div className="edu-course-bar">
        <span role="radiogroup" aria-label="Тривалість тесту" className="edu-seg">
          {TEST_DURATIONS_MS.map((ms) => (
            <button key={ms} type="button" role="radio" aria-checked={ms === durationMs} onClick={() => setDurationMs(ms)}>
              {minutes(ms)} хв
            </button>
          ))}
        </span>
        <button type="button" className="edu-btn" onClick={start}>
          Почати тест
        </button>
      </div>
    </div>
  )
}
