import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import './Sidebar.css'

function Sidebar() {
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const isActive = (path) => location.pathname === path

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/accounts', label: 'Contas ML', icon: '🏪' },
    { path: '/reports', label: 'Relatórios', icon: '📈' },
    { path: '/settings', label: 'Configurações', icon: '⚙️' },
  ]

  const handleLogout = () => {
    logout()
  }

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>SASS</h1>
          <button
            className="sidebar-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            ☰
          </button>
        </div>

        <nav className={`sidebar-nav ${isMenuOpen ? 'active' : ''}`}>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.firstName?.charAt(0)}
            </div>
            <div className="user-details">
              <p className="user-name">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="user-email">{user?.email}</p>
            </div>
          </div>
          <button className="btn btn-sm btn-secondary w-full mt-2" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </aside>

      {isMenuOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  )
}

export default Sidebar
