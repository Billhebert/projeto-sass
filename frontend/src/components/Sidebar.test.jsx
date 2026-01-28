import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Sidebar from '../src/components/Sidebar'
import { useAuthStore } from '../src/store/authStore'

// Mock the auth store
vi.mock('../src/store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useLocation: () => ({ pathname: '/' }),
  }
})

describe('Sidebar Component', () => {
  beforeEach(() => {
    useAuthStore.mockReturnValue({
      user: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
      logout: vi.fn(),
    })
  })

  it('renders sidebar with user information', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    )

    expect(screen.getByText('SASS')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  it('renders all menu items', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Contas ML')).toBeInTheDocument()
    expect(screen.getByText('Relatórios')).toBeInTheDocument()
    expect(screen.getByText('Configurações')).toBeInTheDocument()
  })

  it('calls logout when logout button is clicked', () => {
    const mockLogout = vi.fn()
    useAuthStore.mockReturnValue({
      user: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
      logout: mockLogout,
    })

    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    )

    fireEvent.click(screen.getByText('Sair'))
    expect(mockLogout).toHaveBeenCalled()
  })

  it('toggles menu on button click', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    )

    const toggleButton = screen.getByText('☰')
    fireEvent.click(toggleButton)

    // The menu should have the 'active' class
    expect(screen.getByRole('navigation')).toHaveClass('active')
  })
})
