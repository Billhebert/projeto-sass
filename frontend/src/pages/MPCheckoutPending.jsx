import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { mpPaymentsAPI, formatMPCurrency } from '../services/mercadopago'
import './MPCheckoutCallback.css'

function MPCheckoutPending() {
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

  const getPendingMessage = () => {
    if (paymentData?.payment_method_id === 'pix') {
      return 'Aguardando pagamento via Pix'
    }
    if (paymentData?.payment_type_id === 'ticket') {
      return 'Aguardando pagamento do boleto'
    }
    return 'Seu pagamento esta sendo processado'
  }

  return (
    <div className="checkout-callback">
      <div className="callback-container pending">
        <div className="callback-icon">
          <span className="material-icons">schedule</span>
        </div>
        
        <h1>Pagamento Pendente</h1>
        <p className="callback-subtitle">{getPendingMessage()}</p>

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
                <span className="value status-pending">{status}</span>
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
            {paymentData?.date_of_expiration && (
              <div className="detail-row">
                <span className="label">Vencimento</span>
                <span className="value">{formatDate(paymentData.date_of_expiration)}</span>
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

        {/* Pix QR Code or Boleto info */}
        {paymentData?.point_of_interaction?.transaction_data?.qr_code && (
          <div className="pix-section">
            <h4>Pix Copia e Cola</h4>
            <div className="pix-code">
              <input 
                type="text" 
                value={paymentData.point_of_interaction.transaction_data.qr_code} 
                readOnly 
              />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(paymentData.point_of_interaction.transaction_data.qr_code)
                }}
              >
                <span className="material-icons">content_copy</span>
              </button>
            </div>
            {paymentData.point_of_interaction.transaction_data.qr_code_base64 && (
              <img 
                src={`data:image/png;base64,${paymentData.point_of_interaction.transaction_data.qr_code_base64}`}
                alt="QR Code Pix"
                className="qr-code"
              />
            )}
          </div>
        )}

        {paymentData?.transaction_details?.external_resource_url && (
          <div className="boleto-section">
            <h4>Boleto</h4>
            <a 
              href={paymentData.transaction_details.external_resource_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              <span className="material-icons">receipt</span>
              Visualizar Boleto
            </a>
          </div>
        )}

        <div className="pending-tips">
          <h4>Informacoes</h4>
          <ul>
            <li>Voce recebera uma notificacao quando o pagamento for confirmado</li>
            <li>Pagamentos via Pix sao confirmados em poucos minutos</li>
            <li>Boletos podem levar ate 3 dias uteis para compensar</li>
          </ul>
        </div>

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

export default MPCheckoutPending
