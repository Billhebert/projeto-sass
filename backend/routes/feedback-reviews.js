const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require('../middleware/auth');

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


const API_BASE_URL = process.env.ML_API_URL || 'https://api.mercadolibre.com';

// Valid rating values (1-5 stars)
const VALID_RATINGS = [1, 2, 3, 4, 5];
const VALID_FEEDBACK_TYPES = ['positive', 'neutral', 'negative'];

// Validation helpers
const validateItemId = (itemId) => {
  if (!itemId || typeof itemId !== 'string' || itemId.trim().length === 0) {
    return 'Item ID must be a non-empty string';
  }
  return null;
};

const validateUserId = (userId) => {
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    return 'User ID must be a non-empty string';
  }
  return null;
};

const validateFeedbackCreation = (body) => {
  const errors = [];
  
  if (!body.order_id || isNaN(parseInt(body.order_id))) {
    errors.push('order_id is required and must be a valid integer');
  }
  
  if (!body.rating || !VALID_RATINGS.includes(parseInt(body.rating))) {
    errors.push(`rating is required and must be one of: ${VALID_RATINGS.join(', ')}`);
  }
  
  if (body.type && !VALID_FEEDBACK_TYPES.includes(body.type.toLowerCase())) {
    errors.push(`type must be one of: ${VALID_FEEDBACK_TYPES.join(', ')}`);
  }
  
  if (body.comment && typeof body.comment !== 'string') {
    errors.push('comment must be a string if provided');
  }
  
  if (body.comment && body.comment.length > 500) {
    errors.push('comment must not exceed 500 characters');
  }
  
  return errors;
};

const validateReviewFilters = (query) => {
  const errors = [];
  
  if (query.limit !== undefined) {
    const limit = parseInt(query.limit);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.push('limit must be a number between 1 and 100 (default: 20)');
    }
  }
  
  if (query.offset !== undefined) {
    const offset = parseInt(query.offset);
    if (isNaN(offset) || offset < 0) {
      errors.push('offset must be a non-negative number (default: 0)');
    }
  }
  
  if (query.rating) {
    const rating = parseInt(query.rating);
    if (!VALID_RATINGS.includes(rating)) {
      errors.push(`rating filter must be one of: ${VALID_RATINGS.join(', ')}`);
    }
  }
  
  return errors;
};

/**
 * GET /
 * Listar feedbacks/avaliações recebidas pelo vendedor
 * Query params: limit, offset, rating, type
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, rating, type } = req.query;
    
    // Get seller ID from user token
    const sellerId = req.user?.userId || req.user?.id;
    
    if (!sellerId) {
      return res.status(400).json({
        success: false,
        error: 'User ID not found in token'
      });
    }
    
    // Validate filters
    const filterErrors = validateReviewFilters(req.query);
    if (filterErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: filterErrors
      });
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.user?.token || ''}`
      }
    };
    
    // Build query params
    const params = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
    
    if (rating) {
      params.rating = parseInt(rating);
    }
    
    if (type && VALID_FEEDBACK_TYPES.includes(type.toLowerCase())) {
      params.type = type.toLowerCase();
    }
    
    logger.info(`FEEDBACK_REVIEWS - list_feedback: Fetching feedback for seller ${sellerId}`, {
      limit: params.limit,
      offset: params.offset,
      rating: params.rating,
      type: params.type
    });
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/users/${sellerId}/feedback`,
      ...config,
      params,
      timeout: 15000
    });
    
    const feedbackList = response.data.feedback || response.data.results || [];
    
    // Calculate stats
    const stats = {
      total: feedbackList.length,
      positive: feedbackList.filter(f => f.type === 'positive' || f.rating >= 4).length,
      neutral: feedbackList.filter(f => f.type === 'neutral' || f.rating === 3).length,
      negative: feedbackList.filter(f => f.type === 'negative' || f.rating <= 2).length,
      average_rating: feedbackList.length > 0 
        ? (feedbackList.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbackList.length).toFixed(1)
        : 0
    };
    
    logger.info(`FEEDBACK_REVIEWS - list_feedback: Success - Found ${feedbackList.length} feedback entries`);
    
    res.json({ 
      success: true, 
      data: feedbackList,
      stats,
      pagination: {
        total: response.data.paging?.total || feedbackList.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`FEEDBACK_REVIEWS - list_feedback: ${error.message}`, {
      status: statusCode,
      errorDetails: errorData
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to list feedback',
      details: errorData
    });
  }
});

/**
 * GET /items/{item_id}/reviews
 * Listar reviews/avaliações do item com filtro de rating
 */
