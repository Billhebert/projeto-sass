/**
 * Mercado Livre Webhook Handler
 *
 * POST /api/webhooks/ml - Receive events from Mercado Livre
 *
 * Handles events:
 * - orders_v2
 * - items
 * - shipments
 * - questions
 */

const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const { clearCachePattern } = require("../middleware/cache");
const logger = require("../logger");
const sdkManager = require("../services/sdk-manager");

const router = express.Router();

// Database functions
const {
  getAccount,
  updateAccount,
  saveEvent,
  getEventsByAccount,
} = require("../db/accounts");

/**
 * Mercado Livre webhook events signature verification
 * ML sends X-Signature header with HMAC-SHA256 signature
 */
function verifyWebhookSignature(req) {
  // For now, we'll implement basic signature verification
  // In production, ensure ML_SECRET_KEY is configured

  const signature = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"];

  // Skip verification in development mode
  if (
    process.env.NODE_ENV === "development" &&
    !process.env.VERIFY_SIGNATURES
  ) {
    return true;
  }

  if (!signature || !requestId) {
    console.warn("Missing signature or request ID in webhook");
    return false;
  }

  // In production with real verification:
  // const data = requestId + JSON.stringify(req.body);
  // const expected = crypto.createHmac('sha256', process.env.ML_SECRET_KEY)
  //   .update(data)
  //   .digest('hex');
  // return signature === expected;

  return true;
}

/**
 * POST /api/webhooks/ml
 *
 * Receive webhook events from Mercado Livre
 *
 * Request body:
 * {
 *   resource: string,      // e.g., "orders/123456"
 *   user_id: number,       // Mercado Livre user ID
 *   topic: string,         // e.g., "orders_v2", "items"
 *   application_id: number,
 *   timestamp: string,
 *   sent: number
 * }
 */
router.post("/ml", async (req, res, next) => {
  try {
    const timestamp = new Date().toISOString();
    const { resource, user_id, topic, application_id } = req.body;

    console.log(
      `[${timestamp}] Webhook received - Topic: ${topic}, User: ${user_id}, Resource: ${resource}`,
    );

    // Verify signature (optional in development)
    // if (!verifyWebhookSignature(req)) {
    //   console.warn('Invalid webhook signature');
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    // Validate required fields
    if (!resource || !user_id || !topic) {
      console.warn("Invalid webhook payload - missing required fields");
      return res.status(400).json({
        error: "Missing required fields",
        details: "resource, user_id, and topic are required",
      });
    }

    // Immediately acknowledge the webhook
    res.status(200).json({
      status: "received",
      timestamp,
      resource,
    });

    // Process the webhook asynchronously
    processWebhookEvent(user_id, topic, resource, req.body).catch((error) =>
      console.error("Error processing webhook:", error),
    );
  } catch (error) {
    console.error("Webhook error:", error.message);
    // Still return 200 to acknowledge
    res.status(200).json({ status: "received" });
  }
});

/**
 * Process webhook event asynchronously
 */
