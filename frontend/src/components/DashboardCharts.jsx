import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./DashboardCharts.css";

/**
 * Dashboard charts section showing sales data
 * @param {Object} props - Component props
 * @param {Array} props.salesData - Sales data for the last 7 days
 * @param {Function} props.formatCurrency - Currency formatter function
 */
function DashboardCharts({ salesData, formatCurrency }) {
  return (
    <div className="chart-card">
      <div className="card-header">
        <h3>Vendas - Últimos 7 dias</h3>
        <Link to="/sales-dashboard" className="view-all">
          Ver detalhes <span className="material-icons">arrow_forward</span>
        </Link>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={salesData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fill: "#666", fontSize: 12 }} />
          <YAxis tick={{ fill: "#666", fontSize: 12 }} />
          <Tooltip
            formatter={(value, name) => [
              name === "receita" ? formatCurrency(value) : value,
              name === "receita" ? "Receita" : "Vendas",
            ]}
          />
          <Legend />
          <Bar
            dataKey="vendas"
            name="Vendas"
            fill="#667eea"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

DashboardCharts.propTypes = {
  salesData: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      vendas: PropTypes.number.isRequired,
      receita: PropTypes.number.isRequired,
    }),
  ).isRequired,
  formatCurrency: PropTypes.func.isRequired,
};

export default DashboardCharts;
