import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { mpSubscriptionsAPI, formatMPCurrency, getMPStatusColor } from '../services/mercadopago'
import { useToastStore } from '../store/toastStore'
import './MPSubscriptions.css'

function MPSubscriptions() {
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('subscriptions') // 'subscriptions' or 'plans'
  const [subscriptions, setSubscriptions] = useState([])
  const [plans, setPlans] = useState([])
  const [stats, setStats] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('view') // 'view', 'create-plan', 'create-subscription'
  const [actionLoading, setActionLoading] = useState(false)
  const { showToast } = useToastStore()

  // Filters
  const [filters, setFilters] = useState({
    status: '',
  })

  // Form states
  const [planForm, setPlanForm] = useState({
    reason: '',
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: '',
      currency_id: 'BRL',
    },
  })

  const [subscriptionForm, setSubscriptionForm] = useState({
    preapproval_plan_id: '',
    payer_email: '',
    external_reference: '',
  })

  useEffect(() => {
    loadData()
  }, [tab, filters])

  const loadData = async () => {
    setLoading(true)
    try {
      if (tab === 'subscriptions') {
        const [subsRes, statsRes] = await Promise.all([
          mpSubscriptionsAPI.search({ status: filters.status || undefined }),
          mpSubscriptionsAPI.getStats(),
        ])
        setSubscriptions(subsRes.data?.results || subsRes.data || [])
        setStats(statsRes.data)
      } else {
        const plansRes = await mpSubscriptionsAPI.searchPlans()
        setPlans(plansRes.data?.results || plansRes.data || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Erro ao carregar dados', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handlePauseSubscription = async (subscriptionId) => {
    if (!window.confirm('Deseja pausar esta assinatura?')) return
    
    setActionLoading(true)
    try {
      await mpSubscriptionsAPI.pause(subscriptionId)
      showToast('Assinatura pausada com sucesso', 'success')
      loadData()
    } catch (error) {
      console.error('Error pausing subscription:', error)
      showToast('Erro ao pausar assinatura', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelSubscription = async (subscriptionId) => {
    if (!window.confirm('Deseja cancelar esta assinatura? Esta acao nao pode ser desfeita.')) return
    
    setActionLoading(true)
    try {
      await mpSubscriptionsAPI.cancel(subscriptionId)
      showToast('Assinatura cancelada com sucesso', 'success')
      loadData()
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      showToast('Erro ao cancelar assinatura', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReactivateSubscription = async (subscriptionId) => {
    setActionLoading(true)
    try {
      await mpSubscriptionsAPI.reactivate(subscriptionId)
      showToast('Assinatura reativada com sucesso', 'success')
      loadData()
    } catch (error) {
      console.error('Error reactivating subscription:', error)
      showToast('Erro ao reativar assinatura', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreatePlan = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      await mpSubscriptionsAPI.createPlan({
        reason: planForm.reason,
        auto_recurring: {
          frequency: parseInt(planForm.auto_recurring.frequency),
          frequency_type: planForm.auto_recurring.frequency_type,
          transaction_amount: parseFloat(planForm.auto_recurring.transaction_amount),
          currency_id: planForm.auto_recurring.currency_id,
        },
      })
      showToast('Plano criado com sucesso', 'success')
      setShowModal(false)
      setPlanForm({
        reason: '',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: '',
          currency_id: 'BRL',
        },
      })
      loadData()
    } catch (error) {
      console.error('Error creating plan:', error)
      showToast('Erro ao criar plano', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateSubscription = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      await mpSubscriptionsAPI.create({
        preapproval_plan_id: subscriptionForm.preapproval_plan_id,
        payer_email: subscriptionForm.payer_email,
        external_reference: subscriptionForm.external_reference || undefined,
      })
      showToast('Assinatura criada com sucesso', 'success')
      setShowModal(false)
      setSubscriptionForm({
        preapproval_plan_id: '',
        payer_email: '',
        external_reference: '',
      })
      loadData()
    } catch (error) {
      console.error('Error creating subscription:', error)
      showToast('Erro ao criar assinatura', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const openCreateModal = (type) => {
    setModalType(type)
    setShowModal(true)
  }

  const openViewModal = (item) => {
    setSelectedItem(item)
    setModalType('view')
    setShowModal(true)
  }

  const getSubscriptionStatusLabel = (status) => {
    const labels = {
      pending: 'Pendente',
      authorized: 'Autorizada',
      paused: 'Pausada',
      cancelled: 'Cancelada',
    }
    return labels[status] || status
  }

  const getFrequencyLabel = (freq, type) => {
    const typeLabels = {
      days: freq === 1 ? 'dia' : 'dias',
      months: freq === 1 ? 'mes' : 'meses',
      years: freq === 1 ? 'ano' : 'anos',
    }
    return `${freq} ${typeLabels[type] || type}`
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  return (
    <div className="mp-subscriptions">
      <header className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">autorenew</span>
            Assinaturas
          </h1>
          <p>Gerencie assinaturas e planos recorrentes</p>
        </div>
        <div className="header-actions">
          <Link to="/mp" className="btn btn-secondary">
            <span className="material-icons">arrow_back</span>
            Voltar
          </Link>
          {tab === 'subscriptions' ? (
            <button className="btn btn-primary" onClick={() => openCreateModal('create-subscription')}>
              <span className="material-icons">add</span>
              Nova Assinatura
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => openCreateModal('create-plan')}>
              <span className="material-icons">add</span>
              Novo Plano
            </button>
          )}
        </div>
      </header>

      {/* Stats Cards */}
      {stats && tab === 'subscriptions' && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon active">
              <span className="material-icons">check_circle</span>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.active || 0}</span>
              <span className="stat-label">Ativas</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon paused">
              <span className="material-icons">pause_circle</span>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.paused || 0}</span>
              <span className="stat-label">Pausadas</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon cancelled">
              <span className="material-icons">cancel</span>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.cancelled || 0}</span>
              <span className="stat-label">Canceladas</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon mrr">
              <span className="material-icons">trending_up</span>
            </div>
            <div className="stat-content">
              <span className="stat-value">{formatMPCurrency(stats.mrr || 0)}</span>
              <span className="stat-label">MRR</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${tab === 'subscriptions' ? 'active' : ''}`}
            onClick={() => setTab('subscriptions')}
          >
            <span className="material-icons">repeat</span>
            Assinaturas
          </button>
          <button
            className={`tab ${tab === 'plans' ? 'active' : ''}`}
            onClick={() => setTab('plans')}
          >
            <span className="material-icons">list_alt</span>
            Planos
          </button>
        </div>

        {tab === 'subscriptions' && (
          <div className="filters">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Todos os Status</option>
              <option value="authorized">Autorizadas</option>
              <option value="paused">Pausadas</option>
              <option value="pending">Pendentes</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Carregando...</p>
        </div>
      ) : tab === 'subscriptions' ? (
        <div className="subscriptions-container">
          {subscriptions.length === 0 ? (
            <div className="empty-state">
              <span className="material-icons">inbox</span>
              <h3>Nenhuma assinatura encontrada</h3>
              <p>Crie uma nova assinatura para comecar</p>
              <button className="btn btn-primary" onClick={() => openCreateModal('create-subscription')}>
                <span className="material-icons">add</span>
                Nova Assinatura
              </button>
            </div>
          ) : (
            <table className="subscriptions-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Plano</th>
                  <th>Assinante</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Proxima Cobranca</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="subscription-id">{sub.id}</td>
                    <td>{sub.reason || sub.preapproval_plan_id || '-'}</td>
                    <td className="payer-info">
                      <span className="payer-email">{sub.payer_email || '-'}</span>
                    </td>
                    <td className="subscription-amount">
                      {sub.auto_recurring 
                        ? formatMPCurrency(sub.auto_recurring.transaction_amount)
                        : '-'}
                      {sub.auto_recurring && (
                        <span className="frequency">
                          /{getFrequencyLabel(sub.auto_recurring.frequency, sub.auto_recurring.frequency_type)}
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: getMPStatusColor(sub.status) }}
                      >
                        {getSubscriptionStatusLabel(sub.status)}
                      </span>
                    </td>
                    <td>{formatDate(sub.next_payment_date)}</td>
                    <td className="actions">
                      <button
                        className="btn-action"
                        title="Ver detalhes"
                        onClick={() => openViewModal(sub)}
                      >
                        <span className="material-icons">visibility</span>
                      </button>
                      {sub.status === 'authorized' && (
                        <button
                          className="btn-action pause"
                          title="Pausar"
                          onClick={() => handlePauseSubscription(sub.id)}
                          disabled={actionLoading}
                        >
                          <span className="material-icons">pause</span>
                        </button>
                      )}
                      {sub.status === 'paused' && (
                        <button
                          className="btn-action reactivate"
                          title="Reativar"
                          onClick={() => handleReactivateSubscription(sub.id)}
                          disabled={actionLoading}
                        >
                          <span className="material-icons">play_arrow</span>
                        </button>
                      )}
                      {(sub.status === 'authorized' || sub.status === 'paused') && (
                        <button
                          className="btn-action cancel"
                          title="Cancelar"
                          onClick={() => handleCancelSubscription(sub.id)}
                          disabled={actionLoading}
                        >
                          <span className="material-icons">cancel</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="plans-container">
          {plans.length === 0 ? (
            <div className="empty-state">
              <span className="material-icons">inbox</span>
              <h3>Nenhum plano encontrado</h3>
              <p>Crie um novo plano para comecar a oferecer assinaturas</p>
              <button className="btn btn-primary" onClick={() => openCreateModal('create-plan')}>
                <span className="material-icons">add</span>
                Novo Plano
              </button>
            </div>
          ) : (
            <div className="plans-grid">
              {plans.map((plan) => (
                <div key={plan.id} className="plan-card">
                  <div className="plan-header">
                    <h3>{plan.reason || 'Plano sem nome'}</h3>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: plan.status === 'active' ? '#28a745' : '#6c757d' }}
                    >
                      {plan.status === 'active' ? 'Ativo' : plan.status}
                    </span>
                  </div>
                  <div className="plan-price">
                    <span className="amount">
                      {plan.auto_recurring 
                        ? formatMPCurrency(plan.auto_recurring.transaction_amount)
                        : '-'}
                    </span>
                    {plan.auto_recurring && (
                      <span className="frequency">
                        /{getFrequencyLabel(plan.auto_recurring.frequency, plan.auto_recurring.frequency_type)}
                      </span>
                    )}
                  </div>
                  <div className="plan-details">
                    <div className="detail">
                      <span className="material-icons">tag</span>
                      <span>{plan.id}</span>
                    </div>
                    <div className="detail">
                      <span className="material-icons">calendar_today</span>
                      <span>Criado em {formatDate(plan.date_created)}</span>
                    </div>
                  </div>
                  <div className="plan-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => openViewModal(plan)}
                    >
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {modalType === 'view' && (tab === 'subscriptions' ? 'Detalhes da Assinatura' : 'Detalhes do Plano')}
                {modalType === 'create-plan' && 'Novo Plano'}
                {modalType === 'create-subscription' && 'Nova Assinatura'}
              </h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="modal-body">
              {modalType === 'view' && selectedItem && (
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>ID</label>
                    <span className="mono">{selectedItem.id}</span>
                  </div>
                  <div className="detail-item">
                    <label>Status</label>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getMPStatusColor(selectedItem.status) }}
                    >
                      {getSubscriptionStatusLabel(selectedItem.status)}
                    </span>
                  </div>
                  {selectedItem.reason && (
                    <div className="detail-item full-width">
                      <label>Descricao</label>
                      <span>{selectedItem.reason}</span>
                    </div>
                  )}
                  {selectedItem.payer_email && (
                    <div className="detail-item">
                      <label>Email</label>
                      <span>{selectedItem.payer_email}</span>
                    </div>
                  )}
                  {selectedItem.auto_recurring && (
                    <>
                      <div className="detail-item">
                        <label>Valor</label>
                        <span className="amount">
                          {formatMPCurrency(selectedItem.auto_recurring.transaction_amount)}
                        </span>
                      </div>
                      <div className="detail-item">
                        <label>Frequencia</label>
                        <span>
                          {getFrequencyLabel(
                            selectedItem.auto_recurring.frequency,
                            selectedItem.auto_recurring.frequency_type
                          )}
                        </span>
                      </div>
                    </>
                  )}
                  {selectedItem.next_payment_date && (
                    <div className="detail-item">
                      <label>Proxima Cobranca</label>
                      <span>{formatDate(selectedItem.next_payment_date)}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <label>Criado em</label>
                    <span>{formatDate(selectedItem.date_created)}</span>
                  </div>
                  {selectedItem.external_reference && (
                    <div className="detail-item full-width">
                      <label>Referencia Externa</label>
                      <span className="mono">{selectedItem.external_reference}</span>
                    </div>
                  )}
                </div>
              )}

              {modalType === 'create-plan' && (
                <form onSubmit={handleCreatePlan}>
                  <div className="form-group">
                    <label>Nome do Plano *</label>
                    <input
                      type="text"
                      value={planForm.reason}
                      onChange={(e) => setPlanForm({ ...planForm, reason: e.target.value })}
                      placeholder="Ex: Plano Mensal Premium"
                      required
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Valor (R$) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={planForm.auto_recurring.transaction_amount}
                        onChange={(e) =>
                          setPlanForm({
                            ...planForm,
                            auto_recurring: {
                              ...planForm.auto_recurring,
                              transaction_amount: e.target.value,
                            },
                          })
                        }
                        placeholder="99.90"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Frequencia *</label>
                      <select
                        value={planForm.auto_recurring.frequency_type}
                        onChange={(e) =>
                          setPlanForm({
                            ...planForm,
                            auto_recurring: {
                              ...planForm.auto_recurring,
                              frequency_type: e.target.value,
                            },
                          })
                        }
                      >
                        <option value="days">Diario</option>
                        <option value="months">Mensal</option>
                        <option value="years">Anual</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                      {actionLoading ? 'Criando...' : 'Criar Plano'}
                    </button>
                  </div>
                </form>
              )}

              {modalType === 'create-subscription' && (
                <form onSubmit={handleCreateSubscription}>
                  <div className="form-group">
                    <label>Plano *</label>
                    <select
                      value={subscriptionForm.preapproval_plan_id}
                      onChange={(e) =>
                        setSubscriptionForm({ ...subscriptionForm, preapproval_plan_id: e.target.value })
                      }
                      required
                    >
                      <option value="">Selecione um plano</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.reason || plan.id} - {plan.auto_recurring
                            ? formatMPCurrency(plan.auto_recurring.transaction_amount)
                            : '-'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Email do Assinante *</label>
                    <input
                      type="email"
                      value={subscriptionForm.payer_email}
                      onChange={(e) =>
                        setSubscriptionForm({ ...subscriptionForm, payer_email: e.target.value })
                      }
                      placeholder="cliente@email.com"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Referencia Externa</label>
                    <input
                      type="text"
                      value={subscriptionForm.external_reference}
                      onChange={(e) =>
                        setSubscriptionForm({ ...subscriptionForm, external_reference: e.target.value })
                      }
                      placeholder="ID no seu sistema"
                    />
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                      {actionLoading ? 'Criando...' : 'Criar Assinatura'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {modalType === 'view' && (
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MPSubscriptions
