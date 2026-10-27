import { useEffect, useState } from 'react'
import rawJa from '../data/ja-audio.json'

const jaClips = rawJa as Record<string, string>

const clips = new Map<string, HTMLAudioElement>()
let speechToken = 0
let activeAudio: HTMLAudioElement | null = null

export const bundledJa = Object.keys(jaClips).length > 0

export function art(file: string): string {
  const base = import.meta.env.BASE_URL
  return `${base}art/${file}`
}

export function hasJaClip(text: string | undefined | null): boolean {
  return Boolean(text && jaClips[text])
}

function jaSrc(text: string): string | null {
  const rel = jaClips[text]
  if (!rel) return null
  const base = import.meta.env.BASE_URL
  return `${base}${rel.replace(/^\//, '')}`
}

export function playSound(name: 'tap' | 'ink' | 'correct' | 'retry' | 'mora') {
  try {
    let clip = clips.get(name)
    if (!clip) {
      clip = new Audio(art(`${name}.wav`))
      clips.set(name, clip)
    }
    clip.currentTime = 0
    void clip.play().catch(() => {})
  } catch {
    /* autoplay can be blocked; the card still moves */
  }
}

export function findJapaneseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  return voices.find((voice) => /^ja([-_]|$)/i.test(voice.lang)) ?? null
}

export function stopSpeech() {
  speechToken += 1
  const audio = activeAudio
  activeAudio = null
  if (audio) {
    audio.onended = null
    audio.onerror = null
    audio.pause()
    audio.src = ''
  }
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
}

function speakDevice(text: string, rate: number, onend?: () => void): boolean {
  const voice = findJapaneseVoice()
  if (!voice || !text || typeof window === 'undefined' || !window.speechSynthesis) return false
  const mine = speechToken
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.voice = voice
  utterance.lang = 'ja-JP'
  utterance.rate = rate
  const finish = () => {
    if (speechToken !== mine) return
    onend?.()
  }
  utterance.onend = finish
  utterance.onerror = finish
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
  return true
}

export function speak(text: string, rate: number, onend?: () => void): boolean {
  if (!text) return false
  const src = jaSrc(text)
  if (!src) return speakDevice(text, rate, onend)
  stopSpeech()
  const mine = speechToken
  const audio = new Audio(src)
  activeAudio = audio
  audio.preload = 'auto'
  audio.preservesPitch = true
  audio.playbackRate = Math.max(0.5, Math.min(rate, 1.25))
  const finish = () => {
    if (speechToken !== mine) return
    if (activeAudio === audio) activeAudio = null
    onend?.()
  }
  audio.onended = finish
  audio.onerror = () => {
    if (speechToken !== mine) return
    if (activeAudio === audio) activeAudio = null
    if (!speakDevice(text, rate, onend)) onend?.()
  }
  void audio.play().catch(() => {
    if (speechToken !== mine) return
    if (activeAudio === audio) activeAudio = null
    if (!speakDevice(text, rate, onend)) onend?.()
  })
  return true
}

export function useJapaneseVoice(): boolean | null {
  const [has, setHas] = useState<boolean | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setHas(false)
      return
    }
    const check = () => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length === 0) return false
      setHas(voices.some((voice) => /^ja([-_]|$)/i.test(voice.lang)))
      return true
    }
    if (check()) return
    const timer = window.setTimeout(() => setHas(false), 500)
    const onChange = () => {
      if (check()) window.clearTimeout(timer)
    }
    window.speechSynthesis.addEventListener('voiceschanged', onChange)
    return () => {
      window.clearTimeout(timer)
      window.speechSynthesis.removeEventListener('voiceschanged', onChange)
    }
  }, [])
  return has
}
