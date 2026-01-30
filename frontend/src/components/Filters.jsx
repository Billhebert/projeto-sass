import React, { useState } from 'react';
import './Filters.css';

/**
 * Reusable Filters component for filtering data
 */
const Filters = ({
  filters = [],
  onApply = () => {},
  onReset = () => {},
  loading = false,
  className = '',
}) => {
  const [values, setValues] = useState(() => {
    const initial = {};
    filters.forEach(f => {
      initial[f.name] = f.defaultValue || '';
    });
    return initial;
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setValues(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  const handleApply = () => {
    const activeFilters = {};
    Object.entries(values).forEach(([key, value]) => {
      if (value !== '' && value !== false && value !== null) {
        activeFilters[key] = value;
      }
    });
    onApply(activeFilters);
  };

  const handleReset = () => {
    const initial = {};
    filters.forEach(f => {
      initial[f.name] = f.defaultValue || '';
    });
    setValues(initial);
    onReset();
  };

  const hasActiveFilters = Object.values(values).some(v => v !== '' && v !== false && v !== null);

  return (
    <div className={`filters-container ${className}`}>
      <div className="filters-header">
        <h3 className="filters-title">Filtros</h3>
        {hasActiveFilters && (
          <span className="filter-badge">{Object.values(values).filter(v => v !== '' && v !== false && v !== null).length}</span>
        )}
      </div>

      <div className="filters-body">
        {filters.map(filter => (
          <div key={filter.name} className="filter-group">
            <label htmlFor={filter.name} className="filter-label">
              {filter.label || filter.name}
            </label>

            {filter.type === 'select' ? (
              <select
                id={filter.name}
                name={filter.name}
                value={values[filter.name]}
                onChange={handleChange}
                className="filter-input"
                disabled={loading}
              >
                <option value="">{filter.placeholder || 'Selecione...'}</option>
                {filter.options && filter.options.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : filter.type === 'checkbox' ? (
              <div className="checkbox-wrapper">
                <input
                  id={filter.name}
                  type="checkbox"
                  name={filter.name}
                  checked={values[filter.name] || false}
                  onChange={handleChange}
                  disabled={loading}
                  className="filter-checkbox"
                />
                <label htmlFor={filter.name} className="checkbox-label">
                  {filter.label || filter.name}
                </label>
              </div>
            ) : filter.type === 'date' ? (
              <input
                id={filter.name}
                type="date"
                name={filter.name}
                value={values[filter.name]}
                onChange={handleChange}
                className="filter-input"
                disabled={loading}
              />
            ) : (
              <input
                id={filter.name}
                type={filter.type || 'text'}
                name={filter.name}
                value={values[filter.name]}
                onChange={handleChange}
                placeholder={filter.placeholder || ''}
                className="filter-input"
                disabled={loading}
              />
            )}
          </div>
        ))}
      </div>

      <div className="filters-actions">
        <button
          className="btn btn-primary"
          onClick={handleApply}
          disabled={loading || !hasActiveFilters}
          title="Aplicar filtros"
        >
          Aplicar
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleReset}
          disabled={loading || !hasActiveFilters}
          title="Limpar filtros"
        >
          Limpar
        </button>
      </div>
    </div>
  );
};

export default Filters;
