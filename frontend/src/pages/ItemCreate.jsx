import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import './ItemCreate.css'

function ItemCreate() {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [categoryAttributes, setCategoryAttributes] = useState([])
  const [listingTypes, setListingTypes] = useState([])
  const [searchCategory, setSearchCategory] = useState('')
  const [predictedCategory, setPredictedCategory] = useState(null)

  const [formData, setFormData] = useState({
    title: '',
    categoryId: '',
    price: '',
    currencyId: 'BRL',
    availableQuantity: 1,
    buyingMode: 'buy_it_now',
    condition: 'new',
    listingTypeId: 'gold_special',
    description: '',
    pictures: [],
    attributes: {}
  })

  useEffect(() => {
    loadAccounts()
    loadListingTypes()
  }, [])

  useEffect(() => {
    if (formData.title.length > 10) {
      predictCategory(formData.title)
    }
  }, [formData.title])

  useEffect(() => {
    if (formData.categoryId) {
      loadCategoryAttributes(formData.categoryId)
    }
  }, [formData.categoryId])

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

  const loadListingTypes = async () => {
    try {
      const response = await api.get('/catalog/listing-types')
      setListingTypes(response.data.data || response.data.listingTypes || [])
    } catch (err) {
      console.error('Erro ao carregar tipos de listagem:', err)
      // Fallback listing types for ML Brazil
      setListingTypes([
        { id: 'gold_special', name: 'Classico' },
        { id: 'gold_pro', name: 'Premium' },
        { id: 'gold', name: 'Ouro' },
        { id: 'silver', name: 'Prata' },
        { id: 'bronze', name: 'Bronze' },
        { id: 'free', name: 'Gratis' }
      ])
    }
  }

  const searchCategories = async () => {
    if (!searchCategory.trim()) return
    try {
      const response = await api.get(`/catalog/search?q=${encodeURIComponent(searchCategory)}`)
      setCategories(response.data.results || [])
    } catch (err) {
      setError('Erro ao buscar categorias')
    }
  }

  const predictCategory = async (title) => {
    try {
      const response = await api.get(`/catalog/predict?title=${encodeURIComponent(title)}`)
      setPredictedCategory(response.data.category)
    } catch (err) {
      console.error('Erro ao prever categoria:', err)
    }
  }

  const loadCategoryAttributes = async (categoryId) => {
    try {
      const response = await api.get(`/catalog/categories/${categoryId}/attributes`)
      setCategoryAttributes(response.data.attributes || [])
    } catch (err) {
      console.error('Erro ao carregar atributos:', err)
    }
  }

  const selectCategory = (category) => {
    setSelectedCategory(category)
    setFormData(prev => ({ ...prev, categoryId: category.id }))
    setCategories([])
    setSearchCategory('')
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAttributeChange = (attrId, value) => {
    setFormData(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [attrId]: value
      }
    }))
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedAccount) {
      setError('Selecione uma conta')
      return
    }

    if (!formData.categoryId) {
      setError('Selecione uma categoria')
      return
    }

    if (formData.pictures.length === 0) {
      setError('Adicione pelo menos uma imagem')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const itemData = {
        title: formData.title,
        category_id: formData.categoryId,
        price: parseFloat(formData.price),
        currency_id: formData.currencyId,
        available_quantity: parseInt(formData.availableQuantity),
        buying_mode: formData.buyingMode,
        condition: formData.condition,
        listing_type_id: formData.listingTypeId,
        description: { plain_text: formData.description },
        pictures: formData.pictures,
        attributes: Object.entries(formData.attributes).map(([id, value]) => ({
          id,
          value_name: value
        }))
      }

      const response = await api.post(`/items/${selectedAccount}`, itemData)
      
      setSuccess('Anuncio criado com sucesso!')
      setTimeout(() => {
        navigate('/items')
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar anuncio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="item-create-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">add_box</span>
            Criar Anuncio
          </h1>
          <p>Publique um novo produto no Mercado Livre</p>
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

      <form onSubmit={handleSubmit} className="item-form">
        <div className="form-section">
          <h2>
            <span className="material-icons">info</span>
            Informacoes Basicas
          </h2>

          <div className="form-group">
            <label>Titulo do Anuncio *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Ex: Smartphone Samsung Galaxy S21 128GB"
              maxLength={60}
              required
            />
            <span className="char-count">{formData.title.length}/60</span>
          </div>

          {predictedCategory && !formData.categoryId && (
            <div className="predicted-category">
              <span className="material-icons">lightbulb</span>
              <span>Categoria sugerida: </span>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => selectCategory(predictedCategory)}
              >
                {predictedCategory.name}
              </button>
            </div>
          )}

          <div className="form-group">
            <label>Categoria *</label>
            {selectedCategory ? (
              <div className="selected-category">
                <span>{selectedCategory.name}</span>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => {
                    setSelectedCategory(null)
                    setFormData(prev => ({ ...prev, categoryId: '' }))
                  }}
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
            ) : (
              <div className="category-search">
                <input
                  type="text"
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  placeholder="Buscar categoria..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchCategories())}
                />
                <button type="button" onClick={searchCategories} className="btn btn-secondary">
                  <span className="material-icons">search</span>
                </button>
              </div>
            )}
            {categories.length > 0 && (
              <div className="category-results">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    className="category-item"
                    onClick={() => selectCategory(cat)}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Preco *</label>
              <div className="input-with-prefix">
                <span className="prefix">R$</span>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="0,00"
                  step="0.01"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Quantidade *</label>
              <input
                type="number"
                name="availableQuantity"
                value={formData.availableQuantity}
                onChange={handleInputChange}
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label>Condicao *</label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleInputChange}
              >
                <option value="new">Novo</option>
                <option value="used">Usado</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Tipo de Listagem</label>
            <select
              name="listingTypeId"
              value={formData.listingTypeId}
              onChange={handleInputChange}
            >
              {listingTypes.map(lt => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
              {listingTypes.length === 0 && (
                <>
                  <option value="gold_special">Classico</option>
                  <option value="gold_pro">Premium</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div className="form-section">
          <h2>
            <span className="material-icons">image</span>
            Imagens
          </h2>

          <div className="pictures-grid">
            {formData.pictures.map((pic, index) => (
              <div key={index} className="picture-item">
                <img src={pic.source} alt={`Imagem ${index + 1}`} />
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
              <span>Adicionar Imagem</span>
            </button>
          </div>
          <p className="form-help">Adicione URLs de imagens do produto (minimo 1)</p>
        </div>

        <div className="form-section">
          <h2>
            <span className="material-icons">description</span>
            Descricao
          </h2>

          <div className="form-group">
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Descreva seu produto em detalhes..."
              rows={6}
            />
          </div>
        </div>

        {categoryAttributes.length > 0 && (
          <div className="form-section">
            <h2>
              <span className="material-icons">tune</span>
              Atributos da Categoria
            </h2>

            <div className="attributes-grid">
              {categoryAttributes.filter(attr => attr.tags?.required).map(attr => (
                <div key={attr.id} className="form-group">
                  <label>
                    {attr.name}
                    {attr.tags?.required && <span className="required">*</span>}
                  </label>
                  {attr.values?.length > 0 ? (
                    <select
                      value={formData.attributes[attr.id] || ''}
                      onChange={(e) => handleAttributeChange(attr.id, e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {attr.values.map(val => (
                        <option key={val.id} value={val.name}>
                          {val.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.attributes[attr.id] || ''}
                      onChange={(e) => handleAttributeChange(attr.id, e.target.value)}
                      placeholder={attr.hint || ''}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/items')}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner small"></div>
                Publicando...
              </>
            ) : (
              <>
                <span className="material-icons">publish</span>
                Publicar Anuncio
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ItemCreate
