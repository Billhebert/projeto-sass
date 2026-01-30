import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [stats, setStats] = useState({
    accounts: 0,
    products: 0,
    activeProducts: 0,
    totalSales: 0,
    lowStock: 0,
  })
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch accounts
      const accountsResponse = await api.get('/ml-accounts')
      const accountsList = accountsResponse.data.data?.accounts || accountsResponse.data.data || []
      const accountsArray = Array.isArray(accountsList) ? accountsList : []
      
      setAccounts(accountsArray)
      
      // If we have accounts, fetch product stats for each
      let totalProducts = 0
      let totalActiveProducts = 0
      let totalSales = 0
      let totalLowStock = 0
      const activity = []

      for (const account of accountsArray) {
        try {
          const statsResponse = await api.get(`/products/${account.id}/stats`)
          if (statsResponse.data.success) {
            const accountStats = statsResponse.data.data
            totalProducts += accountStats.products?.total || 0
            totalActiveProducts += accountStats.products?.active || 0
            totalSales += accountStats.sales || 0
            totalLowStock += accountStats.products?.lowStock || 0
            
            // Add to activity
            if (accountStats.products?.total > 0) {
              activity.push({
                type: 'sync',
                account: account.nickname,
                message: `${accountStats.products.total} produtos sincronizados`,
                time: account.lastSync || account.updatedAt,
              })
            }
          }
        } catch (err) {
          console.error(`Error fetching stats for account ${account.id}:`, err)
        }
      }

      setStats({
        accounts: accountsArray.length,
        products: totalProducts,
        activeProducts: totalActiveProducts,
        totalSales: totalSales,
        lowStock: totalLowStock,
      })

      // Sort activity by time
      setRecentActivity(
        activity
          .sort((a, b) => new Date(b.time) - new Date(a.time))
          .slice(0, 5)
      )
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setStats({
        accounts: 0,
        products: 0,
        activeProducts: 0,
        totalSales: 0,
        lowStock: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ label, value, icon, onClick, warning }) => (
    <div 
      className={`stat-card ${onClick ? 'clickable' : ''} ${warning ? 'warning' : ''}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : {}}
    >
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <p className="stat-label">{label}</p>
        <p className="stat-value" style={warning ? { color: '#dc3545' } : {}}>
          {loading ? '-' : value}
        </p>
      </div>
    </div>
  )

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Bem-vindo, {user?.firstName || 'Usuario'}!</h1>
        <p>Aqui voce pode gerenciar suas contas e visualizar relatorios</p>
      </div>

      <div className="stats-grid">
        <StatCard 
          label="Contas Conectadas" 
          value={stats.accounts} 
          icon="🏪"
          onClick={() => navigate('/accounts')}
        />
        <StatCard 
          label="Total de Produtos" 
          value={stats.products} 
          icon="📦"
          onClick={stats.accounts > 0 ? () => navigate(`/accounts/${accounts[0]?.id}/products`) : undefined}
        />
        <StatCard 
          label="Produtos Ativos" 
          value={stats.activeProducts} 
          icon="✅"
        />
        <StatCard 
          label="Vendas Totais" 
          value={stats.totalSales} 
          icon="💰"
          onClick={() => navigate('/reports')}
        />
      </div>

      {stats.lowStock > 0 && (
        <div className="alert" style={{ 
          backgroundColor: '#fff3cd', 
          borderColor: '#ffc107', 
          color: '#856404',
          marginTop: '1rem',
          padding: '1rem',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <span>
            <strong>{stats.lowStock} produto(s)</strong> com estoque baixo. 
            <button 
              className="btn btn-sm btn-primary" 
              style={{ marginLeft: '1rem' }}
              onClick={() => navigate('/reports')}
            >
              Ver detalhes
            </button>
          </span>
        </div>
      )}

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Atividade Recente</h2>
          </div>
          <div className="card-body">
            {loading ? (
              <p className="text-muted">Carregando...</p>
            ) : recentActivity.length > 0 ? (
              <ul className="activity-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {recentActivity.map((item, idx) => (
                  <li key={idx} style={{ 
                    padding: '0.75rem 0', 
                    borderBottom: idx < recentActivity.length - 1 ? '1px solid #eee' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <strong>{item.account}</strong>
                      <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>{item.message}</p>
                    </div>
                    <small style={{ color: '#999' }}>{formatDate(item.time)}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">
                Nenhuma atividade recente. Conecte uma conta Mercado Livre para comecar.
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Acoes Rapidas</h2>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {stats.accounts === 0 ? (
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate('/accounts')}
                  style={{ justifyContent: 'flex-start', padding: '1rem' }}
                >
                  🏪 Conectar primeira conta do Mercado Livre
                </button>
              ) : (
                <>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => navigate('/accounts')}
                    style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
                  >
                    ➕ Adicionar nova conta
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => navigate(`/accounts/${accounts[0]?.id}/products`)}
                    style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
                  >
                    🔄 Sincronizar produtos
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => navigate('/reports')}
                    style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
                  >
                    📊 Ver relatorios
                  </button>
                </>
              )}
              <button 
                className="btn btn-secondary"
                onClick={() => navigate('/settings')}
                style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
              >
                ⚙️ Configuracoes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Accounts Summary */}
      {accounts.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <h2 className="card-title">Contas Conectadas</h2>
            <button 
              className="btn btn-sm btn-secondary"
              onClick={() => navigate('/accounts')}
            >
              Ver todas
            </button>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
              {accounts.slice(0, 4).map(account => (
                <div 
                  key={account.id} 
                  style={{ 
                    padding: '1rem', 
                    border: '1px solid #eee', 
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s',
                  }}
                  onClick={() => navigate(`/accounts/${account.id}/products`)}
                  onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{account.nickname}</strong>
                    <span className={`status-badge status-${account.status}`}>
                      {account.status === 'active' ? 'Ativo' : account.status}
                    </span>
                  </div>
                  <p style={{ margin: '0.5rem 0 0', color: '#666', fontSize: '0.85rem' }}>
                    {account.email}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
