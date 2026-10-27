import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { Lottie } from 'lottie-react'
import type { Lesson, Role } from '../engine/logic.ts'
import {
  acceptExtra,
  checkAnswer,
  commitAnswer,
  declineExtra,
  replayPair,
  showFurigana,
  trapFor,
} from '../engine/logic.ts'
import { lessons } from '../data/lessons.ts'
import { art, hasJaClip, playSound, speak, stopSpeech, useJapaneseVoice } from '../ui/media.ts'
import { useSave } from '../ui/save.tsx'
import { Fox, Pitch, Tap } from './bits.tsx'
import { ImeBody } from './pages.tsx'

const ROLE: Record<Role, string> = {
  review: 'Review',
  new: 'New',
  extra: 'Extra row',
  test: "Today's check",
  chapter: 'Chapter check',
}

const VOWEL_GRID = [
  { k: 'あ', label: 'ah', en: 'father' },
  { k: 'い', label: 'ee', en: 'see' },
  { k: 'う', label: 'uu', en: 'food, with the y left off' },
  { k: 'え', label: 'eh', en: 'bed' },
  { k: 'お', label: 'oh', en: 'pure oh, with no w' },
]

type Recog = {
  lang: string
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  abort: () => void
}

function recognitionCtor(): (new () => Recog) | null {
  if (typeof window === 'undefined') return null
  const host = window as unknown as {
    SpeechRecognition?: new () => Recog
    webkitSpeechRecognition?: new () => Recog
  }
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null
}

function foldKana(text: string): string {
  return [...text.normalize('NFKC')]
    .map((ch) => {
      const code = ch.codePointAt(0) ?? 0
      if (code >= 0x30a1 && code <= 0x30f6) return String.fromCodePoint(code - 0x60)
      return ch
    })
    .join('')
}

