export type Door = 'new' | 'phrase' | 'katakana' | 'lapsed' | 'read' | 'lot'
export type Band = 'intro' | 'vowel' | 'hiragana' | 'katakana' | 'sentence' | 'grammar' | 'news' | 'kanji'
export type Role = 'review' | 'new' | 'extra' | 'test' | 'chapter'
export type Minutes = 10 | 15 | 20
export type Level = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'

export type Lesson = {
  id: string
  band: Band
  level?: Level
  activity: 'teach' | 'choice' | 'order' | 'type' | 'trace' | 'listen'
  prompt: string
  detail?: string
  hint?: string
  answer: string
  choices?: string[]
  tiles?: string[]
  trap: string
  say?: string
  picture?: string
  caption?: string
  lock?: boolean
  ungraded?: boolean
  kana?: string[]
  furigana?: string
}

export type Step = { id: string; role: Role }

export type Today = {
  day: string
  minutes: Minutes
  started: number
  steps: Step[]
  index: number
  phase: 'cards' | 'offer' | 'done'
  extraUsed: boolean
  newCorrect: number
  newAnswered: number
  testQueued: boolean
  chapterQueued: boolean
}

export type Chapter = {
  ids: string[]
  title: string
  level: string
  pack: number
  packs: number
  opened: string
  tested: boolean
}

export type Memory = {
  ef: number
  reps: number
  lapses: number
  leech: boolean
  due: string
}

export type Shelf = {
  tale: boolean
  easy: boolean
  town: boolean
  news: boolean
  casual: boolean
}

export type Save = {
  v: 1
  door: Door | null
  fox: boolean
  readingOk: boolean | null
  level: Level | null
  learnedKana: string[]
  passed: string[]
  seen: string[]
  learning: string[]
  memory: Record<string, Memory>
  furigana: Record<string, number>
  logs: { day: string; minutes: number; news: number }[]
  closed: { title: string; level: string }[]
  closedIds: string[]
  chapter: Chapter | null
  today: Today | null
  recentMiss: string[]
  shelf: Shelf
  journal: { text: string; note: string }[]
  screen: string
  skippedVowels: boolean
}

export const NEWS =
  'アロハ航空243便事故は、1988年4月28日にハワイ諸島で発生した航空事故である。'

export const YOMU = '本を読みます。'
export const IU = '名前を言う。'

const KEY = 'michi.v1'

export function dayKey(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return dayKey(dt)
}

export function fresh(): Save {
  return {
    v: 1,
    door: null,
    fox: true,
    readingOk: null,
    level: null,
    learnedKana: [],
    passed: [],
    seen: [],
    learning: [],
    memory: {},
    furigana: {},
    logs: [],
    closed: [],
    closedIds: [],
    chapter: null,
    today: null,
    recentMiss: [],
    shelf: { tale: false, easy: false, town: false, news: false, casual: false },
    journal: [],
    screen: 'door',
    skippedVowels: false,
  }
}

export function load(): Save {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fresh()
    const parsed = JSON.parse(raw) as Save
    if (parsed.v !== 1) return fresh()
    return { ...fresh(), ...parsed, shelf: { ...fresh().shelf, ...parsed.shelf } }
  } catch {
    return fresh()
  }
}

export function persist(save: Save) {
  localStorage.setItem(KEY, JSON.stringify(save))
}

