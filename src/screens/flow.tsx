import { useState } from 'react'
import type { Door, Level, Minutes, Save } from '../engine/logic.ts'
import { beginDay, fresh } from '../engine/logic.ts'
import { lessons } from '../data/lessons.ts'
import { art, bundledJa, useJapaneseVoice } from '../ui/media.ts'
import { useSave } from '../ui/save.tsx'
import { Fox, Tap } from './bits.tsx'

export function Doors() {
  const { save, set } = useSave()
  const voice = useJapaneseVoice()
  function choose(door: Door) {
    const next: Save = {
      ...fresh(),
      door,
      fox: door !== 'lot',
      screen: door === 'lapsed' ? 'check' : 'map',
    }
    set(next)
  }
  return (
    <section>
      <Fox show mood="idle" />
      <img className="mark" src={art('fox.svg')} alt="" />
      <h2>Where are you?</h2>
      <p className="lead">English first. Pick the door that matches what you can already do.</p>
      {voice === false && !bundledJa && <p className="calm">This device cannot speak Japanese yet.</p>}
      <div className="stack">
        <Tap onClick={() => choose('new')}>New</Tap>
        <Tap onClick={() => choose('phrase')}>I can say it, I can’t read it</Tap>
        <Tap onClick={() => choose('katakana')}>Katakana first</Tap>
        <Tap onClick={() => choose('lapsed')}>I studied before</Tap>
        <Tap onClick={() => choose('read')}>I can read</Tap>
        <Tap onClick={() => choose('lot')}>I read a lot</Tap>
        <button type="button" className="quiet" onClick={() => set({ ...save, screen: 'about' })}>
          About
        </button>
      </div>
    </section>
  )
}

const PROBE = [
  { kana: 'ねこ', en: 'cat' },
  { kana: 'みず', en: 'water' },
  { kana: 'すし', en: 'sushi' },
  { kana: 'やま', en: 'mountain' },
  { kana: 'ひと', en: 'person' },
]

export function Probe() {
  const { save, set } = useSave()
  const [index, setIndex] = useState(0)
  const [hits, setHits] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const done = index >= PROBE.length
  const word = PROBE[Math.min(index, PROBE.length - 1)]

  function finish(ok: boolean) {
    const next = { ...save, readingOk: ok }
    if (!ok) {
      set({ ...next, screen: 'map' })
      return
    }
    if (next.door === 'read' || next.door === 'lot') {
      set({ ...next, screen: 'band' })
      return
    }
    set({ ...next, screen: 'minutes' })
  }

  return (
    <section>
      <h2>Five words</h2>
      <p className="lead">Read the hiragana. Four of five opens the advanced road. A katakana miss cannot open it.</p>
      {done ? (
        <div className="stack">
          <p>
            {hits >= 4
              ? `${hits} of 5. The advanced road can open.`
              : `${hits} of 5. て-form, adjective grammar, and kanji stay locked.`}
          </p>
          <Tap onClick={() => finish(hits >= 4)}>{hits >= 4 ? 'Continue' : 'Stay on the early road'}</Tap>
        </div>
      ) : (
        <div className="stack">
          <p className="kana-xl" lang="ja">
            {word.kana}
          </p>
          {PROBE.map((item) => (
            <Tap
              key={item.en}
              disabled={picked !== null}
              onClick={() => {
                setPicked(item.en)
                if (item.en === word.en) setHits((n) => n + 1)
              }}
            >
              {item.en}
            </Tap>
          ))}
          {picked && (
            <Tap
              onClick={() => {
                setPicked(null)
                setIndex((n) => n + 1)
              }}
            >
              Next word
            </Tap>
          )}
        </div>
      )}
    </section>
  )
}

const BANDS: { id: Level; text: string }[] = [
  { id: 'N5', text: 'N5 — sentences, です/ます, て-form, then kanji' },
  { id: 'N4', text: 'N4 — from this band upward' },
  { id: 'N3', text: 'N3 — the news line, then kanji' },
  { id: 'N1', text: 'N1 — 読みます first, then the rest of the list' },
  { id: 'N2', text: 'N2 — packs you have not already passed' },
]

export function Band() {
  const { save, set } = useSave()
  const ordered = ['N5', 'N4', 'N3', 'N2', 'N1'] as const
  return (
    <section>
      <h2>Where should the list start?</h2>
      <p className="lead">The road continues upward from the band you pick. Bands below it stay closed.</p>
      <div className="stack">
        {ordered.map((id) => {
          const band = BANDS.find((item) => item.id === id)
          if (!band) return null
          return (
            <Tap key={band.id} onClick={() => set({ ...save, level: band.id, screen: 'minutes' })}>
              {band.text}
            </Tap>
          )
        })}
      </div>
    </section>
  )
}

export function Minutes() {
  const { save, set } = useSave()
  const choices: Minutes[] = [10, 15, 20]
  return (
    <section>
      <h2>How long is this sitting?</h2>
      <p className="lead">
        Reviews and new cards share the time. Today’s check sits inside it, not after a timer. A 10-minute day never
        offers an extra row. Weekends still get new items.
      </p>
      <div className="stack">
        {choices.map((minutes) => (
          <Tap key={minutes} onClick={() => set(beginDay(save, minutes, lessons, new Date()))}>
            {minutes} minutes
          </Tap>
        ))}
      </div>
    </section>
  )
}

