import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { 
  RadialBarChart, RadialBar, ResponsiveContainer, 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell
} from 'recharts'
import './Reputation.css'

function Reputation() {
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [loading, setLoading] = useState(true)
  const [reputation, setReputation] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      loadReputation()
    }
  }, [selectedAccount])

  const loadAccounts = async () => {
    try {
      const response = await api.get('/ml-accounts')
      const accountsList = response.data.data?.accounts || response.data.accounts || []
      setAccounts(accountsList)
      if (accountsList.length > 0) {
        setSelectedAccount(accountsList[0].id)
      }
    } catch (err) {
      setError('Erro ao carregar contas')
      setLoading(false)
    }
  }

  const loadReputation = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get(`/metrics/${selectedAccount}/reputation`)
      setReputation(response.data.reputation)
      
      // Generate mock history for visualization
      // In production, this would come from stored data
      const mockHistory = generateMockHistory(response.data.reputation)
      setHistory(mockHistory)
    } catch (err) {
      setError('Erro ao carregar reputacao')
      setReputation(null)
    } finally {
      setLoading(false)
    }
  }

  const generateMockHistory = (rep) => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun']
    const baseCompleted = rep?.transactions?.completed || 0
    const baseClaims = (rep?.metrics?.claims?.rate || 0) * 100
    const baseDelayed = (rep?.metrics?.delayed_handling_time?.rate || 0) * 100
    
    return months.map((month, idx) => ({
      month,
      vendas: Math.max(0, Math.floor(baseCompleted / 6 * (1 + (idx - 3) * 0.1))),
      reclamacoes: Math.max(0, baseClaims + (Math.random() - 0.5) * 2).toFixed(1),
      atrasos: Math.max(0, baseDelayed + (Math.random() - 0.5) * 2).toFixed(1)
    }))
  }

  const getReputationLevel = (levelId) => {
    const levels = {
      '5_green': { 
        label: 'MercadoLider Platinum', 
        color: '#10b981', 
        icon: 'workspace_premium',
        description: 'Voce esta no nivel maximo! Continue assim.',
        score: 100
      },
      '4_light_green': { 
        label: 'MercadoLider Gold', 
        color: '#84cc16', 
        icon: 'military_tech',
        description: 'Otimo desempenho! Voce esta quase no topo.',
        score: 80
      },
      '3_yellow': { 
        label: 'MercadoLider', 
        color: '#eab308', 
        icon: 'verified',
        description: 'Bom trabalho! Continue melhorando suas metricas.',
        score: 60
      },
      '2_orange': { 
        label: 'Bom', 
        color: '#f97316', 
        icon: 'thumb_up',
        description: 'Voce pode melhorar. Foque nas metricas abaixo.',
        score: 40
      },
      '1_red': { 
        label: 'Regular', 
        color: '#ef4444', 
        icon: 'warning',
        description: 'Atencao! Suas metricas precisam de melhoria urgente.',
        score: 20
      }
    }
    return levels[levelId] || { label: 'Nao Avaliado', color: '#6b7280', icon: 'help', description: 'Sem dados suficientes.', score: 0 }
  }

  const getMetricStatus = (value, thresholds) => {
    if (value <= thresholds.good) return { status: 'good', color: '#10b981', label: 'Otimo' }
    if (value <= thresholds.warning) return { status: 'warning', color: '#f59e0b', label: 'Atencao' }
    return { status: 'danger', color: '#ef4444', label: 'Critico' }
  }

  const formatPercent = (value) => {
    return `${(value * 100).toFixed(2)}%`
  }

  const renderThermometer = () => {
    if (!reputation) return null
    
    const level = getReputationLevel(reputation.level_id)
    const data = [{ name: 'score', value: level.score, fill: level.color }]
    
    return (
      <div className="thermometer-container">
        <ResponsiveContainer width="100%" height={200}>
          <RadialBarChart 
            cx="50%" 
            cy="50%" 
            innerRadius="60%" 
            outerRadius="100%" 
            barSize={20} 
            data={data}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar
              background={{ fill: '#e5e7eb' }}
              dataKey="value"
              cornerRadius={10}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="thermometer-center">
          <span className="material-icons" style={{ color: level.color, fontSize: '2.5rem' }}>
            {level.icon}
          </span>
          <span className="thermometer-label">{level.label}</span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="reputation-page">
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Carregando reputacao...</p>
        </div>
      </div>
    )
  }

  const level = reputation ? getReputationLevel(reputation.level_id) : null
  const claimsRate = (reputation?.metrics?.claims?.rate || 0) * 100
  const delayedRate = (reputation?.metrics?.delayed_handling_time?.rate || 0) * 100
  const cancellationRate = (reputation?.metrics?.cancellations?.rate || 0) * 100
  
  const claimsStatus = getMetricStatus(claimsRate, { good: 1, warning: 3 })
  const delayedStatus = getMetricStatus(delayedRate, { good: 5, warning: 10 })
  const cancellationStatus = getMetricStatus(cancellationRate, { good: 2, warning: 5 })

  return (
    <div className="reputation-page">
      {/* Header */}
      <header className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">verified</span>
            Reputacao
          </h1>
          <p>Acompanhe e melhore sua reputacao no Mercado Livre</p>
        </div>
        <div className="header-actions">
          <select
            className="account-select"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.nickname || acc.mlUserId}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={loadReputation}>
            <span className="material-icons">refresh</span>
            Atualizar
          </button>
        </div>
      </header>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      {reputation && (
        <>
          {/* Main Level Card */}
          <section className="level-section">
            <div className="level-card" style={{ '--level-color': level.color }}>
              <div className="level-thermometer">
                {renderThermometer()}
              </div>
              <div className="level-info">
                <div className="level-badge">
                  <span className="material-icons">{level.icon}</span>
                  <span>{level.label}</span>
                </div>
                <p className="level-description">{level.description}</p>
                
                <div className="level-stats">
                  <div className="level-stat">
                    <span className="stat-value">{reputation.transactions?.completed || 0}</span>
                    <span className="stat-label">Vendas Completadas</span>
                  </div>
                  <div className="level-stat">
                    <span className="stat-value">{reputation.transactions?.canceled || 0}</span>
                    <span className="stat-label">Vendas Canceladas</span>
                  </div>
                  <div className="level-stat positive">
                    <span className="stat-value">{reputation.transactions?.ratings?.positive || 0}</span>
                    <span className="stat-label">Avaliacoes Positivas</span>
                  </div>
                  <div className="level-stat negative">
                    <span className="stat-value">{reputation.transactions?.ratings?.negative || 0}</span>
                    <span className="stat-label">Avaliacoes Negativas</span>
                  </div>
                </div>

                {reputation.power_seller_status && (
                  <div className="power-seller-badge">
                    <span className="material-icons">stars</span>
                    <span>Power Seller: {reputation.power_seller_status}</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Metrics Cards */}
          <section className="metrics-section">
            <h2 className="section-title">
              <span className="material-icons">analytics</span>
              Metricas de Performance
            </h2>
            
            <div className="metrics-grid">
              {/* Claims */}
              <div className={`metric-card ${claimsStatus.status}`}>
                <div className="metric-header">
                  <div className="metric-icon">
                    <span className="material-icons">report_problem</span>
                  </div>
                  <span className={`metric-badge ${claimsStatus.status}`}>{claimsStatus.label}</span>
                </div>
                <div className="metric-body">
                  <span className="metric-value">{claimsRate.toFixed(2)}%</span>
                  <span className="metric-label">Taxa de Reclamacoes</span>
                  <div className="metric-bar">
                    <div 
                      className="metric-bar-fill" 
                      style={{ width: `${Math.min(claimsRate * 10, 100)}%`, background: claimsStatus.color }}
                    ></div>
                  </div>
                  <p className="metric-help">
                    <span className="material-icons">info</span>
                    Ideal: menos de 1%
                  </p>
                </div>
                <div className="metric-details">
                  <div className="detail-row">
                    <span>Total de Reclamacoes</span>
                    <span>{reputation.metrics?.claims?.value || 0}</span>
                  </div>
                  <div className="detail-row">
                    <span>Periodo Analisado</span>
                    <span>{reputation.metrics?.claims?.period || 'Ultimos 60 dias'}</span>
                  </div>
                </div>
              </div>

              {/* Delayed Handling */}
              <div className={`metric-card ${delayedStatus.status}`}>
                <div className="metric-header">
                  <div className="metric-icon">
                    <span className="material-icons">schedule</span>
                  </div>
                  <span className={`metric-badge ${delayedStatus.status}`}>{delayedStatus.label}</span>
                </div>
                <div className="metric-body">
                  <span className="metric-value">{delayedRate.toFixed(2)}%</span>
                  <span className="metric-label">Taxa de Atrasos no Despacho</span>
                  <div className="metric-bar">
                    <div 
                      className="metric-bar-fill" 
                      style={{ width: `${Math.min(delayedRate * 5, 100)}%`, background: delayedStatus.color }}
                    ></div>
                  </div>
                  <p className="metric-help">
                    <span className="material-icons">info</span>
                    Ideal: menos de 5%
                  </p>
                </div>
                <div className="metric-details">
                  <div className="detail-row">
                    <span>Envios Atrasados</span>
                    <span>{reputation.metrics?.delayed_handling_time?.value || 0}</span>
                  </div>
                  <div className="detail-row">
                    <span>Periodo Analisado</span>
                    <span>{reputation.metrics?.delayed_handling_time?.period || 'Ultimos 60 dias'}</span>
                  </div>
                </div>
              </div>

              {/* Cancellations */}
              <div className={`metric-card ${cancellationStatus.status}`}>
                <div className="metric-header">
                  <div className="metric-icon">
                    <span className="material-icons">cancel</span>
                  </div>
                  <span className={`metric-badge ${cancellationStatus.status}`}>{cancellationStatus.label}</span>
                </div>
                <div className="metric-body">
                  <span className="metric-value">{cancellationRate.toFixed(2)}%</span>
                  <span className="metric-label">Taxa de Cancelamentos</span>
                  <div className="metric-bar">
                    <div 
                      className="metric-bar-fill" 
                      style={{ width: `${Math.min(cancellationRate * 10, 100)}%`, background: cancellationStatus.color }}
                    ></div>
                  </div>
                  <p className="metric-help">
                    <span className="material-icons">info</span>
                    Ideal: menos de 2%
                  </p>
                </div>
                <div className="metric-details">
                  <div className="detail-row">
                    <span>Vendas Canceladas</span>
                    <span>{reputation.metrics?.cancellations?.value || 0}</span>
                  </div>
                  <div className="detail-row">
                    <span>Periodo Analisado</span>
                    <span>{reputation.metrics?.cancellations?.period || 'Ultimos 60 dias'}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* History Chart */}
          <section className="history-section">
            <div className="chart-card">
              <div className="chart-header">
                <h3>
                  <span className="material-icons">show_chart</span>
                  Historico de Metricas
                </h3>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="reclamacoes" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="Reclamacoes (%)"
                      dot={{ fill: '#ef4444' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="atrasos" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      name="Atrasos (%)"
                      dot={{ fill: '#f59e0b' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Tips Section */}
          <section className="tips-section">
            <h2 className="section-title">
              <span className="material-icons">lightbulb</span>
              Dicas para Melhorar
            </h2>
            
            <div className="tips-grid">
              <div className="tip-card">
                <div className="tip-icon blue">
                  <span className="material-icons">local_shipping</span>
                </div>
                <div className="tip-content">
                  <h4>Despache Rapido</h4>
                  <p>Envie seus produtos dentro do prazo para manter uma boa taxa de despacho.</p>
                  <Link to="/shipments" className="tip-link">
                    Ver envios pendentes
                    <span className="material-icons">arrow_forward</span>
                  </Link>
                </div>
              </div>

              <div className="tip-card">
                <div className="tip-icon green">
                  <span className="material-icons">chat</span>
                </div>
                <div className="tip-content">
                  <h4>Responda Rapido</h4>
                  <p>Responda perguntas e mensagens rapidamente para evitar reclamacoes.</p>
                  <Link to="/questions" className="tip-link">
                    Ver perguntas
                    <span className="material-icons">arrow_forward</span>
                  </Link>
                </div>
              </div>

              <div className="tip-card">
                <div className="tip-icon purple">
                  <span className="material-icons">inventory_2</span>
                </div>
                <div className="tip-content">
                  <h4>Controle o Estoque</h4>
                  <p>Mantenha seu estoque atualizado para evitar cancelamentos por falta de produto.</p>
                  <Link to="/inventory" className="tip-link">
                    Ver estoque
                    <span className="material-icons">arrow_forward</span>
                  </Link>
                </div>
              </div>

              <div className="tip-card">
                <div className="tip-icon orange">
                  <span className="material-icons">description</span>
                </div>
                <div className="tip-content">
                  <h4>Anuncios Completos</h4>
                  <p>Crie anuncios detalhados com boas fotos e descricoes para evitar duvidas.</p>
                  <Link to="/items" className="tip-link">
                    Ver anuncios
                    <span className="material-icons">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Protection Period */}
          {reputation.protection && reputation.protection.active && (
            <section className="protection-section">
              <div className="protection-card">
                <div className="protection-icon">
                  <span className="material-icons">shield</span>
                </div>
                <div className="protection-content">
                  <h3>Periodo de Protecao Ativo</h3>
                  <p>
                    Voce esta em um periodo de protecao. Algumas metricas negativas nao afetarao 
                    sua reputacao ate {new Date(reputation.protection.end_date).toLocaleDateString('pt-BR')}.
                  </p>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {!reputation && !loading && !error && (
        <div className="empty-state">
          <span className="material-icons">verified</span>
          <h3>Sem dados de reputacao</h3>
          <p>Selecione uma conta para ver os dados de reputacao</p>
        </div>
      )}
    </div>
  )
}

export default Reputation
