import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { toast } from "../store/toastStore";
import "./Admin.css";

function AdminPanel() {
  const navigate = useNavigate();
  const [adminToken, setAdminToken] = useState(
    localStorage.getItem("adminToken") || "",
  );
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("adminToken"),
  );
  const [activeTab, setActiveTab] = useState("stats");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Login with admin token
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!adminToken) {
      toast.error("Por favor, insira o token admin");
      return;
    }

    try {
      setLoading(true);
      // Teste a conexão com um endpoint que requer auth
      const response = await api.get("/admin/stats", {
        headers: { "x-admin-token": adminToken },
      });

      if (response.data.success) {
        localStorage.setItem("adminToken", adminToken);
        setIsAuthenticated(true);
        toast.success("Admin autenticado com sucesso!");
        fetchStats();
      }
    } catch (error) {
      toast.error("Token admin inválido");
      localStorage.removeItem("adminToken");
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const getHeaders = () => ({
    "x-admin-token": localStorage.getItem("adminToken") || adminToken,
  });

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/stats", { headers: getHeaders() });
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      toast.error("Erro ao carregar estatísticas");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingUsers = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await api.get(
        `/admin/pending-verifications?page=${pageNum}&limit=20`,
        {
          headers: getHeaders(),
        },
      );
      if (response.data.success) {
        setPendingUsers(response.data.data.users);
        setPage(pageNum);
        setTotalPages(response.data.data.pagination.totalPages);
      }
    } catch (error) {
      toast.error("Erro ao carregar usuários pendentes");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (email) => {
    try {
      setLoading(true);
      const response = await api.get(
        `/admin/verification-tokens/${encodeURIComponent(email)}`,
        {
          headers: getHeaders(),
        },
      );
      if (response.data.success) {
        setUserDetails(response.data.data);
        setSelectedUser(email);
      }
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error("Tokens só estão disponíveis em TEST mode");
      } else {
        toast.error("Erro ao carregar dados do usuário");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async (email) => {
    try {
      setLoading(true);
      const response = await api.post(
        `/admin/resend-verification/${encodeURIComponent(email)}`,
        {},
        {
          headers: getHeaders(),
        },
      );
      if (response.data.success) {
        toast.success("Email reenviado com sucesso!");
        fetchPendingUsers(page);
      }
    } catch (error) {
      toast.error("Erro ao reenviar email");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUser = async (email) => {
    if (!window.confirm(`Confirma a verificação manual do usuário ${email}?`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(
        `/admin/verify-user/${encodeURIComponent(email)}`,
        {},
        {
          headers: getHeaders(),
        },
      );
      if (response.data.success) {
        toast.success("Usuário verificado com sucesso!");
        setSelectedUser(null);
        setUserDetails(null);
        fetchPendingUsers(page);
        fetchStats();
      }
    } catch (error) {
      toast.error("Erro ao verificar usuário");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (email) => {
    if (
      !window.confirm(
        `Tem certeza que deseja deletar ${email}? Esta ação é irreversível!`,
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.delete(
        `/admin/users/${encodeURIComponent(email)}`,
        {
          headers: getHeaders(),
        },
      );
      if (response.data.success) {
        toast.success("Usuário deletado com sucesso");
        setSelectedUser(null);
        setUserDetails(null);
        fetchPendingUsers(page);
        fetchStats();
      }
    } catch (error) {
      toast.error("Erro ao deletar usuário");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setIsAuthenticated(false);
    setAdminToken("");
    setStats(null);
    setPendingUsers([]);
    setSelectedUser(null);
    setUserDetails(null);
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === "stats") {
      fetchStats();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && activeTab === "pending") {
      fetchPendingUsers(1);
    }
  }, [isAuthenticated, activeTab]);

  if (!isAuthenticated) {
    return (
      <div className="admin-login-container">
        <div className="admin-login-card">
          <h1>Admin Panel</h1>
          <p>Painel de Administração - Verificação de Emails</p>

          <form onSubmit={handleAdminLogin} className="admin-login-form">
            <div className="form-group">
              <label>Token Admin</label>
              <input
                type="password"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder="Cole seu token admin aqui"
                disabled={loading}
              />
              <small>
                O token admin deve ser definido em .env como ADMIN_TOKEN
              </small>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? "Autenticando..." : "Login"}
            </button>
          </form>

          <div className="admin-info">
            <h3>Em Ambiente de Produção:</h3>
            <ol>
              <li>
                Defina <code>ADMIN_TOKEN=sua_senha_forte_aleatoria</code> no{" "}
                <code>.env</code>
              </li>
              <li>Acesse este painel com seu navegador</li>
              <li>Cole o token para autenticar</li>
              <li>Veja os tokens de verificação dos usuários</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <button onClick={handleLogout} className="btn btn-secondary">
          Sair
        </button>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === "stats" ? "active" : ""}`}
          onClick={() => setActiveTab("stats")}
        >
          📊 Estatísticas
        </button>
        <button
          className={`tab-button ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          ⏳ Usuários Pendentes
        </button>
      </div>

      {/* STATS TAB */}
      {activeTab === "stats" && stats && (
        <div className="admin-content">
          <h2>Estatísticas de Verificação</h2>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalUsers}</div>
              <div className="stat-label">Total de Usuários</div>
            </div>

            <div className="stat-card success">
              <div className="stat-value">{stats.verifiedUsers}</div>
              <div className="stat-label">Usuários Verificados</div>
              <div className="stat-percent">{stats.verificationRate}%</div>
            </div>

            <div className="stat-card warning">
              <div className="stat-value">{stats.pendingUsers}</div>
              <div className="stat-label">Aguardando Verificação</div>
            </div>

            <div className="stat-card danger">
              <div className="stat-value">{stats.expiredTokens}</div>
              <div className="stat-label">Tokens Expirados</div>
            </div>
          </div>
        </div>
      )}

      {/* PENDING USERS TAB */}
      {activeTab === "pending" && (
        <div className="admin-content">
          <h2>Usuários Aguardando Verificação</h2>

          {selectedUser && userDetails ? (
            <div className="user-details-panel">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedUser(null);
                  setUserDetails(null);
                }}
              >
                ← Voltar
              </button>

              <div className="user-details">
                <h3>
                  {userDetails.firstName} {userDetails.lastName}
                </h3>
                <p className="user-email">{userDetails.email}</p>

                <div className="details-grid">
                  <div className="detail-item">
                    <label>Criado em:</label>
                    <span>
                      {new Date(userDetails.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>

                  <div className="detail-item">
                    <label>Expira em:</label>
                    <span>
                      {new Date(userDetails.expiresAt).toLocaleString("pt-BR")}
                    </span>
                  </div>

                  <div className="detail-item">
                    <label>Status:</label>
                    <span
                      className={userDetails.tokenExpired ? "expired" : "valid"}
                    >
                      {userDetails.tokenExpired ? "⏰ Expirado" : "✅ Válido"}
                    </span>
                  </div>

                  <div className="detail-item">
                    <label>Hash do Token:</label>
                    <code className="token-hash">
                      {userDetails.verificationToken.substring(0, 32)}...
                    </code>
                  </div>
                </div>

                <div className="actions">
                  <button
                    className="btn btn-warning"
                    onClick={() => handleResendEmail(userDetails.email)}
                    disabled={loading}
                  >
                    📧 Reenviar Email
                  </button>

                  <button
                    className="btn btn-success"
                    onClick={() => handleVerifyUser(userDetails.email)}
                    disabled={loading}
                  >
                    ✅ Verificar Manualmente
                  </button>

                  <button
                    className="btn btn-danger"
                    onClick={() => handleDeleteUser(userDetails.email)}
                    disabled={loading}
                  >
                    🗑️ Deletar Usuário
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Nome</th>
                    <th>Criado</th>
                    <th>Expira em</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-state">
                        Nenhum usuário aguardando verificação
                      </td>
                    </tr>
                  ) : (
                    pendingUsers.map((user) => (
                      <tr key={user.email}>
                        <td className="email">{user.email}</td>
                        <td>
                          {user.firstName} {user.lastName}
                        </td>
                        <td>
                          {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                        </td>
                        <td>{user.expiresIn}</td>
                        <td>
                          <span
                            className={
                              user.tokenExpired
                                ? "status-expired"
                                : "status-valid"
                            }
                          >
                            {user.tokenExpired ? "⏰ Expirado" : "✅ Válido"}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-small btn-info"
                            onClick={() => fetchUserDetails(user.email)}
                            disabled={loading}
                          >
                            Ver Detalhes
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="pagination">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
                      <button
                        key={p}
                        className={`page-button ${page === p ? "active" : ""}`}
                        onClick={() => fetchPendingUsers(p)}
                        disabled={loading}
                      >
                        {p}
                      </button>
                    ),
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
