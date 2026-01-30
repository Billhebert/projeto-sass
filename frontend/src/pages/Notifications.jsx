import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import './Notifications.css'

function Notifications() {
  const { token } = useAuthStore()
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [notifications, setNotifications] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('unread')

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      loadNotifications()
      loadStats()
    }
  }, [selectedAccount, filter])

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
    }
  }

  const loadNotifications = async () => {
    setLoading(true)
    setError(null)
    try {
      const endpoint = filter === 'unread'
        ? `/notifications/${selectedAccount}/unread`
        : `/notifications/${selectedAccount}`
      const response = await api.get(endpoint)
      setNotifications(response.data.notifications || [])
    } catch (err) {
      setError('Erro ao carregar notificacoes')
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await api.get(`/notifications/${selectedAccount}/stats`)
      setStats(response.data)
    } catch (err) {
      console.error('Erro ao carregar estatisticas:', err)
    }
  }

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${selectedAccount}/${notificationId}/read`)
      await loadNotifications()
      await loadStats()
    } catch (err) {
      setError('Erro ao marcar como lida')
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.put(`/notifications/${selectedAccount}/read-all`)
      await loadNotifications()
      await loadStats()
    } catch (err) {
      setError('Erro ao marcar todas como lidas')
    }
  }

  const getTopicIcon = (topic) => {
    const icons = {
      'orders_v2': 'shopping_cart',
      'questions': 'help',
      'items': 'inventory_2',
      'messages': 'chat',
      'shipments': 'local_shipping',
      'claims': 'report_problem',
      'payments': 'payment'
    }
    return icons[topic] || 'notifications'
  }

  const getTopicLabel = (topic) => {
    const labels = {
      'orders_v2': 'Pedido',
      'questions': 'Pergunta',
      'items': 'Anuncio',
      'messages': 'Mensagem',
      'shipments': 'Envio',
      'claims': 'Reclamacao',
      'payments': 'Pagamento'
    }
    return labels[topic] || topic
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now - date) / 1000 / 60)

    if (diff < 60) return `${diff} min atras`
    if (diff < 1440) return `${Math.floor(diff / 60)}h atras`
    return date.toLocaleString('pt-BR')
  }

  return (
    <div className="notifications-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">notifications</span>
            Notificacoes
          </h1>
          <p>Historico de webhooks do Mercado Livre</p>
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
          {stats?.unread > 0 && (
            <button
              className="btn btn-secondary"
              onClick={markAllAsRead}
            >
              <span className="material-icons">done_all</span>
              Marcar todas como lidas
            </button>
          )}
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <span className="material-icons">notifications</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.total || 0}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red">
              <span className="material-icons">mark_email_unread</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.unread || 0}</span>
              <span className="stat-label">Nao Lidas</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <span className="material-icons">shopping_cart</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.byTopic?.orders_v2 || 0}</span>
              <span className="stat-label">Pedidos</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow">
              <span className="material-icons">help</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.byTopic?.questions || 0}</span>
              <span className="stat-label">Perguntas</span>
            </div>
          </div>
        </div>
      )}

      <div className="filters-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            <span className="material-icons">mark_email_unread</span>
            Nao Lidas
            {stats?.unread > 0 && (
              <span className="tab-badge">{stats.unread}</span>
            )}
          </button>
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            <span className="material-icons">list</span>
            Todas
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      <div className="notifications-list">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando notificacoes...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <span className="material-icons">notifications_none</span>
            <h3>Nenhuma notificacao encontrada</h3>
            <p>
              {filter === 'unread'
                ? 'Voce nao tem notificacoes nao lidas!'
                : 'As notificacoes de webhooks aparecerao aqui'
              }
            </p>
          </div>
        ) : (
          notifications.map(notification => (
            <div
              key={notification._id}
              className={`notification-item ${!notification.read ? 'unread' : ''}`}
              onClick={() => !notification.read && markAsRead(notification._id)}
            >
              <div className={`notification-icon ${notification.topic}`}>
                <span className="material-icons">{getTopicIcon(notification.topic)}</span>
              </div>
              <div className="notification-content">
                <div className="notification-header">
                  <span className="notification-type">{getTopicLabel(notification.topic)}</span>
                  <span className="notification-time">{formatDate(notification.receivedAt)}</span>
                </div>
                <div className="notification-body">
                  <p className="notification-resource">
                    {notification.resource || 'N/A'}
                  </p>
                  {notification.attempts && (
                    <span className="notification-attempts">
                      Tentativas: {notification.attempts}
                    </span>
                  )}
                </div>
              </div>
              {!notification.read && (
                <div className="unread-indicator">
                  <span className="material-icons">fiber_manual_record</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Notifications