const CHECK = [
  { id: 'v-a', group: 'vowel', prompt: 'あ', choices: ['ah', 'ee', 'uu', 'eh', 'oh'], answer: 'ah' },
  { id: 'v-i', group: 'vowel', prompt: 'い', choices: ['ah', 'ee', 'uu', 'eh', 'oh'], answer: 'ee' },
  { id: 'v-u', group: 'vowel', prompt: 'う', choices: ['ah', 'ee', 'uu', 'eh', 'oh'], answer: 'uu' },
  { id: 'v-e', group: 'vowel', prompt: 'え', choices: ['ah', 'ee', 'uu', 'eh', 'oh'], answer: 'eh' },
  { id: 'v-o', group: 'vowel', prompt: 'お', choices: ['ah', 'ee', 'uu', 'eh', 'oh'], answer: 'oh' },
  { id: 'w-neko', group: 'word', prompt: 'ねこ', choices: ['cat', 'water', 'sushi'], answer: 'cat' },
  { id: 'w-mizu', group: 'word', prompt: 'みず', choices: ['cat', 'water', 'sushi'], answer: 'water' },
  { id: 'w-sushi', group: 'word', prompt: 'すし', choices: ['cat', 'water', 'sushi'], answer: 'sushi' },
  { id: 'daku', group: 'daku', prompt: 'が', choices: ['ka', 'ga'], answer: 'ga' },
  { id: 'p-wa', group: 'particle', prompt: 'は is said…', choices: ['wa', 'ha'], answer: 'wa' },
  { id: 'p-ga', group: 'particle', prompt: 'が marks the…', choices: ['topic', 'subject'], answer: 'subject' },
  { id: 'p-wo', group: 'particle', prompt: 'を is said…', choices: ['o', 'wo'], answer: 'o' },
  { id: 'p-ni', group: 'particle', prompt: 'に often marks…', choices: ['destination', 'place of action'], answer: 'destination' },
  { id: 'p-de', group: 'particle', prompt: 'で often marks…', choices: ['destination', 'place of action'], answer: 'place of action' },
  { id: 'p-no', group: 'particle', prompt: 'の links…', choices: ['two nouns', 'a question'], answer: 'two nouns' },
  { id: 'p-he', group: 'particle', prompt: 'へ is said…', choices: ['e', 'he'], answer: 'e' },
]

export function Check() {
  const { save, set, setKept } = useSave()
  const [index, setIndex] = useState(0)
  const [right, setRight] = useState<string[]>([])
  const item = CHECK[index]
  const done = index >= CHECK.length

  function finish() {
    const kept = CHECK.filter((entry) => right.includes(entry.id)).map((entry) => entry.prompt)
    const rebuild = CHECK.filter((entry) => !right.includes(entry.id)).map((entry) => entry.prompt)
    const vowelsPassed = CHECK.filter((entry) => entry.group === 'vowel').every((entry) => right.includes(entry.id))
    setKept({ kept, rebuild })
    set({ ...save, skippedVowels: vowelsPassed, screen: 'kept' })
  }

  if (done) {
    return (
      <section>
        <h2>Check finished</h2>
        <p>Nothing here was graded. Next is a kind summary.</p>
        <Tap onClick={finish}>See what you kept</Tap>
      </section>
    )
  }

  return (
    <section>
      <h2>What is still there?</h2>
      <p className="lead">Ungraded. Vowels, pictured words, dakuten, and は が を に で の へ. Casual speech is not scored.</p>
      <p className="kana-xl" lang="ja">
        {item.prompt}
      </p>
      <div className="stack">
        {item.choices.map((choice) => (
          <Tap
            key={choice}
            onClick={() => {
              if (choice === item.answer) setRight((list) => [...list, item.id])
              setIndex((n) => n + 1)
            }}
          >
            {choice}
          </Tap>
        ))}
      </div>
    </section>
  )
}

export function Kept() {
  const { save, set, kept } = useSave()
  return (
    <section>
      <h2>What you kept</h2>
      <p className="lead">
        You kept more than a blank start. The gaps are a rebuild, not a verdict. Casual speech stays unscored.
        {save.skippedVowels
          ? ' The vowels you passed will not be taught again.'
          : ' Missed vowels are named here, and they do not open て-form.'}
      </p>
      {kept && kept.kept.length > 0 && (
        <>
          <h3>Kept</h3>
          <ul>
            {kept.kept.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      )}
      {kept && kept.rebuild.length > 0 && (
        <>
          <h3>Rebuild</h3>
          <ul>
            {kept.rebuild.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      )}
      {!kept && <p>What you kept is still yours. A passed vowel row is not opened again.</p>}
      <Tap onClick={() => set({ ...save, screen: 'map' })}>Continue</Tap>
    </section>
  )
}
