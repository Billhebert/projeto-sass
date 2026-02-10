/**
 * Reviews Routes (Opiniões de Produtos)
 * Manage product reviews and ratings
 * 
 * API Mercado Livre:
 * - GET /reviews/item/{item_id} - Get reviews for an item
 * - GET /reviews/item/{item_id}/ratings - Get ratings summary
 * - POST /reviews/{review_id}/reply - Reply to a review
 * 
 * Routes:
 * GET    /api/reviews/:accountId/item/:itemId         - Get item reviews
 * GET    /api/reviews/:accountId/item/:itemId/summary - Get ratings summary
 * GET    /api/reviews/:accountId/all                  - Get all reviews for seller
 * POST   /api/reviews/:accountId/reply/:reviewId      - Reply to review
 * GET    /api/reviews/:accountId/pending              - Get reviews pending reply
 * GET    /api/reviews/:accountId/stats                - Get review statistics
 */

const express = require('express');
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require('../middleware/auth');
const { validateMLToken } = require('../middleware/ml-token-validation');
const { handleError, sendSuccess, buildHeaders } = require('../middleware/response-helpers');

const router = express.Router();

/**
 * GET /api/reviews/:accountId/item/:itemId
 * Get reviews for a specific item
 */
router.get('/:accountId/item/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const reviews = await sdkManager.getItemReviews(accountId, itemId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    logger.info({
      action: 'GET_ITEM_REVIEWS',
      accountId,
      itemId,
      userId: req.user.userId,
      reviewsCount: reviews.reviews?.length || 0,
    });

    sendSuccess(res, reviews);
  } catch (error) {
    handleError(
      res,
      error.response?.status || 500,
      'Failed to get item reviews',
      error,
      {
        action: 'GET_ITEM_REVIEWS_ERROR',
        accountId: req.params.accountId,
        itemId: req.params.itemId,
        userId: req.user.userId,
      },
    );
  }
});

/**
 * GET /api/reviews/:accountId/item/:itemId/summary
 * Get ratings summary for an item
 */
router.get('/:accountId/item/:itemId/summary', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;

    const [reviewsRes, itemRes] = await Promise.all([
      sdkManager.getItemReviews(accountId, itemId, { limit: 100 }),
      sdkManager.getItem(accountId, itemId),
    ]);

    const reviews = reviewsRes.reviews || [];
    
    const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      if (review.rate && ratingDist[review.rate] !== undefined) {
        ratingDist[review.rate]++;
      }
    });

    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0 
      ? reviews.reduce((sum, r) => sum + (r.rate || 0), 0) / totalReviews 
      : 0;

    logger.info({
      action: 'GET_RATINGS_SUMMARY',
      accountId,
      itemId,
      userId: req.user.userId,
    });

    sendSuccess(res, {
      item_id: itemId,
      title: itemRes.title,
      total_reviews: totalReviews,
      average_rating: parseFloat(avgRating.toFixed(2)),
      rating_distribution: ratingDist,
      paging: reviewsRes.paging,
    });
  } catch (error) {
    handleError(
      res,
      error.response?.status || 500,
      'Failed to get ratings summary',
      error,
      {
        action: 'GET_RATINGS_SUMMARY_ERROR',
        accountId: req.params.accountId,
        itemId: req.params.itemId,
        userId: req.user.userId,
      },
    );
  }
});

/**
 * GET /api/reviews/:accountId/all
 * Get all reviews for seller's items
 */
router.get('/:accountId/all', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit = 50 } = req.query;

    const itemsRes = await sdkManager.getAllUserItems(accountId, req.mlAccount.mlUserId, {
      status: 'active',
      limit: 20,
    });

    const itemIds = itemsRes.results || [];
    const allReviews = [];

    for (const itemId of itemIds.slice(0, 10)) {
      try {
        const reviewsRes = await sdkManager.getItemReviews(accountId, itemId, { limit: 10 });
        
        const reviews = reviewsRes.reviews || [];
        reviews.forEach(review => {
          allReviews.push({
            ...review,
            item_id: itemId,
          });
        });
      } catch (err) {
      }
    }

    allReviews.sort((a, b) => new Date(b.date_created) - new Date(a.date_created));

    logger.info({
      action: 'GET_ALL_REVIEWS',
      accountId,
      userId: req.user.userId,
      reviewsCount: allReviews.length,
    });

    sendSuccess(res, {
      reviews: allReviews.slice(0, parseInt(limit)),
      total: allReviews.length,
      items_analyzed: itemIds.length,
    });
  } catch (error) {
    handleError(
      res,
      error.response?.status || 500,
      'Failed to get all reviews',
      error,
      {
        action: 'GET_ALL_REVIEWS_ERROR',
        accountId: req.params.accountId,
        userId: req.user.userId,
      },
    );
  }
});

/**
 * POST /api/reviews/:accountId/reply/:reviewId
 * Reply to a review
 */
router.post('/:accountId/reply/:reviewId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, reviewId } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reply text is required',
      });
    }

    const response = await sdkManager.execute(accountId, async (sdk) => {
      return sdk.replyReview(reviewId, { text });
    });

    logger.info({
      action: 'REPLY_TO_REVIEW',
      accountId,
      reviewId,
      userId: req.user.userId,
    });

    sendSuccess(res, response, 'Reply posted successfully');
  } catch (error) {
    handleError(
      res,
      error.response?.status || 500,
      'Failed to reply to review',
      error,
      {
        action: 'REPLY_TO_REVIEW_ERROR',
        accountId: req.params.accountId,
        reviewId: req.params.reviewId,
        userId: req.user.userId,
      },
    );
  }
});

