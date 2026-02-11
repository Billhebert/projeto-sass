import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Card, Spinner } from '@/components/ui';
import { AuthService } from '../services/auth.service';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { tokens } from '@/styles/tokens';

/**
 * OAuth Callback Page
 * 
 * Handles the OAuth callback from Mercado Livre.
 * Exchanges the authorization code for access tokens and creates/updates ML account.
 */
export const OAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateUser } = useAuth();
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  
  // Guard to prevent multiple exchange attempts
  const exchangeAttemptedRef = useRef(false);

  const { mutate: exchangeToken, isPending } = useMutation({
    mutationFn: (code: string) => AuthService.exchangeMercadoLivreToken(code),
    onSuccess: async (data) => {
      console.log('[OAuth] Exchange successful:', data);
      
      // Fetch updated user profile after ML account connection
      try {
        const currentUser = await AuthService.getCurrentUser();
        updateUser(currentUser);
      } catch (e) {
        console.warn('[OAuth] Could not refresh user profile:', e);
      }
      
      showToast('Conta do Mercado Livre conectada com sucesso!', 'success');
      
      // Redirect to ML accounts page
      navigate('/ml-accounts');
    },
    onError: (error: any) => {
      console.error('[OAuth] Exchange failed:', error);
      const message = error?.response?.data?.error || error?.message || 'Falha ao conectar conta do Mercado Livre';
      setError(message);
      showToast(message, 'error');
    },
  });

  useEffect(() => {
    // Prevent multiple exchange attempts
    if (exchangeAttemptedRef.current) {
      console.log('[OAuth] Exchange already attempted, skipping');
      return;
    }

    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      // User denied access or OAuth error
      setError('Authorization was denied or cancelled');
      showToast('Authorization was denied or cancelled', 'error');
      
      setTimeout(() => {
        navigate('/ml-accounts');
      }, 3000);
      return;
    }

    if (!code) {
      setError('No authorization code received');
      showToast('No authorization code received', 'error');
      
      setTimeout(() => {
        navigate('/ml-accounts');
      }, 3000);
      return;
    }

    // Mark as attempted before calling
    exchangeAttemptedRef.current = true;
    console.log('[OAuth] Exchanging code (first attempt)');
    
    // Exchange code for tokens
    exchangeToken(code);
  }, [searchParams]); // Removed exchangeToken from dependencies to prevent re-runs

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.neutral[50],
    padding: tokens.spacing[4],
  };

  const cardWrapperStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '500px',
  };

  const contentStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacing[6],
    padding: tokens.spacing[8],
    textAlign: 'center',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize['2xl'],
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.neutral[900],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const messageStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.base,
    color: tokens.colors.neutral[600],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const errorStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.base,
    color: tokens.colors.error[600],
    fontFamily: tokens.typography.fontFamily.sans,
    backgroundColor: tokens.colors.error[50],
    padding: tokens.spacing[4],
    borderRadius: tokens.borderRadius.md,
    border: `1px solid ${tokens.colors.error[200]}`,
  };

  return (
    <div style={containerStyle}>
      <div style={cardWrapperStyle}>
        <Card variant="elevated">
          <div style={contentStyle}>
            {isPending && (
              <>
                <Spinner size="xl" />
                <div>
                  <h1 style={titleStyle}>Connecting to Mercado Livre</h1>
                  <p style={messageStyle}>
                    Please wait while we connect your Mercado Livre account...
                  </p>
                </div>
              </>
            )}

            {error && (
              <>
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={tokens.colors.error[600]}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <h1 style={titleStyle}>Connection Failed</h1>
                  <p style={errorStyle}>{error}</p>
                  <p style={messageStyle}>Redirecting you back...</p>
                </div>
              </>
            )}

            {!isPending && !error && (
              <>
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={tokens.colors.success[600]}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <div>
                  <h1 style={titleStyle}>Connection Successful!</h1>
                  <p style={messageStyle}>
                    Your Mercado Livre account has been connected successfully.
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
