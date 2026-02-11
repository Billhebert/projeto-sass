import { useState, useEffect } from "react";
import {
  useMLAccounts,
  useProductCosts,
  useUpdateProductCost,
  useDeleteProductCost,
  useSyncProductCosts,
} from "../hooks/useApi";
import "./ProductCosts.css";

function ProductCosts() {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [syncStatus, setSyncStatus] = useState(null);

  // React Query hooks
  const { data: accounts = [], isLoading: accountsLoading } = useMLAccounts();
  const { data: costs = [], isLoading: costsLoading } =
    useProductCosts(selectedAccount);
  const updateProductCost = useUpdateProductCost();
  const deleteProductCost = useDeleteProductCost();
  const syncProductCosts = useSyncProductCosts();

  // Auto-select first account
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].accountId);
    }
  }, [accounts, selectedAccount]);

  const handleSyncProducts = async () => {
    if (!selectedAccount) return;

    setSyncStatus("Sincronizando produtos...");
    try {
      const result = await syncProductCosts.mutateAsync({
        accountId: selectedAccount,
      });
      if (result.success) {
        setSyncStatus(`${result.data.newCosts} novos produtos adicionados!`);
        setTimeout(() => setSyncStatus(null), 3000);
      }
    } catch (error) {
      console.error("Error syncing products:", error);
      setSyncStatus("Erro ao sincronizar produtos");
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  const handleEdit = (cost) => {
    setEditingId(cost._id);
    setEditValue(cost.cogs.toString());
  };

  const handleSave = async (cost) => {
    if (!editValue || isNaN(editValue) || parseFloat(editValue) < 0) {
      alert("Por favor, insira um valor válido");
      return;
    }

    try {
      await updateProductCost.mutateAsync({
        accountId: selectedAccount,
        itemId: cost.itemId,
        cogs: parseFloat(editValue),
      });
      setEditingId(null);
      setEditValue("");
    } catch (error) {
      console.error("Error updating cost:", error);
      alert("Erro ao atualizar custo");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleDelete = async (cost) => {
    if (
      !window.confirm(
        `Tem certeza que deseja deletar o custo de "${cost.title}"?`,
      )
    ) {
      return;
    }

    try {
      await deleteProductCost.mutateAsync({
        accountId: selectedAccount,
        itemId: cost.itemId,
      });
    } catch (error) {
      console.error("Error deleting cost:", error);
      alert("Erro ao deletar custo");
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const filteredCosts = costs.filter(
    (cost) =>
      cost.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cost.itemId.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const stats = {
    total: costs.length,
    withCost: costs.filter((c) => c.cogs > 0).length,
    withoutCost: costs.filter((c) => c.cogs === 0).length,
    avgCost:
      costs.length > 0
        ? costs.reduce((sum, c) => sum + c.cogs, 0) / costs.length
        : 0,
  };

  const loading = accountsLoading || costsLoading || syncProductCosts.isPending;

  return (
    <div className="product-costs-container">
      <div className="product-costs-header">
        <h1>Gestao de Custos (COGS)</h1>
        <p>
          Gerencie os custos dos seus produtos para calculo preciso de margem de
          lucro
        </p>
      </div>

      <div className="product-costs-controls">
        <select
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="account-select"
        >
          {accounts.map((account) => (
            <option key={account._id} value={account.accountId}>
              {account.nickname || account.id || account.accountId}
            </option>
          ))}
        </select>

        <button
          className="btn btn-primary"
          onClick={handleSyncProducts}
          disabled={!selectedAccount || loading}
        >
          Sincronizar Produtos
        </button>

        <input
          type="text"
          placeholder="Buscar produto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {syncStatus && <div className="sync-status">{syncStatus}</div>}

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-label">Total de Produtos</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Com Custo</div>
          <div className="stat-value success">{stats.withCost}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Sem Custo</div>
          <div className="stat-value warning">{stats.withoutCost}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Custo Médio</div>
          <div className="stat-value">{formatCurrency(stats.avgCost)}</div>
        </div>
      </div>

      {loading && <div className="loading">Carregando...</div>}

      {!loading && filteredCosts.length === 0 && (
        <div className="empty-state">
          <p>Nenhum produto encontrado.</p>
          <p>
            Clique em "Sincronizar Produtos" para importar produtos dos seus
            pedidos.
          </p>
        </div>
      )}

      {!loading && filteredCosts.length > 0 && (
        <div className="costs-table-container">
          <table className="costs-table">
            <thead>
              <tr>
                <th>ID do Item</th>
                <th>Título do Produto</th>
                <th>Custo (COGS)</th>
                <th>Ultima Atualizacao</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredCosts.map((cost) => (
                <tr key={cost._id}>
                  <td>
                    <code>{cost.itemId}</code>
                  </td>
                  <td className="product-title">{cost.title}</td>
                  <td>
                    {editingId === cost._id ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="cost-input"
                        autoFocus
                      />
                    ) : (
                      <span
                        className={`cost-value ${cost.cogs === 0 ? "zero" : ""}`}
                      >
                        {formatCurrency(cost.cogs)}
                      </span>
                    )}
                  </td>
                  <td>
                    {new Date(cost.updatedAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>
                    {editingId === cost._id ? (
                      <div className="action-buttons">
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleSave(cost)}
                        >
                          Salvar
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={handleCancel}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="action-buttons">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleEdit(cost)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(cost)}
                        >
                          Deletar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="help-text">
        <h3>Como funciona?</h3>
        <ul>
          <li>
            <strong>COGS (Cost of Goods Sold)</strong>: Custo do produto que
            voce paga ao fornecedor
          </li>
          <li>
            Adicione os custos dos produtos para ter calculo preciso de margem
            de lucro
          </li>
          <li>
            A margem verdadeira sera:{" "}
            <code>(Receita - Taxas - COGS) / Receita</code>
          </li>
          <li>
            Use "Sincronizar Produtos" para importar automaticamente produtos
            dos seus pedidos
          </li>
        </ul>
      </div>
    </div>
  );
}

export default ProductCosts;
