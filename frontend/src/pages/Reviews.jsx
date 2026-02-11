import { useState } from "react";
import {
  useMLAccounts,
  useReviewsStats,
  useAllReviews,
  usePendingReviews,
  useNegativeReviews,
  useReplyToReview,
} from "../hooks/useApi";
import "./Reviews.css";

function Reviews() {
  // Load accounts and select first one
  const { data: accounts = [] } = useMLAccounts();
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id || "");

  // Fetch reviews data using React Query hooks
  const { data: stats, isLoading: statsLoading } =
    useReviewsStats(selectedAccount);
  const {
    data: reviews = [],
    isLoading: reviewsLoading,
    refetch: refetchReviews,
  } = useAllReviews(selectedAccount, 100);
  const {
    data: pendingReviews = [],
    isLoading: pendingLoading,
    refetch: refetchPending,
  } = usePendingReviews(selectedAccount);
  const {
    data: negativeReviews = [],
    isLoading: negativeLoading,
    refetch: refetchNegative,
  } = useNegativeReviews(selectedAccount);

  // Reply mutation
  const replyMutation = useReplyToReview();

  // Local UI states
  const [activeTab, setActiveTab] = useState("all");
  const [selectedReview, setSelectedReview] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Update selected account when accounts load
  useState(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts]);

  // Combined loading state
  const loading =
    statsLoading || reviewsLoading || pendingLoading || negativeLoading;

  const handleRefresh = () => {
    refetchReviews();
    refetchPending();
    refetchNegative();
  };

  const handleReply = async (reviewId) => {
    if (!replyText.trim()) {
      setError("Digite uma resposta");
      return;
    }

    try {
      await replyMutation.mutateAsync({
        accountId: selectedAccount,
        reviewId,
        text: replyText,
      });
      setSuccess("Resposta enviada com sucesso!");
      setReplyText("");
      setSelectedReview(null);
      // React Query will automatically refetch
    } catch (err) {
      setError("Erro ao enviar resposta");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const renderStars = (rating) => {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`material-icons star ${star <= rating ? "filled" : ""}`}
          >
            star
          </span>
        ))}
      </div>
    );
  };

  const getRatingColor = (rating) => {
    if (rating >= 4) return "success";
    if (rating === 3) return "warning";
    return "danger";
  };

  const getDisplayReviews = () => {
    switch (activeTab) {
      case "pending":
        return pendingReviews;
      case "negative":
        return negativeReviews;
      default:
        return reviews;
    }
  };

  return (
    <div className="reviews-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">rate_review</span>
            Avaliacoes e Opinioes
          </h1>
          <p>Gerencie as avaliacoes dos seus produtos</p>
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
            onClick={handleRefresh}
            disabled={loading}
          >
            <span className="material-icons">refresh</span>
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-cards">
          <div className="stat-card primary">
            <div className="stat-value">
              {stats.average_rating?.toFixed(1) || "0.0"}
              <span className="material-icons">star</span>
            </div>
            <div className="stat-label">Media Geral</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.total_reviews || 0}</div>
            <div className="stat-label">Total de Avaliacoes</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-value">{stats.pending_replies || 0}</div>
            <div className="stat-label">Aguardando Resposta</div>
          </div>
          <div className="stat-card success">
            <div className="stat-value">{stats.positive_percentage || 0}%</div>
            <div className="stat-label">Avaliacoes Positivas</div>
          </div>
        </div>
      )}

      {/* Sentiment Distribution */}
      {stats && stats.sentiment && (
        <div className="sentiment-section">
          <h3>Distribuicao de Sentimento</h3>
          <div className="sentiment-bars">
            <div className="sentiment-bar">
              <div className="sentiment-info">
                <span className="sentiment-label success">Positivas (4-5)</span>
                <span className="sentiment-count">
                  {stats.sentiment.positive}
                </span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill success"
                  style={{
                    width: `${stats.total_reviews > 0 ? (stats.sentiment.positive / stats.total_reviews) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="sentiment-bar">
              <div className="sentiment-info">
                <span className="sentiment-label warning">Neutras (3)</span>
                <span className="sentiment-count">
                  {stats.sentiment.neutral}
                </span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill warning"
                  style={{
                    width: `${stats.total_reviews > 0 ? (stats.sentiment.neutral / stats.total_reviews) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="sentiment-bar">
              <div className="sentiment-info">
                <span className="sentiment-label danger">Negativas (1-2)</span>
                <span className="sentiment-count">
                  {stats.sentiment.negative}
                </span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill danger"
                  style={{
                    width: `${stats.total_reviews > 0 ? (stats.sentiment.negative / stats.total_reviews) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="reviews-tabs">
        <button
          className={`tab ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          <span className="material-icons">list</span>
          Todas ({reviews.length})
        </button>
        <button
          className={`tab ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          <span className="material-icons">pending</span>
          Pendentes ({pendingReviews.length})
        </button>
        <button
          className={`tab ${activeTab === "negative" ? "active" : ""}`}
          onClick={() => setActiveTab("negative")}
        >
          <span className="material-icons">thumb_down</span>
          Negativas ({negativeReviews.length})
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error}
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span className="material-icons">check_circle</span>
          {success}
          <button onClick={() => setSuccess(null)}>&times;</button>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Carregando avaliacoes...</p>
        </div>
      ) : (
        <div className="reviews-list">
          {getDisplayReviews().length === 0 ? (
            <div className="empty-state">
              <span className="material-icons">rate_review</span>
              <h3>Nenhuma avaliacao encontrada</h3>
              <p>
                {activeTab === "pending"
                  ? "Todas as avaliacoes foram respondidas!"
                  : activeTab === "negative"
                    ? "Otimo! Nenhuma avaliacao negativa."
                    : "Suas avaliacoes aparecerao aqui"}
              </p>
            </div>
          ) : (
            getDisplayReviews().map((review, idx) => (
              <div
                key={idx}
                className={`review-card rating-${getRatingColor(review.rate)}`}
              >
                <div className="review-header">
                  <div className="reviewer-info">
                    <div className="reviewer-avatar">
                      {review.reviewer?.nickname?.charAt(0) || "?"}
                    </div>
                    <div className="reviewer-details">
                      <span className="reviewer-name">
                        {review.reviewer?.nickname || "Comprador"}
                      </span>
                      <span className="review-date">
                        {formatDate(review.date_created)}
                      </span>
                    </div>
                  </div>
                  <div className="review-rating">
                    {renderStars(review.rate)}
                    <span
                      className={`rating-badge ${getRatingColor(review.rate)}`}
                    >
                      {review.rate}/5
                    </span>
                  </div>
                </div>

                <div className="review-content">
                  {review.title && (
                    <h4 className="review-title">{review.title}</h4>
                  )}
                  <p className="review-text">
                    {review.content || "Sem comentario"}
                  </p>
                </div>

                {review.item_id && (
                  <div className="review-item">
                    <span className="material-icons">inventory_2</span>
                    <span>Item: {review.item_id}</span>
                  </div>
                )}

                {review.reply && review.reply.text ? (
                  <div className="review-reply">
                    <div className="reply-header">
                      <span className="material-icons">reply</span>
                      <span>Sua resposta</span>
                    </div>
                    <p className="reply-text">{review.reply.text}</p>
                  </div>
                ) : (
                  <div className="review-actions">
                    {selectedReview === review.id ? (
                      <div className="reply-form">
                        <textarea
                          placeholder="Digite sua resposta..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={3}
                        />
                        <div className="reply-buttons">
                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              setSelectedReview(null);
                              setReplyText("");
                            }}
                          >
                            Cancelar
                          </button>
                          <button
                            className="btn btn-primary"
                            onClick={() => handleReply(review.id)}
                            disabled={replyMutation.isPending}
                          >
                            {replyMutation.isPending
                              ? "Enviando..."
                              : "Enviar Resposta"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="btn btn-outline"
                        onClick={() => setSelectedReview(review.id)}
                      >
                        <span className="material-icons">reply</span>
                        Responder
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Reviews;
