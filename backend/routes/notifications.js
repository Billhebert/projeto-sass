/**
 * Notifications Routes
 * Manage webhook notifications history
 *
 * GET    /api/notifications                        - List all notifications for user
 * GET    /api/notifications/:accountId             - List notifications for specific account
 * GET    /api/notifications/:accountId/unread      - List unread notifications
 * GET    /api/notifications/:accountId/:notificationId - Get notification details
 * PUT    /api/notifications/:accountId/:notificationId/read - Mark as read
 * PUT    /api/notifications/:accountId/read-all    - Mark all as read
 * GET    /api/notifications/:accountId/stats       - Get notification statistics
 */

const express = require('express');
const logger = require('../logger');
const { authenticateToken } = require('../middleware/auth');
const Notification = require('../db/models/Notification');
const MLAccount = require('../db/models/MLAccount');

const router = express.Router();

// ============================================================================
// CORE HELPERS
// ============================================================================

/**
 * Handle and log errors with consistent response format
 */
const handleError = (res, statusCode = 500, message, error = null, context = {}) => {
  logger.error({
    action: context.action || 'UNKNOWN_ERROR',
    error: error?.message || message,
    statusCode,
    ...context,
  });

  const response = { success: false, message };
  if (error?.message) response.error = error.message;
  res.status(statusCode).json(response);
};

/**
 * Send success response with consistent format
 */
const sendSuccess = (res, data, message = null, statusCode = 200) => {
  const response = { success: true, data };
  if (message) response.message = message;
  res.status(statusCode).json(response);
};



/**
 * GET /api/notifications
 * List all notifications for the authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 100, offset = 0, topic, status, isRead, sort = '-dateReceived' } = req.query;

    const query = { userId: req.user.userId };
    if (topic) query.topic = topic;
    if (status) query.status = status;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const notifications = await Notification.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId: req.user.userId, isRead: false });

    res.json({
      success: true,
      data: {
        notifications: notifications.map(n => n.getSummary()),
        total,
        unreadCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_NOTIFICATIONS_ERROR',
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message,
    });
  }
});

/**
 * GET /api/notifications/:accountId/stats
 * Get notification statistics for an account
 */
router.get('/:accountId/stats', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { days = 7 } = req.query;

    // Verify account exists
    const account = await MLAccount.findOne({
      id: accountId,
      userId: req.user.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const { stats, unreadCount } = await Notification.getStats(accountId, {
      start: startDate,
    });

    // Get counts by topic
    const topicCounts = await Notification.aggregate([
      { $match: { accountId } },
      {
        $group: {
          _id: '$topic',
          count: { $sum: 1 },
          unread: {
            $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] },
          },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        accountId,
        period: { days: parseInt(days) },
        unreadCount,
        byTopic: topicCounts,
        breakdown: stats,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_NOTIFICATION_STATS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get notification statistics',
      error: error.message,
    });
  }
});

/**
 * GET /api/notifications/:accountId/unread
 * List unread notifications for specific account
 */
router.get('/:accountId/unread', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit = 50, topic } = req.query;

    // Verify account belongs to user
    const account = await MLAccount.findOne({
      id: accountId,
      userId: req.user.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    const notifications = await Notification.findUnread(accountId, {
      limit: parseInt(limit),
      topic,
    });

    res.json({
      success: true,
      data: {
        account: {
          id: account.id,
          nickname: account.nickname,
        },
        notifications: notifications.map(n => n.getSummary()),
        total: notifications.length,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_UNREAD_NOTIFICATIONS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread notifications',
      error: error.message,
    });
  }
});

/**
 * GET /api/notifications/:accountId
 * List notifications for specific account
 */
router.get('/:accountId', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit = 100, offset = 0, topic, status, isRead, sort = '-dateReceived' } = req.query;

    // Verify account belongs to user
    const account = await MLAccount.findOne({
      id: accountId,
      userId: req.user.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    const query = { accountId, userId: req.user.userId };
    if (topic) query.topic = topic;
    if (status) query.status = status;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const notifications = await Notification.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      data: {
        account: {
          id: account.id,
          nickname: account.nickname,
        },
        notifications: notifications.map(n => n.getSummary()),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_ACCOUNT_NOTIFICATIONS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message,
    });
  }
});

/**
 * GET /api/notifications/:accountId/:notificationId
 * Get detailed notification information
 */
router.get('/:accountId/:notificationId', authenticateToken, async (req, res) => {
  try {
    const { accountId, notificationId } = req.params;

    const notification = await Notification.findOne({
      id: notificationId,
      accountId,
      userId: req.user.userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.json({
      success: true,
      data: notification.getDetails(),
    });
  } catch (error) {
    logger.error({
      action: 'GET_NOTIFICATION_ERROR',
      notificationId: req.params.notificationId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification',
      error: error.message,
    });
  }
});

/**
 * PUT /api/notifications/:accountId/:notificationId/read
 * Mark notification as read
 */
router.put('/:accountId/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { accountId, notificationId } = req.params;

    const notification = await Notification.findOne({
      id: notificationId,
      accountId,
      userId: req.user.userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    logger.error({
      action: 'MARK_NOTIFICATION_READ_ERROR',
      notificationId: req.params.notificationId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message,
    });
  }
});

/**
 * PUT /api/notifications/:accountId/read-all
 * Mark all notifications as read
 */
router.put('/:accountId/read-all', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { topic } = req.body;

    // Verify account belongs to user
    const account = await MLAccount.findOne({
      id: accountId,
      userId: req.user.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    const result = await Notification.markAllAsRead(accountId, topic);

    logger.info({
      action: 'ALL_NOTIFICATIONS_MARKED_READ',
      accountId,
      userId: req.user.userId,
      count: result.modifiedCount,
    });

    res.json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read`,
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    logger.error({
      action: 'MARK_ALL_NOTIFICATIONS_READ_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read',
      error: error.message,
    });
  }
});


module.exports = router;