router.get('/items/:item_id/reviews', async (req, res) => {
  try {
    const { item_id } = req.params;
    
    // Validate item ID
    const itemIdError = validateItemId(item_id);
    if (itemIdError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: [itemIdError]
      });
    }
    
    // Validate filters
    const filterErrors = validateReviewFilters(req.query);
    if (filterErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: filterErrors
      });
    }
    
    // Set default pagination values
    const params = {
      ...req.query,
      limit: req.query.limit || 20,
      offset: req.query.offset || 0
    };
    
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    logger.info(`FEEDBACK_REVIEWS - get_item_reviews: Fetching reviews for item ${item_id}`, {
      limit: params.limit,
      offset: params.offset,
      rating_filter: params.rating
    });
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/items/${item_id}/reviews`,
      ...config,
      params,
      timeout: 10000
    });
    
    // Calculate review statistics
    const stats = {
      total_reviews: response.data.reviews?.length || 0,
      average_rating: response.data.average_rating || 0
    };
    
    logger.info(`FEEDBACK_REVIEWS - get_item_reviews: Success - Found ${stats.total_reviews} reviews`);
    res.json({ 
      success: true, 
      data: response.data,
      stats,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: response.data.total_reviews || 0
      }
    });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`FEEDBACK_REVIEWS - get_item_reviews: ${error.message}`, {
      item_id: req.params.item_id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch item reviews',
      details: errorData
    });
  }
});

/**
 * POST /feedback
 * Deixar feedback/avaliação em uma venda com validação de rating
 */
router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    // Validate request body
    const validationErrors = validateFeedbackCreation(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.user?.token || ''}`
      }
    };
    
    logger.info(`FEEDBACK_REVIEWS - create_feedback: Creating feedback for order ${req.body.order_id}`, {
      rating: req.body.rating,
      type: req.body.type
    });
    
    const response = await axios({
      method: 'POST',
      url: `${API_BASE_URL}/feedback`,
      ...config,
      data: req.body,
      timeout: 10000
    });
    
    logger.info(`FEEDBACK_REVIEWS - create_feedback: Success - Feedback created`, {
      order_id: req.body.order_id,
      rating: req.body.rating
    });
    
    res.status(201).json({ 
      success: true, 
      data: response.data,
      feedback_summary: {
        order_id: req.body.order_id,
        rating: req.body.rating,
        type: req.body.type,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`FEEDBACK_REVIEWS - create_feedback: ${error.message}`, {
      order_id: req.body?.order_id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to create feedback',
      details: errorData
    });
  }
});

/**
 * GET /users/{user_id}/reviews
 * Obter reviews/reputação do vendedor com filtro de rating
 */
router.get('/users/:user_id/reviews', async (req, res) => {
  try {
    const { user_id } = req.params;
    
    // Validate user ID
    const userIdError = validateUserId(user_id);
    if (userIdError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: [userIdError]
      });
    }
    
    // Validate filters
    const filterErrors = validateReviewFilters(req.query);
    if (filterErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: filterErrors
      });
    }
    
    // Set default pagination values
    const params = {
      ...req.query,
      limit: req.query.limit || 20,
      offset: req.query.offset || 0
    };
    
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    logger.info(`FEEDBACK_REVIEWS - get_seller_reviews: Fetching reviews for user ${user_id}`, {
      limit: params.limit,
      offset: params.offset
    });
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/users/${user_id}/reviews`,
      ...config,
      params,
      timeout: 10000
    });
    
    // Calculate seller reputation stats
    const stats = {
      total_reviews: response.data.reviews?.length || 0,
      average_rating: response.data.average_rating || 0,
      positive_count: response.data.positive_count || 0,
      neutral_count: response.data.neutral_count || 0,
      negative_count: response.data.negative_count || 0
    };
    
    logger.info(`FEEDBACK_REVIEWS - get_seller_reviews: Success - Found ${stats.total_reviews} seller reviews`);
    res.json({ 
      success: true, 
      data: response.data,
      seller_stats: stats,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: response.data.total_reviews || 0
      }
    });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`FEEDBACK_REVIEWS - get_seller_reviews: ${error.message}`, {
      user_id: req.params.user_id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch seller reviews',
      details: errorData
    });
  }
});


module.exports = router;
