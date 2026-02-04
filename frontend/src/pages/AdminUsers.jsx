import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { toast } from "../store/toastStore";
import api from "../services/api";
import "./Admin.css";

const ADMIN_TOKEN =
  "0f934bb5410a922cab7d411654a5b6aaf16e65a0a5cc12813c8c214876fcea02";

const adminApi = {
  get: async (url) => {
    return api.get(url, {
      headers: { "X-Admin-Token": ADMIN_TOKEN },
    });
  },
  post: async (url, data) => {
    return api.post(url, data, {
      headers: { "X-Admin-Token": ADMIN_TOKEN },
    });
  },
};

function AdminUsers() {
  const { user } = useAuthStore();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const pendingResponse = await adminApi.get("/admin/users/pending");
      setPendingUsers(pendingResponse.data.data.users || []);

      const allResponse = await adminApi.get("/admin/users");
      setAllUsers(allResponse.data.data.users || []);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      const response = await adminApi.post(`/admin/users/${userId}/approve`);
      toast.success(response.data.message);
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao aprovar usuário");
    }
  };

  const handleReject = async (userId, email) => {
    if (
      !window.confirm(`Tem certeza que deseja rejeitar e remover ${email}?`)
    ) {
      return;
    }
    try {
      const response = await adminApi.post(`/admin/users/${userId}/reject`, {
        reason: "Rejeitado pelo administrador",
      });
      toast.success(response.data.message);
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao rejeitar usuário");
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const response = await adminApi.post(
        `/admin/users/${userId}/toggle-status`,
      );
      toast.success(response.data.message);
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao alterar status");
    }
  };

  const handleMakeAdmin = async (userId, email) => {
    if (
      !window.confirm(
        `Tem certeza que deseja tornar ${email} um administrador?`,
      )
    ) {
      return;
    }
    try {
      const response = await adminApi.post(`/admin/users/${userId}/make-admin`);
      toast.success(response.data.message);
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao promover usuário");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const filteredUsers = allUsers.filter((user) => {
    if (filter === "all") return true;
    return user.status === filter;
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="admin-container">
        <div className="admin-error">
          <h1>🔒 Acesso Negado</h1>
          <p>Você não tem permissão para acessar esta página.</p>
          <Link to="/" className="btn btn-primary">
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>👥 Gerenciamento de Usuários</h1>
        <p>Administração de contas e aprovações</p>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          ⏳ Pendentes ({pendingUsers.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          📋 Todos os Usuários
        </button>
      </div>

      {loading ? (
        <div className="admin-loading">Carregando...</div>
      ) : (
        <>
          {activeTab === "pending" && (
            <div className="admin-section">
              {pendingUsers.length === 0 ? (
                <div className="admin-empty">
                  <div className="empty-icon">✅</div>
                  <h3>Nenhum usuário pendente!</h3>
                  <p>Todos os usuários foram aprovados.</p>
                </div>
              ) : (
                <div className="users-grid">
                  {pendingUsers.map((user) => (
                    <div key={user.id} className="user-card pending">
                      <div className="user-avatar">
                        {user.firstName?.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-info">
                        <h3>
                          {user.firstName} {user.lastName}
                        </h3>
                        <p className="user-email">{user.email}</p>
                        <p className="user-date">
                          Criado em: {formatDate(user.createdAt)}
                        </p>
                      </div>
                      <div className="user-actions">
                        <button
                          className="btn btn-success"
                          onClick={() => handleApprove(user.id)}
                        >
                          ✅ Aprovar
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleReject(user.id, user.email)}
                        >
                          ❌ Rejeitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "all" && (
            <div className="admin-section">
              <div className="filter-bar">
                <label>Filtrar por status:</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </select>
                <button className="btn btn-secondary" onClick={loadUsers}>
                  🔄 Atualizar
                </button>
              </div>

              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Usuário</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Criado</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar small">
                              {user.firstName?.charAt(0).toUpperCase()}
                            </div>
                            <span>
                              {user.firstName} {user.lastName}
                            </span>
                          </div>
                        </td>
                        <td>{user.email}</td>
                        <td>
                          <span
                            className={`status-badge ${
                              user.emailVerified
                                ? user.status === "active"
                                  ? "active"
                                  : "inactive"
                                : "pending"
                            }`}
                          >
                            {user.emailVerified
                              ? user.status === "active"
                                ? "Ativo"
                                : "Inativo"
                              : "Pendente"}
                          </span>
                        </td>
                        <td>{formatDate(user.createdAt)}</td>
                        <td>
                          <div className="action-buttons">
                            {!user.emailVerified && (
                              <button
                                className="btn-icon success"
                                title="Aprovar"
                                onClick={() => handleApprove(user.id)}
                              >
                                ✅
                              </button>
                            )}
                            {user.emailVerified && user.status === "active" && (
                              <button
                                className="btn-icon warning"
                                title="Desativar"
                                onClick={() => handleToggleStatus(user.id)}
                              >
                                ⏸️
                              </button>
                            )}
                            {user.emailVerified &&
                              user.status === "inactive" && (
                                <button
                                  className="btn-icon success"
                                  title="Ativar"
                                  onClick={() => handleToggleStatus(user.id)}
                                >
                                  ▶️
                                </button>
                              )}
                            <button
                              className="btn-icon danger"
                              title="Remover"
                              onClick={() => handleReject(user.id, user.email)}
                            >
                              🗑️
                            </button>
                            {user.role !== "admin" && (
                              <button
                                className="btn-icon admin"
                                title="Tornar Admin"
                                onClick={() =>
                                  handleMakeAdmin(user.id, user.email)
                                }
                              >
                                👑
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AdminUsers;
