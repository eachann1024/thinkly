import { create } from 'zustand'

interface ContextMenuStore {
  openMenuId: string | null
  
  open: (id: string) => void
  
  close: () => void
  
  generateId: () => string
}

let idCounter = 0

export const useContextMenu = create<ContextMenuStore>((set) => ({
  openMenuId: null,
  
  open: (id) => set({ openMenuId: id }),
  
  close: () => set({ openMenuId: null }),
  
  generateId: () => `ctx-menu-${++idCounter}`
}))
