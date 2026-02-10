/**
 * Billing Routes (Conciliação Financeira)
 * Financial reconciliation, billing reports, and settlement data
 *
 * API Mercado Livre:
 * - GET /users/{user_id}/billing/periods - Billing periods
 * - GET /users/{user_id}/billing/period/{period_id} - Period details
 * - GET /users/{user_id}/billing/period/{period_id}/balance - Balance
 * - GET /users/{user_id}/orders/search - Orders for settlement
 * - GET /users/{user_id}/mercadopago_account/balance - MP account balance
 *
 * Routes:
 * GET    /api/billing/:accountId/periods                  - List billing periods
 * GET    /api/billing/:accountId/period/:periodId         - Get period details
 * GET    /api/billing/:accountId/balance                  - Get current balance
 * GET    /api/billing/:accountId/settlements              - List settlements
 * GET    /api/billing/:accountId/settlement/:settlementId - Get settlement details
 * GET    /api/billing/:accountId/fees                     - Get fee summary
 * GET    /api/billing/:accountId/report/:type             - Generate report
 */

const express = require("express");
const axios = require("axios");
const logger = require("../logger");
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require("../middleware/auth");
const { validateMLToken } = require("../middleware/ml-token-validation");

const router = express.Router();

const ML_API_BASE = "https://api.mercadolibre.com";

// ============================================================================
// CORE HELPER FUNCTIONS
// ============================================================================

/**
 * Send successful response
 */
function sendSuccess(res, data, message = '', statusCode = 200) {
  const response = { success: true };
  if (message) response.message = message;
  if (data !== undefined) response.data = data;
  return res.status(statusCode).json(response);
}

/**
 * Handle error response with logging
 */
function handleError(res, statusCode, message, error, action, context = {}, isFallback = false) {
  if (!isFallback) {
    logger.error({
      action,
      ...context,
      error: error.message || error,
    });
  }
  return res.status(statusCode).json({
    success: !isFallback,
    message,
    error: error.message || error,
    source: isFallback ? 'fallback' : undefined,
  });
}

/**
 * Build authorization headers
 */
function buildHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

// ============================================================================
// BILLING-SPECIFIC HELPER FUNCTIONS
// ============================================================================

/**
 * Build billing period params
 */
function buildBillingParams(query) {
  return {
    limit: parseInt(query.limit || 12),
  };
}

/**
 * Build settlement search params
 */
function buildSettlementParams(query) {
  const params = {
    seller_id: query.seller_id,
    order_status: "paid",
    limit: parseInt(query.limit || 100),
    offset: parseInt(query.offset || 0),
    sort: "date_desc",
  };

  if (query.from) params["order.date_created.from"] = query.from;
  if (query.to) params["order.date_created.to"] = query.to;

  return params;
}

/**
 * Format settlement data
 */
function formatSettlement(order) {
  return {
    order_id: order.id,
    pack_id: order.pack_id,
    date_created: order.date_created,
    date_closed: order.date_closed,
    status: order.status,
    total_amount: order.total_amount,
    paid_amount: order.paid_amount,
    currency_id: order.currency_id,
    buyer: order.buyer,
    items: order.order_items?.length || 0,
  };
}

/**
 * Calculate order fees
 */
function calculateOrderFees(order) {
  return {
    marketplace_fee: order.marketplace_fee || 0,
    shipping_fee: order.shipping_cost || 0,
    financing_fee: order.financing_fee || 0,
  };
}

/**
 * Calculate net amount
 */
function calculateNetAmount(totalAmount, fees) {
  return totalAmount - fees.marketplace_fee - fees.shipping_fee - fees.financing_fee;
}

/**
 * Calculate fee totals from orders
 */
function calculateFeeTotals(orders) {
  let totalMarketplaceFee = 0;
  let totalShippingFee = 0;
  let totalFinancingFee = 0;
  let totalGrossAmount = 0;

  orders.forEach((order) => {
    totalMarketplaceFee += order.marketplace_fee || 0;
    totalShippingFee += order.shipping_cost || 0;
    totalFinancingFee += order.financing_fee || 0;
    totalGrossAmount += order.total_amount || 0;
  });

  const totalFees = totalMarketplaceFee + totalShippingFee + totalFinancingFee;
  const netAmount = totalGrossAmount - totalFees;
  const feePercentage = totalGrossAmount > 0
    ? ((totalFees / totalGrossAmount) * 100).toFixed(2)
    : 0;

  return {
    totalMarketplaceFee,
    totalShippingFee,
    totalFinancingFee,
    totalGrossAmount,
    totalFees,
    netAmount,
    feePercentage,
  };
}

