import initSqlJs from 'sql.js'
import { strToU8, zipSync } from 'fflate'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import type { AnkiNote } from './notes.ts'

const MODEL_ID = 1609459200002
const DECK_ID = 1609459200001

export const DECK_NAME = 'Michi Dojo'
export const MODEL_NAME = 'Michi Dojo'
export const DECK_DESCRIPTION =
  'OpenJLPT mountain cards are CC BY-SA 4.0; credit OpenJLPT, EDRDG JMdict/KANJIDIC2, Jonathan Waller, Tatoeba. Lesson prose is original.'

const LATEX_PRE =
  '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n' +
  '\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n'
const LATEX_POST = '\\end{document}'

const SCHEMA = `
CREATE TABLE col (
  id integer primary key,
  crt integer not null,
  mod integer not null,
  scm integer not null,
  ver integer not null,
  dty integer not null,
  usn integer not null,
  ls integer not null,
  conf text not null,
  models text not null,
  decks text not null,
  dconf text not null,
  tags text not null
);
CREATE TABLE notes (
  id integer primary key,
  guid text not null,
  mid integer not null,
  mod integer not null,
  usn integer not null,
  tags text not null,
  flds text not null,
  sfld text not null,
  csum integer not null,
  flags integer not null,
  data text not null
);
CREATE TABLE cards (
  id integer primary key,
  nid integer not null,
  did integer not null,
  ord integer not null,
  mod integer not null,
  usn integer not null,
  type integer not null,
  queue integer not null,
  due integer not null,
  ivl integer not null,
  factor integer not null,
  reps integer not null,
  lapses integer not null,
  left integer not null,
  odue integer not null,
  odid integer not null,
  flags integer not null,
  data text not null
);
CREATE TABLE revlog (
  id integer primary key,
  cid integer not null,
  usn integer not null,
  ease integer not null,
  ivl integer not null,
  lastIvl integer not null,
  factor integer not null,
  time integer not null,
  type integer not null
);
CREATE TABLE graves (
  usn integer not null,
  oid integer not null,
  type integer not null
);
CREATE INDEX ix_notes_usn on notes (usn);
CREATE INDEX ix_cards_usn on cards (usn);
CREATE INDEX ix_revlog_usn on revlog (usn);
CREATE INDEX ix_cards_nid on cards (nid);
CREATE INDEX ix_cards_sched on cards (did, queue, due);
CREATE INDEX ix_revlog_cid on revlog (cid);
CREATE INDEX ix_notes_csum on notes (csum);
`

const BASE91 = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's',
  't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
  'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3', '4',
  '5', '6', '7', '8', '9', '!', '#', '$', '%', '&', '(', ')', '*', '+', ',', '-', '.', '/', ':',
  ';', '<', '=', '>', '?', '@', '[', ']', '^', '_', '`', '{', '|', '}', '~',
]

export async function buildApkg(
  notes: AnkiNote[],
  locateFile?: (file: string) => string,
): Promise<Uint8Array> {
  const usable = notes.filter((note) => note.front.trim() && note.back.trim())
  const SQL = await initSqlJs({ locateFile: locateFile ?? (() => wasmUrl) })
  const db = new SQL.Database()
  try {
    const now = Date.now()
    const seconds = Math.floor(now / 1000)
    db.exec(SCHEMA)
    db.run(
      `INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags)
       VALUES (1, ?, ?, ?, 11, 0, 0, 0, ?, ?, ?, ?, '{}')`,
      [
        seconds,
        now,
        now,
        JSON.stringify(collectionConf(usable.length)),
        JSON.stringify({ [String(MODEL_ID)]: modelJson(seconds) }),
        JSON.stringify(decksJson(seconds)),
        JSON.stringify(deckConfig()),
      ],
    )
    db.run('BEGIN')
    for (let index = 0; index < usable.length; index += 1) {
      const note = usable[index]
      const noteId = now + index + 1
      const guid = await guidFor(`michi:${note.lessonId}`)
      const front = html(note.front)
      const flds = [front, html(note.back), html(note.extra)].join('\u001f')
      const tags = note.tags.map((tag) => tag.replace(/\s+/g, '')).filter(Boolean)
      db.run(
        `INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data)
         VALUES (?, ?, ?, ?, -1, ?, ?, ?, ?, 0, '')`,
        [noteId, guid, MODEL_ID, seconds, ` ${tags.join(' ')} `, flds, note.front, await checksum(note.front)],
      )
      db.run(
        `INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data)
         VALUES (?, ?, ?, 0, ?, -1, 0, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0, '')`,
        [now + 1_000_000 + index + 1, noteId, DECK_ID, seconds, index + 1],
      )
    }
    db.run('COMMIT')
    return zipSync({
      'collection.anki2': db.export(),
      media: strToU8('{}'),
    })
  } finally {
    db.close()
  }
}

