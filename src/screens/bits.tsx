import type { ReactNode } from 'react'
import { Lottie } from 'lottie-react'
import type { Save } from '../engine/logic.ts'
import { art, playSound } from '../ui/media.ts'

export function Tap({
  children,
  onClick,
  className = '',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className={`tap ${className}`}
      disabled={disabled}
      onClick={() => {
        playSound('tap')
        onClick?.()
      }}
    >
      {children}
    </button>
  )
}

export function Top({ title, back }: { title: string; back?: () => void }) {
  return (
    <header className="top">
      {back && (
        <Tap className="back" onClick={back}>
          Back
        </Tap>
      )}
      <p className="brand">{title}</p>
    </header>
  )
}

export function Fox({ show, mood }: { show: boolean; mood: 'idle' | 'listen' | 'yes' | 'again' }) {
  if (!show) return null
  return (
    <div className="foxbox">
      <Lottie src={art(`fox-${mood}.json`)} loop={mood === 'idle' || mood === 'listen'} autoplay className="fox" />
    </div>
  )
}

export function backHome(save: Save): Save {
  if (!save.door) return { ...save, screen: 'door' }
  return { ...save, screen: 'map' }
}

export function Pitch() {
  return (
    <p className="pitch">
      <svg viewBox="0 0 160 40" aria-hidden="true">
        <path d="M8 10 H70 L150 30" fill="none" stroke="#1c1915" strokeWidth="3" />
      </svg>
      <span>visual guide</span>
    </p>
  )
}
