import { StrictMode, useState } from "react"
import { createRoot } from "react-dom/client"
import { lessons } from "../core/index.ts"
import { TypingTrainer, type Report } from "../ui/TypingTrainer.tsx"
import "./demo.css"

const firstLesson = lessons[0]
if (!firstLesson) throw new Error("Немає жодного уроку")

const params = new URLSearchParams(window.location.search)
/** ?embed=1 hides the demo header and sends the result to the parent page (iframe). */
const embedded = params.get("embed") === "1"
const large = params.get("large") === "1"

/** In an iframe the host page listens: window.addEventListener("message", e => e.data.type === "edu-typing:result"). */
const sendToParent = (report: Report) => {
  if (window.parent !== window) window.parent.postMessage({ type: "edu-typing:result", report }, "*")
}

/** Demo page: pick a lesson and try the trainer. */
const Demo = () => {
  const [id, setId] = useState(params.get("lesson") ?? firstLesson.id)
  const [last, setLast] = useState<Report>()
  const lesson = lessons.find((l) => l.id === id) ?? firstLesson
  const onComplete = (report: Report) => {
    setLast(report)
    sendToParent(report)
  }
  if (embedded) return <TypingTrainer lesson={lesson} large={large} onComplete={onComplete} />
  return (
    <div className="demo">
      <header className="demo-head">
        <strong>Тренажер друку</strong>
        <label>
          <span className="demo-visually-hidden">Урок</span>
          <select value={lesson.id} onChange={(e) => setId(e.target.value)}>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.layout === "uk" ? "УКР" : "ENG"} · {l.title}
              </option>
            ))}
          </select>
        </label>
      </header>
      <main className="demo-main">
        <TypingTrainer key={lesson.id} lesson={lesson} large={large} onComplete={onComplete} />
        {last && (
          <details className="demo-report">
            <summary>Що отримає EduProstir (onComplete)</summary>
            <pre>{JSON.stringify(last, null, 2)}</pre>
          </details>
        )}
      </main>
    </div>
  )
}

const rootEl = document.getElementById("root")
if (!rootEl) throw new Error("Немає #root")
createRoot(rootEl).render(
  <StrictMode>
    <Demo />
  </StrictMode>
)
