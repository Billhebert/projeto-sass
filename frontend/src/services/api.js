import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3011/api',
  timeout: 10000,
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only logout for 401 errors that are NOT related to ML token refresh
    // ML token refresh failures should show an error, not logout the user
    const isMLTokenRefresh = error.config?.url?.includes('/refresh-token')
    
    if (error.response?.status === 401 && !isMLTokenRefresh) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
