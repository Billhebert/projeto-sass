import PropTypes from "prop-types";
import "./LoadingState.css";

/**
 * Componente de Loading State reutilizável e acessível
 *
 * @param {Object} props
 * @param {string} props.size - Tamanho do spinner: 'small', 'medium', 'large' (padrão: 'medium')
 * @param {string} props.message - Mensagem personalizada a ser exibida
 * @param {boolean} props.fullScreen - Se true, ocupa toda a tela
 * @param {string} props.variant - Variante de estilo: 'spinner', 'dots', 'pulse' (padrão: 'spinner')
 */
function LoadingState({
  size = "medium",
  message = "Carregando...",
  fullScreen = false,
  variant = "spinner",
}) {
  const sizeClass = `loading-${size}`;
  const containerClass = fullScreen
    ? "loading-fullscreen"
    : "loading-container";

  const renderLoader = () => {
    switch (variant) {
      case "dots":
        return (
          <div className="loading-dots" role="status" aria-label="Carregando">
            <div className="dot" aria-hidden="true"></div>
            <div className="dot" aria-hidden="true"></div>
            <div className="dot" aria-hidden="true"></div>
          </div>
        );
      case "pulse":
        return (
          <div
            className={`loading-pulse ${sizeClass}`}
            role="status"
            aria-label="Carregando"
          />
        );
      case "spinner":
      default:
        return (
          <div
            className={`loading-spinner ${sizeClass}`}
            role="status"
            aria-label="Carregando"
          />
        );
    }
  };

  return (
    <div
      className={containerClass}
      role="alert"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="loading-content">
        {renderLoader()}
        {message && (
          <p className="loading-message" aria-live="polite">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

LoadingState.propTypes = {
  size: PropTypes.oneOf(["small", "medium", "large"]),
  message: PropTypes.string,
  fullScreen: PropTypes.bool,
  variant: PropTypes.oneOf(["spinner", "dots", "pulse"]),
};

export default LoadingState;