export function chapterSize(logs: Save['logs']): number {
  const last = logs.slice(-7)
  if (last.length === 0) return 10
  const days = new Set(last.map((s) => s.day)).size || 1
  const news = last.reduce((sum, s) => sum + s.news, 0)
  const perDay = news / days
  return clamp(Math.round(perDay * 14), 10, 60)
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

export function newsVerdict(input: string): 'pass' | 'register' | 'particles' | 'mismatch' {
  const s = input.replace(/\s/g, '')
  if (s === NEWS.replace(/\s/g, '')) return 'pass'
  if (s.includes('です') || s.includes('ます')) return 'register'
  const topic = s.includes('は')
  const time = s.includes('に')
  const place = s.includes('で')
  const end = s.endsWith('である。') || s.endsWith('である') || s.endsWith('だ。') || s.endsWith('だ')
  if (!topic || !time || !place || !end) return 'particles'
  return 'mismatch'
}

export function productionVerdict(input: string, model: string): 'pass' | 'partial' | 'miss' {
  const s = input.replace(/\s/g, '')
  const m = model.replace(/\s/g, '')
  if (s === m) return 'pass'
  if (m.includes('読みます') && s.includes('読') && !s.includes('読みます')) return 'partial'
  if (m.includes('言う')) {
    if (s === '言う' || s === '名前を言う' || s === '名前を言う。') return 'pass'
    if (s.includes('言') && !s.includes('言う')) return 'partial'
  }
  return 'miss'
}

export function journalNote(text: string): string {
  const t = text.trim()
  if (!t) return 'Write one line you could actually use.'
  const kana = /[ぁ-んァ-ン一-龯]/.test(t)
  if (!kana) return 'This note is still in English. One Japanese line is enough.'
  if (/だろう|べき|らしい|させる|させられる/.test(t)) {
    return 'This is grammatical, and it uses a pattern this chapter does not score. It stays in the journal. It is not marked wrong.'
  }
  return 'This uses writing you have met. A different grammatical pattern stays in the journal and is not treated as an error.'
}

export function checkAnswer(lesson: Lesson, input: string): 'pass' | 'partial' | 'register' | 'particles' | 'mismatch' | 'miss' {
  const value = input.trim()
  if (lesson.id === 'news-aloha') return newsVerdict(value)
  if (lesson.id === 'n1-yomu') return productionVerdict(value, YOMU)
  if (lesson.id === 'n1-iu') return productionVerdict(value, IU)
  if (lesson.activity === 'order') {
    return value.replace(/\s/g, '') === lesson.answer.replace(/\s/g, '') ? 'pass' : 'miss'
  }
  if (value.replace(/\s/g, '') === lesson.answer.replace(/\s/g, '')) return 'pass'
  return 'miss'
}

export function trapFor(lesson: Lesson, verdict: string): string {
  if (verdict === 'pass') return ''
  if (lesson.id === 'news-aloha' && verdict === 'register') {
    return 'です and ます are a different register. This news line uses は for the topic, に for the date, で for the place, and it ends with である.'
  }
  if (lesson.id === 'news-aloha' && verdict === 'particles') {
    return 'The line needs all three: は for the topic, に for the time, and で for the place, and it has to end with だ or である. One of those particles is not the sentence.'
  }
  if (lesson.id === 'news-aloha') {
    return 'The practice line has to match the model sentence, including は, に, で, and である.'
  }
  if ((lesson.id === 'n1-yomu' || lesson.id === 'n1-iu') && verdict === 'partial') {
    return lesson.trap
  }
  return lesson.trap
}

const LEVELS: Level[] = ['N5', 'N4', 'N3', 'N2', 'N1']

export function levelsFrom(level: Level | null): Level[] {
  if (!level) return ['N5']
  return LEVELS.slice(LEVELS.indexOf(level))
}

export function allowed(lesson: Lesson, save: Save): boolean {
  if (lesson.lock && save.readingOk !== true) return false
  if (save.skippedVowels && lesson.band === 'vowel') return false
  if (!save.door) return false
  if (save.level && lesson.level && !levelsFrom(save.level).includes(lesson.level)) return false
  if (lesson.band === 'news' && save.level && LEVELS.indexOf(save.level) < LEVELS.indexOf('N3')) return false
  if (lesson.band === 'kanji' && save.level && lesson.level && !levelsFrom(save.level).includes(lesson.level)) return false
  return bandsFor(save.door).includes(lesson.band)
}

export function bandsFor(door: Door): Band[] {
  switch (door) {
    case 'new':
      return ['intro', 'vowel', 'hiragana', 'katakana', 'sentence', 'grammar', 'news', 'kanji']
    case 'katakana':
      return ['katakana', 'hiragana', 'vowel', 'sentence', 'grammar', 'news', 'kanji']
    case 'phrase':
    case 'lapsed':
    case 'read':
      return ['sentence', 'grammar', 'news', 'kanji']
    case 'lot':
      return ['news', 'kanji', 'grammar']
  }
}

function roadRank(save: Save, lesson: Lesson): number {
  const bands = save.door ? bandsFor(save.door) : []
  const index = bands.indexOf(lesson.band)
  if ((save.level === 'N2' || save.level === 'N1') && lesson.band === 'kanji') return -1
  return index
}

export function poolFor(save: Save, lessons: Lesson[]): Lesson[] {
  const filtered = lessons.filter((lesson) => allowed(lesson, save) && !save.closedIds.includes(lesson.id))
  const ordered = [...filtered].sort((a, b) => {
    const diff = roadRank(save, a) - roadRank(save, b)
    return diff
  })
  if (save.level !== 'N1') return ordered
  const lead = ['n1-yomu', 'n1-iu']
  const head = lead.flatMap((id) => {
    const found = ordered.find((lesson) => lesson.id === id)
    return found ? [found] : []
  })
  return [...head, ...ordered.filter((lesson) => !lead.includes(lesson.id))]
}

export function needsProbe(save: Save, lessons: Lesson[]): boolean {
  if (save.readingOk !== null) return false
  if (!save.door || save.door === 'new' || save.door === 'katakana') {
    const open = poolFor({ ...save, readingOk: true }, lessons)
    const next = open.find((lesson) => !save.seen.includes(lesson.id))
    return Boolean(next?.lock)
  }
  return save.door === 'read' || save.door === 'lot' || save.door === 'phrase' || save.door === 'lapsed'
}

export function ensureChapter(save: Save, lessons: Lesson[], now = new Date()): Save {
  if (save.chapter && !save.chapter.tested) return save
  const pool = poolFor(save, lessons)
  const seen = new Set(save.seen)
  const next = pool.filter((lesson) => !seen.has(lesson.id))
  if (next.length === 0) return save
  const size = chapterSize(save.logs)
  const ids = next.slice(0, size).map((lesson) => lesson.id)
  const first = next[0]
  const level = first.level ?? first.band
  const same = next.filter((lesson) => (lesson.level ?? lesson.band) === level)
  const packs = Math.max(1, Math.ceil(same.length / size))
  const pack = save.closed.filter((c) => c.level === level).length + 1
  const title = chapterTitle(first, pack, packs)
  return {
    ...save,
    chapter: {
      ids,
      title,
      level,
      pack,
      packs,
      opened: dayKey(now),
      tested: false,
    },
  }
}

function chapterTitle(lesson: Lesson, pack: number, packs: number): string {
  if (lesson.band === 'kanji' && lesson.level) return `${lesson.level} pack ${pack} of ${packs}`
  if (lesson.band === 'news') return 'News line'
  const names: Record<Band, string> = {
    intro: 'Starting out',
    vowel: 'Vowel sounds',
    hiragana: 'Hiragana',
    katakana: 'Katakana',
    sentence: 'First sentences',
    grammar: 'Sentence patterns',
    news: 'News line',
    kanji: 'Kanji',
  }
  return packs > 1 ? `${names[lesson.band]} ${pack} of ${packs}` : names[lesson.band]
}

export function newLeft(save: Save): number {
  if (!save.chapter) return 0
  return save.chapter.ids.filter((id) => !save.seen.includes(id)).length
}

export function daysLeft(save: Save): number {
  const left = newLeft(save)
  const last = save.logs.slice(-7)
  const days = new Set(last.map((s) => s.day)).size || 1
  const news = last.reduce((sum, s) => sum + s.news, 0)
  const perDay = last.length ? Math.max(1, news / days) : 5
  return Math.max(1, Math.ceil(left / perDay))
}

function dueReviews(save: Save, day: string): string[] {
  const due: string[] = []
  for (const id of save.learning) if (!due.includes(id)) due.push(id)
  for (const [id, mem] of Object.entries(save.memory)) {
    if (mem.due <= day && !due.includes(id)) due.push(id)
  }
  return due
}

export function beginDay(save: Save, minutes: Minutes, lessons: Lesson[], now = new Date()): Save {
  const day = dayKey(now)
  if (save.today && save.today.day === day && !save.today.phase) return save
  if (save.today && save.today.day === day && save.today.phase !== 'done') return { ...save, screen: 'lesson' }
  let next = ensureChapter(save, lessons, now)
  if (next.today && next.today.day === day && next.today.phase === 'done') {
    return { ...next, screen: 'map' }
  }
  const chapter = next.chapter
  if (!chapter) return { ...next, screen: 'map' }
  const unseen = chapter.ids.filter((id) => !next.seen.includes(id))
  const reviews = dueReviews(next, day).filter((id) => lessons.some((lesson) => lesson.id === id))
  const freshIds = unseen.slice(0, 5)
  const reviewIds = reviews.filter((id) => !freshIds.includes(id)).slice(0, Math.max(freshIds.length, reviews.length ? 5 : 0))
  const half = reviewIds.slice(0, 5)
  let steps: Step[] = [
    ...half.map((id) => ({ id, role: 'review' as const })),
    ...freshIds.map((id) => ({ id, role: 'new' as const })),
  ]
  let chapterQueued = false
  if (steps.length === 0 && unseen.length === 0 && !chapter.tested) {
    steps = chapterSteps(next, chapter.ids, minutes, now)
    chapterQueued = true
  }
  if (steps.length === 0) return { ...next, screen: 'map' }
  return {
    ...next,
    screen: 'lesson',
    today: {
      day,
      minutes,
      started: now.getTime(),
      steps,
      index: 0,
      phase: 'cards',
      extraUsed: false,
      newCorrect: 0,
      newAnswered: 0,
      testQueued: false,
      chapterQueued,
    },
  }
}

function chapterSteps(save: Save, ids: string[], minutes: Minutes, now: Date): Step[] {
  const clockGone = Boolean(save.today && now.getTime() - save.today.started >= save.today.minutes * 60_000)
  const n = minutes === 10 || clockGone ? Math.min(3, ids.length) : Math.min(5, ids.length)
  return ids.slice(0, n).map((id) => ({ id, role: 'chapter' as const }))
}

export function commitAnswer(save: Save, lesson: Lesson, ok: boolean, lessons: Lesson[], now = new Date()): Save {
  const today = save.today
  if (!today) return save
  const step = today.steps[today.index]
  let next = save
  if (ok) next = markCorrect(next, lesson, today.day)
  else if (!lesson.ungraded) next = markMiss(next, lesson)
  if (lesson.band === 'vowel' || lesson.band === 'hiragana' || lesson.band === 'katakana') {
    const kana = lesson.kana ?? []
    next = { ...next, learnedKana: unique([...next.learnedKana, ...kana]) }
  }
  next = unlockShelf(next, lesson, ok)
  const newAnswered = today.newAnswered + (step && (step.role === 'new' || step.role === 'extra') ? 1 : 0)
  const newCorrect = today.newCorrect + (ok && step && (step.role === 'new' || step.role === 'extra') ? 1 : 0)
  let steps = today.steps
  if (!ok && !lesson.ungraded && step?.role !== 'test' && step?.role !== 'chapter') {
    const later = steps.slice(today.index + 1).some((s) => s.id === lesson.id)
    if (!later) steps = [...steps.slice(0, today.index + 1), { id: lesson.id, role: 'review' }, ...steps.slice(today.index + 1)]
  }
  const index = today.index + 1
  next = {
    ...next,
    today: { ...today, steps, index, newAnswered, newCorrect, phase: 'cards' },
  }
  return advance(next, lessons, now)
}

function markCorrect(save: Save, lesson: Lesson, day: string): Save {
  const prev = save.memory[lesson.id]
  const reps = (prev?.reps ?? 0) + 1
  const ef = Math.max(1.3, (prev?.ef ?? 2.5) + 0.1)
  const memory = {
    ...save.memory,
    [lesson.id]: {
      ef,
      reps,
      lapses: prev?.lapses ?? 0,
      leech: prev?.leech ?? false,
      due: addDays(day, 1),
    },
  }
  const reads = (save.furigana[lesson.id] ?? 0) + 1
  return {
    ...save,
    passed: unique([...save.passed, lesson.id]),
    seen: unique([...save.seen, lesson.id]),
    learning: save.learning.filter((id) => id !== lesson.id),
    memory,
    furigana: { ...save.furigana, [lesson.id]: reads },
  }
}

function markMiss(save: Save, lesson: Lesson): Save {
  const prev = save.memory[lesson.id]
  const lapses = (prev?.lapses ?? 0) + 1
  const memory = {
    ...save.memory,
    [lesson.id]: {
      ef: Math.max(1.3, (prev?.ef ?? 2.5) - 0.2),
      reps: 0,
      lapses,
      leech: lapses >= 4,
      due: addDays(dayKey(), lapses >= 4 ? 7 : 1),
    },
  }
  return {
    ...save,
    seen: unique([...save.seen, lesson.id]),
    learning: unique([...save.learning, lesson.id]),
    recentMiss: [...save.recentMiss, lesson.id].slice(-8),
    memory,
    furigana: { ...save.furigana, [lesson.id]: 0 },
  }
}

function unlockShelf(save: Save, lesson: Lesson, ok: boolean): Save {
  if (!ok) return save
  const shelf = { ...save.shelf }
  if (lesson.id === 'sent-student') shelf.tale = true
  if (lesson.band === 'kanji') shelf.easy = true
  const kanjiPassed = new Set(save.passed.filter((id) => id.startsWith('kanji-') || id.startsWith('n1-')))
  kanjiPassed.add(lesson.band === 'kanji' ? lesson.id : '')
  if ([...kanjiPassed].filter(Boolean).length >= 5) shelf.town = true
  if (lesson.id === 'news-aloha') {
    shelf.news = true
    shelf.casual = true
  }
  return { ...save, shelf }
}

function advance(save: Save, lessons: Lesson[], now: Date): Save {
  const today = save.today
  if (!today) return save
  if (today.index < today.steps.length) return save
  if (shouldOfferExtra(save, now)) {
    return { ...save, today: { ...today, phase: 'offer' } }
  }
  if (!today.testQueued && !today.chapterQueued) {
    const test = testSteps(save, now)
    if (test.length) {
      return {
        ...save,
        today: {
          ...today,
          steps: [...today.steps, ...test],
          phase: 'cards',
          testQueued: true,
        },
      }
    }
  }
  const chapter = save.chapter
  const chapterDone = chapter && chapter.ids.every((id) => save.seen.includes(id))
  if (chapter && chapterDone && !chapter.tested && !today.chapterQueued) {
    const steps = chapterSteps(save, chapter.ids, today.minutes, now)
    if (steps.length) {
      return {
        ...save,
        today: {
          ...today,
          steps: [...today.steps, ...steps],
          phase: 'cards',
          chapterQueued: true,
        },
      }
    }
  }
  return finishDay(save, lessons, now)
}

function shouldOfferExtra(save: Save, now: Date): boolean {
  const today = save.today
  if (!today || today.extraUsed || today.testQueued || today.chapterQueued) return false
  if (today.minutes < 15) return false
  if (today.newAnswered < 5 || today.newCorrect !== today.newAnswered) return false
  const elapsed = now.getTime() - today.started
  if (elapsed >= today.minutes * 60_000) return false
  const unseen = save.chapter?.ids.some((id) => !save.seen.includes(id))
  return Boolean(unseen)
}

export function acceptExtra(save: Save): Save {
  const today = save.today
  if (!today || !save.chapter) return save
  const extra = save.chapter.ids.filter((id) => !save.seen.includes(id)).slice(0, 5)
  return {
    ...save,
    today: {
      ...today,
      extraUsed: true,
      phase: 'cards',
      steps: [...today.steps, ...extra.map((id) => ({ id, role: 'extra' as const }))],
    },
  }
}

export function declineExtra(save: Save, lessons: Lesson[], now = new Date()): Save {
  const today = save.today
  if (!today) return save
  return advance({ ...save, today: { ...today, extraUsed: true, phase: 'cards' } }, lessons, now)
}

function testSteps(save: Save, now: Date): Step[] {
  const today = save.today
  if (!today) return []
  const clockGone = now.getTime() - today.started >= today.minutes * 60_000
  const todayIds = today.steps.map((step) => step.id)
  const unpassed = unique(todayIds.filter((id) => save.learning.includes(id)))
  if (clockGone) return unpassed.slice(0, 3).map((id) => ({ id, role: 'test' as const }))
  const n = today.minutes === 10 ? 3 : 5
  const pool = unique([...unpassed, ...todayIds])
  return pool.slice(0, n).map((id) => ({ id, role: 'test' as const }))
}

function finishDay(save: Save, lessons: Lesson[], now: Date): Save {
  const today = save.today
  if (!today) return save
  const introduced = today.steps.filter((step) => step.role === 'new' || step.role === 'extra').length
  const logs = today.phase === 'done'
    ? save.logs
    : [...save.logs.filter((log) => log.day !== today.day), { day: today.day, minutes: today.minutes, news: introduced }]
  let chapter = save.chapter
  let closed = save.closed
  let closedIds = save.closedIds
  if (chapter && today.chapterQueued) {
    chapter = { ...chapter, tested: true }
    closed = [...closed, { title: chapter.title, level: chapter.level }]
    closedIds = unique([...closedIds, ...chapter.ids])
  }
  const finished: Save = {
    ...save,
    logs,
    chapter,
    closed,
    closedIds,
    today: { ...today, phase: 'done' },
    screen: 'map',
  }
  if (chapter?.tested) return ensureChapter({ ...finished, chapter }, lessons, now)
  return finished
}

export function showFurigana(save: Save, id: string): boolean {
  return (save.furigana[id] ?? 0) < 2
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)]
}

export function replayPair(save: Save): string[] {
  return save.recentMiss.slice(-2)
}