async function processWebhookEvent(userId, topic, resource, payload) {
  try {
    // Get account by user ID
    const account = await getAccount(userId, "userId");

    if (!account) {
      console.warn(`Account not found for user ID: ${userId}`);
      return;
    }

    // Parse resource ID
    const resourceId = resource.split("/")[1];

    // Log the event
    const event = {
      id: `evt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      accountId: account.id,
      topic,
      resource,
      resourceId,
      payload,
      processedAt: new Date().toISOString(),
      status: "pending",
    };

    await saveEvent(event);

    // Invalidate cache for affected resources
    await invalidateCacheForEvent(account, topic, resourceId);

    // Handle different event types
    switch (topic) {
      case "orders_v2":
        await handleOrderEvent(account, resourceId);
        break;
      case "items":
        await handleItemEvent(account, resourceId);
        break;
      case "shipments":
        await handleShipmentEvent(account, resourceId);
        break;
      case "questions":
        await handleQuestionEvent(account, resourceId);
        break;
      default:
        console.log(`Unknown topic: ${topic}`);
    }

    // Update event status
    event.status = "processed";
    await saveEvent(event);

    console.log(
      `Webhook processed successfully - Topic: ${topic}, Resource: ${resource}`,
    );
  } catch (error) {
    console.error(`Error processing ${topic} event:`, error.message);
  }
}

/**
 * Invalidate cache for affected resources
 * Clears Redis cache when data changes via webhook
 */
async function invalidateCacheForEvent(account, topic, resourceId) {
  try {
    logger.info({
      action: "WEBHOOK_CACHE_INVALIDATION",
      accountId: account.id,
      topic,
      resourceId,
    });

    // Patterns to clear based on event topic
    const patterns = [];

    switch (topic) {
      case "orders_v2":
        // Clear order-related caches
        patterns.push(`cache:stats:*:${account.id}:*`);
        patterns.push(`cache:analytics:*:${account.id}:*`);
        patterns.push(`cache:orders:*:${account.id}:*`);
        break;

      case "items":
        // Clear product/item caches
        patterns.push(`cache:items:*:${account.id}:*`);
        patterns.push(`cache:products:*:${account.id}:*`);
        break;

      case "shipments":
        // Clear shipment caches
        patterns.push(`cache:shipments:*:${account.id}:*`);
        patterns.push(`cache:stats:*:${account.id}:*`);
        break;

      case "questions":
        // Clear question caches
        patterns.push(`cache:questions:*:${account.id}:*`);
        break;

      default:
        logger.debug({
          action: "WEBHOOK_CACHE_INVALIDATION_SKIPPED",
          topic,
          reason: "Unknown topic",
        });
        return;
    }

    // Clear all patterns
    let totalCleared = 0;
    for (const pattern of patterns) {
      const cleared = await clearCachePattern(pattern);
      totalCleared += cleared;
    }

    logger.info({
      action: "WEBHOOK_CACHE_INVALIDATED",
      accountId: account.id,
      topic,
      keysCleared: totalCleared,
    });
  } catch (error) {
    logger.error({
      action: "WEBHOOK_CACHE_INVALIDATION_ERROR",
      error: error.message,
      accountId: account.id,
      topic,
    });
  }
}

/**
 * Handle orders_v2 event
 * Fetch full order details and notify subscribers
 */
async function handleOrderEvent(account, orderId) {
  try {
    console.log(`Processing order event - Order ID: ${orderId}`);

    // Fetch order details from ML API
    const orderData = await fetchOrderDetails(account.accessToken, orderId);

    if (orderData) {
      // Update account last sync time
      account.lastSyncTime = new Date().toISOString();
      account.lastSyncStatus = "success";
      await updateAccount(account.id, account);

      // Notify connected WebSocket clients about order update
      const broadcastToClients =
        require("../server").app.locals.broadcastToClients;
      broadcastToClients({
        type: "order-update",
        accountId: account.id,
        orderId,
        data: orderData,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error handling order event:", error.message);
  }
}

/**
 * Handle items event
 * Fetch full item details and notify subscribers
 */
async function handleItemEvent(account, itemId) {
  try {
    console.log(`Processing item event - Item ID: ${itemId}`);

    // Fetch item details from ML API
    const itemData = await fetchItemDetails(account.accessToken, itemId);

    if (itemData) {
      account.lastSyncTime = new Date().toISOString();
      await updateAccount(account.id, account);

      const broadcastToClients =
        require("../server").app.locals.broadcastToClients;
      broadcastToClients({
        type: "item-update",
        accountId: account.id,
        itemId,
        data: itemData,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error handling item event:", error.message);
  }
}

/**
 * Handle shipments event
 */
async function handleShipmentEvent(account, shipmentId) {
  try {
    console.log(`Processing shipment event - Shipment ID: ${shipmentId}`);

    const broadcastToClients =
      require("../server").app.locals.broadcastToClients;
    broadcastToClients({
      type: "shipment-update",
      accountId: account.id,
      shipmentId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error handling shipment event:", error.message);
  }
}

/**
 * Handle questions event
 */
async function handleQuestionEvent(account, questionId) {
  try {
    console.log(`Processing question event - Question ID: ${questionId}`);

    const broadcastToClients =
      require("../server").app.locals.broadcastToClients;
    broadcastToClients({
      type: "question-update",
      accountId: account.id,
      questionId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error handling question event:", error.message);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Fetch order details from Mercado Livre API
 */
async function fetchOrderDetails(accessToken, orderId) {
  try {
    const response = await axios.get(
      `https://api.mercadolibre.com/orders/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 15000,
      },
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch order ${orderId}:`, error.message);
    return null;
  }
}

/**
 * Fetch item details from Mercado Livre API
 */
async function fetchItemDetails(accessToken, itemId) {
  try {
    const response = await axios.get(
      `https://api.mercadolibre.com/items/${itemId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 15000,
      },
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch item ${itemId}:`, error.message);
    return null;
  }
}

module.exports = router;
