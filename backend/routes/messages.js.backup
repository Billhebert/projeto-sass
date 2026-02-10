/**
 * Messages Routes
 * Manage post-sale messages from Mercado Livre
 *
 * GET    /api/messages                              - List all messages for user
 * GET    /api/messages/:accountId                   - List messages for specific account
 * GET    /api/messages/:accountId/unread            - List unread messages
 * GET    /api/messages/:accountId/pack/:packId      - Get conversation by pack
 * GET    /api/messages/:accountId/:messageId        - Get message details
 * POST   /api/messages/:accountId/pack/:packId      - Send message
 * POST   /api/messages/:accountId/sync              - Sync messages from ML
 * PUT    /api/messages/:accountId/:messageId/read   - Mark message as read
 * GET    /api/messages/:accountId/stats             - Get message statistics
 */

const express = require("express");
const logger = require("../logger");
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require("../middleware/auth");
const { validateMLToken } = require("../middleware/ml-token-validation");
const Message = require("../db/models/Message");
const Order = require("../db/models/Order");
const MLAccount = require("../db/models/MLAccount");

const router = express.Router();

/**
 * GET /api/messages
 * List all messages for the authenticated user
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const {
      all,
      limit: queryLimit,
      offset = 0,
      isRead,
      sort = "-dateCreated",
    } = req.query;

    // If all=true, fetch everything. Otherwise use limit (default 100)
    const limit = all === "true" ? 999999 : queryLimit || 100;

    const query = { userId: req.user.userId };
    if (isRead !== undefined) query.isRead = isRead === "true";

    const messages = await Message.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Message.countDocuments(query);

    res.json({
      success: true,
      data: {
        messages: messages.map((m) => m.getSummary()),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error({
      action: "GET_MESSAGES_ERROR",
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
});

/**
 * GET /api/messages/:accountId/stats
 * Get message statistics for an account
 */
router.get("/:accountId/stats", authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;

    // Verify account exists
    const account = await MLAccount.findOne({
      id: accountId,
      userId: req.user.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const stats = await Message.getStats(accountId);

    // Get today's messages
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMessages = await Message.countDocuments({
      accountId,
      dateCreated: { $gte: today },
    });

    res.json({
      success: true,
      data: {
        accountId,
        ...stats,
        todayMessages,
      },
    });
  } catch (error) {
    logger.error({
      action: "GET_MESSAGE_STATS_ERROR",
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Failed to get message statistics",
      error: error.message,
    });
  }
});

/**
 * GET /api/messages/:accountId/unread
 * List unread messages for specific account
 */
router.get("/:accountId/unread", authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit = 50 } = req.query;

    // Verify account belongs to user
    const account = await MLAccount.findOne({
      id: accountId,
      userId: req.user.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const messages = await Message.findUnread(accountId, {
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: {
        account: {
          id: account.id,
          nickname: account.nickname,
        },
        messages: messages.map((m) => m.getSummary()),
        total: messages.length,
      },
    });
  } catch (error) {
    logger.error({
      action: "GET_UNREAD_MESSAGES_ERROR",
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Failed to fetch unread messages",
      error: error.message,
    });
  }
});

/**
 * GET /api/messages/:accountId
 * List messages for specific account
 */
