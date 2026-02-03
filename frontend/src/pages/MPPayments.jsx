import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  mpPaymentsAPI,
  formatMPCurrency,
  getMPStatusColor,
  getMPStatusLabel,
  getMPPaymentTypeLabel,
} from '../services/mercadopago'
import { useToastStore } from '../store/toastStore'
import './MPPayments.css'

function MPPayments() {
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState([])
  const [paging, setPaging] = useState({ total: 0, limit: 30, offset: 0 })
  const [filters, setFilters] = useState({
    status: '',
    begin_date: '',
    end_date: '',
  })
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const { showToast } = useToastStore()

  useEffect(() => {
    loadPayments()
  }, [filters, paging.offset])

  const loadPayments = async () => {
    setLoading(true)
    try {
      const params = {
        limit: paging.limit,
        offset: paging.offset,
        sort: 'date_created',
        criteria: 'desc',
      }

      if (filters.status) params.status = filters.status
      if (filters.begin_date) params.begin_date = filters.begin_date
      if (filters.end_date) params.end_date = filters.end_date

      const response = await mpPaymentsAPI.search(params)
      setPayments(response.data?.results || [])
      setPaging((prev) => ({
        ...prev,
        total: response.data?.paging?.total || 0,
      }))
    } catch (error) {
      console.error('Error loading payments:', error)
      showToast('Erro ao carregar pagamentos', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = async () => {
    if (!selectedPayment) return

    try {
      const amount = refundAmount ? parseFloat(refundAmount) : null
      await mpPaymentsAPI.refund(selectedPayment.id, amount)
      showToast('Reembolso processado com sucesso', 'success')
      setShowRefundModal(false)
      setSelectedPayment(null)
      setRefundAmount('')
      loadPayments()
    } catch (error) {
      console.error('Error refunding payment:', error)
      showToast('Erro ao processar reembolso', 'error')
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
    setPaging((prev) => ({ ...prev, offset: 0 }))
  }

  const handlePageChange = (newOffset) => {
    setPaging((prev) => ({ ...prev, offset: newOffset }))
  }

  const totalPages = Math.ceil(paging.total / paging.limit)
  const currentPage = Math.floor(paging.offset / paging.limit) + 1

  return (
    <div className="mp-payments">
      <header className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">receipt_long</span>
            Pagamentos
          </h1>
          <p>Gerencie todos os pagamentos do Mercado Pago</p>
        </div>
        <div className="header-actions">
          <Link to="/mp" className="btn btn-secondary">
            <span className="material-icons">arrow_back</span>
            Voltar
          </Link>
        </div>
      </header>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Status</label>
          <select name="status" value={filters.status} onChange={handleFilterChange}>
            <option value="">Todos</option>
            <option value="pending">Pendente</option>
            <option value="approved">Aprovado</option>
            <option value="authorized">Autorizado</option>
            <option value="in_process">Em Processamento</option>
            <option value="rejected">Rejeitado</option>
            <option value="cancelled">Cancelado</option>
            <option value="refunded">Reembolsado</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Data Inicial</label>
          <input
            type="date"
            name="begin_date"
            value={filters.begin_date}
            onChange={handleFilterChange}
          />
        </div>

        <div className="filter-group">
          <label>Data Final</label>
          <input
            type="date"
            name="end_date"
            value={filters.end_date}
            onChange={handleFilterChange}
          />
        </div>

        <button className="btn btn-filter" onClick={loadPayments}>
          <span className="material-icons">search</span>
          Buscar
        </button>
      </div>

      {/* Stats Summary */}
      <div className="stats-summary">
        <div className="summary-item">
          <span className="summary-value">{paging.total}</span>
          <span className="summary-label">Total de Pagamentos</span>
        </div>
      </div>

      {/* Payments Table */}
      <div className="payments-container">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Carregando pagamentos...</p>
          </div>
        ) : payments.length > 0 ? (
          <>
            <table className="payments-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Data</th>
                  <th>Pagador</th>
                  <th>Metodo</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="payment-id">#{payment.id}</td>
                    <td>{new Date(payment.date_created).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <div className="payer-info">
                        <span className="payer-email">{payment.payer?.email || '-'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="payment-method">
                        {getMPPaymentTypeLabel(payment.payment_type_id)}
                      </span>
                      <span className="payment-method-id">{payment.payment_method_id}</span>
                    </td>
                    <td className="payment-amount">
                      {formatMPCurrency(payment.transaction_amount, payment.currency_id)}
                      {payment.installments > 1 && (
                        <span className="installments">
                          {payment.installments}x
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: getMPStatusColor(payment.status) }}
                      >
                        {getMPStatusLabel(payment.status)}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn-action"
                          title="Ver detalhes"
                          onClick={() => setSelectedPayment(payment)}
                        >
                          <span className="material-icons">visibility</span>
                        </button>
                        {payment.status === 'approved' && (
                          <button
                            className="btn-action refund"
                            title="Reembolsar"
                            onClick={() => {
                              setSelectedPayment(payment)
                              setShowRefundModal(true)
                            }}
                          >
                            <span className="material-icons">undo</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(paging.offset - paging.limit)}
                >
                  <span className="material-icons">chevron_left</span>
                </button>
                <span className="page-info">
                  Pagina {currentPage} de {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(paging.offset + paging.limit)}
                >
                  <span className="material-icons">chevron_right</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <span className="material-icons">receipt_long</span>
            <h3>Nenhum pagamento encontrado</h3>
            <p>Ajuste os filtros ou crie um novo checkout</p>
            <Link to="/mp/checkout" className="btn btn-primary">
              Criar Checkout
            </Link>
          </div>
        )}
      </div>

      {/* Payment Details Modal */}
      {selectedPayment && !showRefundModal && (
        <div className="modal-overlay" onClick={() => setSelectedPayment(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalhes do Pagamento</h2>
              <button className="close-btn" onClick={() => setSelectedPayment(null)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>ID</label>
                  <span>{selectedPayment.id}</span>
                </div>
                <div className="detail-item">
                  <label>Status</label>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getMPStatusColor(selectedPayment.status) }}
                  >
                    {getMPStatusLabel(selectedPayment.status)}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Data Criacao</label>
                  <span>{new Date(selectedPayment.date_created).toLocaleString('pt-BR')}</span>
                </div>
                {selectedPayment.date_approved && (
                  <div className="detail-item">
                    <label>Data Aprovacao</label>
                    <span>{new Date(selectedPayment.date_approved).toLocaleString('pt-BR')}</span>
                  </div>
                )}
                <div className="detail-item">
                  <label>Valor</label>
                  <span className="amount">
                    {formatMPCurrency(selectedPayment.transaction_amount, selectedPayment.currency_id)}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Metodo</label>
                  <span>{getMPPaymentTypeLabel(selectedPayment.payment_type_id)}</span>
                </div>
                <div className="detail-item">
                  <label>Pagador</label>
                  <span>{selectedPayment.payer?.email || '-'}</span>
                </div>
                {selectedPayment.installments > 1 && (
                  <div className="detail-item">
                    <label>Parcelas</label>
                    <span>{selectedPayment.installments}x</span>
                  </div>
                )}
                {selectedPayment.external_reference && (
                  <div className="detail-item">
                    <label>Referencia Externa</label>
                    <span>{selectedPayment.external_reference}</span>
                  </div>
                )}
                {selectedPayment.status_detail && (
                  <div className="detail-item full-width">
                    <label>Detalhe Status</label>
                    <span>{selectedPayment.status_detail}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              {selectedPayment.status === 'approved' && (
                <button
                  className="btn btn-warning"
                  onClick={() => setShowRefundModal(true)}
                >
                  <span className="material-icons">undo</span>
                  Reembolsar
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setSelectedPayment(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedPayment && (
        <div className="modal-overlay" onClick={() => setShowRefundModal(false)}>
          <div className="modal refund-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reembolsar Pagamento</h2>
              <button className="close-btn" onClick={() => setShowRefundModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <p>
                Pagamento: <strong>#{selectedPayment.id}</strong>
              </p>
              <p>
                Valor Total:{' '}
                <strong>
                  {formatMPCurrency(selectedPayment.transaction_amount, selectedPayment.currency_id)}
                </strong>
              </p>

              <div className="form-group">
                <label>Valor do Reembolso (deixe vazio para reembolso total)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={selectedPayment.transaction_amount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="Reembolso total"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRefundModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={handleRefund}>
                <span className="material-icons">undo</span>
                Confirmar Reembolso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MPPayments
