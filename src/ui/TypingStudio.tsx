import { useState } from "react"
import { type Certificate, learnedKeys, type LayoutId } from "../core/index.ts"
import { CourseView } from "./CourseView.tsx"
import { BalloonsGame, type GameId, LetterfallGame } from "./games.tsx"
import { TypingTest } from "./TypingTest.tsx"
import type { Report } from "./TypingTrainer.tsx"
import { DEFAULT_STORAGE_KEY, useProgress } from "./useProgress.ts"

export type StudioTab = "course" | "games" | "test"

interface Props {
  /** localStorage key for progress; give each signed-in student their own key. */
  readonly storageKey?: string
  /** Bigger text and keys for grades 1–4. */
  readonly large?: boolean
  /** Name to put on the certificate; the student can change it before printing. */
  readonly studentName?: string
  /** Who issues the certificate, e.g. "EduProstir". */
  readonly issuer?: string
  readonly onCertificate?: (certificate: Certificate) => void
  readonly onLessonComplete?: (report: Report) => void
  readonly initialTab?: StudioTab
}

const TABS: ReadonlyArray<{ readonly id: StudioTab; readonly label: string }> = [
  { id: "course", label: "Уроки" },
  { id: "games", label: "Ігри" },
  { id: "test", label: "Тест і сертифікат" }
]

const LAYOUT_LABELS: Readonly<Record<LayoutId, string>> = { uk: "Українська", en: "English" }

const GAMES: ReadonlyArray<{ readonly id: GameId; readonly title: string; readonly about: string }> = [
  { id: "letterfall", title: "Літеропад", about: "Лови літери, що падають з неба" },
  { id: "balloons", title: "Повітряні кульки", about: "Набирай слова й лопай кульки" }
]

/** The whole trainer: lessons with progress, typing games, and the speed test with a certificate. */
export const TypingStudio = ({
  storageKey = DEFAULT_STORAGE_KEY,
  large = false,
  studentName = "",
  issuer = "Тренажер сліпого друку",
  onCertificate,
  onLessonComplete,
  initialTab = "course"
}: Props) => {
  const [progress, update] = useProgress(storageKey)
  const [tab, setTab] = useState<StudioTab>(initialTab)
  const [layout, setLayout] = useState<LayoutId>("uk")
  const [game, setGame] = useState<GameId>("letterfall")
  const learned = learnedKeys(progress, layout)

  return (
    <div className="edu-studio">
      <nav className="edu-studio-nav">
        <span role="tablist" aria-label="Розділ" className="edu-tabs">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={t.id === tab} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </span>
        <span role="radiogroup" aria-label="Розкладка" className="edu-seg">
          {(["uk", "en"] as const).map((l) => (
            <button key={l} type="button" role="radio" aria-checked={l === layout} onClick={() => setLayout(l)}>
              {LAYOUT_LABELS[l]}
            </button>
          ))}
        </span>
      </nav>

      {tab === "course" && (
        <CourseView key={layout} layout={layout} progress={progress} onProgress={update} large={large} onLessonComplete={onLessonComplete} />
      )}

      {tab === "games" && (
        <div className="edu-games">
          <span role="radiogroup" aria-label="Гра" className="edu-game-pick">
            {GAMES.map((g) => (
              <button key={g.id} type="button" role="radio" aria-checked={g.id === game} onClick={() => setGame(g.id)}>
                <b>{g.title}</b>
                <small>{g.about}</small>
                {(progress.games[g.id] ?? 0) > 0 && <small>Рекорд: {progress.games[g.id]}</small>}
              </button>
            ))}
          </span>
          {game === "letterfall" ? (
            <LetterfallGame key={layout} layout={layout} progress={progress} onProgress={update} learned={learned} />
          ) : (
            <BalloonsGame key={layout} layout={layout} progress={progress} onProgress={update} learned={learned} />
          )}
        </div>
      )}

      {tab === "test" && (
        <TypingTest
          key={layout}
          layout={layout}
          progress={progress}
          onProgress={update}
          large={large}
          studentName={studentName}
          issuer={issuer}
          onCertificate={onCertificate}
        />
      )}
    </div>
  )
}