router.get("/:accountId", authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const {
      all,
      limit: queryLimit,
      offset = 0,
      packId,
      isRead,
      sort = "-dateCreated",
    } = req.query;

    // If all=true, fetch everything. Otherwise use limit (default 100)
    const limit = all === "true" ? 999999 : queryLimit || 100;

    // Verify account belongs to user
    const account = await MLAccount.findOne({
      id: accountId,
      userId: req.user.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const query = { accountId, userId: req.user.userId };
    if (packId) query.packId = packId;
    if (isRead !== undefined) query.isRead = isRead === "true";

    const messages = await Message.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Message.countDocuments(query);

    res.json({
      success: true,
      data: {
        account: {
          id: account.id,
          nickname: account.nickname,
        },
        messages: messages.map((m) => m.getSummary()),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error({
      action: "GET_ACCOUNT_MESSAGES_ERROR",
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
});

/**
 * GET /api/messages/:accountId/pack/:packId
 * Get conversation by pack ID
 */
router.get(
  "/:accountId/pack/:packId",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, packId } = req.params;
      const account = req.mlAccount;

      // Fetch conversation using SDK Manager
      const response = await sdkManager
        .execute(accountId, async (sdk) => {
          return await sdk.messages.getPackMessages(packId, account.mlUserId);
        })
        .catch((err) => {
          logger.warn({
            action: "FETCH_CONVERSATION_ERROR",
            packId,
            error: err.message,
          });
          return null;
        });

      // Also get from local DB
      const localMessages = await Message.getConversation(accountId, packId);

      res.json({
        success: true,
        data: {
          packId,
          messages:
            response?.messages || localMessages.map((m) => m.getDetails()),
          paging: response?.paging || { total: localMessages.length },
        },
      });
    } catch (error) {
      logger.error({
        action: "GET_CONVERSATION_ERROR",
        packId: req.params.packId,
        userId: req.user.userId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        message: "Failed to fetch conversation",
        error: error.message,
      });
    }
  },
);

/**
 * GET /api/messages/:accountId/:messageId
 * Get detailed message information
 */
router.get("/:accountId/:messageId", authenticateToken, async (req, res) => {
  try {
    const { accountId, messageId } = req.params;

    const message = await Message.findOne({
      $or: [{ id: messageId }, { mlMessageId: messageId }],
      accountId,
      userId: req.user.userId,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    res.json({
      success: true,
      data: message.getDetails(),
    });
  } catch (error) {
    logger.error({
      action: "GET_MESSAGE_ERROR",
      messageId: req.params.messageId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Failed to fetch message",
      error: error.message,
    });
  }
});

/**
 * POST /api/messages/:accountId/pack/:packId
 * Send a message to a conversation
 */
router.post(
  "/:accountId/pack/:packId",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, packId } = req.params;
      const { text, attachments } = req.body;
      const account = req.mlAccount;

      if (!text || text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Message text is required",
        });
      }

      // Send message using SDK Manager
      const messageData = {
        from: {
          user_id: account.mlUserId,
        },
        to: {
          // Buyer ID should be determined from the pack
        },
        text: text.trim(),
      };

      if (attachments && attachments.length > 0) {
        messageData.attachments = attachments;
      }

      const response = await sdkManager.execute(accountId, async (sdk) => {
        return await sdk.messages.sendMessage(
          packId,
          account.mlUserId,
          messageData,
        );
      });

      // Save message to local DB
      const message = new Message({
        accountId,
        userId: req.user.userId,
        mlMessageId: response.id?.toString() || `local_${Date.now()}`,
        packId,
        text: text.trim(),
        from: {
          id: account.mlUserId,
          nickname: account.nickname,
          role: "seller",
        },
        dateCreated: new Date(),
        direction: "outbound",
        isRead: true,
      });
      await message.save();

      logger.info({
        action: "MESSAGE_SENT",
        packId,
        accountId,
        userId: req.user.userId,
      });

      res.json({
        success: true,
        message: "Message sent successfully",
        data: message.getDetails(),
      });
    } catch (error) {
      logger.error({
        action: "SEND_MESSAGE_ERROR",
        packId: req.params.packId,
        userId: req.user.userId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        message: "Failed to send message",
        error: error.message,
      });
    }
  },
);

/**
 * PUT /api/messages/:accountId/:messageId/read
 * Mark message as read
 */
router.put(
  "/:accountId/:messageId/read",
  authenticateToken,
  async (req, res) => {
    try {
      const { accountId, messageId } = req.params;

      const message = await Message.findOne({
        $or: [{ id: messageId }, { mlMessageId: messageId }],
        accountId,
        userId: req.user.userId,
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Message not found",
        });
      }

      message.isRead = true;
      message.dateRead = new Date();
      await message.save();

      res.json({
        success: true,
        message: "Message marked as read",
      });
    } catch (error) {
      logger.error({
        action: "MARK_MESSAGE_READ_ERROR",
        messageId: req.params.messageId,
        userId: req.user.userId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        message: "Failed to mark message as read",
        error: error.message,
      });
    }
  },
);

/**
 * POST /api/messages/:accountId/sync
 * Sync messages from Mercado Livre
 */
