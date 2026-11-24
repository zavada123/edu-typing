import { useEffect, useState } from "react"
import { comboLabels, combosOf, hotkeyById, type Platform, promptParts } from "../core/index.ts"

/** A Mac (or an iPad with a keyboard) uses Cmd; everything else Ctrl. Known only in the browser: "pc" until then. */
export const usePlatform = (): Platform => {
  const [platform, setPlatform] = useState<Platform>("pc")
  useEffect(() => {
    const nav = navigator as Navigator & { readonly userAgentData?: { readonly platform?: string } }
    const name = nav.userAgentData?.platform ?? nav.platform
    if (/mac|iphone|ipad/iu.test(name)) setPlatform("mac")
  }, [])
  return platform
}

/** One combo as keycaps: [Ctrl] + [C]. */
export const ComboKeys = ({ combo, platform, big = false }: { readonly combo: string; readonly platform: Platform; readonly big?: boolean }) => (
  <span className={big ? "edu-hk-combo edu-hk-combo-big" : "edu-hk-combo"}>
    {comboLabels(combo, platform).map((label, i) => (
      <span key={i}>
        {i > 0 && <span className="edu-hk-plus">+</span>}
        <kbd>{label}</kbd>
      </span>
    ))}
  </span>
)

/** All combos of a shortcut on the platform: "Ctrl+Y або Ctrl+Shift+Z". */
export const HotkeyKeys = ({ id, platform, big = false, all = true }: { readonly id: string; readonly platform: Platform; readonly big?: boolean; readonly all?: boolean }) => {
  const combos = combosOf(hotkeyById(id), platform)
  const shown = all ? combos : combos.slice(0, 1)
  return (
    <span className="edu-hk-combos">
      {shown.map((c, i) => (
        <span key={c}>
          {i > 0 && <span className="edu-hk-or"> або </span>}
          <ComboKeys combo={c} platform={platform} big={big} />
        </span>
      ))}
    </span>
  )
}

/** A text with `{copy}` places drawn as the keys of the shortcut. */
export const HotkeyText = ({ text, platform }: { readonly text: string; readonly platform: Platform }) => (
  <>
    {promptParts(text).map((part, i) =>
      "text" in part ? <span key={i}>{part.text}</span> : <HotkeyKeys key={i} id={part.hotkey} platform={platform} all={false} />
    )}
  </>
)
