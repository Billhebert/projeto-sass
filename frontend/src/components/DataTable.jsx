import React, { useState, useCallback } from 'react';
import './DataTable.css';

/**
 * Reusable DataTable component with pagination, sorting, and filtering
 */
const DataTable = ({
  data = [],
  columns = [],
  loading = false,
  error = null,
  pagination = { limit: 20, offset: 0, total: 0 },
  onPageChange = () => {},
  onSort = () => {},
  onFilter = () => {},
  onRowClick = null,
  onEdit = null,
  onDelete = null,
  className = '',
  striped = true,
  hoverable = true,
  selectable = false,
  onSelectionChange = null,
}) => {
  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [selectedRows, setSelectedRows] = useState(new Set());

  const handleSort = (column) => {
    let newDir = 'asc';
    if (sortBy === column && sortDir === 'asc') {
      newDir = 'desc';
    }
    setSortBy(column);
    setSortDir(newDir);
    onSort(column, newDir);
  };

  const handleSelectAll = (e) => {
    const newSelected = e.target.checked 
      ? new Set(data.map((_, i) => i))
      : new Set();
    setSelectedRows(newSelected);
    if (onSelectionChange) {
      onSelectionChange(Array.from(newSelected).map(i => data[i]));
    }
  };

  const handleSelectRow = (index, e) => {
    e.stopPropagation();
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
    if (onSelectionChange) {
      onSelectionChange(Array.from(newSelected).map(i => data[i]));
    }
  };

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  if (error) {
    return (
      <div className={`data-table-error ${className}`}>
        <div className="error-icon">⚠️</div>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className={`data-table-container ${className}`}>
      <div className="table-wrapper">
        <table className={`data-table ${striped ? 'striped' : ''} ${hoverable ? 'hoverable' : ''}`}>
          <thead>
            <tr>
              {selectable && (
                <th className="checkbox-col">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === data.length && data.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={col.sortable !== false ? 'sortable' : ''}
                  style={{ width: col.width }}
                >
                  <div className="th-content">
                    {col.label}
                    {col.sortable !== false && sortBy === col.key && (
                      <span className={`sort-icon ${sortDir}`}>
                        {sortDir === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {(onEdit || onDelete) && <th className="actions-col">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="loading-row">
                <td colSpan={columns.length + (selectable ? 1 : 0) + (onEdit || onDelete ? 1 : 0)}>
                  <div className="spinner"></div>
                  <p>Carregando...</p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={columns.length + (selectable ? 1 : 0) + (onEdit || onDelete ? 1 : 0)}>
                  Nenhum dado encontrado
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={index}
                  className={selectedRows.has(index) ? 'selected' : ''}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {selectable && (
                    <td className="checkbox-col">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(index)}
                        onChange={(e) => handleSelectRow(index, e)}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} style={{ width: col.width }}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
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
                            title="Editar"
                          >
                            ✎
                          </button>
                        )}
                        {onDelete && (
                          <button
                            className="btn-small btn-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Tem certeza?')) {
                                onDelete(row);
                              }
                            }}
                            title="Deletar"
                          >
                            🗑
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
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => onPageChange(pagination.offset - pagination.limit)}
          >
            ← Anterior
          </button>
          <span className="page-info">
            Página {currentPage} de {totalPages} ({pagination.total} total)
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(pagination.offset + pagination.limit)}
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
};

export default DataTable;
