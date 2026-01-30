import React, { useState, useEffect, useCallback } from 'react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import { categoriesAPI } from '../services/api'
import { handleAPIError } from '../services/api'
import './CategoriesList.css'

function CategoriesList() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0
  })

  const [showModal, setShowModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [attributes, setAttributes] = useState([])
  const [toast, setToast] = useState(null)

  const fetchCategories = useCallback(async (offset = 0) => {
    try {
      setLoading(true)
      setError(null)
      const response = await categoriesAPI.getListingTypes('MLB')
      
      const data = response.data.data || response.data.listing_types || []
      
      setCategories(Array.isArray(data) ? data : [])
      setPagination(prev => ({
        ...prev,
        offset: 0,
        total: Array.isArray(data) ? data.length : 0
      }))
    } catch (err) {
      const apiError = handleAPIError(err)
      setError(apiError.message)
      setToast({
        type: 'error',
        message: 'Erro ao carregar categorias: ' + apiError.message
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories(0)
  }, [])

  const handlePageChange = (newOffset) => {
    fetchCategories(newOffset)
  }

  const handleSort = (column, direction) => {
    console.log('Sort:', column, direction)
  }

  const handleViewDetails = async (category) => {
    try {
      setLoading(true)
      const response = await categoriesAPI.getCategoryAttributes(category.id)
      setAttributes(response.data.data || response.data.attributes || [])
      setSelectedCategory(category)
      setShowModal(true)
    } catch (err) {
      const apiError = handleAPIError(err)
      setToast({
        type: 'error',
        message: 'Erro ao carregar atributos: ' + apiError.message
      })
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      key: 'id',
      label: 'ID',
      width: '100px',
      render: (value) => value
    },
    {
      key: 'name',
      label: 'Nome',
      sortable: true,
      render: (value) => <strong>{value}</strong>
    },
    {
      key: 'picture_url',
      label: 'Imagem',
      width: '80px',
      render: (value) => value ? <img src={value} alt="Category" style={{maxWidth: '50px', height: 'auto'}} /> : 'N/A'
    },
    {
      key: 'listing_types',
      label: 'Tipos de Anúncios',
      render: (value) => Array.isArray(value) ? value.join(', ') : 'N/A'
    }
  ]

  return (
    <div className="categories-list-container">
      <div className="categories-header">
        <h1>Categorias de Produtos</h1>
        <p>Explore as categorias disponíveis e seus atributos</p>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      <DataTable
        data={categories}
        columns={columns}
        loading={loading}
        error={error}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSort={handleSort}
        onRowClick={handleViewDetails}
        striped={true}
        hoverable={true}
      />

      {selectedCategory && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={selectedCategory.name}
          size="large"
        >
          <div className="category-details">
            <div className="details-section">
              <h3>ID da Categoria</h3>
              <p>{selectedCategory.id}</p>
            </div>

            {selectedCategory.picture_url && (
              <div className="details-section">
                <h3>Imagem</h3>
                <img src={selectedCategory.picture_url} alt={selectedCategory.name} style={{maxWidth: '200px'}} />
              </div>
            )}

            <div className="details-section">
              <h3>Atributos ({attributes.length})</h3>
              {attributes.length > 0 ? (
                <div className="attributes-grid">
                  {attributes.map((attr, idx) => (
                    <div key={idx} className="attribute-item">
                      <div className="attribute-name">{attr.name}</div>
                      <div className="attribute-type">{attr.type}</div>
                      {attr.required && <div className="attribute-required">Obrigatório</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <p>Nenhum atributo disponível</p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default CategoriesList
