import { atom } from 'jotai'

export const aiTextResponseAtom = atom<{text: string, words: string[]}>({ text: '', words: [] })
export const sessionIdAtom = atom<string | null>(null)