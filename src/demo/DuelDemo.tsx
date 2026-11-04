import { useEffect, useRef, useState } from "react"
import { advanceDuel, duelBlocked, type DuelInput, type DuelKey, type DuelSide, type DuelState, newDuel, TICK_MS, WORDS } from "../core/index.ts"
import { DuelGame } from "../ui/kingdom/DuelGame.tsx"

/**
 * Demo of the network duel without a network: a relay in the page stamps the keys with ticks the way the
 * EduProstir server does, and a simple bot types for the other castle. Open with ?duel=1.
 */

const RELAY_MS = 100
const BOT_CPM = 90
const SEED = 20_261_104

const botKey = (s: DuelState, side: DuelSide): DuelKey | undefined => {
  const p = s.players[side]
  if (p.target) return p.slots.find((o) => o.kind === p.target)?.word[p.typed]
  const can = (k: string) => p.slots.some((o) => o.kind === k) && duelBlocked(s, side, k as never) === undefined
  const kind = can("warrior") ? "warrior" : can("tower") ? "tower" : p.gold < 5 ? "gold" : "wood"
  return p.slots.find((o) => o.kind === kind)?.word[0]
}

export const DuelDemo = () => {
  const [inputs, setInputs] = useState<readonly DuelInput[]>([])
  const [upTo, setUpTo] = useState(0)
  const [round, setRound] = useState(0)
  const tick = useRef(0)
  const queued = useRef<DuelKey[]>([])
  const shadow = useRef<DuelState>(newDuel(WORDS.uk, SEED))
  const botWait = useRef(0)

  useEffect(() => {
    tick.current = 0
    shadow.current = newDuel(WORDS.uk, SEED + round)
    const id = setInterval(() => {
      const from = tick.current
      tick.current += RELAY_MS / TICK_MS
      const stamped: DuelInput[] = queued.current.map((key) => ({ tick: from + 1, side: 0, key }))
      queued.current = []
      botWait.current -= RELAY_MS
      if (botWait.current <= 0) {
        botWait.current += 60_000 / BOT_CPM
        const key = botKey(shadow.current, 1)
        if (key) stamped.push({ tick: from + 1, side: 1, key })
      }
      shadow.current = advanceDuel(shadow.current, stamped, tick.current)
      setInputs((all) => [...all, ...stamped])
      setUpTo(tick.current)
    }, RELAY_MS)
    return () => clearInterval(id)
  }, [round])

  return (
    <DuelGame
      key={round}
      layout="uk"
      seed={SEED + round}
      side={0}
      names={["Ти", `Бот (${BOT_CPM} зн/хв)`]}
      inputs={inputs}
      upTo={upTo}
      onKey={(key) => queued.current.push(key)}
      onExit={() => {
        setInputs([])
        setUpTo(0)
        setRound((r) => r + 1)
      }}
    />
  )
}
