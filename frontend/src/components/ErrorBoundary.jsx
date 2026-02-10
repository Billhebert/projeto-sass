import React from "react";
import "./ErrorBoundary.css";
import logger from "../utils/logger";

/**
 * Error Boundary Component
 * Captura erros de renderização e exibe uma UI de fallback
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // Atualiza o state para exibir a UI de fallback
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log do erro
    logger.error("ErrorBoundary caught an error:", error, errorInfo);

    // Atualiza o state com detalhes do erro
    this.setState((prevState) => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Em produção, enviar para serviço de monitoramento
    if (import.meta.env.PROD) {
      // TODO: Integrar com Sentry ou similar
      // Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Se houver callback de reset, executar
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // UI de fallback customizada
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // UI de fallback padrão
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">⚠️</div>
            <h2 className="error-boundary-title">
              {this.props.title || "Ops! Algo deu errado"}
            </h2>
            <p className="error-boundary-message">
              {this.props.message ||
                "Desculpe, ocorreu um erro inesperado. Por favor, tente novamente."}
            </p>

            {/* Detalhes do erro em desenvolvimento */}
            {import.meta.env.DEV && this.state.error && (
              <details className="error-boundary-details">
                <summary>Detalhes do erro (modo desenvolvimento)</summary>
                <div className="error-details-content">
                  <p>
                    <strong>Erro:</strong>
                  </p>
                  <pre>{this.state.error.toString()}</pre>

                  {this.state.errorInfo && (
                    <>
                      <p>
                        <strong>Component Stack:</strong>
                      </p>
                      <pre>{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}
                </div>
              </details>
            )}

            <div className="error-boundary-actions">
              <button className="btn btn-primary" onClick={this.handleReset}>
                Tentar Novamente
              </button>
              <button className="btn btn-secondary" onClick={this.handleReload}>
                Recarregar Página
              </button>
            </div>

            {this.state.errorCount > 3 && (
              <p className="error-boundary-warning">
                ⚠️ Erro recorrente detectado. Considere limpar o cache ou entrar
                em contato com o suporte.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
