import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import "./Quality.css";

function Quality() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [qualityStats, setQualityStats] = useState({
    professional: 0,
    satisfactory: 0,
    basic: 0,
    total: 0,
  });
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      loadQualityData();
    }
  }, [selectedAccount]);

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
      setLoading(false);
    }
  };

  const loadQualityData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/quality/${selectedAccount}`);

      if (response.data.success) {
        const qualityData = response.data.data;
        setQualityStats(
          qualityData.stats || {
            professional: 0,
            satisfactory: 0,
            basic: 0,
            total: 0,
          },
        );
        setItems(qualityData.items || []);
      } else {
        throw new Error("Failed to fetch quality data");
      }
    } catch (err) {
      console.error("Error loading quality data:", err);
      setError(
        "Erro ao carregar dados de qualidade. Verifique se você tem anúncios sincronizados.",
      );
      setQualityStats({ professional: 0, satisfactory: 0, basic: 0, total: 0 });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const getQualityConfig = (level) => {
    const configs = {
      professional: {
        color: "#10b981",
        label: "Profissional",
        icon: "verified",
        score: 90,
      },
      satisfactory: {
        color: "#f59e0b",
        label: "Satisfatoria",
        icon: "thumb_up",
        score: 70,
      },
      basic: { color: "#ef4444", label: "Basica", icon: "warning", score: 40 },
    };
    return configs[level] || configs.basic;
  };

  const filteredItems = items.filter((item) => {
    if (filter === "all") return true;
    return item.quality?.level === filter;
  });

  const chartData = [
    { name: "Profissional", value: qualityStats.professional, fill: "#10b981" },
    { name: "Satisfatoria", value: qualityStats.satisfactory, fill: "#f59e0b" },
    { name: "Basica", value: qualityStats.basic, fill: "#ef4444" },
  ];

  const overallScore =
    qualityStats.total > 0
      ? Math.round(
          (qualityStats.professional * 100 +
            qualityStats.satisfactory * 70 +
            qualityStats.basic * 40) /
            qualityStats.total,
        )
      : 0;

  const scoreColor =
    overallScore >= 80 ? "#10b981" : overallScore >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="quality-page">
      {/* Header */}
      <header className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">star_rate</span>
            Qualidade das Publicacoes
          </h1>
          <p>Melhore seus anuncios para vender mais</p>
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
          <button className="btn btn-secondary" onClick={loadQualityData}>
            <span className="material-icons">refresh</span>
            Atualizar
          </button>
        </div>
      </header>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Analisando qualidade...</p>
        </div>
      ) : (
        <>
          {/* Overview Section */}
          <section className="overview-section">
            <div className="overview-grid">
              {/* Score Card */}
              <div className="score-card">
                <div className="score-gauge">
                  <ResponsiveContainer width="100%" height={180}>
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="70%"
                      outerRadius="100%"
                      barSize={12}
                      data={[{ value: overallScore, fill: scoreColor }]}
                      startAngle={180}
                      endAngle={0}
                    >
                      <RadialBar
                        background={{ fill: "#e5e7eb" }}
                        dataKey="value"
                        cornerRadius={6}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="score-center">
                    <span className="score-value" style={{ color: scoreColor }}>
                      {overallScore}
                    </span>
                    <span className="score-label">Score Geral</span>
                  </div>
                </div>
                <div className="score-info">
                  <p>
                    {overallScore >= 80
                      ? "Excelente! Seus anuncios estao otimizados."
                      : overallScore >= 60
                        ? "Bom, mas ha espaco para melhorias."
                        : "Atencao! Melhore seus anuncios para vender mais."}
                  </p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="stats-cards">
                <div
                  className={`stat-card green ${filter === "professional" ? "active" : ""}`}
                  onClick={() =>
                    setFilter(
                      filter === "professional" ? "all" : "professional",
                    )
                  }
                >
                  <div className="stat-icon">
                    <span className="material-icons">verified</span>
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">
                      {qualityStats.professional}
                    </span>
                    <span className="stat-label">Profissional</span>
                  </div>
                  <div className="stat-percent">
                    {qualityStats.total > 0
                      ? Math.round(
                          (qualityStats.professional / qualityStats.total) *
                            100,
                        )
                      : 0}
                    %
                  </div>
                </div>

                <div
                  className={`stat-card yellow ${filter === "satisfactory" ? "active" : ""}`}
                  onClick={() =>
                    setFilter(
                      filter === "satisfactory" ? "all" : "satisfactory",
                    )
                  }
                >
                  <div className="stat-icon">
                    <span className="material-icons">thumb_up</span>
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">
                      {qualityStats.satisfactory}
                    </span>
                    <span className="stat-label">Satisfatoria</span>
                  </div>
                  <div className="stat-percent">
                    {qualityStats.total > 0
                      ? Math.round(
                          (qualityStats.satisfactory / qualityStats.total) *
                            100,
                        )
                      : 0}
                    %
                  </div>
                </div>

                <div
                  className={`stat-card red ${filter === "basic" ? "active" : ""}`}
                  onClick={() =>
                    setFilter(filter === "basic" ? "all" : "basic")
                  }
                >
                  <div className="stat-icon">
                    <span className="material-icons">warning</span>
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">{qualityStats.basic}</span>
                    <span className="stat-label">Basica</span>
                  </div>
                  <div className="stat-percent">
                    {qualityStats.total > 0
                      ? Math.round(
                          (qualityStats.basic / qualityStats.total) * 100,
                        )
                      : 0}
                    %
                  </div>
                </div>
              </div>

              {/* Distribution Chart */}
              <div className="distribution-card">
                <h3>Distribuicao</h3>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={chartData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={80}
                      fontSize={11}
                    />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Items List */}
          <section className="items-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="material-icons">inventory_2</span>
                Anuncios ({filteredItems.length})
              </h2>
              {filter !== "all" && (
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setFilter("all")}
                >
                  <span className="material-icons">close</span>
                  Limpar filtro
                </button>
              )}
            </div>

            <div className="items-grid">
              {filteredItems.map((item) => {
                const config = getQualityConfig(item.quality?.level);
                return (
                  <div
                    key={item._id || item.mlItemId}
                    className={`item-card ${item.quality?.level}`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="item-image">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt="" />
                      ) : (
                        <div className="no-image">
                          <span className="material-icons">image</span>
                        </div>
                      )}
                      <div
                        className="quality-badge"
                        style={{ background: config.color }}
                      >
                        <span className="material-icons">{config.icon}</span>
                        {config.label}
                      </div>
                    </div>

                    <div className="item-content">
                      <h4 className="item-title">{item.title}</h4>
                      <p className="item-id">MLB{item.mlItemId}</p>

                      <div className="quality-score">
                        <div className="score-bar">
                          <div
                            className="score-fill"
                            style={{
                              width: `${item.quality?.score || 50}%`,
                              background: config.color,
                            }}
                          ></div>
                        </div>
                        <span className="score-text">
                          {item.quality?.score || 50}%
                        </span>
                      </div>

                      {item.quality?.issues?.length > 0 && (
                        <div className="issues-preview">
                          <span className="material-icons">error_outline</span>
                          <span>{item.quality.issues.length} problema(s)</span>
                        </div>
                      )}
                    </div>

                    <div className="item-actions">
                      <Link
                        to={`/items/${item.mlItemId}/edit`}
                        className="btn btn-sm btn-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="material-icons">edit</span>
                        Melhorar
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredItems.length === 0 && (
              <div className="empty-state">
                <span className="material-icons">inventory_2</span>
                <h3>Nenhum anuncio encontrado</h3>
                <p>Nao ha anuncios com o filtro selecionado</p>
              </div>
            )}
          </section>

          {/* Item Detail Modal */}
          {selectedItem && (
            <div
              className="modal-overlay"
              onClick={() => setSelectedItem(null)}
            >
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h2>Detalhes da Qualidade</h2>
                  <button
                    className="btn-close"
                    onClick={() => setSelectedItem(null)}
                  >
                    <span className="material-icons">close</span>
                  </button>
                </div>

                <div className="modal-body">
                  <div className="item-detail-header">
                    {selectedItem.thumbnail && (
                      <img
                        src={selectedItem.thumbnail}
                        alt=""
                        className="item-thumb"
                      />
                    )}
                    <div className="item-detail-info">
                      <h3>{selectedItem.title}</h3>
                      <p>MLB{selectedItem.mlItemId}</p>
                      <div
                        className="quality-level-badge"
                        style={{
                          background: getQualityConfig(
                            selectedItem.quality?.level,
                          ).color,
                        }}
                      >
                        <span className="material-icons">
                          {getQualityConfig(selectedItem.quality?.level).icon}
                        </span>
                        {getQualityConfig(selectedItem.quality?.level).label}
                      </div>
                    </div>
                  </div>

                  <div className="quality-detail-score">
                    <div
                      className="detail-score-circle"
                      style={{
                        "--score-color": getQualityConfig(
                          selectedItem.quality?.level,
                        ).color,
                      }}
                    >
                      <span className="score">
                        {selectedItem.quality?.score || 50}
                      </span>
                      <span className="label">Score</span>
                    </div>
                  </div>

                  {selectedItem.quality?.issues?.length > 0 ? (
                    <div className="issues-section">
                      <h4>
                        <span className="material-icons">build</span>
                        Acoes para Melhorar
                      </h4>
                      <ul className="issues-list">
                        {selectedItem.quality.issues.map((issue, idx) => (
                          <li
                            key={idx}
                            className={`issue-item ${issue.priority}`}
                          >
                            <span className="material-icons">
                              {issue.priority === "high"
                                ? "error"
                                : issue.priority === "medium"
                                  ? "warning"
                                  : "info"}
                            </span>
                            <span className="issue-message">
                              {issue.message}
                            </span>
                            <span
                              className={`issue-priority ${issue.priority}`}
                            >
                              {issue.priority === "high"
                                ? "Alta"
                                : issue.priority === "medium"
                                  ? "Media"
                                  : "Baixa"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="no-issues">
                      <span className="material-icons">check_circle</span>
                      <p>Este anuncio nao possui problemas identificados!</p>
                    </div>
                  )}

                  <div className="modal-actions">
                    <Link
                      to={`/items/${selectedItem.mlItemId}/edit`}
                      className="btn btn-primary"
                    >
                      <span className="material-icons">edit</span>
                      Editar Anuncio
                    </Link>
                    <a
                      href={
                        selectedItem.permalink ||
                        `https://produto.mercadolivre.com.br/MLB-${selectedItem.mlItemId}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                    >
                      <span className="material-icons">open_in_new</span>
                      Ver no ML
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tips Section */}
          <section className="tips-section">
            <h2 className="section-title">
              <span className="material-icons">lightbulb</span>
              Como Melhorar sua Qualidade
            </h2>

            <div className="tips-grid">
              <div className="tip-card">
                <div className="tip-icon">
                  <span className="material-icons">photo_camera</span>
                </div>
                <h4>Fotos de Qualidade</h4>
                <p>
                  Use fotos em alta resolucao, fundo branco e mostre o produto
                  de varios angulos.
                </p>
              </div>

              <div className="tip-card">
                <div className="tip-icon">
                  <span className="material-icons">description</span>
                </div>
                <h4>Descricao Completa</h4>
                <p>
                  Escreva descricoes detalhadas com especificacoes tecnicas e
                  beneficios do produto.
                </p>
              </div>

              <div className="tip-card">
                <div className="tip-icon">
                  <span className="material-icons">list_alt</span>
                </div>
                <h4>Atributos Preenchidos</h4>
                <p>
                  Complete todos os atributos solicitados para melhorar a
                  visibilidade nas buscas.
                </p>
              </div>

              <div className="tip-card">
                <div className="tip-icon">
                  <span className="material-icons">qr_code</span>
                </div>
                <h4>Codigo EAN/GTIN</h4>
                <p>
                  Adicione o codigo de barras do produto para vincula-lo ao
                  catalogo do ML.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default Quality;
