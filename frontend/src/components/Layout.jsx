import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import CacheManager from './CacheManager'
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
      <CacheManager />
    </div>
  )
}

export default Layout