router.post(
  "/:accountId/sync",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId } = req.params;
      const { all = false } = req.body;
      const account = req.mlAccount;

      logger.info({
        action: "MESSAGES_SYNC_STARTED",
        accountId,
        userId: req.user.userId,
        all,
        timestamp: new Date().toISOString(),
      });

      // Get orders with pack IDs - all or limited to 20
      const query = Order.find({
        accountId,
        userId: req.user.userId,
        packId: { $exists: true, $ne: null },
      }).sort({ dateCreated: -1 });

      const orders = all ? await query : await query.limit(20);

      const packIds = [
        ...new Set(orders.map((o) => o.packId).filter((id) => id)),
      ];

      // Fetch messages for each pack using SDK Manager
      let allMessages = [];
      for (const packId of packIds) {
        try {
          const response = await sdkManager.execute(accountId, async (sdk) => {
            return await sdk.messages.getPackMessages(packId, account.mlUserId);
          });

          if (response?.messages) {
            allMessages = allMessages.concat(
              response.messages.map((m) => ({ ...m, packId })),
            );
          }
        } catch (err) {
          logger.warn({
            action: "FETCH_PACK_MESSAGES_ERROR",
            packId,
            error: err.message,
          });
        }
      }

      // Save messages
      const savedMessages = await saveMessages(
        accountId,
        req.user.userId,
        account.mlUserId,
        allMessages,
      );

      logger.info({
        action: "MESSAGES_SYNC_COMPLETED",
        accountId,
        userId: req.user.userId,
        messagesCount: savedMessages.length,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: `Synchronized ${savedMessages.length} messages`,
        data: {
          accountId,
          messagesCount: savedMessages.length,
          messages: savedMessages.slice(0, 20).map((m) => m.getSummary()),
          syncedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error({
        action: "MESSAGES_SYNC_ERROR",
        accountId: req.params.accountId,
        userId: req.user.userId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      res.status(500).json({
        success: false,
        message: "Failed to sync messages",
        error: error.message,
      });
    }
  },
);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Save or update messages in database
 */
async function saveMessages(accountId, userId, sellerId, mlMessages) {
  const savedMessages = [];

  for (const mlMessage of mlMessages) {
    try {
      const isSeller =
        mlMessage.from?.user_id?.toString() === sellerId.toString();

      const messageData = {
        accountId,
        userId,
        mlMessageId:
          mlMessage.id?.toString() || `ml_${Date.now()}_${Math.random()}`,
        packId: mlMessage.packId || mlMessage.pack_id,
        text: mlMessage.text || mlMessage.message_text || "",
        plainText: mlMessage.plain_text,
        status: mlMessage.status || "available",
        from: mlMessage.from
          ? {
              id: mlMessage.from.user_id?.toString(),
              email: mlMessage.from.email,
              nickname: mlMessage.from.nickname,
              role: isSeller ? "seller" : "buyer",
            }
          : null,
        to: mlMessage.to
          ? {
              id: mlMessage.to.user_id?.toString(),
              email: mlMessage.to.email,
              nickname: mlMessage.to.nickname,
              role: isSeller ? "buyer" : "seller",
            }
          : null,
        messageType: mlMessage.message_type || "text",
        attachments: mlMessage.attachments || [],
        dateCreated: mlMessage.date_created
          ? new Date(mlMessage.date_created)
          : new Date(),
        dateReceived: mlMessage.date_received
          ? new Date(mlMessage.date_received)
          : null,
        dateRead: mlMessage.date_read ? new Date(mlMessage.date_read) : null,
        direction: isSeller ? "outbound" : "inbound",
        isRead: isSeller ? true : mlMessage.date_read ? true : false,
        lastSyncedAt: new Date(),
      };

      // Find or create message
      let message = await Message.findOne({
        accountId,
        mlMessageId: messageData.mlMessageId,
      });

      if (message) {
        Object.assign(message, messageData);
        await message.save();
      } else {
        message = new Message(messageData);
        await message.save();
      }

      savedMessages.push(message);
    } catch (error) {
      logger.error({
        action: "SAVE_MESSAGE_ERROR",
        mlMessageId: mlMessage.id,
        accountId,
        error: error.message,
      });
    }
  }

  return savedMessages;
}

module.exports = router;
