import { useState, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import api from "../services/api";
import "./Questions.css";

function Questions() {
  const { token } = useAuthStore();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("unanswered");
  const [answerModal, setAnswerModal] = useState({
    show: false,
    question: null,
  });
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 1000, // Increased limit to fetch more questions
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      loadQuestions();
      loadStats();
    }
  }, [selectedAccount, filter, pagination.page]);

  const loadAccounts = async () => {
    try {
      const response = await api.get("/ml-accounts");
      const accountsList =
        response.data.data?.accounts || response.data.accounts || [];
      setAccounts(accountsList);
      if (accountsList.length > 0) {
        setSelectedAccount(accountsList[0].id);
      }
    } catch (err) {
      setError("Erro ao carregar contas");
    }
  };

  const loadQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint =
        filter === "unanswered"
          ? `/questions/${selectedAccount}/unanswered`
          : `/questions/${selectedAccount}`;
      const response = await api.get(endpoint, {
        params: {
          all: true, // Fetch ALL questions without limit
        },
      });
      setQuestions(response.data.questions || []);

      // Update pagination info from response
      const total = response.data.total || response.data.questions?.length || 0;
      setPagination((prev) => ({
        ...prev,
        total,
        totalPages: 1, // Single page now since we fetch everything
      }));
    } catch (err) {
      setError("Erro ao carregar perguntas");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get(`/questions/${selectedAccount}/stats`);
      setStats(response.data);
    } catch (err) {
      console.error("Erro ao carregar estatisticas:", err);
    }
  };

  const syncQuestions = async () => {
    setSyncing(true);
    try {
      await api.post(`/questions/${selectedAccount}/sync`, {
        all: true, // Fetch ALL questions without limit
      });
      await loadQuestions();
      await loadStats();
    } catch (err) {
      setError("Erro ao sincronizar perguntas");
    } finally {
      setSyncing(false);
    }
  };

  const openAnswerModal = (question) => {
    setAnswerModal({ show: true, question });
    setAnswerText("");
  };

  const closeAnswerModal = () => {
    setAnswerModal({ show: false, question: null });
    setAnswerText("");
  };

  const submitAnswer = async () => {
    if (!answerText.trim()) return;

    setSubmitting(true);
    try {
      await api.post(
        `/questions/${selectedAccount}/${answerModal.question.mlQuestionId}/answer`,
        {
          text: answerText,
        },
      );
      closeAnswerModal();
      await loadQuestions();
      await loadStats();
    } catch (err) {
      setError("Erro ao enviar resposta");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("pt-BR");
  };

  const getTimeSince = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now - date) / 1000 / 60);

    if (diff < 60) return `${diff} min atras`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h atras`;
    return `${Math.floor(diff / 1440)} dias atras`;
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleAccountChange = (accountId) => {
    setSelectedAccount(accountId);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      handlePageChange(pagination.page - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.totalPages) {
      handlePageChange(pagination.page + 1);
    }
  };

  return (
    <div className="questions-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">help</span>
            Perguntas
          </h1>
          <p>Responda as perguntas dos compradores</p>
        </div>
        <div className="header-actions">
          <select
            className="account-select"
            value={selectedAccount}
            onChange={(e) => handleAccountChange(e.target.value)}
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.nickname || acc.mlUserId}
              </option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            onClick={syncQuestions}
            disabled={syncing || !selectedAccount}
          >
            <span className="material-icons">sync</span>
            {syncing ? "Sincronizando..." : "Sincronizar"}
          </button>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <span className="material-icons">quiz</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.total || 0}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>
          <div className="stat-card urgent">
            <div className="stat-icon red">
              <span className="material-icons">priority_high</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.unanswered || 0}</span>
              <span className="stat-label">Nao Respondidas</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <span className="material-icons">check_circle</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.answered || 0}</span>
              <span className="stat-label">Respondidas</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">
              <span className="material-icons">timer</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {stats.avgResponseTime || "N/A"}
              </span>
              <span className="stat-label">Tempo Medio Resposta</span>
            </div>
          </div>
        </div>
      )}

      <div className="filters-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === "unanswered" ? "active" : ""}`}
            onClick={() => handleFilterChange("unanswered")}
          >
            <span className="material-icons">schedule</span>
            Pendentes
            {stats?.unanswered > 0 && (
              <span className="tab-badge">{stats.unanswered}</span>
            )}
          </button>
          <button
            className={`filter-tab ${filter === "all" ? "active" : ""}`}
            onClick={() => handleFilterChange("all")}
          >
            <span className="material-icons">list</span>
            Todas
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      <div className="questions-list">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando perguntas...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="empty-state">
            <span className="material-icons">chat_bubble_outline</span>
            <h3>Nenhuma pergunta encontrada</h3>
            <p>
              {filter === "unanswered"
                ? "Voce respondeu todas as perguntas!"
                : "Clique em sincronizar para buscar perguntas"}
            </p>
          </div>
        ) : (
          questions.map((question) => (
            <div
              key={question._id || question.mlQuestionId}
              className="question-card"
            >
              <div className="question-header">
                <div className="question-product">
                  {question.item?.thumbnail && (
                    <img
                      src={question.item.thumbnail}
                      alt=""
                      className="product-thumb"
                    />
                  )}
                  <div className="product-info">
                    <span className="product-title">
                      {question.item?.title || "Produto"}
                    </span>
                    <span className="product-id">MLB{question.itemId}</span>
                  </div>
                </div>
                <div className="question-meta">
                  <span className="question-time">
                    <span className="material-icons">schedule</span>
                    {getTimeSince(question.dateCreated)}
                  </span>
                  <span className={`question-status ${question.status}`}>
                    {question.status === "UNANSWERED"
                      ? "Pendente"
                      : "Respondida"}
                  </span>
                </div>
              </div>

              <div className="question-body">
                <div className="question-text">
                  <span className="from-label">
                    <span className="material-icons">person</span>
                    {question.from?.nickname || "Comprador"}
                  </span>
                  <p>{question.text}</p>
                </div>

                {question.answer && (
                  <div className="answer-text">
                    <span className="from-label">
                      <span className="material-icons">store</span>
                      Sua resposta
                    </span>
                    <p>{question.answer.text}</p>
                    <span className="answer-date">
                      Respondido em {formatDate(question.answer.dateCreated)}
                    </span>
                  </div>
                )}
              </div>

              {question.status === "UNANSWERED" && (
                <div className="question-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => openAnswerModal(question)}
                  >
                    <span className="material-icons">reply</span>
                    Responder
                  </button>
                  <a
                    href={`https://www.mercadolivre.com.br/perguntas/vendedor?itemId=${question.itemId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                  >
                    <span className="material-icons">open_in_new</span>
                    Ver no ML
                  </a>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {!loading && questions.length > 0 && pagination.totalPages > 1 && (
        <div className="pagination-controls">
          <button
            className="btn btn-secondary pagination-btn"
            onClick={handlePrevPage}
            disabled={pagination.page === 1}
          >
            <span className="material-icons">chevron_left</span>
            Anterior
          </button>
          <div className="pagination-info">
            <span className="page-text">
              Pagina {pagination.page} de {pagination.totalPages}
            </span>
            <span className="total-text">
              ({pagination.total}{" "}
              {pagination.total === 1 ? "pergunta" : "perguntas"})
            </span>
          </div>
          <button
            className="btn btn-secondary pagination-btn"
            onClick={handleNextPage}
            disabled={pagination.page === pagination.totalPages}
          >
            Proxima
            <span className="material-icons">chevron_right</span>
          </button>
        </div>
      )}

      {answerModal.show && (
        <div className="modal-overlay" onClick={closeAnswerModal}>
          <div
            className="modal-content answer-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Responder Pergunta</h2>
              <button className="btn-close" onClick={closeAnswerModal}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="original-question">
                <label>Pergunta:</label>
                <p>{answerModal.question?.text}</p>
              </div>
              <div className="answer-form">
                <label>Sua resposta:</label>
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Digite sua resposta..."
                  rows={4}
                  maxLength={2000}
                />
                <span className="char-count">{answerText.length}/2000</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeAnswerModal}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={submitAnswer}
                disabled={submitting || !answerText.trim()}
              >
                {submitting ? "Enviando..." : "Enviar Resposta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Questions;