function normSpoken(text: string): string {
  return foldKana(text).replace(/[\s\u3000、。！？!?・,.「」『』（）()'"]/g, '')
}

function matchesSpoken(heard: string, lesson: Lesson): boolean {
  const got = normSpoken(heard)
  if (!got || !/[ぁ-んァ-ヶ一-龯]/.test(got)) return false
  const targets = [lesson.say, lesson.furigana]
    .filter((item): item is string => Boolean(item))
    .map(normSpoken)
  return targets.includes(got)
}

export function Lesson() {
  const { save } = useSave()
  const today = save.today
  if (!today || today.phase === 'done') return null
  if (today.phase === 'offer') return <Offer />
  const step = today.steps[today.index]
  if (!step) return <p>This sitting is caught up.</p>
  const lesson = lessons.find((item) => item.id === step.id)
  if (!lesson) return <p>That card is missing.</p>
  return <Card key={`${today.index}-${step.role}-${lesson.id}`} lesson={lesson} role={step.role} />
}

function Offer() {
  const { save, set } = useSave()
  return (
    <section>
      <h2>One more row?</h2>
      <p>The last new row was solid, and the clock still has room. A 10-minute day never asks.</p>
      <div className="stack">
        <Tap onClick={() => set(acceptExtra(save))}>One more row</Tap>
        <Tap className="ghost" onClick={() => set(declineExtra(save, lessons, new Date()))}>
          Not now
        </Tap>
      </div>
    </section>
  )
}

function Card({ lesson, role }: { lesson: Lesson; role: Role }) {
  const { save, set, setReplay } = useSave()
  const voice = useJapaneseVoice()
  const [pending, setPending] = useState<{ ok: boolean; verdict: string; picked: string } | null>(null)
  const [aside, setAside] = useState('')
  const [speechNote, setSpeechNote] = useState('')
  const [counted, setCounted] = useState(false)
  const [listening, setListening] = useState(false)
  const [mood, setMood] = useState<'idle' | 'listen' | 'yes' | 'again'>('idle')
  const recogRef = useRef<Recog | null>(null)
  const strokeFirst = lesson.id === 'kata-shirt' && lesson.activity === 'choice'
  const [drawn, setDrawn] = useState(!strokeFirst)
  const quiet = save.door === 'lot' || !save.fox
  const furigana = lesson.furigana && showFurigana(save, lesson.id)
  const clipped = hasJaClip(lesson.say)
  const canModel = Boolean(lesson.say && (clipped || voice === true))
  const RecogCtor = recognitionCtor()

  function stopMic() {
    try {
      recogRef.current?.abort()
    } catch {
      /* the recognizer was already idle */
    }
    recogRef.current = null
    setListening(false)
  }

  function hear(rate: number, chain = false) {
    if (!lesson.say) return
    const line = lesson.say
    const hasClip = hasJaClip(line)
    if (!hasClip && voice !== true) return
    if (!hasClip && quiet && rate > 0.85) return
    stopMic()
    setMood('listen')
    const spoken = speak(line, rate, () => {
      if (!chain) {
        setMood('idle')
        return
      }
      const again = speak(line, 1, () => setMood('idle'))
      if (!again) setMood('idle')
    })
    if (!spoken) setMood('idle')
  }

  useEffect(() => {
    if (!lesson.say || !hasJaClip(lesson.say)) return
    setMood('listen')
    const spoken = speak(lesson.say, 1, () => setMood('idle'))
    if (!spoken) setMood('idle')
    return () => {
      stopSpeech()
      try {
        recogRef.current?.abort()
      } catch {
        /* the recognizer was already idle */
      }
    }
  }, [lesson.id, lesson.say])

  function grade(value: string) {
    const verdict = checkAnswer(lesson, value)
    const ok = verdict === 'pass'
    playSound(ok ? 'correct' : 'retry')
    setPending({ ok, verdict, picked: value })
    setMood(ok ? 'yes' : 'again')
    if (!ok && lesson.band === 'vowel' && lesson.say) {
      const line = `${value}。${lesson.answer}`
      setMood('listen')
      const spoken = speak(line, 0.8, () => setMood('again'))
      if (!spoken) setMood('again')
    }
  }

  function startMic() {
    if (!RecogCtor || !lesson.say || listening) return
    stopSpeech()
    setMood('idle')
    const recog = new RecogCtor()
    recogRef.current = recog
    recog.lang = 'ja-JP'
    recog.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript ?? ''
      if (!text.trim()) {
        setSpeechNote('Nothing landed. This does not finish the card.')
        return
      }
      if (matchesSpoken(text, lesson)) {
        setCounted(true)
        setSpeechNote('That matches.')
        return
      }
      setSpeechNote(trapFor(lesson, 'miss'))
    }
    recog.onerror = () => setSpeechNote('Nothing landed. This does not finish the card.')
    recog.onend = () => setListening(false)
    setListening(true)
    try {
      recog.start()
    } catch {
      setListening(false)
      setSpeechNote('Nothing landed. This does not finish the card.')
    }
  }

  function next() {
    const ok = pending ? pending.ok : true
    set(commitAnswer(save, lesson, ok, lessons, new Date()))
  }

  const pair = replayPair({ ...save, recentMiss: [...save.recentMiss, lesson.id].slice(-8) })

  return (
    <article
      className="card"
      data-lesson={lesson.id}
      data-role={role}
      data-audio={clipped ? 'bundled' : undefined}
    >
      <p className="banner">{ROLE[role]}</p>
      <Fox show={save.fox} mood={mood} />
      {lesson.picture && (
        <img className="picture" src={art(lesson.picture)} alt={lesson.caption ?? ''} />
      )}
      <Prompt lesson={lesson} />
      {lesson.hint && lesson.id !== 'vowel-five' && <p className="hint">({lesson.hint})</p>}
      {furigana && (
        <p className="hint" lang="ja">
          {lesson.furigana}
        </p>
      )}
      {lesson.detail && lesson.id !== 'particle-map' && <p className="detail">{lesson.detail}</p>}
      {lesson.say && !clipped && voice === false && (
        <p className="calm">This device cannot speak Japanese yet.</p>
      )}
      {aside && <p className="note">{aside}</p>}
      {canModel && lesson.say && (
        <div className="say-step" data-speaking="say">
          <p className="banner">Say it</p>
          <p className="jp" lang="ja">
            {lesson.say}
          </p>
          {RecogCtor ? (
            <button type="button" className="quiet" disabled={listening} onClick={startMic}>
              {listening ? 'Listening…' : 'Tap the mic'}
            </button>
          ) : (
            <button
              type="button"
              className="quiet"
              onClick={() =>
                setSpeechNote('You said it. This does not count as pronunciation practice and does not finish the card.')
              }
            >
              I said it
            </button>
          )}
          {counted && <p className="note">This counts as pronunciation practice.</p>}
          {speechNote && <p className="note">{speechNote}</p>}
        </div>
      )}
      {lesson.activity === 'teach' && (
        <Teach
          lesson={lesson}
          audible={canModel}
          onHear={() => hear(0.7, true)}
          onMora={(ch) => {
            playSound('mora')
            setMood('listen')
            const spoken = speak(ch, 0.85, () => setMood('idle'))
            if (!spoken) setMood('idle')
          }}
        />
      )}
      {strokeFirst && !drawn && <LookalikeDraw onReady={() => setDrawn(true)} />}
      {lesson.activity === 'choice' && drawn && (
        <Choices lesson={lesson} locked={Boolean(pending)} onPick={grade} />
      )}
      {lesson.activity === 'order' && <Order lesson={lesson} locked={Boolean(pending)} onSubmit={grade} />}
      {lesson.activity === 'type' && (
        <Typer lesson={lesson} learned={keysFor(save)} locked={Boolean(pending)} onSubmit={grade} />
      )}
      {lesson.activity === 'trace' && !pending && <TracePad onPass={() => grade(lesson.answer)} />}
      {lesson.activity === 'listen' && (
        <Listen lesson={lesson} audible={canModel} locked={Boolean(pending)} onHear={() => hear(0.7, true)} onPick={grade} />
      )}
      {!quiet && lesson.say && (
        <div className="row">
          {canModel && (
            <button type="button" className="quiet" onClick={() => hear(1)}>
              Hear it
            </button>
          )}
          <button
            type="button"
            className="quiet"
            onClick={() => {
              stopSpeech()
              stopMic()
              setMood('idle')
              setAside('Speaking stays optional. This does not count as pronunciation practice and does not finish the card.')
            }}
          >
            Continue without speaking
          </button>
        </div>
      )}
      {quiet && canModel && lesson.say && (
        <div className="row">
          <button type="button" className="quiet" onClick={() => hear(0.7)}>
            Hear it slowly
          </button>
          <button
            type="button"
            className="quiet"
            onClick={() => {
              stopSpeech()
              stopMic()
              setMood('idle')
              setAside('Speaking stays optional. This does not count as pronunciation practice and does not finish the card.')
            }}
          >
            Continue without speaking
          </button>
        </div>
      )}
      {pending && (
        <div className={pending.ok ? 'okbox' : 'trap'} role="status">
          <div data-motion={pending.ok ? 'flourish' : 'settle'}>
            <Lottie
              className={pending.ok ? 'flourish' : 'settle'}
              src={art(pending.ok ? 'flourish.json' : 'settle.json')}
              autoplay
              loop={false}
            />
          </div>
          {pending.ok ? (
            <p>Good. The road goes on.</p>
          ) : (
            <>
              <p>That miss is acknowledged.</p>
              <p>{trapFor(lesson, pending.verdict)}</p>
              {lesson.band === 'vowel' && (
                <p className="pair" lang="ja">
                  <span>{pending.picked}</span>
                  <span>{lesson.answer}</span>
                </p>
              )}
              <p>
                {role === 'test' || role === 'chapter'
                  ? 'It returns to the learning set. The day still counts, and the next chapter still opens.'
                  : lesson.ungraded
                    ? 'This early card is not scored.'
                    : 'It stays in the learning set until one correct answer. The road continues.'}
              </p>
              {pair.length >= 2 && (
                <button type="button" className="quiet" onClick={() => setReplay(pair)}>
                  See those two again
                </button>
              )}
            </>
          )}
          <Tap onClick={next}>Next</Tap>
        </div>
      )}
      {!pending && lesson.activity === 'teach' && <Tap onClick={next}>Continue</Tap>}
    </article>
  )
}

function LookalikeDraw({ onReady }: { onReady: () => void }) {
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  const gone = useRef(false)
  const started = useRef(0)
  const go = useCallback((force = false) => {
    if (!force && performance.now() - started.current < 900) return
    if (gone.current) return
    gone.current = true
    onReadyRef.current()
  }, [])
  const [skip, setSkip] = useState(false)
  useEffect(() => {
    started.current = performance.now()
    const skipTimer = window.setTimeout(() => setSkip(true), 700)
    const openTimer = window.setTimeout(() => go(true), 2800)
    return () => {
      window.clearTimeout(skipTimer)
      window.clearTimeout(openTimer)
    }
  }, [go])
  return (
    <div className="trace" data-motion="lookalike">
      <p>Stroke first.</p>
      <Lottie
        className="lookalike"
        src={art('lookalike.json')}
        autoplay
        loop={false}
        subscriptions={{ complete: () => go(false) }}
      />
      {skip && (
        <button type="button" className="quiet" onClick={() => go(true)}>
          Continue
        </button>
      )}
    </div>
  )
}

function Prompt({ lesson }: { lesson: Lesson }) {
  if (lesson.id === 'vowel-five') {
    return (
      <div className="vowel-grid">
        {VOWEL_GRID.map((item) => (
          <div key={item.k}>
            <p className="sound">{item.label}</p>
            <p className="kana-xl" lang="ja">
              {item.k}
            </p>
            <p className="hint">({item.en})</p>
          </div>
        ))}
        <Pitch />
      </div>
    )
  }
  if (lesson.id === 'particle-map') return <ParticleTable />
  if (lesson.band === 'vowel' && lesson.activity === 'teach' && lesson.caption) {
    return (
      <>
        <p className="sound">{lesson.caption}</p>
        <p className="kana-xl" lang="ja">
          {lesson.prompt}
        </p>
      </>
    )
  }
  const jp = /[ぁ-んァ-ン一-龯]/.test(lesson.prompt)
  const huge = jp && [...lesson.prompt].length <= 8
  return (
    <h2 className={huge ? 'kana-xl' : jp ? 'jp' : 'en'} lang={jp ? 'ja' : 'en'}>
      {lesson.prompt}
    </h2>
  )
}

function ParticleTable() {
  const rows = [
    ['は', 'wa', 'ha'],
    ['を', 'o', 'wo'],
    ['へ', 'e', 'he'],
  ]
  return (
    <div>
      <h2 className="en">Written, sound, and keys</h2>
      <p className="kana-xl" lang="ja">
        こんにちは
      </p>
      <div className="cols">
        <strong>Written</strong>
        <strong>Sound</strong>
        <strong>Keys</strong>
        {rows.map((row) =>
          row.map((cell, index) => (
            <span key={`${row[0]}-${cell}`} lang={index === 0 ? 'ja' : 'en'}>
              {cell}
            </span>
          )),
        )}
      </div>
      <p>わ is a different word (きれいだわ). こんにちは uses は, said wa, typed ha. を is not お. へ is not え.</p>
    </div>
  )
}

function Teach({
  lesson,
  audible,
  onHear,
  onMora,
}: {
  lesson: Lesson
  audible: boolean
  onHear: () => void
  onMora: (ch: string) => void
}) {
  const chars = [...(lesson.prompt || '')].filter((ch) => /[ぁ-んァ-ンー]/.test(ch))
  if (chars.length < 2 || chars.length > 8) {
    return lesson.say && audible ? (
      <button type="button" className="quiet" onClick={onHear}>
        Hear it slowly, then at normal speed
      </button>
    ) : null
  }
  return (
    <div className="mora">
      {chars.map((ch, index) => (
        <button key={`${ch}-${index}`} type="button" className="tap key" onClick={() => onMora(ch)}>
          {ch}
        </button>
      ))}
    </div>
  )
}

function Choices({
  lesson,
  locked,
  onPick,
}: {
  lesson: Lesson
  locked: boolean
  onPick: (value: string) => void
}) {
  const look = (lesson.choices ?? []).every((choice) => [...choice].length <= 2)
  return (
    <div className={look ? 'pair' : 'stack'}>
      {(lesson.choices ?? []).map((choice) => (
        <Tap key={choice} disabled={locked} onClick={() => onPick(choice)}>
          {choice}
        </Tap>
      ))}
    </div>
  )
}

function Order({
  lesson,
  locked,
  onSubmit,
}: {
  lesson: Lesson
  locked: boolean
  onSubmit: (value: string) => void
}) {
  const tiles = useMemo(() => shuffleTiles(lesson.id, lesson.tiles ?? []), [lesson.id, lesson.tiles])
  const [bank, setBank] = useState(tiles)
  const [built, setBuilt] = useState<string[]>([])
  return (
    <div className="stack">
      <div className="built" lang="ja">
        {built.length === 0 && <span className="hint">Tap the tiles. です stays last when it is there.</span>}
        {built.map((tile, index) => (
          <button
            key={`${tile}-${index}`}
            type="button"
            className="tap key"
            disabled={locked}
            onClick={() => {
              setBuilt(built.filter((_, at) => at !== index))
              setBank([...bank, tile])
            }}
          >
            {tile}
          </button>
        ))}
      </div>
      <div className="mora">
        {bank.map((tile, index) => (
          <button
            key={`${tile}-${index}`}
            type="button"
            className="tap key"
            disabled={locked}
            onClick={() => {
              setBank(bank.filter((_, at) => at !== index))
              setBuilt([...built, tile])
            }}
          >
            {tile}
          </button>
        ))}
      </div>
      <Tap disabled={locked || built.length === 0} onClick={() => onSubmit(built.join(''))}>
        Check order
      </Tap>
    </div>
  )
}

const ALL_KANA = [...'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽぁぃぅぇぉっゃゅょアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポァィゥェォッャュョー']

function keysFor(save: { readingOk: boolean | null; learnedKana: string[] }): string[] {
  if (save.readingOk) return [...new Set([...ALL_KANA, ...save.learnedKana])]
  return save.learnedKana
}

function Typer({
  lesson,
  learned,
  locked,
  onSubmit,
}: {
  lesson: Lesson
  learned: string[]
  locked: boolean
  onSubmit: (value: string) => void
}) {
  const kana = /^[ぁ-んァ-ンー、。！？\s]+$/.test(lesson.answer)
  const [value, setValue] = useState('')
  const [warn, setWarn] = useState('')
  function submit() {
    if (!value.trim()) {
      setWarn('Write an answer first.')
      return
    }
    onSubmit(value)
  }
  function press(key: string) {
    playSound('ink')
    if (key === '⌫') setValue((current) => [...current].slice(0, -1).join(''))
    else setValue((current) => current + key)
  }
  return (
    <div className={kana ? 'stack' : 'ime-row'}>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
          if (!locked) submit()
        }}
      >
        {kana ? (
          <p className="built" lang="ja">
            {value || '…'}
          </p>
        ) : (
          <textarea
            lang="ja"
            rows={3}
            value={value}
            disabled={locked}
            placeholder="Write the whole line"
            onChange={(event) => setValue(event.target.value)}
          />
        )}
        {kana && (
          <div className="keys">
            {learned.map((key) => (
              <button key={key} type="button" className="tap key" disabled={locked} onClick={() => press(key)}>
                {key}
              </button>
            ))}
            <button type="button" className="tap key" disabled={locked} onClick={() => press('⌫')}>
              ⌫
            </button>
          </div>
        )}
        {kana && learned.length === 0 && <p className="note">The keyboard grows as shapes are taught.</p>}
        {warn && <p className="note">{warn}</p>}
        <Tap disabled={locked} onClick={submit}>
          Check
        </Tap>
      </form>
      {!kana && <ImeBody compact />}
    </div>
  )
}

