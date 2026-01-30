import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useSidebarStore } from '../store/sidebarStore'
import './Layout.css'

function Layout() {
  const { isCollapsed } = useSidebarStore()

  return (
    <div className={`layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar />
      <main className="main-content">
        <div className="content-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout
