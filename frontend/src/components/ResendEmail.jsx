import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { toast } from "../store/toastStore";

function ResendEmail({ email, onEmailChange, className = "" }) {
  const { resendVerificationEmail, loading } = useAuthStore();
  const [localEmail, setLocalEmail] = useState(email || "");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState(null);

  const validateEmail = (value) => {
    if (!value) return "Email é obrigatório";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return "Email inválido";
    return null;
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setLocalEmail(value);
    if (error) setError(null);
    if (onEmailChange) onEmailChange(value);
  };

  const handleBlur = () => {
    setTouched(true);
    const emailError = validateEmail(localEmail);
    if (emailError) setError(emailError);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);

    const emailError = validateEmail(localEmail);
    if (emailError) {
      setError(emailError);
      return;
    }

    const result = await resendVerificationEmail(localEmail);
    if (result.success) {
      toast.success(result.message);
      setLocalEmail("");
      setError(null);
      setTouched(false);
    } else {
      toast.error(result.message);
      setError(result.message);
    }
  };

  const inputClassName = `form-input ${
    touched && error ? "input-error" : ""
  } ${touched && !error && localEmail ? "input-success" : ""}`;

  return (
    <form
      onSubmit={handleSubmit}
      className={`resend-email-form ${className}`}
      noValidate
    >
      <h3>Reenviar Email de Verificação</h3>

      <div className="form-group">
        <label className="form-label">Email</label>
        <input
          type="email"
          className={inputClassName}
          value={localEmail}
          onChange={handleEmailChange}
          onBlur={handleBlur}
          disabled={loading}
          placeholder="seu@email.com"
        />
        {touched && error && <span className="form-error">{error}</span>}
      </div>

      <button
        type="submit"
        className="btn btn-secondary w-full"
        disabled={loading || !localEmail}
      >
        {loading ? "Enviando..." : "Reenviar Email"}
      </button>
    </form>
  );
}

export default ResendEmail;
