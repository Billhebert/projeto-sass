import { useState } from "react";
import {
  useMLAccounts,
  useNotifications,
  useNotificationsStats,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "../hooks/useApi";
import "./Notifications.css";

function Notifications() {
  // Load accounts and select first one
  const { data: accounts = [] } = useMLAccounts();
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id || "");
  const [filter, setFilter] = useState("unread");

  // Update selected account when accounts load
  useState(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts]);

  // Fetch data using React Query hooks
  const { data: notifications = [], isLoading: loading } = useNotifications(
    selectedAccount,
    filter,
  );
  const { data: stats } = useNotificationsStats(selectedAccount);

  // Mutations
  const markAsReadMutation = useMarkNotificationRead();
  const markAllAsReadMutation = useMarkAllNotificationsRead();

  const markAsRead = async (notificationId) => {
    try {
      await markAsReadMutation.mutateAsync({
        accountId: selectedAccount,
        notificationId,
      });
    } catch (err) {
      console.error("Erro ao marcar como lida:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync({ accountId: selectedAccount });
    } catch (err) {
      console.error("Erro ao marcar todas como lidas:", err);
    }
  };

  const getTopicIcon = (topic) => {
    const icons = {
      orders_v2: "shopping_cart",
      questions: "help",
      items: "inventory_2",
      messages: "chat",
      shipments: "local_shipping",
      claims: "report_problem",
      payments: "payment",
    };
    return icons[topic] || "notifications";
  };

  const getTopicLabel = (topic) => {
    const labels = {
      orders_v2: "Pedido",
      questions: "Pergunta",
      items: "Anuncio",
      messages: "Mensagem",
      shipments: "Envio",
      claims: "Reclamacao",
      payments: "Pagamento",
    };
    return labels[topic] || topic;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60);

    if (diff < 60) return `${diff} min atras`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h atras`;
    return date.toLocaleString("pt-BR");
  };

  return (
    <div className="notifications-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">notifications</span>
            Notificacoes
          </h1>
          <p>Historico de webhooks do Mercado Livre</p>
        </div>
        <div className="header-actions">
          <select
            className="account-select"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.nickname || acc.mlUserId}
              </option>
            ))}
          </select>
          {stats?.unread > 0 && (
            <button
              className="btn btn-secondary"
              onClick={markAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              <span className="material-icons">done_all</span>
              Marcar todas como lidas
            </button>
          )}
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <span className="material-icons">notifications</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.total || 0}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red">
              <span className="material-icons">mark_email_unread</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.unread || 0}</span>
              <span className="stat-label">Nao Lidas</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <span className="material-icons">shopping_cart</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {stats.byTopic?.orders_v2 || 0}
              </span>
              <span className="stat-label">Pedidos</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow">
              <span className="material-icons">help</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {stats.byTopic?.questions || 0}
              </span>
              <span className="stat-label">Perguntas</span>
            </div>
          </div>
        </div>
      )}

      <div className="filters-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === "unread" ? "active" : ""}`}
            onClick={() => setFilter("unread")}
          >
            <span className="material-icons">mark_email_unread</span>
            Nao Lidas
            {stats?.unread > 0 && (
              <span className="tab-badge">{stats.unread}</span>
            )}
          </button>
          <button
            className={`filter-tab ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            <span className="material-icons">list</span>
            Todas
          </button>
        </div>
      </div>

      <div className="notifications-list">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando notificacoes...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <span className="material-icons">notifications_none</span>
            <h3>Nenhuma notificacao encontrada</h3>
            <p>
              {filter === "unread"
                ? "Voce nao tem notificacoes nao lidas!"
                : "As notificacoes de webhooks aparecerao aqui"}
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification._id}
              className={`notification-item ${!notification.read ? "unread" : ""}`}
              onClick={() => !notification.read && markAsRead(notification._id)}
            >
              <div className={`notification-icon ${notification.topic}`}>
                <span className="material-icons">
                  {getTopicIcon(notification.topic)}
                </span>
              </div>
              <div className="notification-content">
                <div className="notification-header">
                  <span className="notification-type">
                    {getTopicLabel(notification.topic)}
                  </span>
                  <span className="notification-time">
                    {formatDate(notification.receivedAt)}
                  </span>
                </div>
                <div className="notification-body">
                  <p className="notification-resource">
                    {notification.resource || "N/A"}
                  </p>
                  {notification.attempts && (
                    <span className="notification-attempts">
                      Tentativas: {notification.attempts}
                    </span>
                  )}
                </div>
              </div>
              {!notification.read && (
                <div className="unread-indicator">
                  <span className="material-icons">fiber_manual_record</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Notifications;
