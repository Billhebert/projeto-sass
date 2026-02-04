import { useState, useCallback } from "react";
import { toast } from "../store/toastStore";
import api from "../services/api";
import "./MLConnection.css";

function MLConnection({ onConnectionComplete, existingAccounts = [] }) {
  const [connecting, setConnecting] = useState(false);
  const [accounts, setAccounts] = useState(existingAccounts);

  const handleConnect = useCallback(async () => {
    try {
      setConnecting(true);
      toast.info("Iniciando conexão com Mercado Livre...");

      const response = await api.post("/ml-accounts/connect");

      if (response.data.success) {
        const { authorizationUrl } = response.data.data;

        toast.success("Redirecionando para Mercado Livre...");

        window.location.href = authorizationUrl;
      } else {
        toast.error(response.data.message || "Erro ao iniciar conexão");
        setConnecting(false);
      }
    } catch (error) {
      console.error("OAuth connect error:", error);
      toast.error(
        error.response?.data?.message || "Erro ao conectar com Mercado Livre",
      );
      setConnecting(false);
    }
  }, []);

  const handleRefresh = useCallback(
    async (accountId) => {
      try {
        toast.info("Renovando token...");

        const response = await api.post(`/ml-accounts/${accountId}/refresh`);

        if (response.data.success) {
          toast.success("Token renovado com sucesso!");

          setAccounts((prev) =>
            prev.map((acc) =>
              acc.id === accountId
                ? {
                    ...acc,
                    tokenExpiresAt: response.data.data.tokenExpiresAt,
                  }
                : acc,
            ),
          );

          if (onConnectionComplete) {
            onConnectionComplete(response.data.data);
          }
        } else {
          toast.error(response.data.message || "Erro ao renovar token");
        }
      } catch (error) {
        console.error("Token refresh error:", error);

        if (error.response?.data?.code === "INVALID_REFRESH_TOKEN") {
          toast.error(
            "Token expirado. Por favor, reconecte sua conta do Mercado Livre.",
            { duration: 5000 },
          );
        } else {
          toast.error(error.response?.data?.message || "Erro ao renovar token");
        }
      }
    },
    [onConnectionComplete],
  );

  const handleDisconnect = useCallback(
    async (accountId) => {
      if (!window.confirm("Tem certeza que deseja desconectar esta conta?")) {
        return;
      }

      try {
        toast.info("Desconectando conta...");

        const response = await api.delete(`/ml-accounts/${accountId}`);

        if (response.data.success) {
          toast.success("Conta desconectada com sucesso!");

          setAccounts((prev) => prev.filter((acc) => acc.id !== accountId));

          if (onConnectionComplete) {
            onConnectionComplete({ disconnected: true, accountId });
          }
        } else {
          toast.error(response.data.message || "Erro ao desconectar conta");
        }
      } catch (error) {
        console.error("Disconnect error:", error);
        toast.error(
          error.response?.data?.message || "Erro ao desconectar conta",
        );
      }
    },
    [onConnectionComplete],
  );

  const getTokenStatus = (account) => {
    if (!account.canAutoRefresh && !account.hasRefreshToken) {
      return {
        label: "Token Manual",
        className: "status-manual",
        tooltip: "Token inserido manualmente. Não renova automaticamente.",
      };
    }

    const expiresAt = new Date(account.tokenExpiresAt || Date.now());
    const now = new Date();
    const hoursUntilExpiry = (expiresAt - now) / (1000 * 60 * 60);

    if (hoursUntilExpiry <= 0) {
      return {
        label: "Expirado",
        className: "status-expired",
        tooltip: "Token expirado. Clique para renovar.",
      };
    }

    if (hoursUntilExpiry <= 1) {
      return {
        label: `Expira em ${Math.round(hoursUntilExpiry * 60)}m`,
        className: "status-warning",
        tooltip: "Token expira em breve. Recomendamos renovar.",
      };
    }

    if (hoursUntilExpiry <= 24) {
      return {
        label: `Expira em ${Math.round(hoursUntilExpiry)}h`,
        className: "status-ok",
        tooltip: "Token válido por menos de 24h",
      };
    }

    return {
      label: `Expira em ${Math.round(hoursUntilExpiry / 24)}d`,
      className: "status-good",
      tooltip: "Token renovará automaticamente",
    };
  };

  return (
    <div className="ml-connection">
      <div className="ml-connection__header">
        <h2>Contas Mercado Livre</h2>
        <button
          className="btn btn--primary"
          onClick={handleConnect}
          disabled={connecting}
        >
          {connecting ? (
            <>
              <span className="spinner spinner--small"></span>
              Conectando...
            </>
          ) : (
            <>
              <span className="icon">+</span>
              Conectar Nova Conta
            </>
          )}
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="ml-connection__empty">
          <div className="ml-connection__empty-icon">🏪</div>
          <h3>Nenhuma conta conectada</h3>
          <p>
            Conecte sua conta do Mercado Livre para gerenciar produtos, pedidos
            e muito mais.
          </p>
          <button
            className="btn btn--primary"
            onClick={handleConnect}
            disabled={connecting}
          >
            Conectar Conta Mercado Livre
          </button>
        </div>
      ) : (
        <div className="ml-connection__list">
          {accounts.map((account) => {
            const status = getTokenStatus(account);
            const isExpired =
              status.className === "status-expired" ||
              status.className === "status-warning";

            return (
              <div
                key={account.id}
                className={`ml-connection__card ${isExpired ? "card--warning" : ""}`}
              >
                <div className="ml-connection__card-header">
                  <div className="ml-connection__account-info">
                    <div className="ml-connection__avatar">
                      {account.nickname?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <h4>{account.accountName || account.nickname}</h4>
                      <p>{account.email}</p>
                    </div>
                  </div>
                  <div className="ml-connection__badges">
                    {account.isPrimary && (
                      <span className="badge badge--primary">Primária</span>
                    )}
                    <span
                      className={`badge badge--status ${status.className}`}
                      title={status.tooltip}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>

                <div className="ml-connection__card-body">
                  <div className="ml-connection__stats">
                    <div className="ml-connection__stat">
                      <span className="stat-label">Produtos</span>
                      <span className="stat-value">
                        {account.cachedData?.products || 0}
                      </span>
                    </div>
                    <div className="ml-connection__stat">
                      <span className="stat-label">Pedidos</span>
                      <span className="stat-value">
                        {account.cachedData?.orders || 0}
                      </span>
                    </div>
                    <div className="ml-connection__stat">
                      <span className="stat-label">Status</span>
                      <span className={`stat-value status--${account.status}`}>
                        {account.status === "active"
                          ? "Ativo"
                          : account.status === "paused"
                            ? "Pausado"
                            : account.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ml-connection__card-footer">
                  {account.canAutoRefresh || account.hasRefreshToken ? (
                    <button
                      className="btn btn--secondary btn--small"
                      onClick={() => handleRefresh(account.id)}
                      disabled={connecting}
                    >
                      <span className="icon">🔄</span>
                      Renovar Token
                    </button>
                  ) : (
                    <button
                      className="btn btn--secondary btn--small"
                      onClick={handleConnect}
                      disabled={connecting}
                    >
                      <span className="icon">🔗</span>
                      Reconectar
                    </button>
                  )}
                  <button
                    className="btn btn--danger btn--small"
                    onClick={() => handleDisconnect(account.id)}
                    disabled={connecting}
                  >
                    <span className="icon">🗑️</span>
                    Desconectar
                  </button>
                </div>

                {isExpired && (
                  <div className="ml-connection__alert">
                    ⚠️ Token precisa ser renovado para continuar usando a API
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="ml-connection__info">
        <h4>🔒 OAuth Invisível</h4>
        <ul>
          <li>Clique em "Conectar" e será redirecionado automaticamente</li>
          <li>Sem necessidade de inserir usuário/senha manualmente</li>
          <li>Tokens são salvos automaticamente após autorização</li>
          <li>Renovação automática em segundo plano</li>
        </ul>
      </div>
    </div>
  );
}

export default MLConnection;
