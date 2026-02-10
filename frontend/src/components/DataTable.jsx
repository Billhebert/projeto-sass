import { useState, useCallback } from "react";
import PropTypes from "prop-types";
import "./DataTable.css";

/**
 * Reusable DataTable component with pagination, sorting, and filtering
 * Optimized with accessibility and performance improvements
 */
function DataTable({
  data = [],
  columns = [],
  loading = false,
  error = null,
  pagination = { limit: 20, offset: 0, total: 0 },
  onPageChange = () => {},
  onSort = () => {},
  onRowClick = null,
  onEdit = null,
  onDelete = null,
  className = "",
  striped = true,
  hoverable = true,
  selectable = false,
  onSelectionChange = null,
}) {
  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [selectedRows, setSelectedRows] = useState(new Set());

  const handleSort = useCallback(
    (column) => {
      let newDir = "asc";
      if (sortBy === column && sortDir === "asc") {
        newDir = "desc";
      }
      setSortBy(column);
      setSortDir(newDir);
      onSort(column, newDir);
    },
    [sortBy, sortDir, onSort],
  );

  const handleSelectAll = useCallback(
    (e) => {
      const newSelected = e.target.checked
        ? new Set(data.map((_, i) => i))
        : new Set();
      setSelectedRows(newSelected);
      if (onSelectionChange) {
        onSelectionChange(Array.from(newSelected).map((i) => data[i]));
      }
    },
    [data, onSelectionChange],
  );

  const handleSelectRow = useCallback(
    (index, e) => {
      e.stopPropagation();
      const newSelected = new Set(selectedRows);
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      setSelectedRows(newSelected);
      if (onSelectionChange) {
        onSelectionChange(Array.from(newSelected).map((i) => data[i]));
      }
    },
    [selectedRows, data, onSelectionChange],
  );

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  if (error) {
    return (
      <div
        className={`data-table-error ${className}`}
        role="alert"
        aria-live="polite"
      >
        <span className="error-icon" aria-hidden="true">
          ⚠️
        </span>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className={`data-table-container ${className}`}>
      <div
        className="table-wrapper"
        role="region"
        aria-label="Tabela de dados"
        tabIndex="0"
      >
        <table
          className={`data-table ${striped ? "striped" : ""} ${hoverable ? "hoverable" : ""}`}
        >
          <thead>
            <tr>
              {selectable && (
                <th className="checkbox-col" scope="col">
                  <input
                    type="checkbox"
                    checked={
                      selectedRows.size === data.length && data.length > 0
                    }
                    onChange={handleSelectAll}
                    aria-label="Selecionar todas as linhas"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={col.sortable !== false ? "sortable" : ""}
                  style={{ width: col.width }}
                  scope="col"
                  role={col.sortable !== false ? "button" : undefined}
                  tabIndex={col.sortable !== false ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (
                      col.sortable !== false &&
                      (e.key === "Enter" || e.key === " ")
                    ) {
                      e.preventDefault();
                      handleSort(col.key);
                    }
                  }}
                  aria-sort={
                    sortBy === col.key
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <div className="th-content">
                    {col.label}
                    {col.sortable !== false && sortBy === col.key && (
                      <span
                        className={`sort-icon ${sortDir}`}
                        aria-hidden="true"
                      >
                        {sortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="actions-col" scope="col">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="loading-row">
                <td
                  colSpan={
                    columns.length +
                    (selectable ? 1 : 0) +
                    (onEdit || onDelete ? 1 : 0)
                  }
                >
                  <div
                    className="spinner"
                    role="status"
                    aria-label="Carregando"
                  ></div>
                  <p aria-live="polite">Carregando...</p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr className="empty-row">
                <td
                  colSpan={
                    columns.length +
                    (selectable ? 1 : 0) +
                    (onEdit || onDelete ? 1 : 0)
                  }
                >
                  <div className="empty-state">
                    <span className="material-icons" aria-hidden="true">
                      inbox
                    </span>
                    <p>Nenhum dado encontrado</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={row.id || index}
                  className={selectedRows.has(index) ? "selected" : ""}
                  onClick={() => onRowClick && onRowClick(row)}
                  role={onRowClick ? "button" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onRowClick(row);
                    }
                  }}
                >
                  {selectable && (
                    <td className="checkbox-col">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(index)}
                        onChange={(e) => handleSelectRow(index, e)}
                        aria-label={`Selecionar linha ${index + 1}`}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} style={{ width: col.width }}>
                      {col.render
                        ? col.render(row[col.key], row)
                        : row[col.key]}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="actions-col">
                      <div className="actions">
                        {onEdit && (
                          <button
                            className="btn-small btn-edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(row);
                            }}
                            aria-label={`Editar linha ${index + 1}`}
                            title="Editar"
                          >
                            <span className="material-icons">edit</span>
                          </button>
                        )}
                        {onDelete && (
                          <button
                            className="btn-small btn-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                window.confirm(
                                  "Tem certeza que deseja excluir?",
                                )
                              ) {
                                onDelete(row);
                              }
                            }}
                            aria-label={`Excluir linha ${index + 1}`}
                            title="Excluir"
                          >
                            <span className="material-icons">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <nav
          className="pagination"
          role="navigation"
          aria-label="Paginação da tabela"
        >
          <button
            disabled={currentPage === 1}
            onClick={() => onPageChange(pagination.offset - pagination.limit)}
            aria-label="Página anterior"
            className="pagination-btn"
          >
            <span className="material-icons">chevron_left</span>
            Anterior
          </button>
          <span className="page-info" aria-current="page">
            Página {currentPage} de {totalPages} ({pagination.total} total)
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(pagination.offset + pagination.limit)}
            aria-label="Próxima página"
            className="pagination-btn"
          >
            Próxima
            <span className="material-icons">chevron_right</span>
          </button>
        </nav>
      )}
    </div>
  );
}

DataTable.propTypes = {
  data: PropTypes.array,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      sortable: PropTypes.bool,
      width: PropTypes.string,
      render: PropTypes.func,
    }),
  ),
  loading: PropTypes.bool,
  error: PropTypes.string,
  pagination: PropTypes.shape({
    limit: PropTypes.number,
    offset: PropTypes.number,
    total: PropTypes.number,
  }),
  onPageChange: PropTypes.func,
  onSort: PropTypes.func,
  onRowClick: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  className: PropTypes.string,
  striped: PropTypes.bool,
  hoverable: PropTypes.bool,
  selectable: PropTypes.bool,
  onSelectionChange: PropTypes.func,
};

export default DataTable;
