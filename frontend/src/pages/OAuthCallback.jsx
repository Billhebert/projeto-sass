/**
 * OAuthCallback.jsx
 * 
 * Handles OAuth redirect from Mercado Livre.
 * This page receives the authorization code and exchanges it for tokens.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../services/api'
import './OAuthCallback.css'

export default function OAuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Processing OAuth callback...');
  const [error, setError] = useState(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Extract authorization code and state from URL
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const state = params.get('state');

      if (!code) {
        throw new Error('Missing authorization code in callback');
      }

      setMessage('Exchanging authorization code for tokens...');

      // Get credentials from sessionStorage (they were stored when user submitted the OAuth form)
      const storedCredentials = sessionStorage.getItem('ml_oauth_config')
      if (!storedCredentials) {
        throw new Error('OAuth credentials not found. Please start the OAuth flow again.')
      }

      const { clientId, clientSecret, redirectUri } = JSON.parse(storedCredentials)

      // Step 1: Exchange code for tokens
      setMessage('Requesting access tokens...');
      const tokenResponse = await api.post('/auth/ml-token-exchange', {
        code,
        clientId,
        clientSecret,
        redirectUri
      });

      if (!tokenResponse.data.success) {
        throw new Error(tokenResponse.data.error || 'Failed to exchange code for tokens');
      }

      const { accessToken, refreshToken, expiresIn } = tokenResponse.data.data;

       // Step 2: Create account with tokens and OAuth credentials
       setMessage('Creating account with tokens...');
       const accountResponse = await api.post('/ml-accounts', {
         accessToken,
         refreshToken,
         expiresIn,
         // Include OAuth credentials for automatic token refresh
         clientId,
         clientSecret,
         redirectUri,
         status: 'connected'
       });

      if (!accountResponse.data.success) {
        throw new Error(accountResponse.data.error || 'Failed to create account');
      }

      // Clear sessionStorage
      sessionStorage.removeItem('ml_oauth_config')

      // Success
      setStatus('success');
      setMessage('✓ Account connected successfully!');

      // Redirect to accounts page after 2 seconds
      setTimeout(() => {
        navigate('/accounts', { state: { success: true, message: 'Account connected successfully' } });
      }, 2000);

    } catch (err) {
      console.error('OAuth callback error:', err);
      setStatus('error');
      setError(err.message || 'An error occurred during OAuth callback');
      setMessage('');

      // Redirect to accounts page after 5 seconds
      setTimeout(() => {
        navigate('/accounts', { state: { error: err.message } });
      }, 5000);
    }
  };

  return (
    <div className="oauth-callback-container">
      <div className="oauth-callback-card">
        {status === 'processing' && (
          <>
            <div className="spinner"></div>
            <h2>Processing OAuth Callback</h2>
            <p className="status-message">{message}</p>
            <p className="info-text">Please wait while we authenticate your Mercado Livre account...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="success-icon">✓</div>
            <h2>Success!</h2>
            <p className="status-message">{message}</p>
            <p className="info-text">Redirecting to accounts page...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="error-icon">✕</div>
            <h2>Authentication Failed</h2>
            <p className="error-message">{error}</p>
            <p className="info-text">Redirecting to accounts page...</p>
            <div className="error-actions">
              <button
                className="btn btn-primary"
                onClick={() => navigate('/accounts')}
              >
                Return to Accounts
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
