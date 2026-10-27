import { useState } from 'react'
import { fresh, journalNote, showFurigana } from '../engine/logic.ts'
import { lessons } from '../data/lessons.ts'
import { useSave } from '../ui/save.tsx'
import { Tap } from './bits.tsx'

type LinkItem = { href: string; label: string; on: boolean }

function LinkLine({ item }: { item: LinkItem }) {
  if (!item.on) return <p className="off">{item.label} — off</p>
  return (
    <p>
      <a href={item.href} target="_blank" rel="noreferrer">
        {item.label}
      </a>
    </p>
  )
}

export function Shelf() {
  const { save, set } = useSave()
  const [topic, setTopic] = useState('')
  const [place, setPlace] = useState('')
  const [ending, setEnding] = useState('')
  const [saved, setSaved] = useState(false)
  const tale: LinkItem[] = [{ href: 'https://hukumusume.com/douwa/', label: 'Tale shelf', on: save.shelf.tale }]
  const easy: LinkItem[] = [{ href: 'https://www3.nhk.or.jp/news/easy/', label: 'NHK Easy', on: save.shelf.easy }]
  const dict: LinkItem[] = [
    { href: 'https://www.weblio.jp/', label: 'Weblio', on: save.shelf.easy },
    { href: 'https://eow.alc.co.jp/', label: 'ALC', on: save.shelf.easy },
    { href: 'https://dictionary.goo.ne.jp/', label: 'goo', on: save.shelf.easy },
  ]
  const town: LinkItem[] = [
    { href: 'https://cookpad.com/', label: 'Cookpad', on: save.shelf.town },
    { href: 'https://tabelog.com/', label: 'Tabelog', on: save.shelf.town },
    { href: 'https://www.hyperdia.com/', label: 'Hyperdia', on: save.shelf.town },
  ]
  const news: LinkItem[] = [
    { href: 'https://www.newsweekjapan.jp/', label: 'Newsweek Japan', on: save.shelf.news },
    { href: 'https://gigazine.net/', label: 'Gigazine', on: save.shelf.news },
    { href: 'https://rocketnews24.com/', label: 'Rocket News', on: save.shelf.news },
    { href: 'https://www.1101.com/', label: 'Almost Daily Itoi', on: save.shelf.news },
  ]
  const casual: LinkItem[] = [
    { href: 'https://hamusoku.com/', label: 'Hamusoku', on: save.shelf.casual },
    { href: 'https://blog.livedoor.com/', label: 'livedoor blog', on: save.shelf.casual },
    { href: 'https://www.nicovideo.jp/', label: 'NicoNico', on: save.shelf.casual },
    { href: 'https://www.pixiv.net/', label: 'pixiv', on: save.shelf.casual },
    { href: 'https://www.comico.jp/', label: 'Comico', on: save.shelf.casual },
  ]
  return (
    <section>
      <h2>Reading shelf</h2>
      <p className="lead">Links only. This app does not store or show those pages. Easy news uses です. The news pack in the lessons uses である. They stay separate.</p>
      <h3>After the student sentence</h3>
      {tale.map((item) => (
        <LinkLine key={item.label} item={item} />
      ))}
      <h3>After the first kanji</h3>
      {easy.map((item) => (
        <LinkLine key={item.label} item={item} />
      ))}
      {dict.map((item) => (
        <LinkLine key={item.label} item={item} />
      ))}
      <h3>After five kanji</h3>
      {town.map((item) => (
        <LinkLine key={item.label} item={item} />
      ))}
      <h3>After the news card</h3>
      {news.map((item) => (
        <LinkLine key={item.label} item={item} />
      ))}
      <h3>Casual shelf</h3>
      <p className="note">Casual internet Japanese is not the answer key. Nothing here is scored.</p>
      {casual.map((item) => (
        <LinkLine key={item.label} item={item} />
      ))}
      <h3>This week’s outside page</h3>
      <p>Open one unlocked link yourself. The app does not download the page. Then answer three questions.</p>
      <label>
        What was the topic?
        <textarea value={topic} onChange={(event) => setTopic(event.target.value)} rows={2} />
      </label>
      <label>
        What time or place did it mention?
        <textarea value={place} onChange={(event) => setPlace(event.target.value)} rows={2} />
      </label>
      <label>
        How did the sentence end?
        <textarea value={ending} onChange={(event) => setEnding(event.target.value)} rows={2} />
      </label>
      <Tap
        onClick={() => {
          const text = `Outside read. Topic: ${topic} Time or place: ${place} Ending: ${ending}`
          set({
            ...save,
            journal: [
              ...save.journal,
              { text, note: 'Outside read. The app did not download the page. These three answers are not scored.' },
            ],
          })
          setSaved(true)
        }}
      >
        Save the three answers
      </Tap>
      {saved && <p className="note">Saved in the journal. Not scored.</p>}
    </section>
  )
}

