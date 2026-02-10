import React from "react";
import PropTypes from "prop-types";
import "./OrdersFilters.css";

/**
 * Orders filters bar component
 * @param {Object} props - Component props
 * @param {Object} props.filters - Current filter values
 * @param {Function} props.onFilterChange - Callback when filters change
 */
function OrdersFilters({ filters, onFilterChange }) {
  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="filters-bar">
      <div className="filter-group">
        <label htmlFor="status-filter">Status</label>
        <select
          id="status-filter"
          value={filters.status || ""}
          onChange={(e) => handleChange("status", e.target.value)}
        >
          <option value="">Todos</option>
          <option value="paid">Pago</option>
          <option value="pending">Pendente</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>
      <div className="filter-group">
        <label htmlFor="date-from-filter">Data Início</label>
        <input
          id="date-from-filter"
          type="date"
          value={filters.dateFrom || ""}
          onChange={(e) => handleChange("dateFrom", e.target.value)}
        />
      </div>
      <div className="filter-group">
        <label htmlFor="date-to-filter">Data Fim</label>
        <input
          id="date-to-filter"
          type="date"
          value={filters.dateTo || ""}
          onChange={(e) => handleChange("dateTo", e.target.value)}
        />
      </div>
      <div className="filter-group search">
        <label htmlFor="search-filter">Buscar</label>
        <input
          id="search-filter"
          type="text"
          placeholder="ID do pedido ou produto..."
          value={filters.search || ""}
          onChange={(e) => handleChange("search", e.target.value)}
        />
      </div>
    </div>
  );
}

OrdersFilters.propTypes = {
  filters: PropTypes.shape({
    status: PropTypes.string,
    dateFrom: PropTypes.string,
    dateTo: PropTypes.string,
    search: PropTypes.string,
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
};

export default OrdersFilters;