/**
 * GET /api/reviews/:accountId/pending
 * Get reviews pending seller reply
 */
router.get('/:accountId/pending', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;

    const itemsRes = await sdkManager.getAllUserItems(accountId, req.mlAccount.mlUserId, {
      status: 'active',
      limit: 50,
    });

    const itemIds = itemsRes.results || [];
    const pendingReviews = [];

    for (const itemId of itemIds.slice(0, 20)) {
      try {
        const reviewsRes = await sdkManager.getItemReviews(accountId, itemId);
        
        const reviews = reviewsRes.reviews || [];
        reviews.forEach(review => {
          if (!review.reply || !review.reply.text) {
            pendingReviews.push({
              ...review,
              item_id: itemId,
            });
          }
        });
      } catch (err) {
      }
    }

    pendingReviews.sort((a, b) => new Date(a.date_created) - new Date(b.date_created));

    logger.info({
      action: 'GET_PENDING_REVIEWS',
      accountId,
      userId: req.user.userId,
      pendingCount: pendingReviews.length,
    });

    sendSuccess(res, {
      pending_reviews: pendingReviews,
      total: pendingReviews.length,
    });
  } catch (error) {
    handleError(
      res,
      error.response?.status || 500,
      'Failed to get pending reviews',
      error,
      {
        action: 'GET_PENDING_REVIEWS_ERROR',
        accountId: req.params.accountId,
        userId: req.user.userId,
      },
    );
  }
});

/**
 * GET /api/reviews/:accountId/stats
 * Get review statistics
 */
router.get('/:accountId/stats', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;

    const itemsRes = await sdkManager.getAllUserItems(accountId, req.mlAccount.mlUserId, {
      status: 'active',
      limit: 50,
    });

    const itemIds = itemsRes.results || [];
    let totalReviews = 0;
    let totalRating = 0;
    let pendingReplies = 0;
    let positiveReviews = 0;
    let negativeReviews = 0;
    let neutralReviews = 0;

    for (const itemId of itemIds.slice(0, 20)) {
      try {
        const reviewsRes = await sdkManager.getItemReviews(accountId, itemId, { limit: 50 });
        
        const reviews = reviewsRes.reviews || [];
        reviews.forEach(review => {
          totalReviews++;
          totalRating += review.rate || 0;
          
          if (!review.reply || !review.reply.text) {
            pendingReplies++;
          }
          
          if (review.rate >= 4) positiveReviews++;
          else if (review.rate <= 2) negativeReviews++;
          else neutralReviews++;
        });
      } catch (err) {
      }
    }

    const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;
    const positivePercentage = totalReviews > 0 ? (positiveReviews / totalReviews * 100) : 0;

    logger.info({
      action: 'GET_REVIEW_STATS',
      accountId,
      userId: req.user.userId,
      totalReviews,
    });

    sendSuccess(res, {
      total_reviews: totalReviews,
      average_rating: parseFloat(averageRating.toFixed(2)),
      pending_replies: pendingReplies,
      sentiment: {
        positive: positiveReviews,
        neutral: neutralReviews,
        negative: negativeReviews,
      },
      positive_percentage: parseFloat(positivePercentage.toFixed(1)),
      items_analyzed: Math.min(itemIds.length, 20),
    });
  } catch (error) {
    handleError(
      res,
      error.response?.status || 500,
      'Failed to get review statistics',
      error,
      {
        action: 'GET_REVIEW_STATS_ERROR',
        accountId: req.params.accountId,
        userId: req.user.userId,
      },
    );
  }
});

/**
 * GET /api/reviews/:accountId/negative
 * Get negative reviews (1-2 stars)
 */
router.get('/:accountId/negative', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;

    const itemsRes = await sdkManager.getAllUserItems(accountId, req.mlAccount.mlUserId, {
      limit: 50,
    });

    const itemIds = itemsRes.results || [];
    const negativeReviews = [];

    for (const itemId of itemIds.slice(0, 20)) {
      try {
        const reviewsRes = await sdkManager.getItemReviews(accountId, itemId);
        
        const reviews = reviewsRes.reviews || [];
        reviews.forEach(review => {
          if (review.rate && review.rate <= 2) {
            negativeReviews.push({
              ...review,
              item_id: itemId,
            });
          }
        });
      } catch (err) {
      }
    }

    negativeReviews.sort((a, b) => new Date(b.date_created) - new Date(a.date_created));

    logger.info({
      action: 'GET_NEGATIVE_REVIEWS',
      accountId,
      userId: req.user.userId,
      negativeCount: negativeReviews.length,
    });

    sendSuccess(res, {
      negative_reviews: negativeReviews,
      total: negativeReviews.length,
    });
  } catch (error) {
    handleError(
      res,
      error.response?.status || 500,
      'Failed to get negative reviews',
      error,
      {
        action: 'GET_NEGATIVE_REVIEWS_ERROR',
        accountId: req.params.accountId,
        userId: req.user.userId,
      },
    );
  }
});

module.exports = router;
