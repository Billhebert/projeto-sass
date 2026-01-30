import { create } from 'zustand'

let toastId = 0

export const useToastStore = create((set, get) => ({
  toasts: [],

  addToast: (message, type = 'info', duration = 5000) => {
    const id = ++toastId
    const toast = { id, message, type, duration }

    set(state => ({
      toasts: [...state.toasts, toast]
    }))

    // Auto-remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, duration)
    }

    return id
  },

  removeToast: (id) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }))
  },

  // Convenience methods
  success: (message, duration) => get().addToast(message, 'success', duration),
  error: (message, duration) => get().addToast(message, 'error', duration),
  warning: (message, duration) => get().addToast(message, 'warning', duration),
  info: (message, duration) => get().addToast(message, 'info', duration),

  clearAll: () => set({ toasts: [] })
}))

// Export helper for use outside React components
export const toast = {
  success: (message, duration) => useToastStore.getState().success(message, duration),
  error: (message, duration) => useToastStore.getState().error(message, duration),
  warning: (message, duration) => useToastStore.getState().warning(message, duration),
  info: (message, duration) => useToastStore.getState().info(message, duration),
}
