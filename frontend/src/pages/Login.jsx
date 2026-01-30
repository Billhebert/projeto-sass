import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { toast } from '../store/toastStore'
import validators from '../utils/validation'
import './Auth.css'

function Login() {
  const navigate = useNavigate()
  const { login, loading } = useAuthStore()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    
    // Validate on blur
    let error = null
    switch (name) {
      case 'email':
        error = validators.email(value)
        break
      case 'password':
        error = validators.required(value, 'Senha')
        break
    }
    
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    const emailError = validators.email(formData.email)
    if (emailError) newErrors.email = emailError
    
    const passwordError = validators.required(formData.password, 'Senha')
    if (passwordError) newErrors.password = passwordError
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Mark all fields as touched
    setTouched({
      email: true,
      password: true,
    })

    if (!validateForm()) {
      toast.error('Por favor, preencha todos os campos corretamente')
      return
    }

    const success = await login(formData.email, formData.password)
    if (success) {
      toast.success('Login realizado com sucesso!')
      navigate('/')
    } else {
      toast.error('Email ou senha inválidos')
    }
  }

  const getInputClassName = (fieldName) => {
    let className = 'form-input'
    if (touched[fieldName] && errors[fieldName]) {
      className += ' input-error'
    } else if (touched[fieldName] && formData[fieldName] && !errors[fieldName]) {
      className += ' input-success'
    }
    return className
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Projeto SASS</h1>
          <p>Dashboard com Mercado Livre</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <h2>Login</h2>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className={getInputClassName('email')}
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={loading}
            />
            {touched.email && errors.email && (
              <span className="form-error">{errors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <input
              type="password"
              name="password"
              className={getInputClassName('password')}
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={loading}
            />
            {touched.password && errors.password && (
              <span className="form-error">{errors.password}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full btn-lg"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="auth-footer">
          Não tem conta? <Link to="/register">Registre-se aqui</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