/**
 * Generate report data by type
 */
function generateReportByType(type, orders, from, to) {
  switch (type) {
    case "sales":
      return orders.map((order) => ({
        order_id: order.id,
        date: order.date_created,
        total: order.total_amount,
        items: order.order_items?.map((i) => i.item.title).join(", "),
        buyer: order.buyer?.nickname,
        status: order.status,
      }));

    case "fees":
      return orders.map((order) => ({
        order_id: order.id,
        date: order.date_created,
        gross: order.total_amount,
        marketplace_fee: order.marketplace_fee || 0,
        shipping_fee: order.shipping_cost || 0,
        net:
          (order.total_amount || 0) -
          (order.marketplace_fee || 0) -
          (order.shipping_cost || 0),
      }));

    case "settlements":
      return orders.map((order) => ({
        order_id: order.id,
        date_created: order.date_created,
        date_closed: order.date_closed,
        amount: order.total_amount,
        payment_type: order.payments?.[0]?.payment_type,
        status: order.status,
      }));

    case "summary":
      const totalSales = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const totalFees = orders.reduce(
        (sum, o) => sum + (o.marketplace_fee || 0) + (o.shipping_cost || 0),
        0,
      );
      return {
        period: { from, to },
        total_orders: orders.length,
        total_sales: totalSales,
        total_fees: totalFees,
        net_revenue: totalSales - totalFees,
        average_order_value: orders.length > 0 ? totalSales / orders.length : 0,
      };

    default:
      return null;
  }
}

/**
 * Group orders by day
 */
function groupOrdersByDay(orders) {
  const dailyData = {};
  orders.forEach((order) => {
    const date = order.date_created.split("T")[0];
    if (!dailyData[date]) {
      dailyData[date] = {
        date,
        orders: 0,
        gross: 0,
        fees: 0,
        net: 0,
      };
    }
    const fees = (order.marketplace_fee || 0) + (order.shipping_cost || 0);
    dailyData[date].orders += 1;
    dailyData[date].gross += order.total_amount || 0;
    dailyData[date].fees += fees;
    dailyData[date].net += (order.total_amount || 0) - fees;
  });

  return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate date range
 */
function calculateDateRange(days) {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - parseInt(days));
  return { fromDate, toDate };
}

/**
 * GET /api/billing/:accountId/periods
 * List billing periods
 */
router.get("/:accountId/periods", authenticateToken, validateMLToken("accountId"), async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = req.mlAccount;
    const headers = buildHeaders(account.accessToken);
    const params = buildBillingParams(req.query);

    const response = await axios.get(
      `${ML_API_BASE}/users/${account.mlUserId}/billing/periods`,
      { headers, params },
    );

    logger.info({
      action: "LIST_BILLING_PERIODS",
      accountId,
      userId: req.user.userId,
      periodsCount: response.data?.length || 0,
    });

    return sendSuccess(res, response.data);
  } catch (error) {
    return handleError(
      res,
      error.response?.status || 500,
      'Failed to list billing periods',
      error,
      'LIST_BILLING_PERIODS_ERROR',
      { accountId: req.params.accountId, userId: req.user.userId }
    );
  }
});

/**
 * GET /api/billing/:accountId/period/:periodId
 * Get billing period details
 */
router.get("/:accountId/period/:periodId", authenticateToken, validateMLToken("accountId"), async (req, res) => {
  try {
    const { accountId, periodId } = req.params;
    const account = req.mlAccount;
    const headers = buildHeaders(account.accessToken);

    const [periodRes, balanceRes] = await Promise.all([
      axios.get(
        `${ML_API_BASE}/users/${account.mlUserId}/billing/period/${periodId}`,
        { headers },
      ),
      axios
        .get(
          `${ML_API_BASE}/users/${account.mlUserId}/billing/period/${periodId}/balance`,
          { headers },
        )
        .catch(() => ({ data: null })),
    ]);

    logger.info({
      action: "GET_BILLING_PERIOD",
      accountId,
      periodId,
      userId: req.user.userId,
    });

    return sendSuccess(res, {
      period: periodRes.data,
      balance: balanceRes.data,
    });
  } catch (error) {
    return handleError(
      res,
      error.response?.status || 500,
      'Failed to get billing period',
      error,
      'GET_BILLING_PERIOD_ERROR',
      {
        accountId: req.params.accountId,
        periodId: req.params.periodId,
        userId: req.user.userId,
      }
    );
  }
});

/**
 * GET /api/billing/:accountId/balance
 * Get current account balance
 */
router.get("/:accountId/balance", authenticateToken, validateMLToken("accountId"), async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = req.mlAccount;
    const headers = buildHeaders(account.accessToken);

    const balanceRes = await axios
      .get(`${ML_API_BASE}/users/${account.mlUserId}/mercadopago_account/balance`, { headers })
      .catch(() => ({ data: null }));

    const ordersRes = await axios
      .get(`${ML_API_BASE}/orders/search`, {
        headers,
        params: {
          seller: account.mlUserId,
          order_status: "paid",
          sort: "date_desc",
          limit: 50,
        },
      })
      .catch(() => ({ data: { results: [] } }));

    const recentOrders = ordersRes.data.results || [];
    const totalRevenue = recentOrders.reduce(
      (sum, order) => sum + (order.total_amount || 0),
      0,
    );

    logger.info({
      action: "GET_BALANCE",
      accountId,
      userId: req.user.userId,
    });

    return sendSuccess(res, {
      mercadopago_balance: balanceRes.data,
      recent_revenue: {
        total: totalRevenue,
        orders_count: recentOrders.length,
        currency: "BRL",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleError(
      res,
      error.response?.status || 500,
      'Failed to get balance',
      error,
      'GET_BALANCE_ERROR',
      { accountId: req.params.accountId, userId: req.user.userId }
    );
  }
});

/**
 * GET /api/billing/:accountId/settlements
 * List settlements (pagamentos liberados)
 */
router.get("/:accountId/settlements", authenticateToken, validateMLToken("accountId"), async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = req.mlAccount;
    const headers = buildHeaders(account.accessToken);

    const params = buildSettlementParams({ ...req.query, seller_id: account.mlUserId });

    const response = await axios.get(`${ML_API_BASE}/orders/search`, { headers, params });

    const orders = response.data.results || [];
    const settlements = orders.map(formatSettlement);
    const totalAmount = settlements.reduce((sum, s) => sum + (s.total_amount || 0), 0);

    logger.info({
      action: "LIST_SETTLEMENTS",
      accountId,
      userId: req.user.userId,
      settlementsCount: settlements.length,
    });

    return sendSuccess(res, {
      settlements,
      summary: {
        total_amount: totalAmount,
        count: settlements.length,
        currency: "BRL",
      },
      paging: response.data.paging,
    });
  } catch (error) {
    return handleError(
      res,
      200,
      'Failed to list settlements',
      error,
      'LIST_SETTLEMENTS_ERROR',
      { accountId: req.params.accountId, userId: req.user.userId },
      true
    );
  }
});

/**
 * GET /api/billing/:accountId/settlement/:orderId
 * Get settlement details for an order
 */
router.get("/:accountId/settlement/:orderId", authenticateToken, validateMLToken("accountId"), async (req, res) => {
  try {
    const { accountId, orderId } = req.params;
    const account = req.mlAccount;
    const headers = buildHeaders(account.accessToken);

    const [orderRes, billingRes] = await Promise.all([
      axios.get(`${ML_API_BASE}/orders/${orderId}`, { headers }),
      axios
        .get(`${ML_API_BASE}/orders/${orderId}/billing_info`, { headers })
        .catch(() => ({ data: null })),
    ]);

    const order = orderRes.data;
    const fees = calculateOrderFees(order);
    const netAmount = calculateNetAmount(order.total_amount, fees);

    logger.info({
      action: "GET_SETTLEMENT_DETAILS",
      accountId,
      orderId,
      userId: req.user.userId,
    });

    return sendSuccess(res, {
      order: {
        id: order.id,
        date_created: order.date_created,
        date_closed: order.date_closed,
        status: order.status,
        total_amount: order.total_amount,
        paid_amount: order.paid_amount,
        currency_id: order.currency_id,
      },
      billing_info: billingRes.data,
      fees,
      net_amount: netAmount,
      items: order.order_items,
      buyer: order.buyer,
      payments: order.payments,
    });
  } catch (error) {
    return handleError(
      res,
      error.response?.status || 500,
      'Failed to get settlement details',
      error,
      'GET_SETTLEMENT_DETAILS_ERROR',
      {
        accountId: req.params.accountId,
        orderId: req.params.orderId,
        userId: req.user.userId,
      }
    );
  }
});

/**
 * GET /api/billing/:accountId/fees
 * Get fee summary for the account
 */
