import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '@/components/ui';
import { useRegister } from '../hooks/useRegister';
import { useToast } from '@/components/ui/Toast';
import { tokens } from '@/styles/tokens';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const RegisterForm: React.FC = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormData, string>>>({});

  const { mutate: register, isPending } = useRegister();
  const { showToast } = useToast();

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof RegisterFormData, string>> = {};

    if (!formData.name) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

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

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Split name into firstName and lastName
    const nameParts = formData.name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;

    // Remove confirmPassword and prepare data for API
    const { confirmPassword, ...registerData } = formData;
    
    const apiData = {
      ...registerData,
      firstName,
      lastName,
    };

    register(apiData, {
      onSuccess: () => {
        showToast('Registration successful! Welcome to Vendata.', 'success');
      },
      onError: (error: any) => {
        const message = error?.response?.data?.message || 'Registration failed. Please try again.';
        showToast(message, 'error');
      },
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof RegisterFormData]) {
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

  const footerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginTop: tokens.spacing[6],
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.neutral[600],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const termsStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.neutral[600],
    textAlign: 'center',
    fontFamily: tokens.typography.fontFamily.sans,
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <Input
        label="Name"
        type="text"
        name="name"
        value={formData.name}
        onChange={handleChange}
        error={errors.name}
        placeholder="John Doe"
        fullWidth
        required
        disabled={isPending}
      />

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
        helperText="At least 6 characters"
        fullWidth
        required
        disabled={isPending}
      />

      <Input
        label="Confirm Password"
        type="password"
        name="confirmPassword"
        value={formData.confirmPassword}
        onChange={handleChange}
        error={errors.confirmPassword}
        placeholder="••••••••"
        fullWidth
        required
        disabled={isPending}
      />

      <div style={termsStyle}>
        By signing up, you agree to our{' '}
        <Link
          to="/terms"
          style={linkStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = tokens.colors.primary[700];
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = tokens.colors.primary[600];
          }}
        >
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link
          to="/privacy"
          style={linkStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = tokens.colors.primary[700];
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = tokens.colors.primary[600];
          }}
        >
          Privacy Policy
        </Link>
      </div>

      <Button type="submit" fullWidth loading={isPending} disabled={isPending}>
        {isPending ? 'Creating account...' : 'Create Account'}
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
          // Redirect to Mercado Livre OAuth
          const mlAuthUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${
            import.meta.env.VITE_ML_CLIENT_ID
          }&redirect_uri=${encodeURIComponent(
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
        Sign up with Mercado Livre
      </Button>

      <div style={footerStyle}>
        Already have an account?{' '}
        <Link
          to="/login"
          style={linkStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = tokens.colors.primary[700];
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = tokens.colors.primary[600];
          }}
        >
          Sign in
        </Link>
      </div>
    </form>
  );
};
