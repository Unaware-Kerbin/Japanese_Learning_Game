import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { lessons } from '../data/lessons.ts'
import { notesFor, type DeckMode } from '../anki/notes.ts'
import { useSave } from '../ui/save.tsx'
import { Tap } from './bits.tsx'

const APKG = 'michi-dojo.apkg'
const ANKI_DROID =
  'In AnkiDroid, open the menu, choose Import, and pick michi-dojo.apkg. Or choose AnkiDroid from the share sheet.'

function onAndroidApp(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

function plainPath(uri: string, fallback: string): string {
  if (!uri.startsWith('file:')) return fallback
  const path = uri.replace(/^file:\/\/localhost/, '').replace(/^file:\/\//, '')
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function saveApkgInBrowser(bytes: Uint8Array) {
  const blob = new Blob([new Uint8Array(bytes).buffer])
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = APKG
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

async function shareApkg(uri: string) {
  const { Share } = await import('@capacitor/share')
  try {
    await Share.share({
      title: 'Michi Dojo',
      files: [uri],
      dialogTitle: 'Michi Dojo',
    })
  } catch {
    // Closing the share sheet leaves the saved file in place.
  }
}

async function saveApkgOnAndroid(bytes: Uint8Array): Promise<string> {
  const { Directory, Filesystem } = await import('@capacitor/filesystem')
  const data = bytesToBase64(bytes)
  const downloadPath = `Download/${APKG}`
  try {
    const perm = await Filesystem.checkPermissions()
    if (perm.publicStorage !== 'granted') {
      const asked = await Filesystem.requestPermissions()
      if (asked.publicStorage !== 'granted') throw new Error('storage permission denied')
    }
    const written = await Filesystem.writeFile({
      path: downloadPath,
      data,
      directory: Directory.ExternalStorage,
      recursive: true,
    })
    await shareApkg(written.uri)
    return plainPath(written.uri, `/storage/emulated/0/${downloadPath}`)
  } catch {
    const written = await Filesystem.writeFile({
      path: APKG,
      data,
      directory: Directory.Cache,
    })
    await shareApkg(written.uri)
    return plainPath(written.uri, APKG)
  }
}

export function AnkiScreen() {
  const { save } = useSave()
  const [status, setStatus] = useState('')
  const [savedPath, setSavedPath] = useState('')
  const [busy, setBusy] = useState(false)
  const android = onAndroidApp()
  const chapter = save.chapter && !save.chapter.tested ? save.chapter : null
  const roadCount = notesFor(save, lessons, 'road').length
  const passedCount = notesFor(save, lessons, 'passed').length

  async function download(mode: DeckMode) {
    if (busy) return
    const notes = notesFor(save, lessons, mode)
    if (notes.length === 0) {
      setSavedPath('')
      setStatus(mode === 'passed' ? 'No passed cards yet.' : 'Nothing to put on a card yet.')
      return
    }
    setBusy(true)
    setStatus('')
    setSavedPath('')
    try {
      const { buildApkg } = await import('../anki/apkg.ts')
      const bytes = await buildApkg(notes)
      if (onAndroidApp()) {
        setSavedPath(await saveApkgOnAndroid(bytes))
      } else {
        saveApkgInBrowser(bytes)
      }
      setStatus(`${notes.length} cards saved as michi-dojo.apkg.`)
    } catch {
      setSavedPath('')
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
      {android ? (
        <p>{ANKI_DROID}</p>
      ) : (
        <>
          <p>Open Anki or AnkiDroid.</p>
          <p>Import.</p>
        </>
      )}
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
      {savedPath && <p className="note">{savedPath}</p>}
    </section>
  )
}
