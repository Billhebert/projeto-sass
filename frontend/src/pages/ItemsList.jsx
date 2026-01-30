import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../components/DataTable'
import Form from '../components/Form'
import Modal from '../components/Modal'
import Filters from '../components/Filters'
import Toast from '../components/Toast'
import { itemsAPI } from '../services/api'
import { handleAPIError } from '../services/api'
import './ItemsList.css'

function ItemsList() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0
  })

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  // Toast notification
  const [toast, setToast] = useState(null)

  // Form fields for items
  const itemFormFields = [
    {
      name: 'title',
      label: 'Título do Produto',
      type: 'text',
      required: true,
      placeholder: 'Exemplo: Camiseta Azul',
      minLength: 5,
      maxLength: 255
    },
    {
      name: 'category_id',
      label: 'Categoria',
      type: 'select',
      required: true,
      placeholder: 'Selecione a categoria',
      options: [
        { value: 'MLB1144', label: 'Camisetas' },
        { value: 'MLB1145', label: 'Calças' },
        { value: 'MLB1146', label: 'Sapatos' },
      ]
    },
    {
      name: 'price',
      label: 'Preço (R$)',
      type: 'number',
      required: true,
      min: 0.01,
      placeholder: '0.00'
    },
    {
      name: 'stock',
      label: 'Quantidade em Estoque',
      type: 'number',
      required: true,
      min: 0,
      placeholder: '0'
    },
    {
      name: 'description',
      label: 'Descrição',
      type: 'textarea',
      required: false,
      placeholder: 'Descreva os detalhes do produto...',
      rows: 4
    },
    {
      name: 'condition',
      label: 'Condição',
      type: 'select',
      required: true,
      options: [
        { value: 'new', label: 'Novo' },
        { value: 'used', label: 'Usado' }
      ]
    }
  ]

  // Fetch items
  const fetchItems = useCallback(async (offset = 0) => {
    try {
      setLoading(true)
      setError(null)
      const response = await itemsAPI.getItems({
        limit: pagination.limit,
        offset: offset,
        sort: 'created_desc'
      })
      
      const data = response.data.data || []
      const total = response.data.pagination?.total || 0
      
      setItems(Array.isArray(data) ? data : [])
      setPagination(prev => ({
        ...prev,
        offset: offset,
        total: total
      }))
    } catch (err) {
      const apiError = handleAPIError(err)
      setError(apiError.message)
      setToast({
        type: 'error',
        message: `Erro ao carregar itens: ${apiError.message}`
      })
    } finally {
      setLoading(false)
    }
  }, [pagination.limit])

  useEffect(() => {
    fetchItems(0)
  }, [])

  // Handle pagination
  const handlePageChange = (newOffset) => {
    fetchItems(newOffset)
  }

  // Handle sort
  const handleSort = (column, direction) => {
    fetchItems(0)
  }

  // Handle filter
  const handleFilter = (filters) => {
    fetchItems(0)
  }

  // Open create modal
  const handleCreateNew = () => {
    setSelectedItem(null)
    setIsEditing(false)
    setShowModal(true)
  }

  // Edit item
  const handleEdit = (item) => {
    setSelectedItem(item)
    setIsEditing(true)
    setShowModal(true)
  }

  // Delete item
  const handleDelete = async (item) => {
    try {
      await itemsAPI.deleteItem(item.id)
      setToast({
        type: 'success',
        message: 'Produto deletado com sucesso!'
      })
      fetchItems(pagination.offset)
    } catch (err) {
      const apiError = handleAPIError(err)
      setToast({
        type: 'error',
        message: `Erro ao deletar produto: ${apiError.message}`
      })
    }
  }

  // Submit form
  const handleSubmitForm = async (values) => {
    try {
      if (isEditing && selectedItem) {
        await itemsAPI.updateItem(selectedItem.id, values)
        setToast({
          type: 'success',
          message: 'Produto atualizado com sucesso!'
        })
      } else {
        await itemsAPI.createItem(values)
        setToast({
          type: 'success',
          message: 'Produto criado com sucesso!'
        })
      }
      setShowModal(false)
      fetchItems(pagination.offset)
    } catch (err) {
      const apiError = handleAPIError(err)
      setToast({
        type: 'error',
        message: `Erro ao salvar produto: ${apiError.message}`
      })
    }
  }

  // DataTable columns
  const columns = [
    {
      key: 'id',
      label: 'ID',
      width: '80px',
      render: (value) => value.substring(0, 8) + '...'
    },
    {
      key: 'title',
      label: 'Título',
      sortable: true,
      render: (value, row) => (
        <div className="item-title">
          <strong>{value}</strong>
        </div>
      )
    },
    {
      key: 'category_id',
      label: 'Categoria',
      width: '120px'
    },
    {
      key: 'price',
      label: 'Preço',
      width: '100px',
      render: (value) => `R$ ${parseFloat(value).toFixed(2)}`
    },
    {
      key: 'stock',
      label: 'Estoque',
      width: '80px',
      render: (value) => (
        <span className={value > 0 ? 'stock-ok' : 'stock-low'}>
          {value} un.
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      width: '100px',
      render: (value) => (
        <span className={`status status-${value?.toLowerCase()}`}>
          {value || 'Ativo'}
        </span>
      )
    }
  ]

  return (
    <div className="items-list-container">
      <div className="items-header">
        <h1>Produtos</h1>
        <button 
          className="btn btn-primary"
          onClick={handleCreateNew}
        >
          + Novo Produto
        </button>
      </div>

      {/* Filters */}
      <Filters
        filters={[
          {
            name: 'search',
            label: 'Buscar Produto',
            type: 'text',
            placeholder: 'Digite o título...'
          },
          {
            name: 'category',
            label: 'Categoria',
            type: 'select',
            options: [
              { value: 'MLB1144', label: 'Camisetas' },
              { value: 'MLB1145', label: 'Calças' },
              { value: 'MLB1146', label: 'Sapatos' }
            ]
          },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { value: 'active', label: 'Ativo' },
              { value: 'paused', label: 'Pausado' }
            ]
          },
          {
            name: 'priceRange',
            label: 'Faixa de Preço (Máx)',
            type: 'number',
            placeholder: '1000.00'
          }
        ]}
        onApply={handleFilter}
        onReset={() => fetchItems(0)}
        loading={loading}
      />

      {/* Data Table */}
      <DataTable
        data={items}
        columns={columns}
        loading={loading}
        error={error}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSort={handleSort}
        onEdit={handleEdit}
        onDelete={handleDelete}
        selectable={true}
        striped={true}
        hoverable={true}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? 'Editar Produto' : 'Novo Produto'}
        size="medium"
        footer={null}
      >
        <Form
          fields={itemFormFields}
          initialValues={selectedItem || {}}
          onSubmit={handleSubmitForm}
          onCancel={() => setShowModal(false)}
          loading={loading}
          submitLabel={isEditing ? 'Atualizar' : 'Criar'}
        />
      </Modal>

      {/* Toast Notifications */}
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

export default ItemsList
