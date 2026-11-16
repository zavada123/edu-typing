import { useRef, useState } from "react"
import { type Certificate, learnedKeys, type LayoutId, type Lesson, lessons, type Progress, type StudioPlace } from "../core/index.ts"
import { CourseView } from "./CourseView.tsx"
import { useFullscreen } from "./fullscreen.ts"
import { BalloonsGame, type GameId, LetterfallGame } from "./games.tsx"
import { KingdomGame } from "./kingdom/KingdomGame.tsx"
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
  /**
   * The whole progress after each change (lesson, game, test). The host page can keep it on its server and give it
   * back with `mergeProgress` on another device. Pass a stable function (`useCallback`).
   */
  readonly onProgressChange?: (progress: Progress) => void
  readonly initialTab?: StudioTab
  /**
   * The place to open at once: a lesson, a game, the test or the lesson map (a link to one lesson). It wins over
   * `initialTab`. Read it from the address with `parseStudioPlace(location.search)`.
   */
  readonly initialPlace?: StudioPlace | undefined
  /** The place after each move of the student (tab, lesson, game). Write it to the address with `formatStudioPlace`. */
  readonly onPlaceChange?: (place: StudioPlace) => void
}

const lessonOf = (place: StudioPlace | undefined): Lesson | undefined =>
  place?.tab === "lesson" ? lessons.find((l) => l.id === place.lesson) : undefined

const tabOf = (place: StudioPlace | undefined, fallback: StudioTab): StudioTab => {
  if (place === undefined) return fallback
  return place.tab === "lesson" ? "course" : place.tab
}

const TABS: ReadonlyArray<{ readonly id: StudioTab; readonly label: string }> = [
  { id: "course", label: "Уроки" },
  { id: "games", label: "Ігри" },
  { id: "test", label: "Тест і сертифікат" }
]

const LAYOUT_LABELS: Readonly<Record<LayoutId, string>> = { uk: "Українська", en: "English" }

const GAMES: ReadonlyArray<{ readonly id: GameId; readonly title: string; readonly about: string }> = [
  { id: "letterfall", title: "Літеропад", about: "Лови літери, що падають з неба" },
  { id: "balloons", title: "Повітряні кульки", about: "Набирай слова й лопай кульки" },
  { id: "kingdom", title: "Клавішне королівство", about: "Командуй замком і бережи його до світанку" }
]

/** The whole trainer: lessons with progress, typing games, and the speed test with a certificate. */
export const TypingStudio = ({
  storageKey = DEFAULT_STORAGE_KEY,
  large = false,
  studentName = "",
  issuer = "Тренажер сліпого друку",
  onCertificate,
  onLessonComplete,
  onProgressChange,
  initialTab = "course",
  initialPlace,
  onPlaceChange
}: Props) => {
  const [progress, update] = useProgress(storageKey, onProgressChange)
  // The linked lesson opens once: after any move the lesson map opens as usual.
  const [initialLesson, setInitialLesson] = useState(() => lessonOf(initialPlace))
  const [tab, setTab] = useState<StudioTab>(() => tabOf(initialPlace, initialTab))
  const [layout, setLayout] = useState<LayoutId>(initialLesson?.layout ?? "uk")
  const [game, setGame] = useState<GameId>(initialPlace?.tab === "games" ? initialPlace.game : "letterfall")
  const moved = (place: StudioPlace) => {
    setInitialLesson(undefined)
    onPlaceChange?.(place)
  }
  const placeOfTab = (t: StudioTab): StudioPlace => (t === "games" ? { tab: "games", game } : { tab: t })
  const chooseTab = (t: StudioTab) => {
    setTab(t)
    moved(placeOfTab(t))
  }
  const chooseLayout = (l: LayoutId) => {
    setLayout(l)
    // The lesson map of the other layout opens: an open lesson closes.
    if (tab === "course") moved({ tab: "course" })
  }
  const chooseGame = (g: GameId) => {
    setGame(g)
    moved({ tab: "games", game: g })
  }
  const learned = learnedKeys(progress, layout)
  const boxRef = useRef<HTMLDivElement>(null)
  const full = useFullscreen(boxRef)

  return (
    <div className="edu-studio" ref={boxRef}>
      <nav className="edu-studio-nav">
        <span role="tablist" aria-label="Розділ" className="edu-tabs">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={t.id === tab} onClick={() => chooseTab(t.id)}>
              {t.label}
            </button>
          ))}
        </span>
        <span role="radiogroup" aria-label="Розкладка" className="edu-seg">
          {(["uk", "en"] as const).map((l) => (
            <button key={l} type="button" role="radio" aria-checked={l === layout} onClick={() => chooseLayout(l)}>
              {LAYOUT_LABELS[l]}
            </button>
          ))}
        </span>
        {full.available && (
          <button type="button" className="edu-game-fullscreen" onClick={full.toggle} aria-pressed={full.on}>
            {full.on ? "Вийти з повного екрана" : "На весь екран"}
          </button>
        )}
      </nav>

      {tab === "course" && (
        <CourseView
          key={layout}
          layout={layout}
          progress={progress}
          onProgress={update}
          large={large}
          onLessonComplete={onLessonComplete}
          initialLesson={initialLesson}
          onLessonChange={(l) => moved(l === undefined ? { tab: "course" } : { tab: "lesson", lesson: l.id })}
        />
      )}

      {tab === "games" && (
        <div className="edu-games">
          <span role="radiogroup" aria-label="Гра" className="edu-game-pick">
            {GAMES.map((g) => (
              <button key={g.id} type="button" role="radio" aria-checked={g.id === game} onClick={() => chooseGame(g.id)}>
                <b>{g.title}</b>
                <small>{g.about}</small>
                {(progress.games[g.id] ?? 0) > 0 && <small>Рекорд: {progress.games[g.id]}</small>}
              </button>
            ))}
          </span>
          {game === "letterfall" && <LetterfallGame key={layout} layout={layout} progress={progress} onProgress={update} learned={learned} />}
          {game === "balloons" && <BalloonsGame key={layout} layout={layout} progress={progress} onProgress={update} learned={learned} />}
          {game === "kingdom" && <KingdomGame key={layout} layout={layout} progress={progress} onProgress={update} learned={learned} />}
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
