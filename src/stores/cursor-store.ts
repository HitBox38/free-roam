import { create } from "zustand"

interface CursorStoreState {
  cursorColor: string | null
  pointerActive: boolean
  setCursorColor: (color: string) => void
  setPointerActive: (pointerActive: boolean) => void
}

export const useCursorStore = create<CursorStoreState>((set) => ({
  cursorColor: null,
  pointerActive: false,
  setCursorColor: (cursorColor) => set({ cursorColor }),
  setPointerActive: (pointerActive) => set({ pointerActive }),
}))
