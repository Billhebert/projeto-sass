import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useMLAccounts,
  useCreateMLAccount,
  useUpdateMLAccount,
  useDeleteMLAccount,
  useGenerateMLOAuthUrl,
  useUpdateAccountOAuthCredentials,
} from "../hooks/useApi";
import { toast } from "../store/toastStore";
import TokenStatus from "../components/TokenStatus";
import "./Pages.css";

function Accounts() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [selectedAccountForCredentials, setSelectedAccountForCredentials] =
    useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    accessToken: "",
    refreshToken: "",
    accountName: "",
  });
  const [oauthFormData, setOAuthFormData] = useState({
    appId: "",
    appSecret: "",
    redirectUrl: "https://vendata.com.br/auth/callback",
  });
  const [credentialsFormData, setCredentialsFormData] = useState({
    clientId: "",
    clientSecret: "",
    redirectUri: "",
    refreshToken: "",
  });

  // React Query hooks
  const {
    data: accounts = [],
    isLoading: loading,
    refetch: refetchAccounts,
  } = useMLAccounts();
  const createAccountMutation = useCreateMLAccount();
  const updateAccountMutation = useUpdateMLAccount();
  const deleteAccountMutation = useDeleteMLAccount();
  const generateOAuthUrlMutation = useGenerateMLOAuthUrl();
  const updateCredentialsMutation = useUpdateAccountOAuthCredentials();

  const openModal = (account = null) => {
    if (account) {
      setEditingId(account.id);
      setFormData({
        accessToken: "",
        refreshToken: "",
        accountName: account.accountName || account.nickname,
      });
    } else {
      setEditingId(null);
      setFormData({
        accessToken: "",
        accountName: "",
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      accessToken: "",
      refreshToken: "",
      accountName: "",
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.accessToken && !editingId) {
      toast.error("Token de acesso é obrigatório");
      return;
    }

    try {
      if (editingId) {
        // Update existing account (nome apenas)
        await updateAccountMutation.mutateAsync({
          accountId: editingId,
          data: { accountName: formData.accountName },
        });
        toast.success("Conta atualizada com sucesso!");
      } else {
        // Create new account com access token (e opcionalmente refresh token)
        await createAccountMutation.mutateAsync({
          accessToken: formData.accessToken,
          refreshToken: formData.refreshToken || null,
          accountName: formData.accountName || "",
        });
        toast.success("Conta criada com sucesso!");
      }

      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erro ao salvar conta");
      console.error(err);
    }
  };

  const handleDelete = async (accountId) => {
    if (
      !window.confirm(
        "Tem certeza que deseja deletar esta conta? Esta ação é irreversível.",
      )
    ) {
      return;
    }

    try {
      await deleteAccountMutation.mutateAsync(accountId);
      toast.success("Conta deletada com sucesso!");
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Erro ao deletar conta";
      toast.error(errorMsg);
      console.error("Delete error:", {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
    }
  };

  const handleMLLogin = () => {
    // Open OAuth configuration modal instead of redirecting immediately
    setShowOAuthModal(true);
    setOAuthFormData({
      appId: "",
      appSecret: "",
      redirectUrl: "http://localhost:5173/auth/callback", // Default value
    });
  };

  const handleOAuthFormChange = (e) => {
    const { name, value } = e.target;
    setOAuthFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOAuthSubmit = async (e) => {
    e.preventDefault();

    if (
      !oauthFormData.appId ||
      !oauthFormData.appSecret ||
      !oauthFormData.redirectUrl
    ) {
      toast.error("App ID, App Secret e Redirect URL são obrigatórios");
      return;
    }

    try {
      // Call backend to generate OAuth URL with credentials
      const response = await generateOAuthUrlMutation.mutateAsync({
        clientId: oauthFormData.appId,
        clientSecret: oauthFormData.appSecret,
        redirectUri: oauthFormData.redirectUrl,
      });

      const { authUrl } = response.data;

      // Store credentials in session storage for callback to use
      sessionStorage.setItem(
        "ml_oauth_config",
        JSON.stringify({
          clientId: oauthFormData.appId,
          clientSecret: oauthFormData.appSecret,
          redirectUri: oauthFormData.redirectUrl,
        }),
      );

      // Redirect to Mercado Livre OAuth
      window.location.href = authUrl;
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Erro ao gerar link de autenticação",
      );
      console.error(err);
    }
  };

  const closeOAuthModal = () => {
    setShowOAuthModal(false);
    setOAuthFormData({
      appId: "",
      appSecret: "",
      redirectUrl: "https://vendata.com.br/auth/callback",
    });
  };

  // ========== CREDENTIALS MODAL FUNCTIONS ==========

  const openCredentialsModal = (account) => {
    setSelectedAccountForCredentials(account);
    setCredentialsFormData({
      clientId: "",
      clientSecret: "",
      redirectUri: "http://localhost:5173/auth/callback",
      refreshToken: "",
    });
    setShowCredentialsModal(true);
  };

  const closeCredentialsModal = () => {
    setShowCredentialsModal(false);
    setSelectedAccountForCredentials(null);
    setCredentialsFormData({
      clientId: "",
      clientSecret: "",
      redirectUri: "",
      refreshToken: "",
    });
  };

  const handleCredentialsFormChange = (e) => {
    const { name, value } = e.target;
    setCredentialsFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();

    if (!credentialsFormData.refreshToken) {
      toast.error("Refresh Token e obrigatorio");
      return;
    }

    try {
      const response = await updateCredentialsMutation.mutateAsync({
        accountId: selectedAccountForCredentials.id,
        credentials: {
          clientId: credentialsFormData.clientId || null,
          clientSecret: credentialsFormData.clientSecret || null,
          redirectUri: credentialsFormData.redirectUri || null,
          refreshToken: credentialsFormData.refreshToken,
        },
      });

      if (response.success) {
        toast.success(
          "Refresh Token salvo com sucesso! Renovacao automatica ativada.",
        );
        closeCredentialsModal();
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Erro ao salvar refresh token",
      );
      console.error(err);
    }
  };

  // Get status badge color based on token configuration
  const getOAuthStatusBadge = (account) => {
    if (account.canAutoRefresh) {
      return (
        <span
          className="oauth-badge oauth-badge-success"
          title="Renovacao automatica ativa (tem Refresh Token)"
        >
          Auto-Refresh
        </span>
      );
    } else if (account.hasRefreshToken) {
      // Has refresh token but canAutoRefresh is false - this shouldn't happen with the new logic
      return (
        <span
          className="oauth-badge oauth-badge-warning"
          title="Refresh Token presente"
        >
          Auto-Refresh
        </span>
      );
    } else {
      return (
        <span
          className="oauth-badge oauth-badge-danger"
          title="Token manual - sem renovacao automatica"
        >
          Manual
        </span>
      );
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Contas Mercado Livre</h1>
        <p>Gerencie suas contas conectadas</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Contas Ativas</h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="btn btn-primary"
              onClick={handleMLLogin}
              disabled={generateOAuthUrlMutation.isPending}
            >
              {generateOAuthUrlMutation.isPending
                ? "Conectando..."
                : "🏪 Mercado Livre"}
            </button>
            <button className="btn btn-secondary" onClick={() => openModal()}>
              + Adicionar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Carregando contas...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma conta conectada</p>
            <div
              className="empty-state-buttons"
              style={{
                display: "flex",
                gap: "1rem",
                marginTop: "1.5rem",
                justifyContent: "center",
              }}
            >
              <button
                className="btn btn-primary"
                onClick={handleMLLogin}
                disabled={generateOAuthUrlMutation.isPending}
              >
                {generateOAuthUrlMutation.isPending
                  ? "Conectando..."
                  : "🏪 Conectar com Mercado Livre"}
              </button>
              <button className="btn btn-secondary" onClick={() => openModal()}>
                + Adicionar Manualmente
              </button>
            </div>
          </div>
        ) : (
          <div className="accounts-list">
            {accounts.map((account) => (
              <div key={account.id} className="account-item">
                <div className="account-header">
                  <div className="account-info">
                    <h3>{account.nickname}</h3>
                    <p className="text-muted">{account.email}</p>
                    <div className="account-badges">
                      <span className={`status-badge status-${account.status}`}>
                        {account.status === "active"
                          ? "Ativo"
                          : account.status === "expired"
                            ? "Expirado"
                            : "Inativo"}
                      </span>
                      {getOAuthStatusBadge(account)}
                    </div>
                  </div>
                </div>

                <div className="account-stats">
                  <div className="stat">
                    <span className="stat-label">Produtos:</span>
                    <span className="stat-value">
                      {account.cachedData?.products || 0}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Pedidos:</span>
                    <span className="stat-value">
                      {account.cachedData?.orders || 0}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Problemas:</span>
                    <span className="stat-value">
                      {account.cachedData?.issues || 0}
                    </span>
                  </div>
                </div>

                {/* Token Status */}
                <TokenStatus
                  accountId={account.id}
                  canAutoRefresh={account.canAutoRefresh}
                  hasRefreshToken={account.hasRefreshToken}
                  tokenExpiresAt={account.tokenExpiresAt}
                  onRefreshSuccess={() => refetchAccounts()}
                  onConfigureOAuth={() => openCredentialsModal(account)}
                />

                <div className="account-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/accounts/${account.id}/products`)}
                  >
                    Produtos
                  </button>
                  {!account.canAutoRefresh && (
                    <button
                      className="btn btn-warning btn-sm"
                      onClick={() => openCredentialsModal(account)}
                      title="Configurar credenciais OAuth para renovação automática"
                    >
                      Configurar OAuth
                    </button>
                  )}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => openModal(account)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(account.id)}
                    disabled={deleteAccountMutation.isPending}
                  >
                    {deleteAccountMutation.isPending
                      ? "Deletando..."
                      : "Deletar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal - Adicionar/Editar Conta Manual */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingId ? "Editar Conta" : "Conectar Conta Mercado Livre"}
              </h2>
              <button className="modal-close" onClick={closeModal}>
                x
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="accountName">Nome da Conta (opcional)</label>
                <input
                  type="text"
                  id="accountName"
                  name="accountName"
                  value={formData.accountName}
                  onChange={handleFormChange}
                  placeholder="Ex: Loja Principal"
                />
              </div>

              {!editingId && (
                <>
                  <div className="form-group">
                    <label htmlFor="accessToken">
                      Token de Acesso Mercado Livre *
                    </label>
                    <input
                      type="password"
                      id="accessToken"
                      name="accessToken"
                      value={formData.accessToken}
                      onChange={handleFormChange}
                      placeholder="Cole seu token de acesso aqui"
                      required={!editingId}
                    />
                    <small className="form-help">
                      Como obter o token? Vá para
                      developers.mercadolibre.com.br, acesse suas aplicações e
                      procure por "Access Token". O token expira em 6 horas.
                    </small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="refreshToken">
                      Refresh Token (Opcional)
                    </label>
                    <input
                      type="password"
                      id="refreshToken"
                      name="refreshToken"
                      value={formData.refreshToken}
                      onChange={handleFormChange}
                      placeholder="Cole seu refresh token aqui (opcional)"
                    />
                    <small className="form-help">
                      Se você tem um refresh token (válido por 6 meses), cole
                      aqui. Sem ele, precisará inserir novo token a cada 6
                      horas.
                    </small>
                  </div>
                </>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                  disabled={
                    createAccountMutation.isPending ||
                    updateAccountMutation.isPending
                  }
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    createAccountMutation.isPending ||
                    updateAccountMutation.isPending
                  }
                >
                  {createAccountMutation.isPending ||
                  updateAccountMutation.isPending
                    ? "Salvando..."
                    : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OAuth Configuration Modal - Nova Conta */}
      {showOAuthModal && (
        <div className="modal-overlay" onClick={closeOAuthModal}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Autenticacao OAuth 2.0</h2>
              <button className="modal-close" onClick={closeOAuthModal}>
                x
              </button>
            </div>

            <form onSubmit={handleOAuthSubmit} className="modal-form">
              <div className="info-box info-box-primary">
                <strong>Como funciona?</strong>
                <p>
                  Forneca suas credenciais da aplicacao Mercado Livre para fazer
                  a autenticacao OAuth. Isso permite renovacao automatica dos
                  tokens.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="appId">App ID (Client ID) *</label>
                <input
                  type="text"
                  id="appId"
                  name="appId"
                  value={oauthFormData.appId}
                  onChange={handleOAuthFormChange}
                  placeholder="Ex: 1234567890123456"
                  required
                />
                <small className="form-help">
                  Encontre em: developers.mercadolibre.com.br - Minhas
                  aplicacoes
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="appSecret">App Secret *</label>
                <input
                  type="password"
                  id="appSecret"
                  name="appSecret"
                  value={oauthFormData.appSecret}
                  onChange={handleOAuthFormChange}
                  placeholder="Sua chave secreta"
                  required
                />
                <small className="form-help">
                  Guarde este valor com seguranca. Sera usado apenas para
                  autenticacao.
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="redirectUrl">Redirect URL *</label>
                <input
                  type="url"
                  id="redirectUrl"
                  name="redirectUrl"
                  value={oauthFormData.redirectUrl}
                  onChange={handleOAuthFormChange}
                  placeholder="Ex: http://localhost:5173/auth/callback"
                  required
                />
                <small className="form-help">
                  Deve corresponder exatamente a URL configurada em suas
                  aplicacoes Mercado Livre.
                </small>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeOAuthModal}
                  disabled={generateOAuthUrlMutation.isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={generateOAuthUrlMutation.isPending}
                >
                  {generateOAuthUrlMutation.isPending
                    ? "Conectando..."
                    : "Conectar com OAuth"}
                </button>
              </div>

              <div className="info-box info-box-info">
                <strong>O que acontece apos enviar?</strong>
                <ol>
                  <li>Voce sera redirecionado para o Mercado Livre</li>
                  <li>Authorize a aplicacao na sua conta</li>
                  <li>Retornara automaticamente com o token de acesso</li>
                  <li>Sua conta estara conectada com renovacao automatica!</li>
                </ol>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OAuth Credentials Modal - Conta Existente */}
      {showCredentialsModal && selectedAccountForCredentials && (
        <div className="modal-overlay" onClick={closeCredentialsModal}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Adicionar Refresh Token</h2>
              <button className="modal-close" onClick={closeCredentialsModal}>
                x
              </button>
            </div>

            <form onSubmit={handleCredentialsSubmit} className="modal-form">
              <div className="info-box info-box-warning">
                <strong>Conta: {selectedAccountForCredentials.nickname}</strong>
                <p>
                  Esta conta foi adicionada manualmente. Adicione um Refresh
                  Token para ativar a renovacao automatica.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="cred-refreshToken">Refresh Token *</label>
                <input
                  type="password"
                  id="cred-refreshToken"
                  name="refreshToken"
                  value={credentialsFormData.refreshToken}
                  onChange={handleCredentialsFormChange}
                  placeholder="Cole seu refresh token aqui"
                  required
                />
                <small className="form-help">
                  O Refresh Token e necessario para a renovacao automatica
                  funcionar. Voce pode obte-lo atraves do OAuth do Mercado Livre
                  ou da API.
                </small>
              </div>

              <div className="info-box info-box-info">
                <strong>Credenciais OAuth (Opcional)</strong>
                <p>
                  Se voce quiser usar credenciais OAuth proprias (diferente das
                  configuradas no servidor), preencha os campos abaixo. Caso
                  contrario, o sistema usara as credenciais padrao.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="cred-clientId">
                  Client ID (App ID) - Opcional
                </label>
                <input
                  type="text"
                  id="cred-clientId"
                  name="clientId"
                  value={credentialsFormData.clientId}
                  onChange={handleCredentialsFormChange}
                  placeholder="Ex: 1234567890123456"
                />
                <small className="form-help">
                  ID da sua aplicacao no Mercado Livre Developers (deixe vazio
                  para usar o padrao)
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="cred-clientSecret">
                  Client Secret (App Secret) - Opcional
                </label>
                <input
                  type="password"
                  id="cred-clientSecret"
                  name="clientSecret"
                  value={credentialsFormData.clientSecret}
                  onChange={handleCredentialsFormChange}
                  placeholder="Sua chave secreta"
                />
                <small className="form-help">
                  Chave secreta da sua aplicacao (deixe vazio para usar o
                  padrao)
                </small>
              </div>

              <div className="info-box info-box-success">
                <strong>O que acontece?</strong>
                <ul
                  style={{ margin: "0.5rem 0 0 1rem", paddingLeft: "0.5rem" }}
                >
                  <li>
                    Com o Refresh Token, a renovacao automatica sera ativada
                  </li>
                  <li>
                    O sistema renovara o token automaticamente antes de expirar
                  </li>
                  <li>Voce nao precisara mais inserir tokens manualmente!</li>
                </ul>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeCredentialsModal}
                  disabled={updateCredentialsMutation.isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updateCredentialsMutation.isPending}
                >
                  {updateCredentialsMutation.isPending
                    ? "Salvando..."
                    : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Accounts;
