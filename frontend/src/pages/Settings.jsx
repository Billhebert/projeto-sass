import { useState, useEffect } from 'react'
import { useAuth } from '../store/authStore'
import api from '../services/api'
import './Pages.css'

function Settings() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  })

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Preferences state
  const [preferences, setPreferences] = useState({
    language: 'pt-BR',
    theme: 'light',
    notifications: true,
    emailNotifications: true,
  })

  // API Keys state
  const [apiKeys, setApiKeys] = useState([])
  const [showNewKeyModal, setShowNewKeyModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')

  useEffect(() => {
    // Load preferences from localStorage
    const savedPreferences = localStorage.getItem('preferences')
    if (savedPreferences) {
      setPreferences(JSON.parse(savedPreferences))
    }
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    try {
      // Mock API keys - in production, fetch from backend
      setApiKeys([
        {
          id: '1',
          name: 'Production Key',
          key: 'sk_live_' + '*'.repeat(20),
          created: '2024-01-15',
          lastUsed: '2024-01-28',
        },
        {
          id: '2',
          name: 'Development Key',
          key: 'sk_test_' + '*'.repeat(20),
          created: '2024-01-10',
          lastUsed: '2024-01-25',
        },
      ])
    } catch (err) {
      console.error('Error loading API keys:', err)
    }
  }

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePreferenceChange = (key) => {
    setPreferences(prev => {
      const updated = {
        ...prev,
        [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key],
      }
      localStorage.setItem('preferences', JSON.stringify(updated))
      return updated
    })
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError('')
      
      // In production, this would call your backend API
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setSuccess('Perfil atualizado com sucesso!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Erro ao atualizar perfil')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('As senhas não conferem')
      return
    }

    if (passwordData.newPassword.length < 8) {
      setError('A nova senha deve ter no mínimo 8 caracteres')
      return
    }

    try {
      setLoading(true)
      setError('')

      // In production, this would call your backend API
      await new Promise(resolve => setTimeout(resolve, 500))

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setSuccess('Senha alterada com sucesso!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao alterar senha')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateApiKey = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError('')

      // In production, this would call your backend API
      await new Promise(resolve => setTimeout(resolve, 500))

      const newKey = {
        id: Date.now().toString(),
        name: newKeyName,
        key: 'sk_live_' + Math.random().toString(36).substring(2, 22),
        created: new Date().toISOString().split('T')[0],
        lastUsed: 'Nunca',
      }

      setApiKeys([...apiKeys, newKey])
      setNewKeyName('')
      setShowNewKeyModal(false)
      setSuccess('Chave de API criada com sucesso!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Erro ao criar chave de API')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteApiKey = async (keyId) => {
    if (!window.confirm('Tem certeza que deseja deletar esta chave? Ela não poderá mais ser usada.')) {
      return
    }

    try {
      setError('')
      setApiKeys(apiKeys.filter(key => key.id !== keyId))
      setSuccess('Chave de API deletada com sucesso!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Erro ao deletar chave de API')
    }
  }

  const handleLogout = () => {
    if (window.confirm('Tem certeza que deseja fazer logout?')) {
      logout()
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Configurações</h1>
        <p>Gerencie sua conta e preferências</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="settings-container">
        {/* Sidebar Navigation */}
        <div className="settings-sidebar">
          <button
            className={`settings-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Meu Perfil
          </button>
          <button
            className={`settings-nav-item ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            Alterar Senha
          </button>
          <button
            className={`settings-nav-item ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            Preferências
          </button>
          <button
            className={`settings-nav-item ${activeTab === 'api-keys' ? 'active' : ''}`}
            onClick={() => setActiveTab('api-keys')}
          >
            Chaves de API
          </button>
          <hr style={{ margin: '1rem 0', border: 'none', borderTop: '1px solid #e0e0e0' }} />
          <button
            className="settings-nav-item"
            onClick={handleLogout}
            style={{ color: '#dc3545' }}
          >
            Fazer Logout
          </button>
        </div>

        {/* Main Content */}
        <div className="settings-content">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="settings-section">
              <h3>Informações do Perfil</h3>
              <form onSubmit={handleProfileSubmit} className="settings-form">
                <div className="form-group">
                  <label>Nome Completo</label>
                  <input
                    type="text"
                    name="name"
                    value={profileData.name}
                    onChange={handleProfileChange}
                    placeholder="Seu nome completo"
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleProfileChange}
                    placeholder="seu@email.com"
                  />
                </div>

                <div className="form-group">
                  <label>Data de Cadastro</label>
                  <input
                    type="text"
                    value={new Date(user?.createdAt).toLocaleDateString('pt-BR')}
                    disabled
                    style={{ backgroundColor: '#f5f5f5' }}
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </form>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <div className="settings-section">
              <h3>Alterar Senha</h3>
              <p style={{ color: '#666', marginBottom: '1.5rem' }}>
                Escolha uma senha forte com no mínimo 8 caracteres
              </p>
              <form onSubmit={handlePasswordSubmit} className="settings-form">
                <div className="form-group">
                  <label>Senha Atual</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Digite sua senha atual"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Nova Senha</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Digite a nova senha"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Confirmar Senha</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirme a nova senha"
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Atualizando...' : 'Atualizar Senha'}
                </button>
              </form>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="settings-section">
              <h3>Preferências</h3>
              <div className="preference-item">
                <div>
                  <h4>Idioma</h4>
                  <p style={{ color: '#999', marginTop: '0.5rem' }}>Escolha seu idioma preferido</p>
                </div>
                <select
                  value={preferences.language}
                  onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                  style={{ width: '150px' }}
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español</option>
                </select>
              </div>

              <div className="preference-item">
                <div>
                  <h4>Tema</h4>
                  <p style={{ color: '#999', marginTop: '0.5rem' }}>Escolha entre tema claro ou escuro</p>
                </div>
                <select
                  value={preferences.theme}
                  onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
                  style={{ width: '150px' }}
                >
                  <option value="light">Claro</option>
                  <option value="dark">Escuro</option>
                  <option value="auto">Automático</option>
                </select>
              </div>

              <div className="preference-item">
                <div>
                  <h4>Notificações no Dashboard</h4>
                  <p style={{ color: '#999', marginTop: '0.5rem' }}>Receba alertas sobre suas contas</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.notifications}
                    onChange={() => handlePreferenceChange('notifications')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="preference-item">
                <div>
                  <h4>Notificações por Email</h4>
                  <p style={{ color: '#999', marginTop: '0.5rem' }}>Receba atualizações importantes por email</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.emailNotifications}
                    onChange={() => handlePreferenceChange('emailNotifications')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === 'api-keys' && (
            <div className="settings-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Chaves de API</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowNewKeyModal(true)}>
                  + Gerar Nova Chave
                </button>
              </div>

              <div className="api-keys-list">
                {apiKeys.map(key => (
                  <div key={key.id} className="api-key-item">
                    <div className="api-key-info">
                      <h4>{key.name}</h4>
                      <p className="api-key-value">{key.key}</p>
                      <div className="api-key-meta">
                        <span>Criada em: {key.created}</span>
                        <span>Último uso: {key.lastUsed}</span>
                      </div>
                    </div>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteApiKey(key.id)}
                    >
                      Deletar
                    </button>
                  </div>
                ))}
              </div>

              {apiKeys.length === 0 && (
                <div className="empty-state">
                  <p>Nenhuma chave de API criada</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal for New API Key */}
      {showNewKeyModal && (
        <div className="modal-overlay" onClick={() => setShowNewKeyModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Gerar Nova Chave de API</h2>
              <button className="modal-close" onClick={() => setShowNewKeyModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateApiKey} className="modal-form">
              <div className="form-group">
                <label htmlFor="keyName">Nome da Chave</label>
                <input
                  type="text"
                  id="keyName"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Ex: Production Key"
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowNewKeyModal(false)}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Gerando...' : 'Gerar Chave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