export function Journal() {
  const { save, set } = useSave()
  const [text, setText] = useState('')
  const [note, setNote] = useState('')
  return (
    <section>
      <h2>Journal</h2>
      {(save.door === 'phrase' || save.door === 'lapsed') && <p className="note">Casual speech is not scored.</p>}
      <p className="lead">A grammatical line in a different pattern stays here. It is not marked wrong.</p>
      <textarea
        lang="ja"
        rows={5}
        value={text}
        placeholder="One line you could actually use"
        onChange={(event) => setText(event.target.value)}
      />
      <Tap
        onClick={() => {
          const next = journalNote(text)
          setNote(next)
          if (!text.trim()) return
          set({ ...save, journal: [...save.journal, { text: text.trim(), note: next }] })
          setText('')
        }}
      >
        Keep this line
      </Tap>
      {note && <p className="note">{note}</p>}
      <ul>
        {save.journal.map((entry, index) => (
          <li key={`${entry.text}-${index}`}>
            <p lang="ja">{entry.text}</p>
            <p className="hint">{entry.note}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

const IME = [
  { name: 'Linux', text: 'IBus and Mozc. Add Japanese (Mozc) in the keyboard settings. Type romaji, Space to convert, Enter to accept.' },
  { name: 'Windows', text: 'Microsoft IME. Windows+Space switches languages. Type romaji, Space to convert, Enter to accept.' },
  { name: 'macOS', text: 'System Settings → Keyboard → Input Sources → Japanese. Use the menu bar to switch. Type romaji, Space, Enter.' },
  { name: 'Android', text: 'Gboard or the system Japanese keyboard. The globe key switches. Type, then tap the suggestion.' },
  { name: 'iOS', text: 'Settings → General → Keyboard → Keyboards → Japanese (Romaji). The globe key switches. Tap the suggestion.' },
]

export function ImeBody({ compact }: { compact?: boolean }) {
  const rows = compact ? IME : IME
  return (
    <aside className={compact ? 'ime compact' : 'ime'}>
      <h3>IME</h3>
      {rows.map((row) => (
        <p key={row.name}>
          <strong>{row.name}. </strong>
          {compact ? row.text.split('.')[0] : row.text}
        </p>
      ))}
    </aside>
  )
}

export function ImePage() {
  return (
    <section>
      <h2>How to type Japanese</h2>
      <ImeBody />
    </section>
  )
}

export function About() {
  const { set, setKept, setReplay } = useSave()
  const [arm, setArm] = useState(false)
  return (
    <section>
      <h2>About Michi Dojo</h2>
      <p>
        Levels on these cards are community estimates, not a JLPT exam pass. Finishing a band here is not an exam
        result. Steady 15–20 minutes a day is about 3.5 years to this app’s N1 list.
      </p>
      <p>Michi Dojo ships a kanji study list derived from OpenJLPT.</p>
      <p>
        OpenJLPT is a derived work under CC BY-SA 4.0. ShareAlike applies to the redistributed dataset in
        src/data/third_party/mountain.json.
      </p>
      <ul>
        <li>
          <a href="https://github.com/evanclan/OpenJLPT" target="_blank" rel="noreferrer">
            OpenJLPT
          </a>
          , CC BY-SA 4.0
        </li>
        <li>
          <a href="https://www.edrdg.org/edrdg/licence.html" target="_blank" rel="noreferrer">
            JMdict and KANJIDIC2
          </a>
        </li>
        <li>
          <a href="https://www.tanos.co.uk/" target="_blank" rel="noreferrer">
            Jonathan Waller, JLPT vocabulary and kanji lists
          </a>
          , CC BY
        </li>
        <li>
          <a href="https://tatoeba.org/" target="_blank" rel="noreferrer">
            Tatoeba example sentences
          </a>
          , CC BY 2.0 FR
        </li>
      </ul>
      <p>
        The JLPT band names on these cards are community estimates. They are not the official lists published after
        2010, and finishing a band in this app is not a JLPT exam result.
      </p>
      <p>
        Lesson prose in this app is original. The linked video is a pointer, not a copy of the narration.{' '}
        <a href="https://www.youtube.com/watch?v=J6Qotze564E" target="_blank" rel="noreferrer">
          Hime’s beginner video
        </a>
        . Reading-shelf links open other sites. This app does not store their articles.
      </p>
      <Tap
        onClick={() => {
          if (!arm) {
            setArm(true)
            return
          }
          localStorage.removeItem('michi.v1')
          setKept(null)
          setReplay(null)
          set(fresh())
        }}
      >
        {arm ? 'Clear michi.v1' : 'Start over'}
      </Tap>
    </section>
  )
}

export function Pack() {
  const { save } = useSave()
  const ids = save.chapter?.ids ?? []
  const rows = ids
    .map((id) => lessons.find((lesson) => lesson.id === id))
    .filter((lesson): lesson is NonNullable<typeof lesson> => Boolean(lesson))
    .slice(0, 8)
  return (
    <section>
      <h2>Pack reader</h2>
      <p className="lead">
        Up to eight lines from the open chapter. Three of them are clozes when the word is blanked. Example lines in
        the kanji packs come from the OpenJLPT list. See About. This page does not open an outside article.
      </p>
      {rows.length === 0 && <p>Start a chapter and this page fills from it.</p>}
      <ol>
        {rows.map((lesson, index) => (
          <li key={lesson.id}>
            <p lang="ja">{lesson.prompt}</p>
            {showFurigana(save, lesson.id) && lesson.furigana && (
              <p className="hint" lang="ja">
                {lesson.furigana}
              </p>
            )}
            {index < 3 && <p className="hint">Cloze. The checked line is on the lesson card.</p>}
          </li>
        ))}
      </ol>
    </section>
  )
}
