import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuthStore } from "../store/authStore";
import { toast } from "../store/toastStore";
import "./MLAuth.css";

function MLAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [activeTab, setActiveTab] = useState("oauth");
  const { user, mlAccounts, loadToken } = useAuthStore();

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  useEffect(() => {
    const init = async () => {
      if (code && state) {
        await handleCallback(code, state);
      } else if (mlAccounts && mlAccounts.length > 0) {
        setAccounts(mlAccounts);
        setLoading(false);
      } else {
        await fetchAccounts();
      }
    };
    init();
  }, [code, state, error, mlAccounts]);

  const fetchAccounts = async () => {
    try {
      const response = await api.get("/auth/ml-auth/status");
      setAccounts(response.data.accounts || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCallback = async (code, state) => {
    try {
      toast.info("Conectando...");
      const response = await api.post("/auth/ml-callback", { code, state });
      if (response.data.success) {
        toast.success("Conta conectada!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Erro");
    }
    window.location.replace("/ml-auth");
  };

  const handleOAuthAutomatico = async () => {
    try {
      toast.info("Redirecionando...");
      const response = await api.get("/auth/ml-auth/url");
      console.log("ML Auth URL response:", response.data);

      if (response.data.success) {
        const config = {
          clientId: response.data.data.clientId || "1706187223829083",
          clientSecret: response.data.data.clientSecret || "",
          redirectUri:
            response.data.data.redirectUri ||
            "https://vendata.com.br/auth/callback",
        };
        console.log("Saving to sessionStorage:", config);
        sessionStorage.setItem("ml_oauth_config", JSON.stringify(config));

        const saved = sessionStorage.getItem("ml_oauth_config");
        console.log("Verification - Saved value:", saved);

        if (saved) {
          console.log("Redirecting to:", response.data.data.authUrl);
          window.location.href = response.data.data.authUrl;
        } else {
          console.error("Failed to save sessionStorage!");
          toast.error("Erro ao salvar configurações");
        }
      } else {
        console.error("Failed to get auth URL:", response.data.error);
        toast.error(response.data.error || "Erro ao conectar");
      }
    } catch (err) {
      console.error("Error getting ML auth URL:", err);
      toast.error("Erro ao conectar");
    }
  };

  const handleDisconnect = async (accountId) => {
    if (
      !window.confirm(
        "Deseja realmente remover esta conta? Esta ação não pode ser desfeita.",
      )
    )
      return;
    try {
      const response = await api.delete(`/ml-accounts/${accountId}`);
      if (response.data.success) {
        toast.success("Conta removida com sucesso!");
        // Atualizar lista local
        setAccounts(accounts.filter((acc) => acc.id !== accountId));
        // Recarregar do servidor
        fetchAccounts();
      }
    } catch (err) {
      console.error("Error disconnecting account:", err);
      toast.error(err.response?.data?.message || "Erro ao remover conta");
    }
  };

  if (loading) {
    return (
      <div className="ml-page">
        <div className="ml-loading">
          <div className="spinner"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ml-page">
      <div className="ml-hero">
        <h1 className="ml-hero__title">Mercado Livre</h1>
        <p className="ml-hero__subtitle">Conecte sua conta</p>
      </div>

      <div className="ml-container">
        {accounts.length > 0 && (
          <div className="ml-card">
            <div className="ml-header">
              <h2>
                {accounts.length} conta{accounts.length > 1 ? "s" : ""}{" "}
                conectada{accounts.length > 1 ? "s" : ""}
              </h2>
              <p className="ml-header-subtitle">
                Gerencie suas contas do Mercado Livre
              </p>
            </div>
            <div className="ml-list">
              {accounts.map((acc) => (
                <div key={acc.id} className="ml-item">
                  <div className="ml-item__avatar">
                    {(acc.nickname || acc.accountName || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="ml-item__info">
                    <h3>{acc.nickname || acc.accountName || "Conta ML"}</h3>
                    <p className="ml-item__email">{acc.email || "-"}</p>
                    {acc.mlUserId && (
                      <p className="ml-item__id">ID: {acc.mlUserId}</p>
                    )}
                  </div>
                  <div className="ml-item__status">
                    <span
                      className={`badge badge--${acc.status === "active" || acc.status === "connected" ? "success" : "warning"}`}
                    >
                      {acc.status === "active" || acc.status === "connected"
                        ? "Conectado"
                        : "Desconectado"}
                    </span>
                    {acc.tokenExpiresAt && (
                      <small className="ml-item__expiry">
                        Expira:{" "}
                        {new Date(acc.tokenExpiresAt).toLocaleDateString()}
                      </small>
                    )}
                  </div>
                  <button
                    className="btn btn--danger btn--small"
                    onClick={() => handleDisconnect(acc.id)}
                    title="Remover conta"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="ml-card">
          <div className="ml-tabs">
            <button
              className={`ml-tab ${activeTab === "oauth" ? "active" : ""}`}
              onClick={() => setActiveTab("oauth")}
            >
              Conexão Automática
            </button>
            <button
              className={`ml-tab ${activeTab === "credentials" ? "active" : ""}`}
              onClick={() => setActiveTab("credentials")}
            >
              Credenciais Manual
            </button>
            <button
              className={`ml-tab ${activeTab === "tokens" ? "active" : ""}`}
              onClick={() => setActiveTab("tokens")}
            >
              Tokens Diretos
            </button>
          </div>

          {activeTab === "oauth" ? (
            <div className="ml-tab-content">
              <TabOAuthAutomatico onSuccess={() => fetchAccounts()} />
            </div>
          ) : activeTab === "credentials" ? (
            <div className="ml-tab-content">
              <TabCredentials onSuccess={() => fetchAccounts()} />
            </div>
          ) : (
            <div className="ml-tab-content">
              <TabTokens onSuccess={() => fetchAccounts()} />
            </div>
          )}
        </div>

        {error && (
          <div className="ml-error">
            <span className="ml-error__icon">⚠</span>
            <p>Erro na autorização: {error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TabOAuthAutomatico({ onSuccess }) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      toast.info("Redirecionando...");
      const response = await api.get("/auth/ml-auth/url");
      console.log("ML Auth URL response:", response.data);

      if (response.data.success) {
        const config = {
          clientId: response.data.data.clientId || "1706187223829083",
          clientSecret: response.data.data.clientSecret || "",
          redirectUri:
            response.data.data.redirectUri ||
            "https://vendata.com.br/auth/callback",
        };
        console.log("Saving to sessionStorage:", config);
        sessionStorage.setItem("ml_oauth_config", JSON.stringify(config));

        const saved = sessionStorage.getItem("ml_oauth_config");
        console.log("Verification - Saved value:", saved);

        if (saved) {
          console.log("Redirecting to:", response.data.data.authUrl);
          window.location.href = response.data.data.authUrl;
        } else {
          console.error("Failed to save sessionStorage!");
          toast.error("Erro ao salvar configurações");
        }
      } else {
        console.error("Failed to get auth URL:", response.data.error);
        toast.error(response.data.error || "Erro ao conectar");
      }
    } catch (err) {
      console.error("Error getting ML auth URL:", err);
      toast.error("Erro ao conectar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ml-tab-pane">
      <h3>OAuth Automático</h3>
      <p className="ml-desc">
        Método mais simples. Você será redirecionado para o Mercado Livre.
      </p>
      <div className="ml-features">
        <span>✓ Redirecionamento automático</span>
        <span>✓ Renovação de tokens automática</span>
        <span>✓ Sem configuração</span>
      </div>
      <button
        className="btn btn--authorize btn--full"
        onClick={handle}
        disabled={loading}
      >
        {loading ? "Redirecionando..." : "Autorizar com Mercado Livre"}
      </button>
    </div>
  );
}

function TabCredentials({ onSuccess }) {
  const [form, setForm] = useState({
    clientId: "",
    clientSecret: "",
    redirectUri: "",
    refreshToken: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.clientId || !form.clientSecret)
      return toast.error("Client ID e Secret são obrigatórios");

    setLoading(true);
    try {
      toast.info("Redirecionando...");
      const response = await api.post("/auth/ml-oauth-url", {
        clientId: form.clientId,
        clientSecret: form.clientSecret,
        redirectUri: form.redirectUri || undefined,
      });
      if (response.data.success) {
        sessionStorage.setItem("ml_oauth_config", JSON.stringify(form));
        window.location.href = response.data.data.authUrl;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Erro ao conectar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ml-tab-pane">
      <h3>Credenciais OAuth</h3>
      <p className="ml-desc">Use suas próprias credenciais de desenvolvedor.</p>
      <form onSubmit={handleSubmit}>
        <div className="ml-form-group">
          <label>Client ID *</label>
          <input
            type="text"
            value={form.clientId}
            onChange={handleChange}
            name="clientId"
            placeholder="1234567890123456"
            required
          />
        </div>
        <div className="ml-form-group">
          <label>Client Secret *</label>
          <input
            type="password"
            value={form.clientSecret}
            onChange={handleChange}
            name="clientSecret"
            placeholder="••••••••••••••••"
            required
          />
        </div>
        <div className="ml-form-group">
          <label>Redirect URI</label>
          <input
            type="text"
            value={form.redirectUri}
            onChange={handleChange}
            name="redirectUri"
            placeholder="https://seudominio.com/auth/callback"
          />
        </div>
        <button
          type="submit"
          className="btn btn--authorize btn--full"
          disabled={loading}
        >
          {loading ? "Redirecionando..." : "Autorizar com Mercado Livre"}
        </button>
      </form>
    </div>
  );
}

function TabTokens({ onSuccess }) {
  const [form, setForm] = useState({
    accessToken: "",
    refreshToken: "",
    userId: "",
    nickname: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.accessToken) {
      return toast.error("Access Token é obrigatório");
    }

    setLoading(true);
    try {
      toast.info("Salvando tokens...");
      const response = await api.post("/auth/ml-add-token", {
        accessToken: form.accessToken,
        refreshToken: form.refreshToken || undefined,
        userId: form.userId || undefined,
        nickname: form.nickname || undefined,
      });

      if (response.data.success) {
        toast.success("Tokens salvos com sucesso!");
        setForm({
          accessToken: "",
          refreshToken: "",
          userId: "",
          nickname: "",
        });
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error("Error saving tokens:", err);
      toast.error(err.response?.data?.message || "Erro ao salvar tokens");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ml-tab-pane">
      <h3>Autenticação com Tokens</h3>
      <p className="ml-desc">
        Cole diretamente seus tokens do Mercado Livre. Útil se você já possui
        tokens válidos.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="ml-form-group">
          <label>Access Token *</label>
          <input
            type="text"
            value={form.accessToken}
            onChange={handleChange}
            name="accessToken"
            placeholder="APP_USR-1234567890123456-..."
            required
          />
          <small>Token de acesso obtido do Mercado Livre</small>
        </div>
        <div className="ml-form-group">
          <label>Refresh Token (Opcional)</label>
          <input
            type="text"
            value={form.refreshToken}
            onChange={handleChange}
            name="refreshToken"
            placeholder="TG-1234567890123456-..."
          />
          <small>
            Token de renovação (recomendado para renovação automática)
          </small>
        </div>
        <div className="ml-form-group">
          <label>User ID (Opcional)</label>
          <input
            type="text"
            value={form.userId}
            onChange={handleChange}
            name="userId"
            placeholder="123456789"
          />
          <small>ID do usuário no Mercado Livre</small>
        </div>
        <div className="ml-form-group">
          <label>Nickname (Opcional)</label>
          <input
            type="text"
            value={form.nickname}
            onChange={handleChange}
            name="nickname"
            placeholder="MINHALOJA123"
          />
          <small>Nome de usuário/loja no Mercado Livre</small>
        </div>
        <button
          type="submit"
          className="btn btn--authorize btn--full"
          disabled={loading}
        >
          {loading ? "Salvando..." : "Adicionar Conta"}
        </button>
      </form>
    </div>
  );
}

export default MLAuth;
