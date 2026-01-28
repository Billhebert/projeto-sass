import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Login from '../src/pages/Login'
import { useAuthStore } from '../src/store/authStore'

// Mock the auth store
vi.mock('../src/store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

describe('Login Page', () => {
  beforeEach(() => {
    useAuthStore.mockReturnValue({
      login: vi.fn(),
      loading: false,
      error: null,
    })
  })

  it('renders login form', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    expect(screen.getByText('Projeto SASS')).toBeInTheDocument()
    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
  })

  it('updates form fields on input change', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Senha')

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    expect(emailInput.value).toBe('test@example.com')
    expect(passwordInput.value).toBe('password123')
  })

  it('shows error when form fields are empty', async () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    const submitButton = screen.getByRole('button', { name: /entrar/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Email and password are required')).toBeInTheDocument()
    })
  })

  it('calls login function with correct credentials', async () => {
    const mockLogin = vi.fn().mockResolvedValue(true)
    useAuthStore.mockReturnValue({
      login: mockLogin,
      loading: false,
      error: null,
    })

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'password123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })
})
