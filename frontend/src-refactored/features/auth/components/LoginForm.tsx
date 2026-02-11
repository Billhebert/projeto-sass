import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '@/components/ui';
import { useLogin } from '../hooks/useLogin';
import { useToast } from '@/components/ui/Toast';
import { tokens } from '@/styles/tokens';

interface LoginFormData {
  email: string;
  password: string;
}

export const LoginForm: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});

  const { mutate: login, isPending } = useLogin();
  const { showToast } = useToast();

  const validate = (): boolean => {
    const newErrors: Partial<LoginFormData> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    login(formData, {
      onSuccess: () => {
        showToast('Login successful! Welcome back.', 'success');
      },
      onError: (error: any) => {
        const message = error?.response?.data?.message || 'Login failed. Please try again.';
        showToast(message, 'error');
      },
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof LoginFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const formStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing[4],
  };

  const linkStyle: React.CSSProperties = {
    color: tokens.colors.primary[600],
    textDecoration: 'none',
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.sans,
    transition: `color ${tokens.transitions.fast}`,
  };

  const forgotPasswordStyle: React.CSSProperties = {
    textAlign: 'right',
    marginTop: `-${tokens.spacing[2]}`,
  };

  const dividerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing[3],
    margin: `${tokens.spacing[4]} 0`,
  };

  const dividerLineStyle: React.CSSProperties = {
    flex: 1,
    height: '1px',
    backgroundColor: tokens.colors.neutral[300],
  };

  const dividerTextStyle: React.CSSProperties = {
    color: tokens.colors.neutral[500],
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const mlButtonStyle: React.CSSProperties = {
    backgroundColor: tokens.colors.secondary[600],
    color: tokens.colors.neutral[0],
  };

  const footerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginTop: tokens.spacing[6],
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.neutral[600],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <Input
        label="Email"
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        error={errors.email}
        placeholder="your@email.com"
        fullWidth
        required
        disabled={isPending}
      />

      <Input
        label="Password"
        type="password"
        name="password"
        value={formData.password}
        onChange={handleChange}
        error={errors.password}
        placeholder="••••••••"
        fullWidth
        required
        disabled={isPending}
      />

      <div style={forgotPasswordStyle}>
        <Link
          to="/forgot-password"
          style={linkStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = tokens.colors.primary[700];
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = tokens.colors.primary[600];
          }}
        >
          Forgot password?
        </Link>
      </div>

      <Button type="submit" fullWidth loading={isPending} disabled={isPending}>
        {isPending ? 'Signing in...' : 'Sign In'}
      </Button>

      <div style={dividerStyle}>
        <div style={dividerLineStyle} />
        <span style={dividerTextStyle}>OR</span>
        <div style={dividerLineStyle} />
      </div>

      <Button
        type="button"
        variant="outline"
        fullWidth
        onClick={() => {
          const mlAuthUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${import.meta.env.VITE_ML_CLIENT_ID}&redirect_uri=${encodeURIComponent(
            `${window.location.origin}/auth/callback`
          )}`;
          window.location.href = mlAuthUrl;
        }}
        disabled={isPending}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          style={{ marginRight: tokens.spacing[2] }}
        >
          <path
            d="M10 0L12.2451 7.30902H20L13.8775 11.8098L16.1225 19.119L10 14.6182L3.87746 19.119L6.12254 11.8098L0 7.30902H7.75486L10 0Z"
            fill={tokens.colors.secondary[600]}
          />
        </svg>
        Continue with Mercado Livre
      </Button>

      <div style={footerStyle}>
        Don't have an account?{' '}
        <Link
          to="/register"
          style={linkStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = tokens.colors.primary[700];
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = tokens.colors.primary[600];
          }}
        >
          Sign up
        </Link>
      </div>
    </form>
  );
};