function Listen({
  lesson,
  audible,
  locked,
  onHear,
  onPick,
}: {
  lesson: Lesson
  audible: boolean
  locked: boolean
  onHear: () => void
  onPick: (value: string) => void
}) {
  return (
    <div className="stack">
      {audible && (
        <button type="button" className="quiet" onClick={onHear}>
          Hear it slowly, then choose
        </button>
      )}
      <Choices lesson={lesson} locked={locked} onPick={onPick} />
    </div>
  )
}

function TracePad({ onPass }: { onPass: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [enough, setEnough] = useState(false)
  const stats = useRef({ points: 0, dist: 0, drawing: false, lastX: 0, lastY: 0 })

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 1800)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !ready) return
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.floor(rect.width * dpr))
    canvas.height = Math.max(1, Math.floor(rect.height * dpr))
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1c1915'
  }, [ready])

  function mark(extra: number, dist: number) {
    stats.current.points += extra
    stats.current.dist += dist
    if (stats.current.points >= 8 || stats.current.dist >= 28) setEnough(true)
  }

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  return (
    <div className="trace">
      {!ready && (
        <>
          <p>Stroke first.</p>
          <Lottie
            className="stroke"
            src={art('stroke.json')}
            autoplay
            loop={false}
            subscriptions={{ complete: () => setReady(true) }}
          />
        </>
      )}
      {ready && (
        <>
          <canvas
            ref={canvasRef}
            className="pad"
            aria-label="Trace area"
            onPointerDown={(event) => {
              try {
                event.currentTarget.setPointerCapture(event.pointerId)
              } catch {
                /* a synthetic stroke still counts */
              }
              playSound('ink')
              const here = point(event)
              stats.current.drawing = true
              stats.current.lastX = here.x
              stats.current.lastY = here.y
              const ctx = event.currentTarget.getContext('2d')
              ctx?.beginPath()
              ctx?.moveTo(here.x, here.y)
              mark(4, 0)
            }}
            onPointerMove={(event) => {
              if (!stats.current.drawing) return
              const here = point(event)
              const dist = Math.hypot(here.x - stats.current.lastX, here.y - stats.current.lastY)
              stats.current.lastX = here.x
              stats.current.lastY = here.y
              const ctx = event.currentTarget.getContext('2d')
              ctx?.lineTo(here.x, here.y)
              ctx?.stroke()
              mark(1, dist)
            }}
            onPointerUp={() => {
              stats.current.drawing = false
            }}
          />
          <Tap disabled={!enough} onClick={onPass}>
            {enough ? 'That trace is enough' : 'Keep tracing'}
          </Tap>
        </>
      )}
    </div>
  )
}