router.get("/:accountId/fees", authenticateToken, validateMLToken("accountId"), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { from, to } = req.query;
    const account = req.mlAccount;
    const headers = buildHeaders(account.accessToken);

    const params = buildSettlementParams({ ...req.query, seller_id: account.mlUserId });

    const response = await axios.get(`${ML_API_BASE}/orders/search`, { headers, params });
    const orders = response.data.results || [];

    const {
      totalMarketplaceFee,
      totalShippingFee,
      totalFinancingFee,
      totalGrossAmount,
      totalFees,
      netAmount,
      feePercentage,
    } = calculateFeeTotals(orders);

    logger.info({
      action: "GET_FEE_SUMMARY",
      accountId,
      userId: req.user.userId,
      ordersAnalyzed: orders.length,
    });

    return sendSuccess(res, {
      summary: {
        gross_amount: totalGrossAmount,
        total_fees: totalFees,
        net_amount: netAmount,
        fee_percentage: parseFloat(feePercentage),
        currency: "BRL",
      },
      breakdown: {
        marketplace_fee: totalMarketplaceFee,
        shipping_fee: totalShippingFee,
        financing_fee: totalFinancingFee,
      },
      orders_analyzed: orders.length,
      period: { from, to },
    });
  } catch (error) {
    return handleError(
      res,
      200,
      'Failed to get fee summary',
      error,
      'GET_FEE_SUMMARY_ERROR',
      { accountId: req.params.accountId, userId: req.user.userId },
      true
    );
  }
});

/**
 * GET /api/billing/:accountId/report/:type
 * Generate billing report
 */
router.get("/:accountId/report/:type", authenticateToken, validateMLToken("accountId"), async (req, res) => {
  try {
    const { accountId, type } = req.params;
    const { from, to } = req.query;
    const account = req.mlAccount;
    const headers = buildHeaders(account.accessToken);

    const validTypes = ["sales", "fees", "settlements", "summary"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid report type. Valid types: ${validTypes.join(", ")}`,
      });
    }

    const params = buildSettlementParams({ ...req.query, seller_id: account.mlUserId });
    const response = await axios.get(`${ML_API_BASE}/orders/search`, { headers, params });
    const orders = response.data.results || [];

    const reportData = generateReportByType(type, orders, from, to);

    logger.info({
      action: "GENERATE_REPORT",
      accountId,
      reportType: type,
      userId: req.user.userId,
    });

    return sendSuccess(res, {
      type,
      generated_at: new Date().toISOString(),
      period: { from, to },
      report: reportData,
    });
  } catch (error) {
    return handleError(
      res,
      error.response?.status || 500,
      'Failed to generate report',
      error,
      'GENERATE_REPORT_ERROR',
      {
        accountId: req.params.accountId,
        reportType: req.params.type,
        userId: req.user.userId,
      }
    );
  }
});

/**
 * GET /api/billing/:accountId/daily-summary
 * Get daily sales and fee summary
 */
router.get("/:accountId/daily-summary", authenticateToken, validateMLToken("accountId"), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { days = 30 } = req.query;
    const account = req.mlAccount;
    const headers = buildHeaders(account.accessToken);

    const { fromDate, toDate } = calculateDateRange(days);

    const response = await axios.get(`${ML_API_BASE}/orders/search`, {
      headers,
      params: {
        seller: account.mlUserId,
        order_status: "paid",
        "order.date_created.from": fromDate.toISOString(),
        "order.date_created.to": toDate.toISOString(),
        limit: 100,
        sort: "date_asc",
      },
    });

    const orders = response.data.results || [];
    const dailySummary = groupOrdersByDay(orders);

    logger.info({
      action: "GET_DAILY_SUMMARY",
      accountId,
      userId: req.user.userId,
      days: parseInt(days),
    });

    return sendSuccess(res, {
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        days: parseInt(days),
      },
      daily: dailySummary,
      totals: {
        orders: orders.length,
        gross: dailySummary.reduce((sum, d) => sum + d.gross, 0),
        fees: dailySummary.reduce((sum, d) => sum + d.fees, 0),
        net: dailySummary.reduce((sum, d) => sum + d.net, 0),
      },
    });
  } catch (error) {
    const { days = 30 } = req.query;
    const { fromDate, toDate } = calculateDateRange(days);

    return handleError(
      res,
      200,
      'Failed to get daily summary',
      error,
      'GET_DAILY_SUMMARY_ERROR',
      { accountId: req.params.accountId, userId: req.user.userId },
      true
    );
  }
});

module.exports = router;
