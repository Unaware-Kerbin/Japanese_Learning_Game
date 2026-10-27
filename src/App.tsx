import { useCallback, useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { lessons } from './data/lessons.ts'
import { load, needsProbe, persist } from './engine/logic.ts'
import type { Save } from './engine/logic.ts'
import { About, ImePage, Journal, Pack, Shelf } from './screens/pages.tsx'
import { AnkiScreen } from './screens/anki.tsx'
import { Lesson, Replay } from './screens/lesson.tsx'
import { MapScreen } from './screens/map.tsx'
import { Band, Check, Doors, Kept, Minutes, Probe } from './screens/flow.tsx'
import { Top, backHome } from './screens/bits.tsx'
import { art } from './ui/media.ts'
import { SaveContext } from './ui/save.tsx'
import type { KeptNote } from './ui/save.tsx'

function viewOf(save: Save): string {
  if (['about', 'shelf', 'journal', 'ime', 'pack', 'anki'].includes(save.screen)) return save.screen
  if (!save.door) return 'door'
  if (save.screen === 'check' || save.screen === 'kept') return save.screen
  if (save.screen === 'lesson' && save.today && save.today.phase !== 'done') return 'lesson'
  if (save.screen === 'minutes') return 'minutes'
  if (needsProbe(save, lessons)) return 'probe'
  if ((save.door === 'read' || save.door === 'lot') && save.readingOk === true && !save.level) return 'band'
  return 'map'
}

function frameFor(view: string): string {
  if (view === 'door' || view === 'probe' || view === 'band' || view === 'check' || view === 'kept') {
    return 'frames/Door.svg'
  }
  if (view === 'map' || view === 'shelf' || view === 'about' || view === 'pack' || view === 'anki') return 'frames/Map.svg'
  return 'frames/Lesson.svg'
}

export default function App() {
  const [save, setSave] = useState<Save>(() => load())
  const [replay, setReplay] = useState<string[] | null>(null)
  const [kept, setKept] = useState<KeptNote | null>(null)
  const set = useCallback((next: Save) => {
    persist(next)
    setSave(next)
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return
    let handle: { remove: () => Promise<void> } | undefined
    let dead = false
    void import('@capacitor/app')
      .then(({ App: CapApp }) =>
        CapApp.addListener('backButton', () => {
          setSave((current) => {
            const next = backHome(current)
            persist(next)
            return next
          })
        }),
      )
      .then((listener) => {
        if (dead) void listener.remove()
        else handle = listener
      })
      .catch(() => {})
    return () => {
      dead = true
      void handle?.remove()
    }
  }, [])

  const view = viewOf(save)
  const showBack = !['door', 'map', 'probe', 'band', 'check'].includes(view)

  let body = <MapScreen />
  if (view === 'door') body = <Doors />
  else if (view === 'probe') body = <Probe />
  else if (view === 'band') body = <Band />
  else if (view === 'minutes') body = <Minutes />
  else if (view === 'check') body = <Check />
  else if (view === 'kept') body = <Kept />
  else if (view === 'lesson') body = <Lesson />
  else if (view === 'shelf') body = <Shelf />
  else if (view === 'journal') body = <Journal />
  else if (view === 'ime') body = <ImePage />
  else if (view === 'about') body = <About />
  else if (view === 'pack') body = <Pack />
  else if (view === 'anki') body = <AnkiScreen />

  return (
    <SaveContext.Provider value={{ save, set, replay, setReplay, kept, setKept }}>
      <div className="app" data-screen={view} style={{ backgroundImage: `url("${art('paper.webp')}")` }}>
        <img className="frame" alt="" src={art(frameFor(view))} />
        <Top title="Michi Dojo" back={showBack ? () => set(backHome(save)) : undefined} />
        {body}
        {replay && <Replay ids={replay} onClose={() => setReplay(null)} />}
      </div>
    </SaveContext.Provider>
  )
}
