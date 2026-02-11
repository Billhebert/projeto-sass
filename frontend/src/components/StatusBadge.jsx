import PropTypes from "prop-types";
import { getStatusBadgeClass, getStatusLabel, getStatusIcon } from "../utils/status";
import "./StatusBadge.css";

/**
 * StatusBadge - Badge de status reutilizável e consistente
 * Substitui badges inline duplicados em 10+ arquivos
 */
function StatusBadge({ 
  status, 
  type = null, 
  showIcon = false,
  size = "medium",
  className = "" 
}) {
  if (!status) return null;
  
  const badgeClass = getStatusBadgeClass(status, type);
  const label = getStatusLabel(status, type);
  const icon = getStatusIcon(status, type);
  
  const sizeClass = `badge-${size}`;
  
  return (
    <span className={`${badgeClass} ${sizeClass} ${className}`}>
      {showIcon && (
        <span className="material-icons badge-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {label}
    </span>
  );
}

StatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
  type: PropTypes.oneOf([
    "product",
    "order",
    "claim",
    "question",
    "shipment",
    "payment",
    "subscription",
    "notification",
    "review",
    null,
  ]),
  showIcon: PropTypes.bool,
  size: PropTypes.oneOf(["small", "medium", "large"]),
  className: PropTypes.string,
};

export default StatusBadge;
