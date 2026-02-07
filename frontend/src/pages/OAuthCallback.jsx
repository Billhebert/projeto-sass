/**
 * OAuthCallback.jsx
 *
 * Handles OAuth redirect from Mercado Livre.
 * This page receives the authorization code and exchanges it for tokens.
 * Supports both standard OAuth code flow and Mercado Livre's compressed URL format.
 */

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import { useAuthStore } from "../store/authStore";
import "./OAuthCallback.css";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loadToken } = useAuthStore();
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState("Processing OAuth callback...");
  const [error, setError] = useState(null);

  useEffect(() => {
    // First, load the token
    loadToken();
  }, [loadToken]);

  useEffect(() => {
    // Wait a bit for token to load
    const checkAuth = setTimeout(() => {
      const token = localStorage.getItem("token");
      if (!token) {
        setStatus("error");
        setError("You must be logged in to connect a Mercado Livre account");
        setTimeout(() => {
          navigate("/login", {
            state: {
              redirect: location.pathname + location.search,
              message:
                "Please login first to connect your Mercado Livre account",
            },
          });
        }, 3000);
        return;
      }

      handleCallback();
    }, 500);

    return () => clearTimeout(checkAuth);
  }, [user, navigate, location]);

  const handleCallback = async () => {
    try {
      console.log("OAuth Callback triggered");
      console.log("Current path:", location.pathname);
      console.log("Current search:", location.search);

      // Extract authorization code and state from URL query parameters
      const params = new URLSearchParams(location.search);
      let code = params.get("code");
      let state = params.get("state");

      console.log("Query params - code:", code, "state:", state);

      // Check if this is Mercado Livre's compressed URL format
      // URL looks like: /jms/mlb/lgz/msl/login/COMPRESSED_DATA/user
      const pathParts = location.pathname.split("/").filter((p) => p);

      console.log("Path parts:", pathParts);

      // Look for compressed data in path
      if (!code && pathParts.length > 0) {
        const loginIndex = pathParts.indexOf("login");
        const mslIndex = pathParts.indexOf("msl");

        console.log("loginIndex:", loginIndex, "mslIndex:", mslIndex);

        if (loginIndex >= 0 && pathParts.length > loginIndex + 1) {
          const potentialCompressed = pathParts[loginIndex + 1];
          console.log("Found potential compressed data:", potentialCompressed);

          // Get credentials from sessionStorage first
          const storedCredentials = sessionStorage.getItem("ml_oauth_config");

          if (storedCredentials && potentialCompressed.length > 20) {
            try {
              const { clientId, clientSecret, redirectUri } =
                JSON.parse(storedCredentials);

              console.log("Sending compressed data to backend...");
              setMessage("Decoding Mercado Livre response...");

              // Send compressed data to backend for decoding
              const response = await api.post("/auth/ml-compressed-callback", {
                compressedData: potentialCompressed,
                clientId,
                clientSecret,
                redirectUri,
              });

              console.log("Backend response:", response.data);

              if (response.data.success) {
                const { accessToken, refreshToken, expiresIn } =
                  response.data.data;

                console.log("Got tokens, creating account...");

                // Create account with tokens
                setMessage("Creating account with tokens...");
                const accountResponse = await api.post("/ml-accounts", {
                  accessToken,
                  refreshToken,
                  expiresIn,
                  clientId,
                  clientSecret,
                  redirectUri,
                  status: "connected",
                });

                console.log("Account response:", accountResponse.data);

                if (!accountResponse.data.success) {
                  throw new Error(
                    accountResponse.data.error || "Failed to create account",
                  );
                }

                sessionStorage.removeItem("ml_oauth_config");
                setStatus("success");
                setMessage("✓ Account connected successfully!");

                setTimeout(() => {
                  navigate("/accounts", {
                    state: {
                      success: true,
                      message: "Account connected successfully",
                    },
                  });
                }, 2000);

                return;
              }
            } catch (apiError) {
              console.error(
                "Error calling compressed callback API:",
                apiError.response?.data || apiError.message,
              );
              // Continue with standard flow
            }
          }
        }
      }

      if (!code) {
        console.error("No authorization code found in URL");
        throw new Error(
          "Missing authorization code in callback. Check that redirect_uri is configured correctly in Mercado Livre.",
        );
      }

      setMessage("Exchanging authorization code for tokens...");

      // Get credentials from sessionStorage
      console.log("Reading ml_oauth_config from sessionStorage...");
      const storedCredentials = sessionStorage.getItem("ml_oauth_config");
      console.log("Stored credentials:", storedCredentials);

      if (!storedCredentials) {
        throw new Error(
          "OAuth credentials not found. Please start the OAuth flow again.",
        );
      }

      const { clientId, clientSecret, redirectUri } =
        JSON.parse(storedCredentials);

      console.log("Exchanging code for tokens with:", {
        clientId,
        redirectUri,
      });

      // Step 1: Exchange code for tokens
      setMessage("Requesting access tokens...");
      const tokenResponse = await api.post("/auth/ml-token-exchange", {
        code,
        clientId,
        clientSecret,
        redirectUri,
      });

      if (!tokenResponse.data.success) {
        throw new Error(
          tokenResponse.data.error || "Failed to exchange code for tokens",
        );
      }

      const { accessToken, refreshToken, expiresIn } = tokenResponse.data.data;

      // Step 2: Create account with tokens and OAuth credentials
      setMessage("Creating account with tokens...");
      const accountResponse = await api.post("/ml-accounts", {
        accessToken,
        refreshToken,
        expiresIn,
        clientId,
        clientSecret,
        redirectUri,
        status: "connected",
      });

      if (!accountResponse.data.success) {
        throw new Error(
          accountResponse.data.error || "Failed to create account",
        );
      }

      // Clear sessionStorage
      sessionStorage.removeItem("ml_oauth_config");

      // Success
      setStatus("success");
      setMessage("✓ Account connected successfully!");

      // Redirect to accounts page after 2 seconds
      setTimeout(() => {
        navigate("/accounts", {
          state: { success: true, message: "Account connected successfully" },
        });
      }, 2000);
    } catch (err) {
      console.error("OAuth callback error:", err);
      setStatus("error");
      setError(err.message || "An error occurred during OAuth callback");
      setMessage("");

      // Redirect to accounts page after 5 seconds
      setTimeout(() => {
        navigate("/accounts", { state: { error: err.message } });
      }, 5000);
    }
  };

  return (
    <div className="oauth-callback-container">
      <div className="oauth-callback-card">
        {status === "processing" && (
          <>
            <div className="spinner"></div>
            <h2>Processing OAuth Callback</h2>
            <p className="status-message">{message}</p>
            <p className="info-text">
              Please wait while we authenticate your Mercado Livre account...
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="success-icon">✓</div>
            <h2>Success!</h2>
            <p className="status-message">{message}</p>
            <p className="info-text">Redirecting to accounts page...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="error-icon">✕</div>
            <h2>Authentication Failed</h2>
            <p className="error-message">{error}</p>
            <p className="info-text">Redirecting to accounts page...</p>
            <div className="error-actions">
              <button
                className="btn btn-primary"
                onClick={() => navigate("/accounts")}
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
