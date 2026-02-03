import { useSearchParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import './MPCheckoutCallback.css'

function MPCheckoutFailure() {
  const [searchParams] = useSearchParams()

  const paymentId = searchParams.get('payment_id')
  const status = searchParams.get('status')
  const externalReference = searchParams.get('external_reference')
  const merchantOrderId = searchParams.get('merchant_order_id')

  const getFailureMessage = () => {
    const statusDetail = searchParams.get('status_detail')
    const messages = {
      cc_rejected_bad_filled_card_number: 'Numero do cartao incorreto',
      cc_rejected_bad_filled_date: 'Data de validade incorreta',
      cc_rejected_bad_filled_other: 'Dados do cartao incorretos',
      cc_rejected_bad_filled_security_code: 'Codigo de seguranca incorreto',
      cc_rejected_blacklist: 'Pagamento nao autorizado',
      cc_rejected_call_for_authorize: 'Pagamento requer autorizacao',
      cc_rejected_card_disabled: 'Cartao desabilitado',
      cc_rejected_card_error: 'Erro no cartao',
      cc_rejected_duplicated_payment: 'Pagamento duplicado',
      cc_rejected_high_risk: 'Pagamento recusado por seguranca',
      cc_rejected_insufficient_amount: 'Saldo insuficiente',
      cc_rejected_invalid_installments: 'Parcelamento invalido',
      cc_rejected_max_attempts: 'Limite de tentativas excedido',
      cc_rejected_other_reason: 'Pagamento recusado',
    }
    return messages[statusDetail] || 'O pagamento nao foi aprovado'
  }

  return (
    <div className="checkout-callback">
      <div className="callback-container failure">
        <div className="callback-icon">
          <span className="material-icons">cancel</span>
        </div>
        
        <h1>Pagamento Recusado</h1>
        <p className="callback-subtitle">{getFailureMessage()}</p>

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
              <span className="value status-rejected">{status}</span>
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

        <div className="failure-tips">
          <h4>O que fazer?</h4>
          <ul>
            <li>Verifique os dados do cartao e tente novamente</li>
            <li>Tente com outro cartao ou forma de pagamento</li>
            <li>Entre em contato com seu banco</li>
          </ul>
        </div>

        <div className="callback-actions">
          <Link to="/mp/checkout" className="btn btn-primary">
            <span className="material-icons">refresh</span>
            Tentar Novamente
          </Link>
          <Link to="/mp" className="btn btn-secondary">
            <span className="material-icons">home</span>
            Dashboard MP
          </Link>
        </div>
      </div>
    </div>
  )
}

export default MPCheckoutFailure
