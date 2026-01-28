import { create } from 'zustand'
import api from '../services/api'

export const useAuthStore = create((set) => ({
  token: null,
  user: null,
  loading: false,
  error: null,

  loadToken: () => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    if (token && user) {
      set({ token, user: JSON.parse(user) })
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const response = await api.post('/auth/login', { email, password })
      const { token, user } = response.data
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      set({ token, user, loading: false })
      return true
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed'
      set({ error: message, loading: false })
      return false
    }
  },

  register: async (data) => {
    set({ loading: true, error: null })
    try {
      const response = await api.post('/auth/register', data)
      const { token, user } = response.data
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      set({ token, user, loading: false })
      return true
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed'
      set({ error: message, loading: false })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null, error: null })
  },
}))

// Alias for convenience
export const useAuth = useAuthStore
