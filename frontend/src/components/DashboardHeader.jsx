import React from "react";
import PropTypes from "prop-types";
import "./DashboardHeader.css";

/**
 * Dashboard header with account selector and refresh button
 * @param {Object} props - Component props
 * @param {Array} props.accounts - List of ML accounts
 * @param {string} props.selectedAccountId - Currently selected account ID
 * @param {Function} props.onAccountChange - Callback when account changes
 * @param {Function} props.onRefresh - Callback to refresh dashboard data
 * @param {boolean} props.loading - Loading state
 */
function DashboardHeader({
  accounts,
  selectedAccountId,
  onAccountChange,
  onRefresh,
  loading,
}) {
  return (
    <div className="dashboard-header">
      <div className="header-left">
        <h1>Dashboard</h1>
        <p>Visão geral do seu negócio no Mercado Livre</p>
      </div>
      <div className="header-right">
        {Array.isArray(accounts) && accounts.length > 0 && (
          <select
            className="account-selector"
            value={selectedAccountId || ""}
            onChange={(e) => onAccountChange(e.target.value)}
            aria-label="Selecionar conta do Mercado Livre"
          >
            {accounts.map((account) => (
              <option
                key={account._id || account.id}
                value={account._id || account.id}
              >
                {account.nickname ||
                  account.name ||
                  `Conta ${account.mlUserId}`}
              </option>
            ))}
          </select>
        )}
        <button
          className="refresh-btn"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Atualizar dados do dashboard"
          title={loading ? "Carregando..." : "Atualizar dados"}
        >
          <span className="material-icons">{loading ? "sync" : "refresh"}</span>
        </button>
      </div>
    </div>
  );
}

DashboardHeader.propTypes = {
  accounts: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      id: PropTypes.string,
      nickname: PropTypes.string,
      name: PropTypes.string,
      mlUserId: PropTypes.string,
    }),
  ).isRequired,
  selectedAccountId: PropTypes.string,
  onAccountChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

DashboardHeader.defaultProps = {
  selectedAccountId: null,
  loading: false,
};

export default DashboardHeader;
