import { useState } from "react";
import {
  useMLAccounts,
  useMessages,
  useMessagesPack,
  useSendMessage,
  useSyncMessages,
} from "../hooks/useApi";
import "./Messages.css";

function Messages() {
  const { data: accounts = [] } = useMLAccounts();
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id || "");
  const [filter, setFilter] = useState("unread");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState(null);

  // Auto-select first account
  useState(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts]);

  const { data: conversations = [], isLoading } = useMessages(
    selectedAccount,
    filter,
  );

  const { data: messages = [] } = useMessagesPack(
    selectedAccount,
    selectedConversation,
  );

  const syncMessagesMutation = useSyncMessages();
  const sendMessageMutation = useSendMessage();

  const syncMessages = async () => {
    try {
      await syncMessagesMutation.mutateAsync({ accountId: selectedAccount });
    } catch (err) {
      setError("Erro ao sincronizar mensagens");
    }
  };

  const openConversation = (packId) => {
    setSelectedConversation(packId);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      await sendMessageMutation.mutateAsync({
        accountId: selectedAccount,
        packId: selectedConversation,
        text: newMessage,
      });
      setNewMessage("");
    } catch (err) {
      setError("Erro ao enviar mensagem");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60);

    if (diff < 60) return `${diff}min`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h`;
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <div className="messages-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">chat</span>
            Mensagens
          </h1>
          <p>Conversas pos-venda com compradores</p>
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
          <button
            className="btn btn-primary"
            onClick={syncMessages}
            disabled={syncMessagesMutation.isPending || !selectedAccount}
          >
            <span className="material-icons">sync</span>
            {syncMessagesMutation.isPending
              ? "Sincronizando..."
              : "Sincronizar"}
          </button>
        </div>
      </div>

      <div className="messages-container">
        <div className="conversations-panel">
          <div className="panel-header">
            <div className="filter-tabs compact">
              <button
                className={`filter-tab ${filter === "unread" ? "active" : ""}`}
                onClick={() => setFilter("unread")}
              >
                Nao lidas
              </button>
              <button
                className={`filter-tab ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
              >
                Todas
              </button>
            </div>
          </div>

          <div className="conversations-list">
            {isLoading ? (
              <div className="loading-state small">
                <div className="spinner"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="empty-state small">
                <span className="material-icons">chat_bubble_outline</span>
                <p>Nenhuma mensagem</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv._id || conv.packId}
                  className={`conversation-item ${selectedConversation === conv.packId ? "active" : ""} ${!conv.read ? "unread" : ""}`}
                  onClick={() => openConversation(conv.packId)}
                >
                  <div className="conv-avatar">
                    {conv.from?.nickname?.charAt(0) || "C"}
                  </div>
                  <div className="conv-content">
                    <div className="conv-header">
                      <span className="conv-name">
                        {conv.from?.nickname || "Comprador"}
                      </span>
                      <span className="conv-time">
                        {formatDate(conv.dateReceived)}
                      </span>
                    </div>
                    <div className="conv-preview">
                      <span className="conv-order">Pedido #{conv.orderId}</span>
                      <p className="conv-text">
                        {conv.text?.substring(0, 50)}...
                      </p>
                    </div>
                  </div>
                  {!conv.read && <div className="unread-dot"></div>}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="chat-panel">
          {selectedConversation ? (
            <>
              <div className="chat-header">
                <div className="chat-info">
                  <span className="material-icons">shopping_bag</span>
                  <span>Pedido #{selectedConversation}</span>
                </div>
                <a
                  href={`https://www.mercadolivre.com.br/vendas/mensagens/${selectedConversation}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-secondary"
                >
                  <span className="material-icons">open_in_new</span>
                  Ver no ML
                </a>
              </div>

              <div className="chat-messages">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`message-bubble ${msg.from?.userId === accounts.find((a) => a.id === selectedAccount)?.mlUserId ? "sent" : "received"}`}
                  >
                    <div className="bubble-content">
                      <p>{msg.text}</p>
                      <span className="bubble-time">
                        {formatDate(msg.dateSent || msg.dateReceived)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="chat-input">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <button
                  className="btn btn-primary"
                  onClick={sendMessage}
                  disabled={sendMessageMutation.isPending || !newMessage.trim()}
                >
                  <span className="material-icons">send</span>
                </button>
              </div>
            </>
          ) : (
            <div className="chat-placeholder">
              <span className="material-icons">forum</span>
              <h3>Selecione uma conversa</h3>
              <p>Escolha uma conversa ao lado para visualizar as mensagens</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger floating">
          <span className="material-icons">error</span>
          {error}
          <button onClick={() => setError(null)}>
            <span className="material-icons">close</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default Messages;
