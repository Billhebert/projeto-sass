import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import './Dashboard.css'

function Dashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({
    accounts: 0,
    orders: 0,
    products: 0,
    issues: 0,
  })
  const [loading, setLoading] = useState(true)

   useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/ml-accounts')
        // Handle the API response structure: { success, data: { accounts: [], total } }
        const accountsList = response.data.data?.accounts || response.data.data || []
        const accounts = Array.isArray(accountsList) ? accountsList : []
        
        if (accounts && accounts.length > 0) {
          const account = accounts[0]
          setStats({
            accounts: accounts.length,
            orders: account.cachedData?.orders || 0,
            products: account.cachedData?.products || 0,
            issues: account.cachedData?.issues || 0,
          })
        } else {
          setStats({
            accounts: 0,
            orders: 0,
            products: 0,
            issues: 0,
          })
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
        setStats({
          accounts: 0,
          orders: 0,
          products: 0,
          issues: 0,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const StatCard = ({ label, value, icon }) => (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{loading ? '-' : value}</p>
      </div>
    </div>
  )

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Bem-vindo, {user?.firstName}! 👋</h1>
        <p>Aqui você pode gerenciar suas contas e visualizar relatórios</p>
      </div>

      <div className="stats-grid">
        <StatCard label="Contas Conectadas" value={stats.accounts} icon="🏪" />
        <StatCard label="Pedidos" value={stats.orders} icon="📦" />
        <StatCard label="Produtos" value={stats.products} icon="🛍️" />
        <StatCard label="Problemas" value={stats.issues} icon="⚠️" />
      </div>

      <div className="dashboard-section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Atividade Recente</h2>
          </div>
          <div className="card-body">
            <p className="text-muted">
              Nenhuma atividade recente. Conecte uma conta Mercado Livre para começar.
            </p>
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Próximas Ações</h2>
          </div>
          <div className="card-body">
            <ul className="action-list">
              <li>
                <span>✅</span> Criar sua primeira conta
              </li>
              <li>
                <span>📊</span> Visualizar seus produtos
              </li>
              <li>
                <span>📈</span> Acompanhar vendas em tempo real
              </li>
              <li>
                <span>⚙️</span> Configurar suas preferências
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
