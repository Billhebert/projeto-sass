import React, { useState, useEffect, useCallback } from 'react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Filters from '../components/Filters'
import Toast from '../components/Toast'
import { ordersAPI } from '../services/api'
import { handleAPIError } from '../services/api'
import './OrdersList.css'

function OrdersList() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0
  })

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)

  // Toast notification
  const [toast, setToast] = useState(null)

  // Fetch orders
  const fetchOrders = useCallback(async (offset = 0, filters = {}) => {
    try {
      setLoading(true)
      setError(null)
      const response = await ordersAPI.searchOrders({
        limit: pagination.limit,
        offset: offset,
        ...filters
      })
      
      const data = response.data.data || []
      const total = response.data.pagination?.total || 0
      
      setOrders(Array.isArray(data) ? data : [])
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
        message: `Erro ao carregar pedidos: ${apiError.message}`
      })
    } finally {
      setLoading(false)
    }
  }, [pagination.limit])

  useEffect(() => {
    fetchOrders(0)
  }, [])

  // Handle pagination
  const handlePageChange = (newOffset) => {
    fetchOrders(newOffset)
  }

  // Handle sort
  const handleSort = (column, direction) => {
    console.log('Sort:', column, direction)
  }

  // Handle filter
  const handleFilter = (filters) => {
    fetchOrders(0, filters)
  }

  // View order details
  const handleViewDetails = (order) => {
    setSelectedOrder(order)
    setShowModal(true)
  }

  // DataTable columns
  const columns = [
    {
      key: 'id',
      label: 'ID Pedido',
      width: '100px',
      sortable: true,
      render: (value) => (
        <strong className="order-id">#{value}</strong>
      )
    },
    {
      key: 'buyer_name',
      label: 'Comprador',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="buyer-name">{value}</div>
          <small className="buyer-email">{row.buyer_email}</small>
        </div>
      )
    },
    {
      key: 'total_amount',
      label: 'Total',
      width: '120px',
      render: (value) => `R$ ${parseFloat(value).toFixed(2)}`
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
      key: 'payment_status',
      label: 'Pagamento',
      width: '120px',
      render: (value) => (
        <span className={`payment-status payment-${value?.toLowerCase()}`}>
          {getPaymentLabel(value)}
        </span>
      )
    },
    {
      key: 'shipping_status',
      label: 'Envio',
      width: '120px',
      render: (value) => (
        <span className={`shipping-status shipping-${value?.toLowerCase()}`}>
          {getShippingLabel(value)}
        </span>
      )
    },
    {
      key: 'date_created',
      label: 'Data',
      width: '120px',
      render: (value) => new Date(value).toLocaleDateString('pt-BR')
    }
  ]

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendente',
      paid: 'Pago',
      cancelled: 'Cancelado',
      completed: 'Completo'
    }
    return labels[status] || status
  }

  const getPaymentLabel = (status) => {
    const labels = {
      pending: 'Aguardando',
      paid: 'Pago',
      failed: 'Falha'
    }
    return labels[status] || status
  }

  const getShippingLabel = (status) => {
    const labels = {
      not_yet_shipped: 'Não Enviado',
      shipped: 'Enviado',
      delivered: 'Entregue',
      cancelled: 'Cancelado'
    }
    return labels[status] || status
  }

  return (
    <div className="orders-list-container">
      <div className="orders-header">
        <h1>Pedidos</h1>
        <div className="orders-stats">
          <div className="stat-card">
            <div className="stat-value">{orders.length}</div>
            <div className="stat-label">Pedidos Visíveis</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {orders.filter(o => o.status === 'pending').length}
            </div>
            <div className="stat-label">Pendentes</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              R$ {orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0).toFixed(2)}
            </div>
            <div className="stat-label">Total em Vendas</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Filters
        filters={[
          {
            name: 'search',
            label: 'Buscar Pedido',
            type: 'text',
            placeholder: 'ID ou nome do comprador...'
          },
          {
            name: 'status',
            label: 'Status do Pedido',
            type: 'select',
            options: [
              { value: 'pending', label: 'Pendente' },
              { value: 'paid', label: 'Pago' },
              { value: 'cancelled', label: 'Cancelado' }
            ]
          },
          {
            name: 'payment_status',
            label: 'Status de Pagamento',
            type: 'select',
            options: [
              { value: 'pending', label: 'Aguardando' },
              { value: 'paid', label: 'Pago' },
              { value: 'failed', label: 'Falha' }
            ]
          },
          {
            name: 'shipping_status',
            label: 'Status de Envio',
            type: 'select',
            options: [
              { value: 'not_yet_shipped', label: 'Não Enviado' },
              { value: 'shipped', label: 'Enviado' },
              { value: 'delivered', label: 'Entregue' }
            ]
          }
        ]}
        onApply={handleFilter}
        onReset={() => fetchOrders(0)}
        loading={loading}
      />

      {/* Data Table */}
      <DataTable
        data={orders}
        columns={columns}
        loading={loading}
        error={error}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSort={handleSort}
        onRowClick={handleViewDetails}
        selectable={true}
        striped={true}
        hoverable={true}
      />

      {/* Order Details Modal */}
      {selectedOrder && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={`Pedido #${selectedOrder.id}`}
          size="large"
        >
          <div className="order-details">
            <div className="details-section">
              <h3>Informações do Comprador</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <label>Nome</label>
                  <p>{selectedOrder.buyer_name}</p>
                </div>
                <div className="detail-item">
                  <label>Email</label>
                  <p>{selectedOrder.buyer_email}</p>
                </div>
                <div className="detail-item">
                  <label>Telefone</label>
                  <p>{selectedOrder.buyer_phone || 'N/A'}</p>
                </div>
                <div className="detail-item">
                  <label>CPF/CNPJ</label>
                  <p>{selectedOrder.buyer_document || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="details-section">
              <h3>Endereço de Entrega</h3>
              <div className="details-grid">
                <div className="detail-item full">
                  <label>Endereço</label>
                  <p>{selectedOrder.shipping_address || 'N/A'}</p>
                </div>
                <div className="detail-item">
                  <label>Cidade</label>
                  <p>{selectedOrder.shipping_city || 'N/A'}</p>
                </div>
                <div className="detail-item">
                  <label>Estado</label>
                  <p>{selectedOrder.shipping_state || 'N/A'}</p>
                </div>
                <div className="detail-item">
                  <label>CEP</label>
                  <p>{selectedOrder.shipping_zip || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="details-section">
              <h3>Status e Valores</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <label>Status</label>
                  <p>
                    <span className={`status status-${selectedOrder.status?.toLowerCase()}`}>
                      {getStatusLabel(selectedOrder.status)}
                    </span>
                  </p>
                </div>
                <div className="detail-item">
                  <label>Pagamento</label>
                  <p>
                    <span className={`payment-status payment-${selectedOrder.payment_status?.toLowerCase()}`}>
                      {getPaymentLabel(selectedOrder.payment_status)}
                    </span>
                  </p>
                </div>
                <div className="detail-item">
                  <label>Envio</label>
                  <p>
                    <span className={`shipping-status shipping-${selectedOrder.shipping_status?.toLowerCase()}`}>
                      {getShippingLabel(selectedOrder.shipping_status)}
                    </span>
                  </p>
                </div>
                <div className="detail-item">
                  <label>Total</label>
                  <p className="total-amount">R$ {parseFloat(selectedOrder.total_amount).toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="modal-footer-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Fechar
              </button>
              <button className="btn btn-primary">
                Imprimir
              </button>
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

export default OrdersList
