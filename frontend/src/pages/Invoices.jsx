import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import './Invoices.css'

function Invoices() {
  const { token } = useAuthStore()
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [invoiceData, setInvoiceData] = useState({
    accessKey: '',
    xml: ''
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      loadInvoices()
    }
  }, [selectedAccount])

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

  const loadInvoices = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get(`/invoices/${selectedAccount}`)
      setInvoices(response.data.invoices || [])
    } catch (err) {
      setError('Erro ao carregar notas fiscais')
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  const viewInvoiceDetails = async (invoiceId) => {
    try {
      const response = await api.get(`/invoices/${selectedAccount}/${invoiceId}`)
      setSelectedInvoice(response.data.invoice)
      setShowModal(true)
    } catch (err) {
      setError('Erro ao carregar detalhes')
    }
  }

  const openCreateModal = (orderId) => {
    setSelectedOrder(orderId)
    setInvoiceData({ accessKey: '', xml: '' })
    setShowCreateModal(true)
  }

  const createInvoice = async () => {
    if (!invoiceData.accessKey) {
      setError('Informe a chave de acesso da NF-e')
      return
    }

    setCreating(true)
    setError(null)

    try {
      await api.post(`/invoices/${selectedAccount}/order/${selectedOrder}`, {
        accessKey: invoiceData.accessKey,
        xml: invoiceData.xml
      })
      setShowCreateModal(false)
      await loadInvoices()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao enviar nota fiscal')
    } finally {
      setCreating(false)
    }
  }

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'created': 'badge-success',
      'pending': 'badge-warning',
      'error': 'badge-danger',
      'rejected': 'badge-danger'
    }
    return statusMap[status] || 'badge-secondary'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const formatCurrency = (value, currency = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(value)
  }

  return (
    <div className="invoices-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">receipt</span>
            Notas Fiscais
          </h1>
          <p>Gerencie notas fiscais dos seus pedidos</p>
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

      <div className="info-banner">
        <span className="material-icons">info</span>
        <div>
          <strong>Nota Fiscal Eletronica</strong>
          <p>Para vincular uma NF-e a um pedido, voce precisa da chave de acesso de 44 digitos.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      <div className="invoices-table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando notas fiscais...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="empty-state">
            <span className="material-icons">receipt_long</span>
            <h3>Nenhuma nota fiscal encontrada</h3>
            <p>As notas fiscais dos seus pedidos aparecerao aqui</p>
          </div>
        ) : (
          <table className="invoices-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Chave de Acesso</th>
                <th>Data</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(invoice => (
                <tr key={invoice._id || invoice.id}>
                  <td className="order-id">#{invoice.orderId}</td>
                  <td className="access-key">
                    <span title={invoice.accessKey}>
                      {invoice.accessKey?.substring(0, 20)}...
                    </span>
                  </td>
                  <td>{formatDate(invoice.dateCreated)}</td>
                  <td>{formatCurrency(invoice.totalAmount || 0)}</td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon"
                        title="Ver detalhes"
                        onClick={() => viewInvoiceDetails(invoice.id)}
                      >
                        <span className="material-icons">visibility</span>
                      </button>
                      {invoice.pdfUrl && (
                        <a
                          href={invoice.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-icon"
                          title="Baixar PDF"
                        >
                          <span className="material-icons">download</span>
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="quick-actions">
        <h3>Vincular NF-e a Pedido</h3>
        <div className="quick-action-form">
          <input
            type="text"
            placeholder="Numero do Pedido (ex: 2000003456789012)"
            id="orderIdInput"
          />
          <button
            className="btn btn-primary"
            onClick={() => {
              const orderId = document.getElementById('orderIdInput').value
              if (orderId) openCreateModal(orderId)
            }}
          >
            <span className="material-icons">add</span>
            Vincular NF-e
          </button>
        </div>
      </div>

      {showModal && selectedInvoice && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nota Fiscal - Pedido #{selectedInvoice.orderId}</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="invoice-detail-section">
                <h3>Informacoes</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Status</label>
                    <span className={`badge ${getStatusBadgeClass(selectedInvoice.status)}`}>
                      {selectedInvoice.status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Data</label>
                    <span>{formatDate(selectedInvoice.dateCreated)}</span>
                  </div>
                  <div className="detail-item full">
                    <label>Chave de Acesso</label>
                    <span className="access-key-full">{selectedInvoice.accessKey}</span>
                  </div>
                </div>
              </div>

              {selectedInvoice.fiscalData && (
                <div className="invoice-detail-section">
                  <h3>Dados Fiscais</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Numero</label>
                      <span>{selectedInvoice.fiscalData.number || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Serie</label>
                      <span>{selectedInvoice.fiscalData.series || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Valor Total</label>
                      <span>{formatCurrency(selectedInvoice.fiscalData.totalAmount || 0)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Vincular Nota Fiscal</h2>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-description">
                Vincule uma Nota Fiscal Eletronica ao pedido <strong>#{selectedOrder}</strong>
              </p>

              <div className="form-group">
                <label>Chave de Acesso (44 digitos) *</label>
                <input
                  type="text"
                  value={invoiceData.accessKey}
                  onChange={(e) => setInvoiceData({ ...invoiceData, accessKey: e.target.value })}
                  placeholder="00000000000000000000000000000000000000000000"
                  maxLength={44}
                />
                <span className="char-count">{invoiceData.accessKey.length}/44</span>
              </div>

              <div className="form-group">
                <label>XML da NF-e (opcional)</label>
                <textarea
                  value={invoiceData.xml}
                  onChange={(e) => setInvoiceData({ ...invoiceData, xml: e.target.value })}
                  placeholder="Cole o XML da nota fiscal aqui..."
                  rows={6}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={createInvoice}
                disabled={creating || invoiceData.accessKey.length !== 44}
              >
                {creating ? 'Enviando...' : 'Vincular NF-e'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Invoices
