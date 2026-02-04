import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { toast } from "../store/toastStore";
import validators from "../utils/validation";
import "./Auth.css";

function Register() {
  const navigate = useNavigate();
  const { register, loading } = useAuthStore();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    // Validate on blur
    let error = null;
    switch (name) {
      case "firstName":
        error = validators.required(value, "Nome");
        break;
      case "lastName":
        error = validators.required(value, "Sobrenome");
        break;
      case "email":
        error = validators.email(value);
        break;
      case "password":
        error = validators.password(value);
        break;
      case "confirmPassword":
        error = validators.confirmPassword(value, formData.password);
        break;
    }

    if (error) {
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const firstNameError = validators.required(formData.firstName, "Nome");
    if (firstNameError) newErrors.firstName = firstNameError;

    const lastNameError = validators.required(formData.lastName, "Sobrenome");
    if (lastNameError) newErrors.lastName = lastNameError;

    const emailError = validators.email(formData.email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validators.password(formData.password);
    if (passwordError) newErrors.password = passwordError;

    const confirmError = validators.confirmPassword(
      formData.confirmPassword,
      formData.password,
    );
    if (confirmError) newErrors.confirmPassword = confirmError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!validateForm()) {
      toast.error("Por favor, corrija os erros no formulário");
      return;
    }

    const result = await register({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
    });

    if (result.success) {
      toast.success("Conta criada com sucesso!");
      // Redirect to login page
      navigate("/login");
    } else {
      toast.error(
        result.message ||
          "Erro ao criar conta. Verifique os dados e tente novamente.",
      );
    }
  };

  const getInputClassName = (fieldName) => {
    let className = "form-input";
    if (touched[fieldName] && errors[fieldName]) {
      className += " input-error";
    } else if (
      touched[fieldName] &&
      formData[fieldName] &&
      !errors[fieldName]
    ) {
      className += " input-success";
    }
    return className;
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Projeto SASS</h1>
          <p>Dashboard com Mercado Livre</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <h2>Criar Conta</h2>

          <div className="form-group">
            <label className="form-label">Primeiro Nome</label>
            <input
              type="text"
              name="firstName"
              className={getInputClassName("firstName")}
              value={formData.firstName}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={loading}
            />
            {touched.firstName && errors.firstName && (
              <span className="form-error">{errors.firstName}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Último Nome</label>
            <input
              type="text"
              name="lastName"
              className={getInputClassName("lastName")}
              value={formData.lastName}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={loading}
            />
            {touched.lastName && errors.lastName && (
              <span className="form-error">{errors.lastName}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className={getInputClassName("email")}
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
              className={getInputClassName("password")}
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={loading}
            />
            {touched.password && errors.password && (
              <span className="form-error">{errors.password}</span>
            )}
            {!errors.password && (
              <span className="form-hint">Mínimo 8 caracteres</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Confirmar Senha</label>
            <input
              type="password"
              name="confirmPassword"
              className={getInputClassName("confirmPassword")}
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={loading}
            />
            {touched.confirmPassword && errors.confirmPassword && (
              <span className="form-error">{errors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full btn-lg"
            disabled={loading}
          >
            {loading ? "Criando Conta..." : "Criar Conta"}
          </button>
        </form>

        <p className="auth-footer">
          Já tem conta? <Link to="/login">Faça login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
