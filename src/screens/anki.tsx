import { useState } from 'react'
import { lessons } from '../data/lessons.ts'
import { notesFor, type DeckMode } from '../anki/notes.ts'
import { useSave } from '../ui/save.tsx'
import { Tap } from './bits.tsx'

export function AnkiScreen() {
  const { save } = useSave()
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const chapter = save.chapter && !save.chapter.tested ? save.chapter : null
  const roadCount = notesFor(save, lessons, 'road').length
  const passedCount = notesFor(save, lessons, 'passed').length

  async function download(mode: DeckMode) {
    if (busy) return
    const notes = notesFor(save, lessons, mode)
    if (notes.length === 0) {
      setStatus(mode === 'passed' ? 'No passed cards yet.' : 'Nothing to put on a card yet.')
      return
    }
    setBusy(true)
    setStatus('')
    try {
      const { buildApkg } = await import('../anki/apkg.ts')
      const bytes = await buildApkg(notes)
      const blob = new Blob([new Uint8Array(bytes).buffer])
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'michi-dojo.apkg'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 2000)
      setStatus(`${notes.length} cards saved as michi-dojo.apkg.`)
    } catch {
      setStatus('The deck file could not be built.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <h2>Anki deck</h2>
      {chapter && <p className="pack">{chapter.title}</p>}
      <p>Save the file.</p>
      <p>Open Anki or AnkiDroid.</p>
      <p>Import.</p>
      <div className="stack">
        <Tap disabled={busy} onClick={() => void download('road')}>
          Download chapter and misses
        </Tap>
        <Tap className="ghost" disabled={busy} onClick={() => void download('passed')}>
          Download passed cards
        </Tap>
      </div>
      <p className="hint">
        {roadCount} cards in this chapter and the learning set. {passedCount} passed. No account. No network. The road
        stays as it is.
      </p>
      {status && <p className="note">{status}</p>}
    </section>
  )
}
