// Form validation utilities

export const validators = {
  email: (value) => {
    if (!value) return 'Email é obrigatório'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) return 'Email inválido'
    return null
  },

  password: (value, minLength = 8) => {
    if (!value) return 'Senha é obrigatória'
    if (value.length < minLength) return `Senha deve ter no mínimo ${minLength} caracteres`
    return null
  },

  passwordStrength: (value) => {
    if (!value) return 'Senha é obrigatória'
    if (value.length < 8) return 'Senha deve ter no mínimo 8 caracteres'
    
    const hasUppercase = /[A-Z]/.test(value)
    const hasLowercase = /[a-z]/.test(value)
    const hasNumber = /[0-9]/.test(value)
    
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      return 'Senha deve conter letras maiúsculas, minúsculas e números'
    }
    return null
  },

  confirmPassword: (value, password) => {
    if (!value) return 'Confirmação de senha é obrigatória'
    if (value !== password) return 'As senhas não conferem'
    return null
  },

  required: (value, fieldName = 'Este campo') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} é obrigatório`
    }
    return null
  },

  minLength: (value, min, fieldName = 'Este campo') => {
    if (!value) return null
    if (value.length < min) {
      return `${fieldName} deve ter no mínimo ${min} caracteres`
    }
    return null
  },

  maxLength: (value, max, fieldName = 'Este campo') => {
    if (!value) return null
    if (value.length > max) {
      return `${fieldName} deve ter no máximo ${max} caracteres`
    }
    return null
  },

  phone: (value) => {
    if (!value) return null // Optional field
    const phoneRegex = /^[\d\s\(\)\-\+]+$/
    if (!phoneRegex.test(value)) return 'Telefone inválido'
    if (value.replace(/\D/g, '').length < 10) return 'Telefone deve ter no mínimo 10 dígitos'
    return null
  },

  url: (value) => {
    if (!value) return null // Optional field
    try {
      new URL(value)
      return null
    } catch {
      return 'URL inválida'
    }
  },
}

// Validate multiple fields at once
export const validateForm = (fields) => {
  const errors = {}
  let hasErrors = false

  for (const [fieldName, validations] of Object.entries(fields)) {
    for (const validation of validations) {
      const error = validation()
      if (error) {
        errors[fieldName] = error
        hasErrors = true
        break // Stop at first error for this field
      }
    }
  }

  return { errors, isValid: !hasErrors }
}

// Hook for form validation state
export const useFormValidation = (initialValues = {}) => {
  const errors = {}
  
  const validate = (field, value, validatorFn) => {
    const error = validatorFn(value)
    if (error) {
      errors[field] = error
    } else {
      delete errors[field]
    }
    return !error
  }

  const validateAll = (validations) => {
    let isValid = true
    for (const [field, { value, validator }] of Object.entries(validations)) {
      if (!validate(field, value, validator)) {
        isValid = false
      }
    }
    return isValid
  }

  return { errors, validate, validateAll }
}

export default validators
