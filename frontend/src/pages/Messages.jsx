import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import './Messages.css'

function Messages() {
  const { token } = useAuthStore()
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('unread')
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      loadConversations()
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

  const loadConversations = async () => {
    setLoading(true)
    setError(null)
    try {
      const endpoint = filter === 'unread'
        ? `/messages/${selectedAccount}/unread`
        : `/messages/${selectedAccount}`
      const response = await api.get(endpoint)
      setConversations(response.data.messages || [])
    } catch (err) {
      setError('Erro ao carregar mensagens')
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  const syncMessages = async () => {
    setSyncing(true)
    try {
      await api.post(`/messages/${selectedAccount}/sync`)
      await loadConversations()
    } catch (err) {
      setError('Erro ao sincronizar mensagens')
    } finally {
      setSyncing(false)
    }
  }

  const openConversation = async (packId) => {
    try {
      const response = await api.get(`/messages/${selectedAccount}/pack/${packId}`)
      setMessages(response.data.messages || [])
      setSelectedConversation(packId)
    } catch (err) {
      setError('Erro ao carregar conversa')
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    setSending(true)
    try {
      await api.post(`/messages/${selectedAccount}/pack/${selectedConversation}`, {
        text: newMessage
      })
      setNewMessage('')
      await openConversation(selectedConversation)
    } catch (err) {
      setError('Erro ao enviar mensagem')
    } finally {
      setSending(false)
    }
  }

  const markAsRead = async (messageId) => {
    try {
      await api.put(`/messages/${selectedAccount}/${messageId}/read`)
      await loadConversations()
    } catch (err) {
      console.error('Erro ao marcar como lida:', err)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now - date) / 1000 / 60)

    if (diff < 60) return `${diff}min`
    if (diff < 1440) return `${Math.floor(diff / 60)}h`
    return date.toLocaleDateString('pt-BR')
  }

  return (
    <div className="messages-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">chat</span>
            Mensagens
          </h1>
          <p>Conversas pos-venda com compradores</p>
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
          <button 
            className="btn btn-primary"
            onClick={syncMessages}
            disabled={syncing || !selectedAccount}
          >
            <span className="material-icons">sync</span>
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
      </div>

      <div className="messages-container">
        <div className="conversations-panel">
          <div className="panel-header">
            <div className="filter-tabs compact">
              <button
                className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
                onClick={() => setFilter('unread')}
              >
                Nao lidas
              </button>
              <button
                className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                Todas
              </button>
            </div>
          </div>

          <div className="conversations-list">
            {loading ? (
              <div className="loading-state small">
                <div className="spinner"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="empty-state small">
                <span className="material-icons">chat_bubble_outline</span>
                <p>Nenhuma mensagem</p>
              </div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv._id || conv.packId}
                  className={`conversation-item ${selectedConversation === conv.packId ? 'active' : ''} ${!conv.read ? 'unread' : ''}`}
                  onClick={() => openConversation(conv.packId)}
                >
                  <div className="conv-avatar">
                    {conv.from?.nickname?.charAt(0) || 'C'}
                  </div>
                  <div className="conv-content">
                    <div className="conv-header">
                      <span className="conv-name">{conv.from?.nickname || 'Comprador'}</span>
                      <span className="conv-time">{formatDate(conv.dateReceived)}</span>
                    </div>
                    <div className="conv-preview">
                      <span className="conv-order">Pedido #{conv.orderId}</span>
                      <p className="conv-text">{conv.text?.substring(0, 50)}...</p>
                    </div>
                  </div>
                  {!conv.read && <div className="unread-dot"></div>}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="chat-panel">
          {selectedConversation ? (
            <>
              <div className="chat-header">
                <div className="chat-info">
                  <span className="material-icons">shopping_bag</span>
                  <span>Pedido #{selectedConversation}</span>
                </div>
                <a
                  href={`https://www.mercadolivre.com.br/vendas/mensagens/${selectedConversation}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-secondary"
                >
                  <span className="material-icons">open_in_new</span>
                  Ver no ML
                </a>
              </div>

              <div className="chat-messages">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`message-bubble ${msg.from?.userId === accounts.find(a => a.id === selectedAccount)?.mlUserId ? 'sent' : 'received'}`}
                  >
                    <div className="bubble-content">
                      <p>{msg.text}</p>
                      <span className="bubble-time">{formatDate(msg.dateSent || msg.dateReceived)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="chat-input">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                />
                <button
                  className="btn btn-primary"
                  onClick={sendMessage}
                  disabled={sending || !newMessage.trim()}
                >
                  <span className="material-icons">send</span>
                </button>
              </div>
            </>
          ) : (
            <div className="chat-placeholder">
              <span className="material-icons">forum</span>
              <h3>Selecione uma conversa</h3>
              <p>Escolha uma conversa ao lado para visualizar as mensagens</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger floating">
          <span className="material-icons">error</span>
          {error}
          <button onClick={() => setError(null)}>
            <span className="material-icons">close</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default Messages
