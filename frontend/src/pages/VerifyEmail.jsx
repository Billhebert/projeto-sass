import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { toast } from "../store/toastStore";
import "./Auth.css";

function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyEmail, resendVerificationEmail, loading } = useAuthStore();

  const emailFromUrl = searchParams.get("email") || "";
  const tokenFromUrl = searchParams.get("token") || "";

  const [email, setEmail] = useState(emailFromUrl);
  const [token, setToken] = useState(tokenFromUrl);
  const [verificationStep, setVerificationStep] = useState(
    tokenFromUrl ? "auto-verify" : "input",
  );
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [verifyAttempted, setVerifyAttempted] = useState(false);

  // Auto-verify if token is provided in URL
  useEffect(() => {
    if (
      tokenFromUrl &&
      verificationStep === "auto-verify" &&
      !verifyAttempted
    ) {
      setVerifyAttempted(true);
      handleAutoVerify();
    }
  }, [tokenFromUrl, verificationStep]);

  const handleAutoVerify = async () => {
    if (!tokenFromUrl) return;

    const result = await verifyEmail(tokenFromUrl);
    if (result.success) {
      toast.success("Email verificado com sucesso!");
      setTimeout(() => navigate("/"), 2000);
    } else {
      toast.error(result.message);
      setVerificationStep("input");
    }
  };

  const validateEmail = (value) => {
    if (!value) return "Email é obrigatório";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return "Email inválido";
    return null;
  };

  const validateToken = (value) => {
    if (!value) return "Token é obrigatório";
    if (value.length < 20) return "Token inválido (muito curto)";
    return null;
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: null }));
    }
  };

  const handleTokenChange = (e) => {
    const value = e.target.value;
    setToken(value);
    if (errors.token) {
      setErrors((prev) => ({ ...prev, token: null }));
    }
  };

  const handleEmailBlur = () => {
    setTouched((prev) => ({ ...prev, email: true }));
    const error = validateEmail(email);
    if (error) {
      setErrors((prev) => ({ ...prev, email: error }));
    }
  };

  const handleTokenBlur = () => {
    setTouched((prev) => ({ ...prev, token: true }));
    const error = validateToken(token);
    if (error) {
      setErrors((prev) => ({ ...prev, token: error }));
    }
  };

  const handleResendEmail = async (e) => {
    e.preventDefault();

    setTouched({ email: true });
    const emailError = validateEmail(email);

    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    const result = await resendVerificationEmail(email);
    if (result.success) {
      toast.success(result.message);
      setToken("");
      setErrors({});
    } else {
      toast.error(result.message);
    }
  };

  const handleVerifyToken = async (e) => {
    e.preventDefault();

    setTouched({ token: true });
    const tokenError = validateToken(token);

    if (tokenError) {
      setErrors({ token: tokenError });
      return;
    }

    const result = await verifyEmail(token);
    if (result.success) {
      toast.success("Email verificado com sucesso!");
      setTimeout(() => navigate("/"), 2000);
    } else {
      toast.error(result.message);
    }
  };

  const getInputClassName = (fieldName) => {
    let className = "form-input";
    if (touched[fieldName] && errors[fieldName]) {
      className += " input-error";
    } else if (
      touched[fieldName] &&
      (fieldName === "email" ? email : token) &&
      !errors[fieldName]
    ) {
      className += " input-success";
    }
    return className;
  };

  if (verificationStep === "auto-verify" && loading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Projeto SASS</h1>
            <p>Dashboard com Mercado Livre</p>
          </div>
          <div className="verification-loading">
            <div className="spinner"></div>
            <h2>Verificando seu email...</h2>
            <p>Por favor aguarde enquanto verificamos seu endereço de email.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Projeto SASS</h1>
          <p>Dashboard com Mercado Livre</p>
        </div>

        <form onSubmit={handleResendEmail} className="auth-form" noValidate>
          <h2>Verificar Email</h2>
          <p className="form-description">
            Enviamos um código de verificação para o seu email. Insira o email e
            o código abaixo para confirmar sua conta.
          </p>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className={getInputClassName("email")}
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              disabled={loading}
              placeholder="seu@email.com"
            />
            {touched.email && errors.email && (
              <span className="form-error">{errors.email}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-secondary w-full"
            disabled={loading}
          >
            {loading ? "Enviando..." : "Reenviar Email"}
          </button>
        </form>

        <div className="form-divider">
          <span>OU</span>
        </div>

        <form onSubmit={handleVerifyToken} className="auth-form" noValidate>
          <h3>Cole seu código</h3>

          <div className="form-group">
            <label className="form-label">Código de Verificação</label>
            <input
              type="text"
              className={getInputClassName("token")}
              value={token}
              onChange={handleTokenChange}
              onBlur={handleTokenBlur}
              disabled={loading}
              placeholder="Cole o código do seu email aqui"
            />
            {touched.token && errors.token && (
              <span className="form-error">{errors.token}</span>
            )}
            <span className="form-hint">
              O código foi enviado para {email || "seu email"}
            </span>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full btn-lg"
            disabled={loading || !token}
          >
            {loading ? "Verificando..." : "Verificar Email"}
          </button>
        </form>

        <p className="auth-footer">
          Não recebeu o email?{" "}
          <button
            type="button"
            onClick={() => {
              if (validateEmail(email) === null) {
                handleResendEmail({ preventDefault: () => {} });
              } else {
                toast.error("Por favor, insira um email válido");
              }
            }}
            className="btn-link"
          >
            Reenviar
          </button>
        </p>

        <p className="auth-footer">
          <Link to="/register">Voltar para registro</Link>
        </p>
      </div>
    </div>
  );
}

export default VerifyEmail;
