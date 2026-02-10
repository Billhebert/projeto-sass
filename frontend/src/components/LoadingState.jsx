import React from "react";
import "./LoadingState.css";

/**
 * Componente de Loading State reutilizável
 *
 * @param {Object} props
 * @param {string} props.size - Tamanho do spinner: 'small', 'medium', 'large' (padrão: 'medium')
 * @param {string} props.message - Mensagem personalizada a ser exibida
 * @param {boolean} props.fullScreen - Se true, ocupa toda a tela
 * @param {string} props.variant - Variante de estilo: 'spinner', 'dots', 'pulse' (padrão: 'spinner')
 */
const LoadingState = ({
  size = "medium",
  message = "Carregando...",
  fullScreen = false,
  variant = "spinner",
}) => {
  const sizeClass = `loading-${size}`;
  const containerClass = fullScreen
    ? "loading-fullscreen"
    : "loading-container";

  const renderLoader = () => {
    switch (variant) {
      case "dots":
        return (
          <div className="loading-dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        );
      case "pulse":
        return <div className={`loading-pulse ${sizeClass}`}></div>;
      case "spinner":
      default:
        return <div className={`loading-spinner ${sizeClass}`}></div>;
    }
  };

  return (
    <div className={containerClass}>
      <div className="loading-content">
        {renderLoader()}
        {message && <p className="loading-message">{message}</p>}
      </div>
    </div>
  );
};

export default LoadingState;
