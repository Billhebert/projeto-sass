import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import './ItemEdit.css'

function ItemEdit() {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [item, setItem] = useState(null)

  const [formData, setFormData] = useState({
    title: '',
    price: '',
    availableQuantity: 1,
    description: '',
    pictures: []
  })

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccount && itemId) {
      loadItem()
    }
  }, [selectedAccount, itemId])

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

  const loadItem = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/items/${selectedAccount}/${itemId}`)
      const itemData = response.data.item
      setItem(itemData)
      setFormData({
        title: itemData.title || '',
        price: itemData.price || '',
        availableQuantity: itemData.availableQuantity || 1,
        description: itemData.description?.plain_text || '',
        pictures: itemData.pictures || []
      })
    } catch (err) {
      setError('Erro ao carregar anuncio')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePictureAdd = () => {
    const url = prompt('URL da imagem:')
    if (url) {
      setFormData(prev => ({
        ...prev,
        pictures: [...prev.pictures, { source: url }]
      }))
    }
  }

  const handlePictureRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      pictures: prev.pictures.filter((_, i) => i !== index)
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      await api.put(`/items/${selectedAccount}/${itemId}`, {
        title: formData.title,
        price: parseFloat(formData.price),
        available_quantity: parseInt(formData.availableQuantity)
      })

      setSuccess('Anuncio atualizado com sucesso!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atualizar anuncio')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateDescription = async () => {
    setSaving(true)
    setError(null)

    try {
      await api.put(`/items/${selectedAccount}/${itemId}/description`, {
        plain_text: formData.description
      })

      setSuccess('Descricao atualizada!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atualizar descricao')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePictures = async () => {
    setSaving(true)
    setError(null)

    try {
      await api.put(`/items/${selectedAccount}/${itemId}/pictures`, {
        pictures: formData.pictures
      })

      setSuccess('Imagens atualizadas!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atualizar imagens')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (status) => {
    try {
      await api.put(`/items/${selectedAccount}/${itemId}/status`, { status })
      await loadItem()
      setSuccess(`Status alterado para ${status}`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Erro ao alterar status')
    }
  }

  const formatCurrency = (value, currency = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(value)
  }

  if (loading) {
    return (
      <div className="item-edit-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Carregando anuncio...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="item-edit-page">
      <div className="page-header">
        <div className="header-content">
          <button className="btn-back" onClick={() => navigate('/items')}>
            <span className="material-icons">arrow_back</span>
          </button>
          <div>
            <h1>Editar Anuncio</h1>
            <p>MLB{itemId}</p>
          </div>
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
          
          <a
            href={item?.permalink || `https://produto.mercadolivre.com.br/MLB-${itemId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            <span className="material-icons">open_in_new</span>
            Ver no ML
          </a>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span className="material-icons">check_circle</span>
          {success}
        </div>
      )}

      {item && (
        <div className="item-status-bar">
          <div className="status-info">
            <span className={`badge badge-${item.status === 'active' ? 'success' : item.status === 'paused' ? 'warning' : 'secondary'}`}>
              {item.status}
            </span>
            <span className="item-stats">
              <span className="material-icons">visibility</span>
              {item.visits || 0} visitas
            </span>
            <span className="item-stats">
              <span className="material-icons">shopping_cart</span>
              {item.soldQuantity || 0} vendidos
            </span>
          </div>
          <div className="status-actions">
            {item.status === 'active' && (
              <button
                className="btn btn-sm btn-warning"
                onClick={() => handleStatusChange('paused')}
              >
                <span className="material-icons">pause</span>
                Pausar
              </button>
            )}
            {item.status === 'paused' && (
              <button
                className="btn btn-sm btn-success"
                onClick={() => handleStatusChange('active')}
              >
                <span className="material-icons">play_arrow</span>
                Ativar
              </button>
            )}
            {item.status === 'closed' && (
              <button
                className="btn btn-sm btn-primary"
                onClick={async () => {
                  try {
                    await api.post(`/items/${selectedAccount}/${itemId}/relist`)
                    await loadItem()
                    setSuccess('Anuncio republicado!')
                  } catch (err) {
                    setError('Erro ao republicar')
                  }
                }}
              >
                <span className="material-icons">refresh</span>
                Republicar
              </button>
            )}
          </div>
        </div>
      )}

      <div className="edit-sections">
        <div className="edit-section">
          <div className="section-header">
            <h2>
              <span className="material-icons">info</span>
              Informacoes Basicas
            </h2>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>

          <div className="form-group">
            <label>Titulo</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              maxLength={60}
            />
            <span className="char-count">{formData.title.length}/60</span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Preco</label>
              <div className="input-with-prefix">
                <span className="prefix">R$</span>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="1"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Quantidade Disponivel</label>
              <input
                type="number"
                name="availableQuantity"
                value={formData.availableQuantity}
                onChange={handleInputChange}
                min="0"
              />
            </div>
          </div>
        </div>

        <div className="edit-section">
          <div className="section-header">
            <h2>
              <span className="material-icons">image</span>
              Imagens
            </h2>
            <button
              className="btn btn-primary"
              onClick={handleUpdatePictures}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Atualizar Imagens'}
            </button>
          </div>

          <div className="pictures-grid">
            {formData.pictures.map((pic, index) => (
              <div key={index} className="picture-item">
                <img src={pic.source || pic.url || pic.secure_url} alt={`Imagem ${index + 1}`} />
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => handlePictureRemove(index)}
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
            ))}
            <button
              type="button"
              className="picture-add"
              onClick={handlePictureAdd}
            >
              <span className="material-icons">add_photo_alternate</span>
              <span>Adicionar</span>
            </button>
          </div>
        </div>

        <div className="edit-section">
          <div className="section-header">
            <h2>
              <span className="material-icons">description</span>
              Descricao
            </h2>
            <button
              className="btn btn-primary"
              onClick={handleUpdateDescription}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Atualizar Descricao'}
            </button>
          </div>

          <div className="form-group">
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={8}
              placeholder="Descricao do produto..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ItemEdit
