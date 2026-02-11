import { useState, useMemo } from "react";
import {
  useMLAccounts,
  useGlobalSellingData,
  useLocalItems,
} from "../hooks/useApi";
import "./GlobalSelling.css";

function GlobalSelling() {
  // React Query hooks
  const { data: accounts = [], isLoading: accountsLoading } = useMLAccounts();
  const [selectedAccount, setSelectedAccount] = useState("");

  const { data: globalSellingData, isLoading: globalDataLoading } =
    useGlobalSellingData(selectedAccount);
  const { data: localItems = [], isLoading: localItemsLoading } =
    useLocalItems(selectedAccount);

  // Local state
  const [activeTab, setActiveTab] = useState("overview");
  const [globalItems, setGlobalItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [publishForm, setPublishForm] = useState({
    items: [],
    targetCountries: [],
    pricingStrategy: "net_proceeds",
    markup: 0,
  });

  const availableCountries = [
    { code: "MLA", name: "Argentina", currency: "ARS", flag: "🇦🇷" },
    { code: "MLM", name: "Mexico", currency: "MXN", flag: "🇲🇽" },
    { code: "MLC", name: "Chile", currency: "CLP", flag: "🇨🇱" },
    { code: "MCO", name: "Colombia", currency: "COP", flag: "🇨🇴" },
    { code: "MLU", name: "Uruguai", currency: "UYU", flag: "🇺🇾" },
    { code: "MPE", name: "Peru", currency: "PEN", flag: "🇵🇪" },
    { code: "MEC", name: "Equador", currency: "USD", flag: "🇪🇨" },
  ];

  // Set first account when accounts load
  useState(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].id || accounts[0].accountId);
    }
  }, [accounts, selectedAccount]);

  // Extract stats from global selling data
  const stats = useMemo(() => {
    return (
      globalSellingData?.stats || {
        totalGlobalItems: 0,
        activeCountries: 0,
        pendingShipments: 0,
        totalRevenue: 0,
      }
    );
  }, [globalSellingData]);

  const handlePublishGlobal = async () => {
    try {
      // Simulated API call
      console.log("Publishing items globally:", publishForm);
      alert("Produtos publicados com sucesso nos paises selecionados!");
      setShowPublishModal(false);
    } catch (error) {
      console.error("Error publishing globally:", error);
    }
  };

  const handlePauseCountry = (itemId, countryCode) => {
    setGlobalItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            publishedCountries: item.publishedCountries.map((c) => {
              if (c.code === countryCode) {
                return {
                  ...c,
                  status: c.status === "active" ? "paused" : "active",
                };
              }
              return c;
            }),
          };
        }
        return item;
      }),
    );
  };

  const handleRemoveCountry = (itemId, countryCode) => {
    if (window.confirm(`Remover publicacao em ${countryCode}?`)) {
      setGlobalItems((prev) =>
        prev.map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              publishedCountries: item.publishedCountries.filter(
                (c) => c.code !== countryCode,
              ),
            };
          }
          return item;
        }),
      );
    }
  };

  const formatCurrency = (value, currency = "BRL") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
    }).format(value);
  };

  const getCountryInfo = (code) => {
    return (
      availableCountries.find((c) => c.code === code) || {
        name: code,
        flag: "",
        currency: "USD",
      }
    );
  };

  const filteredLocalItems = useMemo(() => {
    return localItems.filter(
      (item) =>
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id?.includes(searchTerm),
    );
  }, [localItems, searchTerm]);

  const loading = accountsLoading || globalDataLoading;

  return (
    <div className="global-selling-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Global Selling</h1>
          <p>
            Venda seus produtos em outros paises da America Latina com
            Cross-Border Trade
          </p>
        </div>
        <div className="header-actions">
          <select
            className="account-select"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            disabled={accountsLoading}
          >
            <option value="">Selecione uma conta</option>
            {accounts.map((account) => (
              <option
                key={account.id || account.accountId}
                value={account.id || account.accountId}
              >
                {account.nickname || account.id || account.accountId}
              </option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            onClick={() => setShowPublishModal(true)}
            disabled={!selectedAccount}
          >
            <span className="material-icons">add</span>
            Publicar Globalmente
          </button>
        </div>
      </div>

      {!selectedAccount ? (
        <div className="empty-state">
          <span className="material-icons">public</span>
          <h3>Selecione uma conta</h3>
          <p>
            Selecione uma conta do Mercado Livre para gerenciar vendas
            internacionais
          </p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue">
                <span className="material-icons">inventory_2</span>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.totalGlobalItems}</span>
                <span className="stat-label">Produtos Globais</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">
                <span className="material-icons">flag</span>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.activeCountries}</span>
                <span className="stat-label">Paises Ativos</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon orange">
                <span className="material-icons">local_shipping</span>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.pendingShipments}</span>
                <span className="stat-label">Envios Pendentes</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon purple">
                <span className="material-icons">payments</span>
              </div>
              <div className="stat-info">
                <span className="stat-value">
                  {formatCurrency(stats.totalRevenue)}
                </span>
                <span className="stat-label">Receita Global</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              <span className="material-icons">grid_view</span>
              Visao Geral
            </button>
            <button
              className={`tab ${activeTab === "items" ? "active" : ""}`}
              onClick={() => setActiveTab("items")}
            >
              <span className="material-icons">inventory_2</span>
              Produtos
            </button>
            <button
              className={`tab ${activeTab === "shipments" ? "active" : ""}`}
              onClick={() => setActiveTab("shipments")}
            >
              <span className="material-icons">local_shipping</span>
              Envios
            </button>
            <button
              className={`tab ${activeTab === "countries" ? "active" : ""}`}
              onClick={() => setActiveTab("countries")}
            >
              <span className="material-icons">public</span>
              Paises
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Carregando dados globais...</p>
            </div>
          ) : (
            <>
              {activeTab === "overview" && (
                <div className="section">
                  <div className="section-header">
                    <h2>Produtos Publicados Globalmente</h2>
                  </div>

                  {globalItems.length === 0 ? (
                    <div className="empty-state">
                      <span className="material-icons">public</span>
                      <h3>Nenhum produto global</h3>
                      <p>
                        Comece a vender internacionalmente publicando seus
                        produtos em outros paises
                      </p>
                      <button
                        className="btn btn-primary"
                        onClick={() => setShowPublishModal(true)}
                      >
                        Publicar Primeiro Produto
                      </button>
                    </div>
                  ) : (
                    <div className="global-items-list">
                      {globalItems.map((item) => (
                        <div key={item.id} className="global-item-card">
                          <div className="item-main">
                            <img
                              src={item.thumbnail || "/placeholder.png"}
                              alt={item.title}
                              className="item-image"
                            />
                            <div className="item-info">
                              <h3>{item.title}</h3>
                              <p className="item-id">{item.id}</p>
                              <p className="item-local-price">
                                Preco local: {formatCurrency(item.localPrice)}
                              </p>
                            </div>
                          </div>

                          <div className="countries-published">
                            <h4>Paises Publicados</h4>
                            <div className="countries-grid">
                              {item.publishedCountries.map((country) => {
                                const countryInfo = getCountryInfo(
                                  country.code,
                                );
                                return (
                                  <div
                                    key={country.code}
                                    className={`country-card ${country.status}`}
                                  >
                                    <div className="country-header">
                                      <span className="country-flag">
                                        {countryInfo.flag}
                                      </span>
                                      <span className="country-name">
                                        {countryInfo.name}
                                      </span>
                                      <span
                                        className={`status-dot ${country.status}`}
                                      ></span>
                                    </div>
                                    <div className="country-details">
                                      <div className="detail">
                                        <span className="label">Preco</span>
                                        <span className="value">
                                          {formatCurrency(
                                            country.price,
                                            countryInfo.currency,
                                          )}
                                        </span>
                                      </div>
                                      <div className="detail">
                                        <span className="label">Vendas</span>
                                        <span className="value">
                                          {country.sales}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="country-actions">
                                      <button
                                        className="btn btn-sm"
                                        onClick={() =>
                                          handlePauseCountry(
                                            item.id,
                                            country.code,
                                          )
                                        }
                                      >
                                        {country.status === "active"
                                          ? "Pausar"
                                          : "Ativar"}
                                      </button>
                                      <button
                                        className="btn btn-sm danger"
                                        onClick={() =>
                                          handleRemoveCountry(
                                            item.id,
                                            country.code,
                                          )
                                        }
                                      >
                                        Remover
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "countries" && (
                <div className="section">
                  <div className="section-header">
                    <h2>Paises Disponiveis</h2>
                  </div>

                  <div className="countries-available">
                    {availableCountries.map((country) => (
                      <div
                        key={country.code}
                        className="available-country-card"
                      >
                        <div className="country-info">
                          <span className="country-flag large">
                            {country.flag}
                          </span>
                          <div>
                            <h3>{country.name}</h3>
                            <p>Mercado Livre {country.code}</p>
                          </div>
                        </div>
                        <div className="country-stats">
                          <div className="stat">
                            <span className="label">Moeda</span>
                            <span className="value">{country.currency}</span>
                          </div>
                          <div className="stat">
                            <span className="label">Produtos</span>
                            <span className="value">
                              {globalItems.reduce(
                                (acc, item) =>
                                  acc +
                                  (item.publishedCountries.some(
                                    (c) => c.code === country.code,
                                  )
                                    ? 1
                                    : 0),
                                0,
                              )}
                            </span>
                          </div>
                        </div>
                        <button className="btn btn-secondary">
                          <span className="material-icons">visibility</span>
                          Ver Detalhes
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "shipments" && (
                <div className="section">
                  <div className="section-header">
                    <h2>Envios Internacionais</h2>
                  </div>

                  <div className="info-banner">
                    <span className="material-icons">info</span>
                    <div>
                      <strong>Net Proceeds Obrigatorio</strong>
                      <p>
                        A partir de 26/01/2026, todos os envios CBT devem usar
                        precificacao Net Proceeds para garantir transparencia
                        nos custos.
                      </p>
                    </div>
                  </div>

                  <div className="shipments-list">
                    <div className="shipment-card">
                      <div className="shipment-header">
                        <span className="shipment-id">#CBT-2024-001234</span>
                        <span className="status-badge pending">
                          Aguardando Envio
                        </span>
                      </div>
                      <div className="shipment-details">
                        <div className="detail">
                          <span className="material-icons">flag</span>
                          <span>Argentina (MLA)</span>
                        </div>
                        <div className="detail">
                          <span className="material-icons">inventory_2</span>
                          <span>2 produtos</span>
                        </div>
                        <div className="detail">
                          <span className="material-icons">schedule</span>
                          <span>Prazo: 15/01/2024</span>
                        </div>
                      </div>
                      <div className="shipment-actions">
                        <button className="btn btn-primary">
                          <span className="material-icons">print</span>
                          Imprimir Etiqueta
                        </button>
                        <button className="btn btn-secondary">
                          <span className="material-icons">track_changes</span>
                          Rastrear
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Publish Modal */}
      {showPublishModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowPublishModal(false)}
        >
          <div
            className="modal-content large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Publicar Globalmente</h2>
              <button
                className="btn btn-icon"
                onClick={() => setShowPublishModal(false)}
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-section">
                <h3>Selecionar Produtos</h3>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Buscar produtos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {localItemsLoading ? (
                  <div className="loading-state">
                    <div className="spinner small"></div>
                    <p>Carregando produtos...</p>
                  </div>
                ) : (
                  <div className="items-selection">
                    {filteredLocalItems.slice(0, 10).map((item) => (
                      <div key={item.id} className="item-checkbox">
                        <input
                          type="checkbox"
                          id={`publish-${item.id}`}
                          checked={publishForm.items.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPublishForm((prev) => ({
                                ...prev,
                                items: [...prev.items, item.id],
                              }));
                            } else {
                              setPublishForm((prev) => ({
                                ...prev,
                                items: prev.items.filter((i) => i !== item.id),
                              }));
                            }
                          }}
                        />
                        <label htmlFor={`publish-${item.id}`}>
                          {item.thumbnail && (
                            <img
                              src={item.thumbnail}
                              alt=""
                              className="item-thumb"
                            />
                          )}
                          <div className="item-details">
                            <span className="item-title">
                              {item.title?.substring(0, 50)}...
                            </span>
                            <span className="item-price">
                              {formatCurrency(item.price)}
                            </span>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                <p className="selected-count">
                  {publishForm.items.length} produtos selecionados
                </p>
              </div>

              <div className="form-section">
                <h3>Paises de Destino</h3>
                <div className="countries-selection">
                  {availableCountries.map((country) => (
                    <div key={country.code} className="country-checkbox">
                      <input
                        type="checkbox"
                        id={`country-${country.code}`}
                        checked={publishForm.targetCountries.includes(
                          country.code,
                        )}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPublishForm((prev) => ({
                              ...prev,
                              targetCountries: [
                                ...prev.targetCountries,
                                country.code,
                              ],
                            }));
                          } else {
                            setPublishForm((prev) => ({
                              ...prev,
                              targetCountries: prev.targetCountries.filter(
                                (c) => c !== country.code,
                              ),
                            }));
                          }
                        }}
                      />
                      <label htmlFor={`country-${country.code}`}>
                        <span className="flag">{country.flag}</span>
                        <span className="name">{country.name}</span>
                        <span className="currency">({country.currency})</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h3>Estrategia de Precificacao</h3>
                <div className="pricing-options">
                  <div className="pricing-option">
                    <input
                      type="radio"
                      id="net_proceeds"
                      name="pricing"
                      value="net_proceeds"
                      checked={publishForm.pricingStrategy === "net_proceeds"}
                      onChange={(e) =>
                        setPublishForm((prev) => ({
                          ...prev,
                          pricingStrategy: e.target.value,
                        }))
                      }
                    />
                    <label htmlFor="net_proceeds">
                      <strong>Net Proceeds (Recomendado)</strong>
                      <p>
                        Voce define quanto quer receber e o ML calcula o preco
                        final automaticamente
                      </p>
                    </label>
                  </div>
                  <div className="pricing-option">
                    <input
                      type="radio"
                      id="fixed_markup"
                      name="pricing"
                      value="fixed_markup"
                      checked={publishForm.pricingStrategy === "fixed_markup"}
                      onChange={(e) =>
                        setPublishForm((prev) => ({
                          ...prev,
                          pricingStrategy: e.target.value,
                        }))
                      }
                    />
                    <label htmlFor="fixed_markup">
                      <strong>Markup Fixo</strong>
                      <p>Aplica um percentual de markup sobre o preco local</p>
                    </label>
                  </div>
                </div>

                {publishForm.pricingStrategy === "fixed_markup" && (
                  <div className="form-group">
                    <label>Percentual de Markup (%)</label>
                    <input
                      type="number"
                      value={publishForm.markup}
                      onChange={(e) =>
                        setPublishForm((prev) => ({
                          ...prev,
                          markup: e.target.value,
                        }))
                      }
                      placeholder="20"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowPublishModal(false)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handlePublishGlobal}
                disabled={
                  publishForm.items.length === 0 ||
                  publishForm.targetCountries.length === 0
                }
              >
                <span className="material-icons">public</span>
                Publicar em {publishForm.targetCountries.length} Pais(es)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GlobalSelling;
