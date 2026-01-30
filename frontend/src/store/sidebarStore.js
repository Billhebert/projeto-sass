import { create } from 'zustand'

export const useSidebarStore = create((set) => ({
  isCollapsed: false,
  isMobileOpen: false,

  toggleCollapse: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setCollapsed: (value) => set({ isCollapsed: value }),
  
  toggleMobileMenu: () => set((state) => ({ isMobileOpen: !state.isMobileOpen })),
  closeMobileMenu: () => set({ isMobileOpen: false }),
  openMobileMenu: () => set({ isMobileOpen: true }),
}))
