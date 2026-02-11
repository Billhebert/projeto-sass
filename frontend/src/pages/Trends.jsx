import { useState } from "react";
import { Link } from "react-router-dom";
import { useTrends } from "../hooks/useApi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import "./Trends.css";

function Trends() {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const popularCategories = [
    { id: "MLB5672", name: "Acessorios para Veiculos" },
    { id: "MLB1648", name: "Informatica" },
    { id: "MLB1051", name: "Celulares e Telefones" },
    { id: "MLB1574", name: "Casa, Moveis e Decoracao" },
    { id: "MLB1276", name: "Esportes e Fitness" },
    { id: "MLB1000", name: "Eletronicos, Audio e Video" },
    { id: "MLB1430", name: "Calcados, Roupas e Bolsas" },
    { id: "MLB1499", name: "Industria e Comercio" },
    { id: "MLB1953", name: "Mais Categorias" },
  ];

  // Use React Query hook for trends
  const {
    data: trendsData,
    isLoading,
    error,
    refetch,
  } = useTrends(selectedCategory);

  // Extract trends from response
  const trends = trendsData?.trends || [];

  const getGrowthColor = (growth) => {
    if (growth > 15) return "#10b981";
    if (growth > 0) return "#84cc16";
    if (growth > -10) return "#f59e0b";
    return "#ef4444";
  };

  const getGrowthIcon = (growth) => {
    if (growth > 0) return "trending_up";
    if (growth < 0) return "trending_down";
    return "trending_flat";
  };

  const formatVolume = (volume) => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toString();
  };

  const filteredTrends = trends.filter((trend) =>
    trend.keyword.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const chartData = filteredTrends.slice(0, 10).map((t) => ({
    name:
      t.keyword.length > 20 ? t.keyword.substring(0, 20) + "..." : t.keyword,
    volume: t.volume,
    growth: t.growth,
  }));

  return (
    <div className="trends-page">
      {/* Header */}
      <header className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">trending_up</span>
            Tendencias de Mercado
          </h1>
          <p>Descubra o que esta vendendo mais no Mercado Livre</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => refetch()}>
            <span className="material-icons">refresh</span>
            Atualizar
          </button>
        </div>
      </header>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          Erro ao carregar tendências. Dados de tendências não disponíveis.
        </div>
      )}

      {/* Search & Filters */}
      <section className="filters-section">
        <div className="search-box">
          <span className="material-icons">search</span>
          <input
            type="text"
            placeholder="Buscar tendencias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-btn" onClick={() => setSearchTerm("")}>
              <span className="material-icons">close</span>
            </button>
          )}
        </div>

        <div className="category-chips">
          <button
            className={`chip ${!selectedCategory ? "active" : ""}`}
            onClick={() => setSelectedCategory("")}
          >
            Todas
          </button>
          {popularCategories.map((cat) => (
            <button
              key={cat.id}
              className={`chip ${selectedCategory === cat.id ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Carregando tendencias...</p>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <section className="overview-section">
            <div className="overview-grid">
              <div className="trend-highlight hot">
                <div className="highlight-icon">
                  <span className="material-icons">local_fire_department</span>
                </div>
                <div className="highlight-content">
                  <span className="highlight-label">Mais Buscado</span>
                  <span className="highlight-value">
                    {filteredTrends[0]?.keyword || "N/A"}
                  </span>
                  <span className="highlight-volume">
                    {formatVolume(filteredTrends[0]?.volume || 0)} buscas
                  </span>
                </div>
              </div>

              <div className="trend-highlight growing">
                <div className="highlight-icon">
                  <span className="material-icons">rocket_launch</span>
                </div>
                <div className="highlight-content">
                  <span className="highlight-label">Maior Crescimento</span>
                  <span className="highlight-value">
                    {filteredTrends.sort((a, b) => b.growth - a.growth)[0]
                      ?.keyword || "N/A"}
                  </span>
                  <span className="highlight-growth positive">
                    +
                    {filteredTrends
                      .sort((a, b) => b.growth - a.growth)[0]
                      ?.growth.toFixed(1) || 0}
                    %
                  </span>
                </div>
              </div>

              <div className="trend-highlight total">
                <div className="highlight-icon">
                  <span className="material-icons">insights</span>
                </div>
                <div className="highlight-content">
                  <span className="highlight-label">Total Analisado</span>
                  <span className="highlight-value">
                    {filteredTrends.length}
                  </span>
                  <span className="highlight-volume">tendencias</span>
                </div>
              </div>
            </div>
          </section>

          {/* Chart Section */}
          <section className="chart-section">
            <div className="chart-card">
              <div className="chart-header">
                <h3>
                  <span className="material-icons">bar_chart</span>
                  Top 10 Tendencias
                </h3>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      type="number"
                      tickFormatter={formatVolume}
                      stroke="#9ca3af"
                      fontSize={11}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={150}
                      stroke="#9ca3af"
                      fontSize={11}
                    />
                    <Tooltip
                      formatter={(value) => [formatVolume(value), "Volume"]}
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar
                      dataKey="volume"
                      radius={[0, 4, 4, 0]}
                      fill="#3b82f6"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Trends List */}
          <section className="trends-section">
            <h2 className="section-title">
              <span className="material-icons">leaderboard</span>
              Ranking de Tendencias
            </h2>

            <div className="trends-table-container">
              <table className="trends-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Palavra-chave</th>
                    <th>Categoria</th>
                    <th>Volume</th>
                    <th>Crescimento</th>
                    <th>Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrends.map((trend, idx) => (
                    <tr key={idx}>
                      <td className="rank-cell">
                        <span className={`rank ${idx < 3 ? "top" : ""}`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="keyword-cell">
                        <div className="keyword-content">
                          <span className="keyword">{trend.keyword}</span>
                          {idx < 3 && (
                            <span className="material-icons fire-icon">
                              local_fire_department
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="category-cell">
                        <span className="category-badge">
                          {trend.category || "Geral"}
                        </span>
                      </td>
                      <td className="volume-cell">
                        <span className="volume">
                          {formatVolume(trend.volume)}
                        </span>
                        <span className="volume-label">buscas/mes</span>
                      </td>
                      <td className="growth-cell">
                        <div
                          className="growth-indicator"
                          style={{ color: getGrowthColor(trend.growth) }}
                        >
                          <span className="material-icons">
                            {getGrowthIcon(trend.growth)}
                          </span>
                          <span>
                            {trend.growth > 0 ? "+" : ""}
                            {trend.growth.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="action-cell">
                        <a
                          href={`https://lista.mercadolivre.com.br/${encodeURIComponent(trend.keyword)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-secondary"
                        >
                          <span className="material-icons">search</span>
                          Ver no ML
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredTrends.length === 0 && (
              <div className="empty-state">
                <span className="material-icons">search_off</span>
                <h3>Nenhuma tendencia encontrada</h3>
                <p>Tente buscar por outro termo</p>
              </div>
            )}
          </section>

          {/* Opportunities Section */}
          <section className="opportunities-section">
            <h2 className="section-title">
              <span className="material-icons">lightbulb</span>
              Oportunidades Identificadas
            </h2>

            <div className="opportunities-grid">
              {filteredTrends
                .filter((t) => t.growth > 15)
                .slice(0, 6)
                .map((trend, idx) => (
                  <div key={idx} className="opportunity-card">
                    <div className="opportunity-header">
                      <span className="opportunity-rank">#{idx + 1}</span>
                      <span
                        className="opportunity-growth"
                        style={{ color: getGrowthColor(trend.growth) }}
                      >
                        <span className="material-icons">trending_up</span>+
                        {trend.growth.toFixed(1)}%
                      </span>
                    </div>
                    <h4 className="opportunity-keyword">{trend.keyword}</h4>
                    <p className="opportunity-volume">
                      {formatVolume(trend.volume)} buscas mensais
                    </p>
                    <div className="opportunity-actions">
                      <Link
                        to="/items/create"
                        className="btn btn-sm btn-primary"
                      >
                        <span className="material-icons">add</span>
                        Criar Anuncio
                      </Link>
                      <a
                        href={`https://lista.mercadolivre.com.br/${encodeURIComponent(trend.keyword)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-secondary"
                      >
                        <span className="material-icons">open_in_new</span>
                      </a>
                    </div>
                  </div>
                ))}
            </div>

            {filteredTrends.filter((t) => t.growth > 15).length === 0 && (
              <div className="no-opportunities">
                <span className="material-icons">explore</span>
                <p>
                  Nenhuma oportunidade de alto crescimento encontrada no
                  momento.
                </p>
              </div>
            )}
          </section>

          {/* Tips Section */}
          <section className="tips-section">
            <h2 className="section-title">
              <span className="material-icons">tips_and_updates</span>
              Como Usar as Tendencias
            </h2>

            <div className="tips-grid">
              <div className="tip-card">
                <div className="tip-number">1</div>
                <h4>Analise o Volume</h4>
                <p>
                  Produtos com alto volume de buscas indicam grande demanda.
                  Priorize esses nichos.
                </p>
              </div>

              <div className="tip-card">
                <div className="tip-number">2</div>
                <h4>Observe o Crescimento</h4>
                <p>
                  Tendencias em alta (verde) sao oportunidades. Tendencias em
                  queda podem ser arriscadas.
                </p>
              </div>

              <div className="tip-card">
                <div className="tip-number">3</div>
                <h4>Pesquise a Concorrencia</h4>
                <p>
                  Antes de criar anuncios, veja quantos vendedores ja oferecem o
                  produto.
                </p>
              </div>

              <div className="tip-card">
                <div className="tip-number">4</div>
                <h4>Otimize seus Titulos</h4>
                <p>
                  Use as palavras-chave em tendencia nos titulos dos seus
                  anuncios para melhor visibilidade.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default Trends;
