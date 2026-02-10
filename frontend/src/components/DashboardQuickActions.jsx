import React from "react";
import { Link } from "react-router-dom";
import "./DashboardQuickActions.css";

/**
 * Dashboard quick actions grid
 */
function DashboardQuickActions() {
  const actions = [
    {
      to: "/items/create",
      icon: "add_box",
      label: "Criar Anúncio",
      primary: true,
    },
    { to: "/orders", icon: "receipt_long", label: "Ver Pedidos" },
    { to: "/shipments", icon: "local_shipping", label: "Gerenciar Envios" },
    { to: "/questions", icon: "chat", label: "Responder Perguntas" },
    { to: "/promotions", icon: "sell", label: "Criar Promoção" },
    { to: "/catalog", icon: "library_books", label: "Catálogo" },
    { to: "/advertising", icon: "campaign", label: "Product Ads" },
    { to: "/analytics", icon: "analytics", label: "Análises" },
  ];

  return (
    <div className="quick-actions">
      <h2>Ações Rápidas</h2>
      <div className="actions-grid">
        {actions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className={`action-btn ${action.primary ? "primary" : ""}`}
          >
            <span className="material-icons">{action.icon}</span>
            <span>{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default DashboardQuickActions;
