import type { Certificate } from "../core/index.ts"
import "./studio.css"

interface Props {
  readonly certificate: Certificate
  /** Who issues it, e.g. the school or the platform name. */
  readonly issuer: string
}

const LAYOUT_NAMES = { uk: "українська розкладка", en: "англійська розкладка" } as const

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })
}

const PRINTING = "edu-cert-printing"

/** Print only the certificate: the class hides the rest of the page in print CSS. */
export const printCertificate = () => {
  document.body.classList.add(PRINTING)
  const done = () => {
    document.body.classList.remove(PRINTING)
    window.removeEventListener("afterprint", done)
  }
  window.addEventListener("afterprint", done)
  window.print()
}

/** A4 landscape certificate. On screen it scales with the container; in print it fills the page. */
export const CertificateView = ({ certificate: c, issuer }: Props) => (
  <div className={`edu-cert edu-cert-${c.level.level}`}>
    <div className="edu-cert-frame">
      <p className="edu-cert-issuer">{issuer}</p>
      <h2 className="edu-cert-title">Сертифікат</h2>
      <p className="edu-cert-sub">засвідчує, що</p>
      <p className="edu-cert-name">{c.name}</p>
      <p className="edu-cert-sub">володіє сліпим десятипальцевим друком на рівні</p>
      <div className="edu-cert-medal" aria-hidden="true">
        <span>{c.level.title.slice(0, 1)}</span>
      </div>
      <p className="edu-cert-level">«{c.level.title}»</p>
      <ul className="edu-cert-stats">
        <li>
          <b>{c.cpm}</b> знаків за хвилину
        </li>
        <li>
          <b>{c.accuracy}%</b> точність
        </li>
        <li>
          <b>{Math.round(c.durationMs / 60_000)} хв</b> тест, {LAYOUT_NAMES[c.layout]}
        </li>
      </ul>
      <p className="edu-cert-foot">
        <span>{formatDate(c.date)}</span>
        <span>№ {c.number}</span>
      </p>
    </div>
  </div>
)
