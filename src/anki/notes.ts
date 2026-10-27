import type { Lesson, Save } from '../engine/logic.ts'

const JAPANESE = /[ぁ-んァ-ン一-龯]/
const KANA = /^[ぁ-んァ-ンー、。！？\s]+$/

export type AnkiNote = {
  lessonId: string
  front: string
  back: string
  extra: string
  tags: string[]
}

export type DeckMode = 'road' | 'passed'

export function exportLessonIds(save: Save, lessons: Lesson[], mode: DeckMode): string[] {
  const rank = new Map(lessons.map((lesson, index) => [lesson.id, index]))
  const raw =
    mode === 'passed'
      ? save.passed
      : [...(save.chapter && !save.chapter.tested ? save.chapter.ids : []), ...save.learning]
  return [...new Set(raw)].filter((id) => rank.has(id)).sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0))
}

export function toNote(lesson: Lesson): AnkiNote | null {
  const prompt = lesson.prompt.trim()
  const answer = lesson.answer.trim()
  const promptJp = JAPANESE.test(prompt)
  const answerJp = JAPANESE.test(answer)
  const taught = answerJp ? answer : promptJp ? prompt : ''
  if (!taught) return null

  const front = lesson.activity === 'teach' ? prompt : promptJp ? prompt : answerJp ? answer : ''
  if (!front) return null

  const lines = [taught]
  const read = readingOf(lesson, taught)
  if (read) lines.push(read)
  const gloss = glossOf(lesson, front)
  if (gloss && !lines.includes(gloss)) lines.push(gloss)
  const back = lines.join('\n').trim()
  if (!back) return null

  const tags = ['michi', lesson.band]
  if (lesson.level) tags.push(lesson.level)
  return {
    lessonId: lesson.id,
    front,
    back,
    extra: lesson.trap.trim(),
    tags,
  }
}

export function notesFor(save: Save, lessons: Lesson[], mode: DeckMode): AnkiNote[] {
  const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]))
  const notes: AnkiNote[] = []
  for (const id of exportLessonIds(save, lessons, mode)) {
    const lesson = byId.get(id)
    if (!lesson) continue
    const note = toNote(lesson)
    if (note) notes.push(note)
  }
  return notes
}

function readingOf(lesson: Lesson, taught: string): string {
  const furigana = lesson.furigana?.trim() ?? ''
  if (furigana && furigana !== taught) return furigana
  const say = lesson.say?.trim() ?? ''
  if (say && say !== taught && KANA.test(say)) return say
  return ''
}

function glossOf(lesson: Lesson, front: string): string {
  const hint = lesson.hint?.trim() ?? ''
  if (hint && hint !== front) return hint
  const caption = lesson.caption?.trim() ?? ''
  if (caption && caption !== front) return caption
  const prompt = lesson.prompt.trim()
  if (prompt && prompt !== front && !JAPANESE.test(prompt) && prompt.length <= 80) return prompt
  return ''
}
