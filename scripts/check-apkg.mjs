import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'

const require = createRequire(import.meta.url)
const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm')
const root = new URL('..', import.meta.url).pathname
const server = await createServer({
  root,
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
})

try {
  const logic = await server.ssrLoadModule('/src/engine/logic.ts')
  const lessonMod = await server.ssrLoadModule('/src/data/lessons.ts')
  const notesMod = await server.ssrLoadModule('/src/anki/notes.ts')
  const apkgMod = await server.ssrLoadModule('/src/anki/apkg.ts')
  const lessons = lessonMod.lessons
  const save = logic.ensureChapter({ ...logic.fresh(), door: 'new', fox: true, screen: 'map' }, lessons)
  if (!save.chapter) throw new Error('open chapter missing')
  const outside = lessons.find((lesson) => !save.chapter.ids.includes(lesson.id) && notesMod.toNote(lesson))
  if (!outside) throw new Error('no lesson outside the chapter')
  save.learning = [save.chapter.ids[1], outside.id, save.chapter.ids[1]]
  const road = notesMod.notesFor(save, lessons, 'road')
  const roadIds = road.map((note) => note.lessonId)
  if (roadIds.includes('intro-en')) throw new Error('teach-only intro card was exported')
  if (new Set(roadIds).size !== roadIds.length) throw new Error('a miss was exported twice')
  if (!roadIds.includes(outside.id) || !roadIds.includes(save.chapter.ids[1])) {
    throw new Error('chapter and learning set were not both exported')
  }
  if (roadIds.indexOf(save.chapter.ids[1]) > roadIds.indexOf(outside.id)) {
    throw new Error('notes are not in lesson order')
  }
  const passed = notesMod.notesFor(
    { ...save, passed: [outside.id, 'intro-en', save.chapter.ids[3]] },
    lessons,
    'passed',
  )
  const passedIds = passed.map((note) => note.lessonId)
  if (passedIds.includes('intro-en')) throw new Error('empty teach card exported from passed')
  const passedRank = new Map(lessons.map((lesson, index) => [lesson.id, index]))
  const sorted = [...passedIds].sort((a, b) => passedRank.get(a) - passedRank.get(b))
  if (passedIds.join() !== sorted.join()) throw new Error('passed cards left road order')

  const progress = JSON.stringify({
    passed: save.passed,
    learning: save.learning,
    seen: save.seen,
    chapter: save.chapter,
    today: save.today,
    memory: save.memory,
    closedIds: save.closedIds,
  })
  const bytes = await apkgMod.buildApkg(road, () => wasmPath)
  const progressAfter = JSON.stringify({
    passed: save.passed,
    learning: save.learning,
    seen: save.seen,
    chapter: save.chapter,
    today: save.today,
    memory: save.memory,
    closedIds: save.closedIds,
  })
  if (progress !== progressAfter) throw new Error('building the deck changed lesson progress')

  const dir = mkdtempSync(join(tmpdir(), 'michi-apkg-'))
  const apkg = join(dir, 'michi-dojo.apkg')
  const expectPath = join(dir, 'expect.json')
  writeFileSync(apkg, bytes)
  writeFileSync(
    expectPath,
    JSON.stringify({
      count: road.length,
      fronts: road.map((note) => note.front.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br>')),
    }),
  )
  const checked = spawnSync('python3', [join(root, 'scripts/check-apkg.py'), apkg, expectPath], {
    encoding: 'utf8',
  })
  if (checked.status !== 0) {
    console.error(checked.stdout)
    console.error(checked.stderr)
    throw new Error('apkg structure check failed')
  }
  const count = Number(checked.stdout.trim())
  if (count !== road.length) throw new Error(`note count ${count} != ${road.length}`)
  console.log(`notes ${count}`)
  console.log(`chapter ${save.chapter.title}`)
  console.log(`file ${apkg}`)
} finally {
  await server.close()
}
