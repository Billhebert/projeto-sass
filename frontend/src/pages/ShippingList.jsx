import React, { useState, useEffect, useCallback } from 'react'
import DataTable from '../components/DataTable'
import Form from '../components/Form'
import Modal from '../components/Modal'
import Filters from '../components/Filters'
import Toast from '../components/Toast'
import { shippingAPI } from '../services/api'
import { handleAPIError } from '../services/api'
import './ShippingList.css'

function ShippingList() {
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0
  })

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [selectedShipment, setSelectedShipment] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showLabelModal, setShowLabelModal] = useState(false)
  const [labelData, setLabelData] = useState(null)

  // Toast notification
  const [toast, setToast] = useState(null)

  // Form fields for shipments
  const shipmentFormFields = [
    {
      name: 'order_id',
      label: 'ID do Pedido',
      type: 'text',
      required: true,
      placeholder: '123456789'
    },
    {
      name: 'shipping_type',
      label: 'Tipo de Envio',
      type: 'select',
      required: true,
      options: [
        { value: 'standard', label: 'Padrão' },
        { value: 'express', label: 'Expresso' },
        { value: 'scheduled', label: 'Agendado' }
      ]
    },
    {
      name: 'address',
      label: 'Endereço de Entrega',
      type: 'textarea',
      required: true,
      placeholder: 'Rua, número, complemento...',
      rows: 3
    },
    {
      name: 'city',
      label: 'Cidade',
      type: 'text',
      required: true,
      placeholder: 'São Paulo'
    },
    {
      name: 'state',
      label: 'Estado',
      type: 'select',
      required: true,
      options: [
        { value: 'SP', label: 'São Paulo' },
        { value: 'RJ', label: 'Rio de Janeiro' },
        { value: 'MG', label: 'Minas Gerais' },
        { value: 'BA', label: 'Bahia' }
      ]
    },
    {
      name: 'zip_code',
      label: 'CEP',
      type: 'text',
      required: true,
      placeholder: '12345-678'
    }
  ]

  // Fetch shipments
  const fetchShipments = useCallback(async (offset = 0, filters = {}) => {
    try {
      setLoading(true)
      setError(null)
      const response = await shippingAPI.listShipments({
        limit: pagination.limit,
        offset: offset,
        ...filters
      })
      
      const data = response.data.data || []
      const total = response.data.pagination?.total || 0
      
      setShipments(Array.isArray(data) ? data : [])
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
        message: `Erro ao carregar envios: ${apiError.message}`
      })
    } finally {
      setLoading(false)
    }
  }, [pagination.limit])

  useEffect(() => {
    fetchShipments(0)
  }, [])

  // Handle pagination
  const handlePageChange = (newOffset) => {
    fetchShipments(newOffset)
  }

  // Handle sort
  const handleSort = (column, direction) => {
    console.log('Sort:', column, direction)
  }

  // Handle filter
  const handleFilter = (filters) => {
    fetchShipments(0, filters)
  }

  // Open create modal
  const handleCreateNew = () => {
    setSelectedShipment(null)
    setIsEditing(false)
    setShowModal(true)
  }

  // Edit shipment
  const handleEdit = (shipment) => {
    setSelectedShipment(shipment)
    setIsEditing(true)
    setShowModal(true)
  }

  // Generate label
  const handleGenerateLabel = async (shipment) => {
    try {
      setLoading(true)
      const response = await shippingAPI.generateLabel(shipment.id)
      setLabelData(response.data)
      setShowLabelModal(true)
      setToast({
        type: 'success',
        message: 'Etiqueta gerada com sucesso!'
      })
    } catch (err) {
      const apiError = handleAPIError(err)
      setToast({
        type: 'error',
        message: `Erro ao gerar etiqueta: ${apiError.message}`
      })
    } finally {
      setLoading(false)
    }
  }

  // Download label
  const handleDownloadLabel = () => {
    if (labelData?.label_url) {
      window.open(labelData.label_url, '_blank')
    }
  }

  // Submit form
  const handleSubmitForm = async (values) => {
    try {
      if (isEditing && selectedShipment) {
        await shippingAPI.updateShipment(selectedShipment.id, values)
        setToast({
          type: 'success',
          message: 'Envio atualizado com sucesso!'
        })
      } else {
        await shippingAPI.createShipment(values)
        setToast({
          type: 'success',
          message: 'Envio criado com sucesso!'
        })
      }
      setShowModal(false)
      fetchShipments(pagination.offset)
    } catch (err) {
      const apiError = handleAPIError(err)
      setToast({
        type: 'error',
        message: `Erro ao salvar envio: ${apiError.message}`
      })
    }
  }

  // DataTable columns
  const columns = [
    {
      key: 'id',
      label: 'ID Envio',
      width: '100px',
      render: (value) => value.substring(0, 8) + '...'
    },
    {
      key: 'order_id',
      label: 'Pedido',
      width: '100px',
      render: (value) => <strong>#{value}</strong>
    },
    {
      key: 'shipping_type',
      label: 'Tipo',
      width: '100px',
      render: (value) => getShippingTypeLabel(value)
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      render: (value) => (
        <span className={`status status-${value?.toLowerCase()}`}>
          {getStatusLabel(value)}
        </span>
      )
    },
    {
      key: 'tracking_number',
      label: 'Rastreamento',
      width: '150px',
      render: (value) => value ? <code className="tracking">{value}</code> : 'N/A'
    },
    {
      key: 'estimated_delivery',
      label: 'Entrega Estimada',
      width: '130px',
      render: (value) => value ? new Date(value).toLocaleDateString('pt-BR') : 'N/A'
    },
    {
      key: 'created_at',
      label: 'Criado em',
      width: '130px',
      render: (value) => new Date(value).toLocaleDateString('pt-BR')
    }
  ]

  const getShippingTypeLabel = (type) => {
    const labels = {
      standard: 'Padrão',
      express: 'Expresso',
      scheduled: 'Agendado'
    }
    return labels[type] || type
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendente',
      shipped: 'Enviado',
      in_transit: 'Em Trânsito',
      delivered: 'Entregue',
      cancelled: 'Cancelado',
      returned: 'Devolvido'
    }
    return labels[status] || status
  }

  return (
    <div className="shipping-list-container">
      <div className="shipping-header">
        <h1>Envios</h1>
        <button 
          className="btn btn-primary"
          onClick={handleCreateNew}
        >
          + Novo Envio
        </button>
      </div>

      {/* Filters */}
      <Filters
        filters={[
          {
            name: 'search',
            label: 'Buscar Envio',
            type: 'text',
            placeholder: 'ID ou Rastreamento...'
          },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { value: 'pending', label: 'Pendente' },
              { value: 'shipped', label: 'Enviado' },
              { value: 'delivered', label: 'Entregue' },
              { value: 'cancelled', label: 'Cancelado' }
            ]
          },
          {
            name: 'shipping_type',
            label: 'Tipo de Envio',
            type: 'select',
            options: [
              { value: 'standard', label: 'Padrão' },
              { value: 'express', label: 'Expresso' },
              { value: 'scheduled', label: 'Agendado' }
            ]
          }
        ]}
        onApply={handleFilter}
        onReset={() => fetchShipments(0)}
        loading={loading}
      />

      {/* Data Table */}
      <DataTable
        data={shipments}
        columns={columns}
        loading={loading}
        error={error}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSort={handleSort}
        onEdit={handleEdit}
        selectable={true}
        striped={true}
        hoverable={true}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? 'Editar Envio' : 'Novo Envio'}
        size="medium"
        footer={null}
      >
        <Form
          fields={shipmentFormFields}
          initialValues={selectedShipment || {}}
          onSubmit={handleSubmitForm}
          onCancel={() => setShowModal(false)}
          loading={loading}
          submitLabel={isEditing ? 'Atualizar' : 'Criar'}
        />
      </Modal>

      {/* Label Modal */}
      {labelData && (
        <Modal
          isOpen={showLabelModal}
          onClose={() => setShowLabelModal(false)}
          title="Etiqueta de Envio"
          size="medium"
          footer={
            <div className="label-actions">
              <button className="btn btn-secondary" onClick={() => setShowLabelModal(false)}>
                Fechar
              </button>
              <button className="btn btn-primary" onClick={handleDownloadLabel}>
                Baixar Etiqueta
              </button>
            </div>
          }
        >
          <div className="label-preview">
            <img 
              src={labelData.label_url} 
              alt="Etiqueta de Envio" 
              style={{ maxWidth: '100%', height: 'auto' }}
            />
            <div className="label-info">
              <p><strong>Número de Rastreamento:</strong> {labelData.tracking_number}</p>
              <p><strong>Transportadora:</strong> {labelData.carrier}</p>
              <p><strong>Tipo de Envio:</strong> {getShippingTypeLabel(labelData.shipping_type)}</p>
            </div>
          </div>
        </Modal>
      )}

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

export default ShippingList
