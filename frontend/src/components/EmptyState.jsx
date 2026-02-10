import React from "react";
import "./EmptyState.css";

/**
 * Componente de Empty State reutilizável
 *
 * @param {Object} props
 * @param {string} props.icon - Ícone a ser exibido (emoji ou caractere)
 * @param {string} props.title - Título principal
 * @param {string} props.message - Mensagem descritiva
 * @param {React.ReactNode} props.action - Botão ou ação (componente React)
 * @param {string} props.variant - Variante de estilo: 'default', 'info', 'warning', 'success'
 */
const EmptyState = ({
  icon = "📭",
  title = "Nenhum item encontrado",
  message = "Não há dados para exibir no momento.",
  action = null,
  variant = "default",
}) => {
  const variantClass = `empty-state--${variant}`;

  return (
    <div className={`empty-state ${variantClass}`}>
      <div className="empty-state-content">
        {icon && <div className="empty-state-icon">{icon}</div>}
        {title && <h3 className="empty-state-title">{title}</h3>}
        {message && <p className="empty-state-message">{message}</p>}
        {action && <div className="empty-state-action">{action}</div>}
      </div>
    </div>
  );
};

export default EmptyState;