function shuffleTiles(id: string, tiles: string[]): string[] {
  const arr = [...tiles]
  let seed = 7
  for (const ch of id) seed = (seed * 33 + ch.charCodeAt(0)) >>> 0
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0
    const j = seed % (i + 1)
    const swap = arr[i]
    arr[i] = arr[j]
    arr[j] = swap
  }
  if (arr.join('') === tiles.join('') && arr.length > 1) {
    const swap = arr[0]
    arr[0] = arr[arr.length - 1]
    arr[arr.length - 1] = swap
  }
  return arr
}

export function Replay({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const [note, setNote] = useState('')
  const [value, setValue] = useState('')
  const lesson = lessons.find((item) => item.id === ids[index])
  if (!lesson) {
    return (
      <div className="overlay">
        <p>Those two are done. The road was not locked.</p>
        <Tap onClick={onClose}>Back</Tap>
      </div>
    )
  }
  return (
    <div className="overlay">
      <p className="banner">See those two again</p>
      <p>This replay does not lock the road.</p>
      <h2 className="jp" lang="ja">
        {lesson.prompt}
      </h2>
      {lesson.activity === 'choice' ? (
        <div className="stack">
          {(lesson.choices ?? []).map((choice) => (
            <Tap key={choice} onClick={() => setNote(checkAnswer(lesson, choice) === 'pass' ? 'Yes.' : trapFor(lesson, 'miss'))}>
              {choice}
            </Tap>
          ))}
        </div>
      ) : (
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault()
            const verdict = checkAnswer(lesson, value || lesson.answer)
            setNote(verdict === 'pass' ? 'Yes.' : trapFor(lesson, verdict))
          }}
        >
          <textarea lang="ja" rows={3} value={value} onChange={(event) => setValue(event.target.value)} />
          <Tap onClick={() => setNote(checkAnswer(lesson, value) === 'pass' ? 'Yes.' : trapFor(lesson, checkAnswer(lesson, value)))}>
            Check
          </Tap>
        </form>
      )}
      {note && <p className="note">{note}</p>}
      <Tap
        onClick={() => {
          if (index + 1 >= ids.length) onClose()
          else {
            setIndex(index + 1)
            setNote('')
            setValue('')
          }
        }}
      >
        {index + 1 >= ids.length ? 'Back to the road' : 'Next'}
      </Tap>
    </div>
  )
}
