import React, { useState, useEffect } from 'react';
import './Form.css';

/**
 * Reusable Form component with validation and submission handling
 */
const Form = ({
  title = '',
  fields = [],
  initialValues = {},
  onSubmit = () => {},
  onCancel = () => {},
  loading = false,
  error = null,
  submitLabel = 'Salvar',
  className = '',
}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const validateField = (name, value) => {
    const field = fields.find(f => f.name === name);
    if (!field) return '';

    // Required validation
    if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${field.label || name} é obrigatório`;
    }

    // Type validation
    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Email inválido';
      }
    }

    if (field.type === 'number' && value) {
      if (isNaN(value)) {
        return 'Deve ser um número';
      }
      if (field.min !== undefined && parseFloat(value) < field.min) {
        return `Mínimo: ${field.min}`;
      }
      if (field.max !== undefined && parseFloat(value) > field.max) {
        return `Máximo: ${field.max}`;
      }
    }

    if (field.type === 'text' && value && field.minLength && value.length < field.minLength) {
      return `Mínimo ${field.minLength} caracteres`;
    }

    if (field.type === 'text' && value && field.maxLength && value.length > field.maxLength) {
      return `Máximo ${field.maxLength} caracteres`;
    }

    // Custom validation
    if (field.validate && typeof field.validate === 'function') {
      return field.validate(value, values) || '';
    }

    return '';
  };

  const validateForm = () => {
    const newErrors = {};
    fields.forEach(field => {
      const error = validateField(field.name, values[field.name]);
      if (error) {
        newErrors[field.name] = error;
      }
    });
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setValues(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Validate on change if field has been touched
    if (touched[name]) {
      const error = validateField(name, newValue);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    const error = validateField(name, values[name]);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formErrors = validateForm();
    setErrors(formErrors);
    
    // Mark all fields as touched
    const allTouched = {};
    fields.forEach(field => {
      allTouched[field.name] = true;
    });
    setTouched(allTouched);

    if (Object.keys(formErrors).length === 0) {
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className={`form-container ${className}`}>
      {title && <h2 className="form-title">{title}</h2>}
      
      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit} className="form">
        <div className="form-fields">
          {fields.map(field => (
            <div key={field.name} className="form-group">
              <label htmlFor={field.name} className="form-label">
                {field.label || field.name}
                {field.required && <span className="required">*</span>}
              </label>

              {field.type === 'textarea' ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  value={values[field.name] || ''}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={field.placeholder}
                  className={`form-input ${errors[field.name] ? 'error' : ''}`}
                  rows={field.rows || 3}
                  disabled={loading || isSubmitting}
                />
              ) : field.type === 'select' ? (
                <select
                  id={field.name}
                  name={field.name}
                  value={values[field.name] || ''}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`form-input ${errors[field.name] ? 'error' : ''}`}
                  disabled={loading || isSubmitting}
                >
                  <option value="">{field.placeholder || 'Selecione...'}</option>
                  {field.options && field.options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === 'checkbox' ? (
                <div className="checkbox-wrapper">
                  <input
                    id={field.name}
                    type="checkbox"
                    name={field.name}
                    checked={values[field.name] || false}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={loading || isSubmitting}
                    className="checkbox-input"
                  />
                  <label htmlFor={field.name} className="checkbox-label">
                    {field.label || field.name}
                  </label>
                </div>
              ) : (
                <input
                  id={field.name}
                  type={field.type || 'text'}
                  name={field.name}
                  value={values[field.name] || ''}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={field.placeholder}
                  className={`form-input ${errors[field.name] ? 'error' : ''}`}
                  disabled={loading || isSubmitting}
                  min={field.min}
                  max={field.max}
                  minLength={field.minLength}
                  maxLength={field.maxLength}
                />
              )}

              {errors[field.name] && touched[field.name] && (
                <span className="error-message">{errors[field.name]}</span>
              )}
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || isSubmitting}
          >
            {isSubmitting ? '...' : submitLabel}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading || isSubmitting}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default Form;
