import React from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import "./DashboardAlerts.css";

/**
 * Dashboard alerts panel showing pending actions
 * @param {Object} props - Component props
 * @param {Object} props.alerts - Alert counts and data
 */
function DashboardAlerts({ alerts }) {
  const navigate = useNavigate();

  // Check if there are any alerts
  const hasAlerts =
    (alerts.pendingQuestions?.length || 0) > 0 ||
    (alerts.openClaims?.length || 0) > 0 ||
    (alerts.ordersToShip?.length || 0) > 0 ||
    (alerts.lowStock?.length || 0) > 0;

  if (!hasAlerts) {
    return null;
  }

  const alertItems = [
    {
      show: alerts.pendingQuestions?.length > 0,
      count: alerts.pendingQuestions?.length || 0,
      label: "Perguntas sem resposta",
      icon: "help_outline",
      className: "warning",
      route: "/questions",
    },
    {
      show: alerts.ordersToShip?.length > 0,
      count: alerts.ordersToShip?.length || 0,
      label: "Pedidos para enviar",
      icon: "local_shipping",
      className: "info",
      route: "/shipments",
    },
    {
      show: alerts.openClaims?.length > 0,
      count: alerts.openClaims?.length || 0,
      label: "Reclamações abertas",
      icon: "report_problem",
      className: "danger",
      route: "/claims",
    },
    {
      show: alerts.lowStock?.length > 0,
      count: alerts.lowStock?.length || 0,
      label: "Produtos com estoque baixo",
      icon: "inventory",
      className: "warning",
      route: "/inventory",
    },
  ];

  return (
    <div className="alerts-panel">
      <h2>
        <span className="material-icons">notifications_active</span>
        Ações Pendentes
      </h2>
      <div className="alerts-grid">
        {alertItems.map((item, index) =>
          item.show ? (
            <div
              key={index}
              className={`alert-card ${item.className}`}
              onClick={() => navigate(item.route)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(item.route);
                }
              }}
              aria-label={`${item.count} ${item.label}`}
            >
              <div className="alert-icon">
                <span className="material-icons">{item.icon}</span>
              </div>
              <div className="alert-content">
                <span className="alert-count">{item.count}</span>
                <span className="alert-label">{item.label}</span>
              </div>
              <span className="material-icons alert-arrow">chevron_right</span>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}

DashboardAlerts.propTypes = {
  alerts: PropTypes.shape({
    pendingQuestions: PropTypes.array,
    openClaims: PropTypes.array,
    moderations: PropTypes.array,
    lowStock: PropTypes.array,
    ordersToShip: PropTypes.array,
  }).isRequired,
};

export default DashboardAlerts;
