import React from "react";
import PropTypes from "prop-types";
import Modal from "./Modal";
import "./OrderDetailsModal.css";

/**
 * Order details modal component
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Modal open state
 * @param {Function} props.onClose - Callback to close modal
 * @param {Object} props.order - Order details
 * @param {Function} props.formatCurrency - Currency formatter
 * @param {Function} props.formatDate - Date formatter
 * @param {Function} props.getStatusBadgeClass - Get status badge CSS class
 */
function OrderDetailsModal({
  isOpen,
  onClose,
  order,
  formatCurrency,
  formatDate,
  getStatusBadgeClass,
}) {
  if (!order) {
    return null;
  }

  // Handle both camelCase and snake_case field names
  const orderId = order.id || order.mlOrderId || order.ml_order_id;
  const dateCreated = order.dateCreated || order.date_created;
  const totalAmount = order.totalAmount || order.total_amount || 0;
  const currencyId = order.currencyId || order.currency_id || "BRL";
  const orderItems = order.orderItems || order.order_items || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Pedido #${orderId}`}>
      <div className="order-detail-section">
        <h3>Informações Gerais</h3>
        <div className="detail-grid">
          <div className="detail-item">
            <label>Status</label>
            <span className={`badge ${getStatusBadgeClass(order.status)}`}>
              {order.status}
            </span>
          </div>
          <div className="detail-item">
            <label>Data</label>
            <span>{formatDate(dateCreated)}</span>
          </div>
          <div className="detail-item">
            <label>Total</label>
            <span className="total-value">
              {formatCurrency(totalAmount, currencyId)}
            </span>
          </div>
        </div>
      </div>

      <div className="order-detail-section">
        <h3>Comprador</h3>
        <div className="detail-grid">
          <div className="detail-item">
            <label>Nickname</label>
            <span>{order.buyer?.nickname}</span>
          </div>
          <div className="detail-item">
            <label>Email</label>
            <span>{order.buyer?.email || "N/A"}</span>
          </div>
        </div>
      </div>

      <div className="order-detail-section">
        <h3>Itens do Pedido</h3>
        <div className="order-items-list">
          {orderItems.map((item, idx) => {
            const itemTitle = item.title || item.item?.title;
            const itemThumbnail = item.thumbnail || item.item?.thumbnail;
            const itemQty = item.quantity;
            const itemPrice =
              item.unitPrice || item.unit_price || item.full_unit_price || 0;

            return (
              <div key={idx} className="order-item-card">
                {itemThumbnail && (
                  <img
                    src={itemThumbnail}
                    alt={itemTitle}
                    className="item-thumbnail"
                  />
                )}
                <div className="item-details">
                  <span className="item-title">{itemTitle}</span>
                  <span className="item-qty">Qtd: {itemQty}</span>
                  <span className="item-price">
                    {formatCurrency(itemPrice * itemQty, currencyId)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {order.shipping && (
        <div className="order-detail-section">
          <h3>Envio</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>ID Envio</label>
              <span>{order.shipping.id}</span>
            </div>
            <div className="detail-item">
              <label>Status</label>
              <span>{order.shipping.status}</span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

OrderDetailsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  order: PropTypes.object,
  formatCurrency: PropTypes.func.isRequired,
  formatDate: PropTypes.func.isRequired,
  getStatusBadgeClass: PropTypes.func.isRequired,
};

export default OrderDetailsModal;
