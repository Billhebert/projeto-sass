import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { mpPaymentsAPI, formatMPCurrency } from '../services/mercadopago'
import './MPCheckoutCallback.css'

function MPCheckoutSuccess() {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [paymentData, setPaymentData] = useState(null)

  const paymentId = searchParams.get('payment_id')
  const status = searchParams.get('status')
  const externalReference = searchParams.get('external_reference')
  const merchantOrderId = searchParams.get('merchant_order_id')

  useEffect(() => {
    if (paymentId) {
      loadPaymentData()
    } else {
      setLoading(false)
    }
  }, [paymentId])

  const loadPaymentData = async () => {
    try {
      const response = await mpPaymentsAPI.get(paymentId)
      setPaymentData(response.data)
    } catch (error) {
      console.error('Error loading payment data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('pt-BR')
  }

  return (
    <div className="checkout-callback">
      <div className="callback-container success">
        <div className="callback-icon">
          <span className="material-icons">check_circle</span>
        </div>
        
        <h1>Pagamento Aprovado!</h1>
        <p className="callback-subtitle">Seu pagamento foi processado com sucesso</p>

        {loading ? (
          <div className="loading-info">
            <div className="spinner-small"></div>
            <span>Carregando detalhes...</span>
          </div>
        ) : (
          <div className="payment-details">
            {paymentId && (
              <div className="detail-row">
                <span className="label">ID do Pagamento</span>
                <span className="value mono">{paymentId}</span>
              </div>
            )}
            {status && (
              <div className="detail-row">
                <span className="label">Status</span>
                <span className="value status-approved">{status}</span>
              </div>
            )}
            {paymentData?.transaction_amount && (
              <div className="detail-row">
                <span className="label">Valor</span>
                <span className="value amount">{formatMPCurrency(paymentData.transaction_amount)}</span>
              </div>
            )}
            {paymentData?.payment_method_id && (
              <div className="detail-row">
                <span className="label">Forma de Pagamento</span>
                <span className="value">{paymentData.payment_method_id}</span>
              </div>
            )}
            {paymentData?.date_approved && (
              <div className="detail-row">
                <span className="label">Data de Aprovacao</span>
                <span className="value">{formatDate(paymentData.date_approved)}</span>
              </div>
            )}
            {externalReference && (
              <div className="detail-row">
                <span className="label">Referencia</span>
                <span className="value mono">{externalReference}</span>
              </div>
            )}
            {merchantOrderId && (
              <div className="detail-row">
                <span className="label">Pedido</span>
                <span className="value mono">{merchantOrderId}</span>
              </div>
            )}
          </div>
        )}

        <div className="callback-actions">
          <Link to="/mp/payments" className="btn btn-secondary">
            <span className="material-icons">receipt_long</span>
            Ver Pagamentos
          </Link>
          <Link to="/mp" className="btn btn-primary">
            <span className="material-icons">home</span>
            Dashboard MP
          </Link>
        </div>
      </div>
    </div>
  )
}

export default MPCheckoutSuccess
