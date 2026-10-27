import { createContext, useContext } from 'react'
import type { Save } from '../engine/logic.ts'

export type KeptNote = { kept: string[]; rebuild: string[] }

type Ctx = {
  save: Save
  set: (next: Save) => void
  replay: string[] | null
  setReplay: (ids: string[] | null) => void
  kept: KeptNote | null
  setKept: (note: KeptNote | null) => void
}

export const SaveContext = createContext<Ctx | null>(null)

export function useSave(): Ctx {
  const ctx = useContext(SaveContext)
  if (!ctx) throw new Error('Michi Dojo save is missing')
  return ctx
}
