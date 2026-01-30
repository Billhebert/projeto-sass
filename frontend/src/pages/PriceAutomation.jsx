import { useState, useEffect } from 'react'
import api from '../services/api'
import './PriceAutomation.css'

function PriceAutomation() {
  const [selectedAccount, setSelectedAccount] = useState('')
  const [accounts, setAccounts] = useState([])
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [items, setItems] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({
    totalRules: 0,
    activeRules: 0,
    itemsAffected: 0,
    lastExecution: null
  })

  const [formData, setFormData] = useState({
    name: '',
    type: 'competitor_match',
    items: [],
    conditions: {
      minPrice: '',
      maxPrice: '',
      minMargin: '',
      competitorDiff: ''
    },
    action: {
      type: 'match_lowest',
      value: '',
      adjustment: 'percentage'
    },
    schedule: {
      frequency: 'hourly',
      active: true
    }
  })

  useEffect(() => {
    fetchAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      fetchRules()
      fetchItems()
    }
  }, [selectedAccount])

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/ml-accounts')
      if (response.data.success) {
        const accountsList = response.data.data?.accounts || []
        setAccounts(accountsList)
        if (accountsList.length > 0) {
          setSelectedAccount(accountsList[0].id || accountsList[0].accountId)
        }
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const fetchRules = async () => {
    try {
      setLoading(true)
      // Simulated data - replace with actual API call
      const mockRules = [
        {
          id: 1,
          name: 'Match Concorrente - Eletronicos',
          type: 'competitor_match',
          itemsCount: 45,
          conditions: { minMargin: 10, competitorDiff: 5 },
          action: { type: 'match_lowest', adjustment: 'percentage', value: 2 },
          schedule: { frequency: 'hourly', active: true },
          lastRun: '2024-01-15T10:30:00',
          status: 'active'
        },
        {
          id: 2,
          name: 'Margem Minima - Acessorios',
          type: 'margin_protection',
          itemsCount: 120,
          conditions: { minMargin: 15 },
          action: { type: 'set_min_margin', value: 15 },
          schedule: { frequency: 'daily', active: true },
          lastRun: '2024-01-15T08:00:00',
          status: 'active'
        },
        {
          id: 3,
          name: 'Promocao Temporaria',
          type: 'time_based',
          itemsCount: 30,
          conditions: { minPrice: 50, maxPrice: 500 },
          action: { type: 'discount', adjustment: 'percentage', value: 10 },
          schedule: { frequency: 'once', active: false },
          lastRun: '2024-01-14T18:00:00',
          status: 'paused'
        }
      ]
      setRules(mockRules)
      setStats({
        totalRules: mockRules.length,
        activeRules: mockRules.filter(r => r.status === 'active').length,
        itemsAffected: mockRules.reduce((acc, r) => acc + r.itemsCount, 0),
        lastExecution: '2024-01-15T10:30:00'
      })
    } catch (error) {
      console.error('Error fetching rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchItems = async () => {
    try {
      const response = await api.get(`/items/${selectedAccount}/list?limit=100`)
      if (response.data.success) {
        setItems(response.data.data || [])
      }
    } catch (error) {
      console.error('Error fetching items:', error)
    }
  }

  const handleCreateRule = () => {
    setEditingRule(null)
    setFormData({
      name: '',
      type: 'competitor_match',
      items: [],
      conditions: { minPrice: '', maxPrice: '', minMargin: '', competitorDiff: '' },
      action: { type: 'match_lowest', value: '', adjustment: 'percentage' },
      schedule: { frequency: 'hourly', active: true }
    })
    setShowModal(true)
  }

  const handleEditRule = (rule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      type: rule.type,
      items: rule.items || [],
      conditions: rule.conditions || {},
      action: rule.action || {},
      schedule: rule.schedule || {}
    })
    setShowModal(true)
  }

  const handleSaveRule = async () => {
    try {
      if (editingRule) {
        // Update rule
        setRules(prev => prev.map(r => r.id === editingRule.id ? { ...r, ...formData } : r))
      } else {
        // Create rule
        const newRule = {
          id: Date.now(),
          ...formData,
          itemsCount: formData.items.length,
          status: 'active',
          lastRun: null
        }
        setRules(prev => [...prev, newRule])
      }
      setShowModal(false)
    } catch (error) {
      console.error('Error saving rule:', error)
    }
  }

  const handleToggleRule = (ruleId) => {
    setRules(prev => prev.map(r => {
      if (r.id === ruleId) {
        return { ...r, status: r.status === 'active' ? 'paused' : 'active' }
      }
      return r
    }))
  }

  const handleDeleteRule = (ruleId) => {
    if (window.confirm('Tem certeza que deseja excluir esta regra?')) {
      setRules(prev => prev.filter(r => r.id !== ruleId))
    }
  }

  const handleRunRule = async (ruleId) => {
    try {
      // Simulated execution
      setRules(prev => prev.map(r => {
        if (r.id === ruleId) {
          return { ...r, lastRun: new Date().toISOString() }
        }
        return r
      }))
      alert('Regra executada com sucesso!')
    } catch (error) {
      console.error('Error running rule:', error)
    }
  }

  const getRuleTypeLabel = (type) => {
    const types = {
      competitor_match: 'Match Concorrente',
      margin_protection: 'Protecao de Margem',
      time_based: 'Baseado em Tempo',
      stock_based: 'Baseado em Estoque',
      sales_based: 'Baseado em Vendas'
    }
    return types[type] || type
  }

  const getActionLabel = (action) => {
    const actions = {
      match_lowest: 'Igualar menor preco',
      set_min_margin: 'Definir margem minima',
      discount: 'Aplicar desconto',
      increase: 'Aumentar preco',
      fixed_price: 'Preco fixo'
    }
    return actions[action?.type] || action?.type
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca executada'
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const filteredItems = items.filter(item => 
    item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id?.includes(searchTerm)
  )

  return (
    <div className="price-automation-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Automacao de Precos</h1>
          <p>Crie regras automaticas para ajustar precos baseado em concorrentes, margem e outros criterios</p>
        </div>
        <div className="header-actions">
          <select 
            className="account-select"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            <option value="">Selecione uma conta</option>
            {accounts.map(account => (
              <option key={account.id || account.accountId} value={account.id || account.accountId}>
                {account.nickname || account.id || account.accountId}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={handleCreateRule} disabled={!selectedAccount}>
            <span className="material-icons">add</span>
            Nova Regra
          </button>
        </div>
      </div>

      {!selectedAccount ? (
        <div className="empty-state">
          <span className="material-icons">price_change</span>
          <h3>Selecione uma conta</h3>
          <p>Selecione uma conta do Mercado Livre para gerenciar as regras de automacao de precos</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <span className="material-icons">rule</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalRules}</span>
            <span className="stat-label">Total de Regras</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <span className="material-icons">play_circle</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.activeRules}</span>
            <span className="stat-label">Regras Ativas</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <span className="material-icons">inventory_2</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.itemsAffected}</span>
            <span className="stat-label">Produtos Afetados</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <span className="material-icons">schedule</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.lastExecution ? formatDate(stats.lastExecution) : 'N/A'}</span>
            <span className="stat-label">Ultima Execucao</span>
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="section">
        <div className="section-header">
          <h2>Regras de Precificacao</h2>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando regras...</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="empty-state">
            <span className="material-icons">price_change</span>
            <h3>Nenhuma regra criada</h3>
            <p>Crie sua primeira regra de automacao de precos</p>
            <button className="btn btn-primary" onClick={handleCreateRule}>
              <span className="material-icons">add</span>
              Criar Regra
            </button>
          </div>
        ) : (
          <div className="rules-list">
            {rules.map(rule => (
              <div key={rule.id} className={`rule-card ${rule.status}`}>
                <div className="rule-header">
                  <div className="rule-info">
                    <h3>{rule.name}</h3>
                    <span className={`rule-type ${rule.type}`}>{getRuleTypeLabel(rule.type)}</span>
                  </div>
                  <div className="rule-status">
                    <span className={`status-badge ${rule.status}`}>
                      {rule.status === 'active' ? 'Ativa' : 'Pausada'}
                    </span>
                  </div>
                </div>

                <div className="rule-details">
                  <div className="detail-item">
                    <span className="material-icons">inventory_2</span>
                    <span>{rule.itemsCount} produtos</span>
                  </div>
                  <div className="detail-item">
                    <span className="material-icons">tune</span>
                    <span>{getActionLabel(rule.action)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="material-icons">schedule</span>
                    <span>{rule.schedule?.frequency === 'hourly' ? 'A cada hora' : 
                           rule.schedule?.frequency === 'daily' ? 'Diariamente' : 'Uma vez'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="material-icons">history</span>
                    <span>{formatDate(rule.lastRun)}</span>
                  </div>
                </div>

                <div className="rule-conditions">
                  {rule.conditions?.minMargin && (
                    <span className="condition-tag">
                      Margem min: {rule.conditions.minMargin}%
                    </span>
                  )}
                  {rule.conditions?.competitorDiff && (
                    <span className="condition-tag">
                      Diff concorrente: {rule.conditions.competitorDiff}%
                    </span>
                  )}
                  {rule.conditions?.minPrice && (
                    <span className="condition-tag">
                      Preco min: R$ {rule.conditions.minPrice}
                    </span>
                  )}
                  {rule.conditions?.maxPrice && (
                    <span className="condition-tag">
                      Preco max: R$ {rule.conditions.maxPrice}
                    </span>
                  )}
                </div>

                <div className="rule-actions">
                  <button 
                    className="btn btn-icon" 
                    onClick={() => handleRunRule(rule.id)}
                    title="Executar agora"
                  >
                    <span className="material-icons">play_arrow</span>
                  </button>
                  <button 
                    className="btn btn-icon" 
                    onClick={() => handleToggleRule(rule.id)}
                    title={rule.status === 'active' ? 'Pausar' : 'Ativar'}
                  >
                    <span className="material-icons">
                      {rule.status === 'active' ? 'pause' : 'play_circle'}
                    </span>
                  </button>
                  <button 
                    className="btn btn-icon" 
                    onClick={() => handleEditRule(rule)}
                    title="Editar"
                  >
                    <span className="material-icons">edit</span>
                  </button>
                  <button 
                    className="btn btn-icon danger" 
                    onClick={() => handleDeleteRule(rule.id)}
                    title="Excluir"
                  >
                    <span className="material-icons">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingRule ? 'Editar Regra' : 'Nova Regra de Precificacao'}</h2>
              <button className="btn btn-icon" onClick={() => setShowModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-section">
                <h3>Informacoes Basicas</h3>
                <div className="form-group">
                  <label>Nome da Regra</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Match concorrente - Eletronicos"
                  />
                </div>

                <div className="form-group">
                  <label>Tipo de Regra</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="competitor_match">Match Concorrente</option>
                    <option value="margin_protection">Protecao de Margem</option>
                    <option value="time_based">Baseado em Tempo</option>
                    <option value="stock_based">Baseado em Estoque</option>
                    <option value="sales_based">Baseado em Vendas</option>
                  </select>
                </div>
              </div>

              <div className="form-section">
                <h3>Condicoes</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Preco Minimo (R$)</label>
                    <input
                      type="number"
                      value={formData.conditions.minPrice}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        conditions: { ...prev.conditions, minPrice: e.target.value }
                      }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label>Preco Maximo (R$)</label>
                    <input
                      type="number"
                      value={formData.conditions.maxPrice}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        conditions: { ...prev.conditions, maxPrice: e.target.value }
                      }))}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Margem Minima (%)</label>
                    <input
                      type="number"
                      value={formData.conditions.minMargin}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        conditions: { ...prev.conditions, minMargin: e.target.value }
                      }))}
                      placeholder="10"
                    />
                  </div>
                  <div className="form-group">
                    <label>Diferenca Concorrente (%)</label>
                    <input
                      type="number"
                      value={formData.conditions.competitorDiff}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        conditions: { ...prev.conditions, competitorDiff: e.target.value }
                      }))}
                      placeholder="5"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Acao</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Tipo de Acao</label>
                    <select
                      value={formData.action.type}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        action: { ...prev.action, type: e.target.value }
                      }))}
                    >
                      <option value="match_lowest">Igualar menor preco</option>
                      <option value="set_min_margin">Definir margem minima</option>
                      <option value="discount">Aplicar desconto</option>
                      <option value="increase">Aumentar preco</option>
                      <option value="fixed_price">Preco fixo</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Valor</label>
                    <div className="input-with-select">
                      <input
                        type="number"
                        value={formData.action.value}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          action: { ...prev.action, value: e.target.value }
                        }))}
                        placeholder="0"
                      />
                      <select
                        value={formData.action.adjustment}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          action: { ...prev.action, adjustment: e.target.value }
                        }))}
                      >
                        <option value="percentage">%</option>
                        <option value="fixed">R$</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Agendamento</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Frequencia</label>
                    <select
                      value={formData.schedule.frequency}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule, frequency: e.target.value }
                      }))}
                    >
                      <option value="hourly">A cada hora</option>
                      <option value="daily">Diariamente</option>
                      <option value="weekly">Semanalmente</option>
                      <option value="once">Executar uma vez</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        id="rule-active"
                        checked={formData.schedule.active}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          schedule: { ...prev.schedule, active: e.target.checked }
                        }))}
                      />
                      <label htmlFor="rule-active">
                        {formData.schedule.active ? 'Ativa' : 'Pausada'}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Produtos</h3>
                <div className="form-group">
                  <label>Buscar produtos</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar por titulo ou ID..."
                  />
                </div>
                <div className="items-selection">
                  {filteredItems.slice(0, 10).map(item => (
                    <div key={item.id} className="item-checkbox">
                      <input
                        type="checkbox"
                        id={`item-${item.id}`}
                        checked={formData.items.includes(item.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, items: [...prev.items, item.id] }))
                          } else {
                            setFormData(prev => ({ 
                              ...prev, 
                              items: prev.items.filter(i => i !== item.id) 
                            }))
                          }
                        }}
                      />
                      <label htmlFor={`item-${item.id}`}>
                        {item.thumbnail && (
                          <img src={item.thumbnail} alt="" className="item-thumb" />
                        )}
                        <div className="item-info">
                          <span className="item-title">{item.title?.substring(0, 60)}...</span>
                          <span className="item-id">{item.id}</span>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
                <p className="items-selected">{formData.items.length} produtos selecionados</p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleSaveRule}>
                <span className="material-icons">save</span>
                {editingRule ? 'Salvar Alteracoes' : 'Criar Regra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PriceAutomation