function collectionConf(count: number) {
  return {
    activeDecks: [DECK_ID],
    addToCur: true,
    collapseTime: 1200,
    curDeck: DECK_ID,
    curModel: String(MODEL_ID),
    dueCounts: true,
    estTimes: true,
    newBury: true,
    newSpread: 0,
    nextPos: count + 1,
    sortBackwards: false,
    sortType: 'noteFld',
    timeLim: 0,
  }
}

function modelJson(seconds: number) {
  return {
    css: '.card { font-family: Palatino, "Noto Serif JP", serif; font-size: 22px; color: #1c1915; background-color: #f3ead7; text-align: left; line-height: 1.45; } .front { font-size: 32px; } .extra { margin-top: 1em; color: #c23b22; }',
    did: DECK_ID,
    flds: [
      { name: 'Front', ord: 0, sticky: false, rtl: false, font: 'Liberation Sans', size: 24, media: [] },
      { name: 'Back', ord: 1, sticky: false, rtl: false, font: 'Liberation Sans', size: 20, media: [] },
      { name: 'Extra', ord: 2, sticky: false, rtl: false, font: 'Liberation Sans', size: 16, media: [] },
    ],
    id: MODEL_ID,
    latexPost: LATEX_POST,
    latexPre: LATEX_PRE,
    latexsvg: false,
    mod: seconds,
    name: MODEL_NAME,
    req: [[0, 'any', [0]]],
    sortf: 0,
    tags: [],
    tmpls: [
      {
        name: 'Card 1',
        ord: 0,
        qfmt: '<div class="front">{{Front}}</div>',
        afmt: '{{FrontSide}}<hr id=answer><div>{{Back}}</div>{{#Extra}}<div class="extra">{{Extra}}</div>{{/Extra}}',
        bqfmt: '',
        bafmt: '',
        did: null,
        bfont: '',
        bsize: 0,
      },
    ],
    type: 0,
    usn: -1,
    vers: [],
  }
}

function decksJson(seconds: number) {
  const fresh = {
    collapsed: false,
    browserCollapsed: false,
    conf: 1,
    dyn: 0,
    extendNew: 0,
    extendRev: 50,
    lrnToday: [0, 0],
    newToday: [0, 0],
    revToday: [0, 0],
    timeToday: [0, 0],
    mod: seconds,
    usn: -1,
  }
  return {
    '1': {
      ...fresh,
      id: 1,
      name: 'Default',
      desc: '',
      usn: 0,
    },
    [String(DECK_ID)]: {
      ...fresh,
      id: DECK_ID,
      name: DECK_NAME,
      desc: DECK_DESCRIPTION,
    },
  }
}

function deckConfig() {
  return {
    '1': {
      autoplay: true,
      id: 1,
      lapse: { delays: [10], leechAction: 0, leechFails: 8, minInt: 1, mult: 0 },
      maxTaken: 60,
      mod: 0,
      name: 'Default',
      new: {
        bury: true,
        delays: [1, 10],
        initialFactor: 2500,
        ints: [1, 4, 7],
        order: 1,
        perDay: 20,
        separate: true,
      },
      replayq: true,
      rev: { bury: true, ease4: 1.3, fuzz: 0.05, ivlFct: 1, maxIvl: 36500, minSpace: 1, perDay: 100 },
      timer: 0,
      usn: 0,
    },
  }
}

function html(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br>')
}

async function checksum(text: string): Promise<number> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text))
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return Number.parseInt(hex.slice(0, 8), 16)
}

async function guidFor(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  const bytes = new Uint8Array(digest).slice(0, 8)
  let hash = 0n
  for (const byte of bytes) hash = (hash << 8n) + BigInt(byte)
  const base = BigInt(BASE91.length)
  const chars: string[] = []
  while (hash > 0n) {
    chars.push(BASE91[Number(hash % base)] ?? 'a')
    hash /= base
  }
  return chars.reverse().join('') || 'michi'
}
