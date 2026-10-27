import { useEffect } from 'react'
import { Lottie } from 'lottie-react'
import { daysLeft, dayKey, ensureChapter, newLeft, replayPair } from '../engine/logic.ts'
import { lessons } from '../data/lessons.ts'
import { art } from '../ui/media.ts'
import { useSave } from '../ui/save.tsx'
import { Fox, Tap } from './bits.tsx'

export function MapScreen() {
  const { save, set, setReplay } = useSave()
  useEffect(() => {
    const next = ensureChapter(save, lessons)
    if (next !== save) set(next)
  }, [save, set])

  const chapter = save.chapter && !save.chapter.tested ? save.chapter : null
  const today = save.today
  const live = Boolean(today && today.day === dayKey() && today.phase !== 'done')
  const done = Boolean(today && today.day === dayKey() && today.phase === 'done')
  const pair = replayPair(save)
  const leftDays = chapter ? daysLeft(save) : 0

  return (
    <section>
      <Fox show={save.fox} mood="idle" />
      <img className="mark" src={art('map.svg')} alt="" />
      {chapter && (
        <div data-motion="path">
          <Lottie className="map-path" src={art('map-path.json')} autoplay loop={false} />
        </div>
      )}
      {(save.door === 'phrase' || save.door === 'lapsed') && (
        <p className="note">Casual speech is not scored.</p>
      )}
      {chapter ? (
        <>
          <h2>{chapter.title}</h2>
          <p className="pack">
            {chapter.title}, {newLeft(save)} new left
          </p>
          <p>
            about {leftDays} {leftDays === 1 ? 'day' : 'days'} left
          </p>
          <p>Opened {chapter.opened}</p>
        </>
      ) : (
        <h2>The open chapter will appear here.</h2>
      )}
      <div className="stack">
        {live && <Tap onClick={() => set({ ...save, screen: 'lesson' })}>Resume</Tap>}
        {!live && !done && chapter && (
          <Tap onClick={() => set({ ...save, screen: 'minutes' })}>Start this sitting</Tap>
        )}
        {done && <p>Done for today. Skipped days do not stack.</p>}
        {save.readingOk === false && (
          <Tap onClick={() => set({ ...save, readingOk: null, screen: 'probe' })}>Try the reading check again</Tap>
        )}
        {pair.length >= 2 && (
          <button type="button" className="quiet" onClick={() => setReplay(pair)}>
            See those two again
          </button>
        )}
        <Tap onClick={() => set({ ...save, screen: 'anki' })}>Anki deck</Tap>
      </div>
      <h3>Closed</h3>
      {save.closed.length === 0 ? (
        <p className="hint">Passed chapters stay here and do not open.</p>
      ) : (
        <ul className="closed">
          {save.closed.map((item, index) => (
            <li key={`${item.title}-${index}`}>{item.title}</li>
          ))}
        </ul>
      )}
      <div className="stack">
        <Tap onClick={() => set({ ...save, screen: 'shelf' })}>Reading shelf</Tap>
        <Tap onClick={() => set({ ...save, screen: 'pack' })}>Pack reader</Tap>
        <Tap onClick={() => set({ ...save, screen: 'journal' })}>Journal</Tap>
        <Tap onClick={() => set({ ...save, screen: 'ime' })}>IME guide</Tap>
        <Tap onClick={() => set({ ...save, screen: 'about' })}>About</Tap>
      </div>
    </section>
  )
}
