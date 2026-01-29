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
      const { data, token, user } = response.data
      
      // Handle both response formats
      const actualToken = token || data?.token
      const actualUser = user || data?.user
      
      if (!actualToken || !actualUser) {
        throw new Error('Invalid response format: missing token or user')
      }
      
      localStorage.setItem('token', actualToken)
      localStorage.setItem('user', JSON.stringify(actualUser))
      set({ token: actualToken, user: actualUser, loading: false })
      return true
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Login failed'
      set({ error: message, loading: false })
      return false
    }
  },

  register: async (data) => {
    set({ loading: true, error: null })
    try {
      const response = await api.post('/auth/register', data)
      const { data: responseData, token, user } = response.data
      
      // Handle both response formats
      const actualToken = token || responseData?.token
      const actualUser = user || responseData?.user
      
      if (!actualToken || !actualUser) {
        throw new Error('Invalid response format: missing token or user')
      }
      
      localStorage.setItem('token', actualToken)
      localStorage.setItem('user', JSON.stringify(actualUser))
      set({ token: actualToken, user: actualUser, loading: false })
      return true
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Registration failed'
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
