import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { toast } from "../store/toastStore";
import "./MLAuth.css";

function MLAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("oauth");
  const [accounts, setAccounts] = useState([]);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  useEffect(() => {
    const init = async () => {
      if (code && state) {
        await handleCallback(code, state);
      } else {
        await fetchAccounts();
      }
    };
    init();
  }, [code, state, error]);

  const fetchAccounts = async () => {
    try {
      const response = await api.get("/ml-auth/status");
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
      const response = await api.post("/ml-auth/complete", { code, state });
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
      const response = await api.get("/ml-auth/url");
      if (response.data.success) {
        window.location.href = response.data.data.authorizationUrl;
      }
    } catch (err) {
      toast.error("Erro ao conectar");
    }
  };

  const handleDisconnect = async (accountId) => {
    if (!window.confirm("Desconectar?")) return;
    try {
      const response = await api.delete(`/ml-accounts/${accountId}`);
      if (response.data.success) {
        toast.success("Desconectado!");
        fetchAccounts();
      }
    } catch (err) {
      toast.error("Erro");
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
                {accounts.length} conta{accounts.length > 1 ? "s" : ""}
              </h2>
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
                    <p>{acc.email || "-"}</p>
                  </div>
                  <span
                    className={`badge badge--${acc.status === "active" ? "success" : "warning"}`}
                  >
                    {acc.status === "active" ? "Ativo" : "Expirado"}
                  </span>
                  <button
                    className="btn btn--danger btn--small"
                    onClick={() => handleDisconnect(acc.id)}
                  >
                    ×
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
              OAuth Automático
            </button>
            <button
              className={`ml-tab ${activeTab === "token" ? "active" : ""}`}
              onClick={() => setActiveTab("token")}
            >
              Token Manual
            </button>
            <button
              className={`ml-tab ${activeTab === "credenciais" ? "active" : ""}`}
              onClick={() => setActiveTab("credenciais")}
            >
              Credenciais
            </button>
          </div>

          <div className="ml-tab-content">
            {activeTab === "oauth" && (
              <TabOAuthAutomatico onSuccess={fetchAccounts} />
            )}
            {activeTab === "token" && (
              <TabTokenManual onSuccess={fetchAccounts} />
            )}
            {activeTab === "credenciais" && (
              <TabCredenciais onSuccess={fetchAccounts} />
            )}
          </div>
        </div>
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
      const response = await api.get("/ml-auth/url");
      if (response.data.success) {
        window.location.href = response.data.data.authorizationUrl;
      }
    } catch (err) {
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

function TabTokenManual({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    accessToken: "",
    refreshToken: "",
    expiresIn: "21600",
  });

  const handle = async (e) => {
    e.preventDefault();
    if (!form.accessToken) return toast.error("Access Token é obrigatório");

    setLoading(true);
    try {
      toast.info("Conectando...");
      const response = await api.post("/ml-accounts", {
        accessToken: form.accessToken,
        refreshToken: form.refreshToken || undefined,
        expiresIn: parseInt(form.expiresIn),
        manualToken: true,
      });
      if (response.data.success) {
        toast.success("Conta conectada!");
        onSuccess();
        setForm({ accessToken: "", refreshToken: "", expiresIn: "21600" });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Erro ao conectar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ml-tab-pane">
      <h3>Token Manual</h3>
      <p className="ml-desc">Cole seu access_token do Mercado Livre.</p>
      <form onSubmit={handle}>
        <div className="ml-form-group">
          <label>Access Token *</label>
          <input
            type="text"
            value={form.accessToken}
            onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
            placeholder="APP_USR-..."
            required
          />
        </div>
        <div className="ml-form-group">
          <label>Refresh Token (opcional)</label>
          <input
            type="text"
            value={form.refreshToken}
            onChange={(e) => setForm({ ...form, refreshToken: e.target.value })}
            placeholder="TG-..."
          />
        </div>
        <div className="ml-form-group">
          <label>Expira em (segundos)</label>
          <input
            type="number"
            value={form.expiresIn}
            onChange={(e) => setForm({ ...form, expiresIn: e.target.value })}
            placeholder="21600"
          />
        </div>
        <button
          type="submit"
          className="btn btn--primary btn--full"
          disabled={loading || !form.accessToken}
        >
          {loading ? "Conectando..." : "Conectar"}
        </button>
      </form>
    </div>
  );
}

function TabCredenciais({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    clientSecret: "",
    redirectUri: "",
  });

  const handle = async (e) => {
    e.preventDefault();
    if (!form.clientId || !form.clientSecret)
      return toast.error("Client ID e Secret são obrigatórios");

    setLoading(true);
    try {
      toast.info("Redirecionando...");
      const response = await api.post("/ml-auth/url-custom", {
        clientId: form.clientId,
        clientSecret: form.clientSecret,
        redirectUri: form.redirectUri || undefined,
      });
      if (response.data.success) {
        window.location.href = response.data.data.authorizationUrl;
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
      <form onSubmit={handle}>
        <div className="ml-form-group">
          <label>Client ID *</label>
          <input
            type="text"
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            placeholder="1234567890123456"
            required
          />
        </div>
        <div className="ml-form-group">
          <label>Client Secret *</label>
          <input
            type="password"
            value={form.clientSecret}
            onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
            placeholder="xxxxxxxxxxxxxxxxxxxx"
            required
          />
        </div>
        <div className="ml-form-group">
          <label>Redirect URI (opcional)</label>
          <input
            type="url"
            value={form.redirectUri}
            onChange={(e) => setForm({ ...form, redirectUri: e.target.value })}
            placeholder="https://seusite.com/callback"
          />
        </div>
        <button
          type="submit"
          className="btn btn--primary btn--full"
          disabled={loading || !form.clientId || !form.clientSecret}
        >
          {loading ? "Configurando..." : "Autorizar"}
        </button>
      </form>
    </div>
  );
}

export default MLAuth;
