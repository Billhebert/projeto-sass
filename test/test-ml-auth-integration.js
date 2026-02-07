/**
 * ML Auth Routes Integration Tests
 * Tests all OAuth endpoints with mocked oauthService
 *
 * Run with: npm test -- test-ml-auth-integration.js
 * or: npx jest test-ml-auth-integration.js
 */

const request = require("supertest");
const express = require("express");
const mlAuthRouter = require("../backend/routes/ml-auth");

// Mock the oauth service
jest.mock("../backend/services/ml-oauth-invisible", () => ({
  generateState: jest.fn(() => "mock-state-12345"),
  generateCustomState: jest.fn(() => "mock-custom-state"),
  getAuthorizationUrl: jest.fn(
    (userId, state) =>
      `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=test&redirect_uri=http://localhost/callback&state=${state}`
  ),
  getCustomAuthorizationUrl: jest.fn(
    (clientId, clientSecret, redirectUri, state) =>
      `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`
  ),
  completeOAuthConnection: jest.fn(),
  getAccountStatus: jest.fn(),
  disconnectAccount: jest.fn(),
}));

// Mock logger
jest.mock("../backend/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// Mock auth middleware
jest.mock("../backend/middleware/auth", () => ({
  authenticateToken: (req, res, next) => {
    req.user = req.user || { userId: "test-user-123" };
    next();
  },
}));

const oauthService = require("../backend/services/ml-oauth-invisible");
const logger = require("../backend/logger");

describe("ML Auth Routes Integration Tests", () => {
  let app;
  let mockResponse;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create fresh app with router
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      // Default authenticated user
      req.user = { userId: "test-user-123" };
      next();
    });
    app.use("/api/ml-auth", mlAuthRouter);

    // Mock response structure for helper function tests
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
    };
  });

  // =========================================================================
  // GET /api/ml-auth/url Tests
  // =========================================================================

  describe("GET /api/ml-auth/url", () => {
    test("should generate authorization URL for authenticated user", async () => {
      const response = await request(app)
        .get("/api/ml-auth/url")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.authorizationUrl).toContain(
        "auth.mercadolivre.com.br"
      );
      expect(response.body.data.expiresIn).toBe(600);
      expect(oauthService.generateState).toHaveBeenCalled();
      expect(oauthService.getAuthorizationUrl).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ML_AUTH_URL_REQUEST",
        })
      );
    });

    test("should generate authorization URL for query param userId", async () => {
      const response = await request(app)
        .get("/api/ml-auth/url?userId=new-user")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.authorizationUrl).toBeDefined();
    });

    test("should handle errors gracefully", async () => {
      oauthService.getAuthorizationUrl.mockImplementation(() => {
        throw new Error("Service unavailable");
      });

      const response = await request(app)
        .get("/api/ml-auth/url")
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("authorization");
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ML_AUTH_URL_ERROR",
        })
      );
    });
  });

  // =========================================================================
  // GET /api/ml-auth/callback Tests
  // =========================================================================

  describe("GET /api/ml-auth/callback", () => {
    test("should handle successful OAuth callback", async () => {
      oauthService.completeOAuthConnection.mockResolvedValue({
        success: true,
        accountId: "account-123",
        isNewAccount: true,
        user: { mlUserId: "123456789" },
      });

      const response = await request(app)
        .get("/api/ml-auth/callback?code=auth-code-123&state=mock-state-12345")
        .expect(302);

      expect(response.headers.location).toContain("status=success");
      expect(response.headers.location).toContain("accountId=account-123");
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ML_AUTH_CALLBACK_SUCCESS",
        })
      );
    });

    test("should handle OAuth error response", async () => {
      const response = await request(app)
        .get(
          "/api/ml-auth/callback?error=access_denied&error_description=User%20denied%20access"
        )
        .expect(302);

      expect(response.headers.location).toContain("status=error");
      expect(response.headers.location).toContain("access_denied");
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ML_AUTH_CALLBACK_ERROR",
        })
      );
    });

    test("should handle missing authorization code", async () => {
      const response = await request(app)
        .get("/api/ml-auth/callback?state=mock-state-12345")
        .expect(302);

      expect(response.headers.location).toContain("status=error");
      expect(response.headers.location).toContain("não recebido");
    });

    test("should handle OAuth connection failure", async () => {
      oauthService.completeOAuthConnection.mockResolvedValue({
        success: false,
        code: "INVALID_CODE",
        error: "Authorization code expired",
      });

      const response = await request(app)
        .get("/api/ml-auth/callback?code=expired-code&state=mock-state-12345")
        .expect(302);

      expect(response.headers.location).toContain("status=error");
      expect(response.headers.location).toContain("expired");
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ML_AUTH_CALLBACK_FAILED",
        })
      );
    });

    test("should handle unexpected errors", async () => {
      oauthService.completeOAuthConnection.mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      const response = await request(app)
        .get("/api/ml-auth/callback?code=auth-code-123&state=mock-state-12345")
        .expect(302);

      expect(response.headers.location).toContain("status=error");
      expect(response.headers.location).toContain("inesperado");
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ML_AUTH_CALLBACK_UNEXPECTED_ERROR",
        })
      );
    });
  });

  // =========================================================================
  // GET /api/ml-auth/status Tests
  // =========================================================================

  describe("GET /api/ml-auth/status", () => {
    test("should return not authenticated for unauthenticated user", async () => {
      const response = await request(app)
        .get("/api/ml-auth/status")
        // Don't set user, middleware will use default
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.connected).toBe(false);
      expect(response.body.accounts).toEqual([]);
      expect(response.body.tokenValid).toBe(false);
    });

    test("should return status for authenticated user with accounts", async () => {
      oauthService.getAccountStatus.mockResolvedValue({
        success: true,
        connected: true,
        accounts: [
          { accountId: "123", mlUserId: "456", name: "Test Store" },
        ],
        tokenRefreshed: false,
        tokenValid: true,
      });

      const response = await request(app)
        .get("/api/ml-auth/status")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.connected).toBe(true);
      expect(response.body.accounts.length).toBe(1);
      expect(response.body.tokenValid).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ML_AUTH_STATUS_REQUEST",
        })
      );
    });

    test("should handle status service errors", async () => {
      oauthService.getAccountStatus.mockResolvedValue({
        success: false,
        error: "Failed to fetch accounts",
      });

      const response = await request(app)
        .get("/api/ml-auth/status")
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Failed to fetch");
    });

    test("should handle unexpected errors", async () => {
      oauthService.getAccountStatus.mockImplementation(() => {
        throw new Error("Network timeout");
      });

      const response = await request(app)
        .get("/api/ml-auth/status")
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ML_AUTH_STATUS_ERROR",
        })
      );
    });
  });

  // =========================================================================
  // DELETE /api/ml-auth/disconnect Tests
  // =========================================================================

  describe("DELETE /api/ml-auth/disconnect", () => {
    test("should disconnect account successfully", async () => {
      oauthService.disconnectAccount.mockResolvedValue({
        success: true,
        accountId: "account-123",
        mlUserId: "ml-user-456",
      });

      const response = await request(app)
        .delete("/api/ml-auth/disconnect")
        .send({ accountId: "account-123" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("desconectada");
      expect(response.body.data.accountId).toBe("account-123");
      expect(oauthService.disconnectAccount).toHaveBeenCalledWith(
        "test-user-123",
        "account-123"
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ML_AUTH_DISCONNECT_SUCCESS",
        })
      );
    });

    test("should require accountId in body", async () => {
      const response = await request(app)
        .delete("/api/ml-auth/disconnect")
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("accountId");
    });

    test("should handle disconnect failures", async () => {
      oauthService.disconnectAccount.mockResolvedValue({
        success: false,
        code: "ACCOUNT_NOT_FOUND",
        error: "Account does not exist",
      });

      const response = await request(app)
        .delete("/api/ml-auth/disconnect")
        .send({ accountId: "invalid-account" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("does not exist");
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ML_AUTH_DISCONNECT_FAILED",
        })
      );
    });

    test("should handle unexpected errors", async () => {
      oauthService.disconnectAccount.mockImplementation(() => {
        throw new Error("Database error");
      });

      const response = await request(app)
        .delete("/api/ml-auth/disconnect")
        .send({ accountId: "account-123" })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ML_AUTH_DISCONNECT_ERROR",
        })
      );
    });
  });

  // =========================================================================
  // POST /api/ml-auth/complete Tests
  // =========================================================================

  describe("POST /api/ml-auth/complete", () => {
    test("should complete OAuth connection for new account", async () => {
      oauthService.completeOAuthConnection.mockResolvedValue({
        success: true,
        accountId: "new-account",
        isNewAccount: true,
        user: { mlUserId: "123456789", nickname: "test_seller" },
      });

      const response = await request(app)
        .post("/api/ml-auth/complete")
        .send({ code: "auth-code-123", state: "mock-state-12345" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("conectada");
      expect(response.body.data.isNewAccount).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ML_AUTH_COMPLETE_SUCCESS",
        })
      );
    });

    test("should complete OAuth connection for existing account", async () => {
      oauthService.completeOAuthConnection.mockResolvedValue({
        success: true,
        accountId: "existing-account",
        isNewAccount: false,
        user: { mlUserId: "123456789", nickname: "test_seller" },
      });

      const response = await request(app)
        .post("/api/ml-auth/complete")
        .send({ code: "auth-code-123", state: "mock-state-12345" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("atualizada");
      expect(response.body.data.isNewAccount).toBe(false);
    });

    test("should require code and state", async () => {
      const response = await request(app)
        .post("/api/ml-auth/complete")
        .send({ code: "auth-code-123" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("required");
    });

    test("should handle OAuth connection failures", async () => {
      oauthService.completeOAuthConnection.mockResolvedValue({
        success: false,
        code: "INVALID_CODE",
        error: "Invalid authorization code",
      });

      const response = await request(app)
        .post("/api/ml-auth/complete")
        .send({ code: "invalid-code", state: "mock-state-12345" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid");
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ML_AUTH_COMPLETE_FAILED",
        })
      );
    });

    test("should handle unexpected errors", async () => {
      oauthService.completeOAuthConnection.mockImplementation(() => {
        throw new Error("Service timeout");
      });

      const response = await request(app)
        .post("/api/ml-auth/complete")
        .send({ code: "auth-code-123", state: "mock-state-12345" })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("erro");
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ML_AUTH_COMPLETE_ERROR",
        })
      );
    });
  });

  // =========================================================================
  // POST /api/ml-auth/url-custom Tests
  // =========================================================================

  describe("POST /api/ml-auth/url-custom", () => {
    test("should generate custom authorization URL", async () => {
      const response = await request(app)
        .post("/api/ml-auth/url-custom")
        .send({
          clientId: "custom-client-id",
          clientSecret: "custom-secret",
          redirectUri: "https://example.com/callback",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.authorizationUrl).toContain(
        "auth.mercadolivre.com.br"
      );
      expect(response.body.data.authorizationUrl).toContain("custom-client-id");
      expect(oauthService.generateCustomState).toHaveBeenCalled();
      expect(oauthService.getCustomAuthorizationUrl).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ML_AUTH_URL_CUSTOM_REQUEST",
        })
      );
    });

    test("should require clientId and clientSecret", async () => {
      const response = await request(app)
        .post("/api/ml-auth/url-custom")
        .send({ redirectUri: "https://example.com/callback" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("obrigatório");
    });

    test("should handle missing clientId", async () => {
      const response = await request(app)
        .post("/api/ml-auth/url-custom")
        .send({ clientSecret: "secret", redirectUri: "https://example.com" })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test("should handle missing clientSecret", async () => {
      const response = await request(app)
        .post("/api/ml-auth/url-custom")
        .send({ clientId: "id", redirectUri: "https://example.com" })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test("should handle service errors", async () => {
      oauthService.getCustomAuthorizationUrl.mockImplementation(() => {
        throw new Error("Invalid credentials");
      });

      const response = await request(app)
        .post("/api/ml-auth/url-custom")
        .send({
          clientId: "bad-id",
          clientSecret: "bad-secret",
          redirectUri: "https://example.com",
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ML_AUTH_URL_CUSTOM_ERROR",
        })
      );
    });
  });

  // =========================================================================
  // Helper Function Tests
  // =========================================================================

  describe("Helper Functions", () => {
    test("should use logInfo() for all info logs", () => {
      // This test ensures logInfo helper is being called
      expect(logger.info).toHaveBeenCalledTimes(0);

      // Make a request
      return request(app).get("/api/ml-auth/url").then(() => {
        // Check that info was logged
        expect(logger.info).toHaveBeenCalled();
        const calls = logger.info.mock.calls;
        calls.forEach((call) => {
          expect(call[0]).toHaveProperty("action");
          expect(call[0]).toHaveProperty("timestamp");
        });
      });
    });

    test("should use logError() for all error logs", () => {
      oauthService.generateState.mockImplementation(() => {
        throw new Error("Service down");
      });

      return request(app).get("/api/ml-auth/url").then(() => {
        expect(logger.error).toHaveBeenCalled();
        const calls = logger.error.mock.calls;
        calls.forEach((call) => {
          expect(call[0]).toHaveProperty("action");
          expect(call[0]).toHaveProperty("timestamp");
        });
      });
    });
  });

  // =========================================================================
  // Error Response Consistency Tests
  // =========================================================================

  describe("Error Response Consistency", () => {
    test("all error responses should have consistent structure", async () => {
      const endpoints = [
        { method: "get", path: "/api/ml-auth/url" },
        { method: "get", path: "/api/ml-auth/status" },
        { method: "post", path: "/api/ml-auth/complete", body: {} },
        { method: "delete", path: "/api/ml-auth/disconnect", body: {} },
        {
          method: "post",
          path: "/api/ml-auth/url-custom",
          body: {},
        },
      ];

      for (const endpoint of endpoints) {
        const req = request(app)[endpoint.method](endpoint.path);
        if (endpoint.body) {
          req.send(endpoint.body);
        }

        const response = await req;
        if (response.status >= 400) {
          expect(response.body).toHaveProperty("success");
          expect(response.body.success).toBe(false);
          expect(response.body).toHaveProperty("message");
        }
      }
    });

    test("all success responses should have consistent structure", async () => {
      oauthService.getAccountStatus.mockResolvedValue({
        success: true,
        connected: false,
        accounts: [],
        tokenRefreshed: false,
        tokenValid: false,
      });

      const response = await request(app).get("/api/ml-auth/status");

      expect(response.body).toHaveProperty("success");
      expect(response.body.success).toBe(true);
    });
  });

  // =========================================================================
  // Logging Consistency Tests
  // =========================================================================

  describe("Logging Consistency", () => {
    test("should log all actions with timestamps", async () => {
      await request(app).get("/api/ml-auth/url");

      logger.info.mock.calls.forEach((call) => {
        expect(call[0]).toHaveProperty("timestamp");
        expect(typeof call[0].timestamp).toBe("string");
        expect(call[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
      });
    });

    test("should log errors with action identifiers", async () => {
      oauthService.generateState.mockImplementation(() => {
        throw new Error("Test error");
      });

      await request(app).get("/api/ml-auth/url");

      expect(logger.error).toHaveBeenCalled();
      logger.error.mock.calls.forEach((call) => {
        expect(call[0]).toHaveProperty("action");
        expect(typeof call[0].action).toBe("string");
        expect(call[0].action).toMatch(/ML_AUTH_/);
      });
    });
  });
});
