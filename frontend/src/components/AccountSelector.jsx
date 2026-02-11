import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import api from "../services/api";
import { handleApiError } from "../utils/api-helpers";
import "./AccountSelector.css";

/**
 * AccountSelector - Seletor de conta ML reutilizável
 * Substitui account-select + sync button duplicados em 15+ arquivos
 */
function AccountSelector({
  selectedAccount,
  onAccountChange,
  onSync = null,
  syncing = false,
  showSyncButton = true,
  autoSelectFirst = true,
  className = "",
}) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    loadAccounts();
  }, []);
  
  useEffect(() => {
    if (autoSelectFirst && accounts.length > 0 && !selectedAccount) {
      onAccountChange(accounts[0].id);
    }
  }, [accounts, selectedAccount, autoSelectFirst, onAccountChange]);
  
  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get("/ml-accounts");
      const accountsList =
        response.data.data?.accounts || response.data.accounts || [];
      setAccounts(Array.isArray(accountsList) ? accountsList : []);
    } catch (err) {
      const message = handleApiError(err, "Erro ao carregar contas", false);
      setError(message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSyncClick = () => {
    if (onSync && !syncing) {
      onSync();
    }
  };
  
  if (loading) {
    return (
      <div className={`account-selector ${className}`}>
        <div className="account-selector-loading">
          <div className="spinner-small"></div>
          <span>Carregando contas...</span>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`account-selector ${className}`}>
        <div className="account-selector-error">
          <span className="material-icons">error</span>
          {error}
        </div>
      </div>
    );
  }
  
  if (accounts.length === 0) {
    return (
      <div className={`account-selector ${className}`}>
        <div className="account-selector-empty">
          <span className="material-icons">info</span>
          Nenhuma conta conectada
        </div>
      </div>
    );
  }
  
  return (
    <div className={`account-selector ${className}`}>
      <select
        className="account-select"
        value={selectedAccount || ""}
        onChange={(e) => onAccountChange(e.target.value)}
        disabled={syncing}
      >
        {accounts.map((acc) => (
          <option key={acc.id} value={acc.id}>
            {acc.nickname || acc.mlUserId || `Conta ${acc.id}`}
          </option>
        ))}
      </select>
      
      {showSyncButton && onSync && (
        <button
          className="btn btn-primary account-sync-btn"
          onClick={handleSyncClick}
          disabled={syncing || !selectedAccount}
          title="Sincronizar dados"
        >
          <span className={`material-icons ${syncing ? "spinning" : ""}`}>
            sync
          </span>
          {syncing ? "Sincronizando..." : "Sincronizar"}
        </button>
      )}
    </div>
  );
}

AccountSelector.propTypes = {
  selectedAccount: PropTypes.string,
  onAccountChange: PropTypes.func.isRequired,
  onSync: PropTypes.func,
  syncing: PropTypes.bool,
  showSyncButton: PropTypes.bool,
  autoSelectFirst: PropTypes.bool,
  className: PropTypes.string,
};

export default AccountSelector;
