const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const API_BASE_URL = process.env.ML_API_URL || 'https://api.mercadolibre.com';

// Valid sort options for questions
const VALID_SORT_OPTIONS = ['created_asc', 'created_desc', 'updated_asc', 'updated_desc'];

// Validation helpers
const validateItemId = (itemId) => {
  if (!itemId || typeof itemId !== 'string' || itemId.trim().length === 0) {
    return 'Item ID must be a non-empty string';
  }
  return null;
};

const validateQuestionId = (questionId) => {
  if (!questionId || typeof questionId !== 'string' || questionId.trim().length === 0) {
    return 'Question ID must be a non-empty string';
  }
  return null;
};

const validateQuestionFilters = (query) => {
  const errors = [];
  
  if (query.sort && !VALID_SORT_OPTIONS.includes(query.sort)) {
    errors.push(`sort must be one of: ${VALID_SORT_OPTIONS.join(', ')}`);
  }
  
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
  
  return errors;
};

const validateQuestionCreation = (body) => {
  const errors = [];
  
  if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
    errors.push('Question text is required and must be a non-empty string');
  }
  
  if (!body.item_id || typeof body.item_id !== 'string') {
    errors.push('item_id is required and must be a string');
  }
  
  return errors;
};

/**
 * GET /
 * Listar todas as perguntas recebidas pelo vendedor
 * Query params: limit, offset, status (unanswered, answered), sort
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, status, sort = 'created_desc' } = req.query;
    
    // Get seller ID from user token
    const sellerId = req.user?.userId || req.user?.id;
    
    if (!sellerId) {
      return res.status(400).json({
        success: false,
        error: 'User ID not found in token'
      });
    }
    
    // Validate filters
    const filterErrors = validateQuestionFilters(req.query);
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
      seller_id: sellerId,
      limit: parseInt(limit),
      offset: parseInt(offset),
      sort: sort
    };
    
    if (status) {
      params.status = status;
    }
    
    logger.info(`QUESTIONS_ANSWERS - list_questions: Fetching questions for seller ${sellerId}`, {
      limit: params.limit,
      offset: params.offset,
      status: params.status
    });
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/questions/search`,
      ...config,
      params,
      timeout: 15000
    });
    
    const questions = response.data.questions || response.data.results || [];
    
    // Calculate stats
    const stats = {
      total: questions.length,
      unanswered: questions.filter(q => !q.answer || q.status === 'UNANSWERED').length,
      answered: questions.filter(q => q.answer || q.status === 'ANSWERED').length
    };
    
    logger.info(`QUESTIONS_ANSWERS - list_questions: Success - Found ${questions.length} questions`);
    
    res.json({ 
      success: true, 
      data: questions,
      stats,
      pagination: {
        total: response.data.paging?.total || questions.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`QUESTIONS_ANSWERS - list_questions: ${error.message}`, {
      status: statusCode,
      errorDetails: errorData
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to list questions',
      details: errorData
    });
  }
});

/**
 * GET /items/{item_id}/questions
 * Listar perguntas de um item com suporte a sorting e paginação
 */
router.get('/items/:item_id/questions', async (req, res) => {
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
    const filterErrors = validateQuestionFilters(req.query);
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
      offset: req.query.offset || 0,
      sort: req.query.sort || 'created_desc'
    };
    
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    logger.info(`QUESTIONS_ANSWERS - get_item_questions: Fetching questions for item ${item_id}`, {
      sort: params.sort,
      limit: params.limit,
      offset: params.offset
    });
    
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/items/${item_id}/questions`,
      ...config,
      params,
      timeout: 10000
    });
    
    logger.info(`QUESTIONS_ANSWERS - get_item_questions: Success - Found ${response.data.questions?.length || 0} questions`);
    res.json({ 
      success: true, 
      data: response.data,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: response.data.total_questions || 0,
        sort: params.sort
      }
    });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`QUESTIONS_ANSWERS - get_item_questions: ${error.message}`, {
      item_id: req.params.item_id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch item questions',
      details: errorData
    });
  }
});

/**
 * POST /questions
 * Criar nova pergunta em um item
 */
router.post('/questions', authenticateToken, async (req, res) => {
  try {
    // Validate request body
    const validationErrors = validateQuestionCreation(req.body);
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
    
    logger.info(`QUESTIONS_ANSWERS - create_question: Creating question for item ${req.body.item_id}`);
    
    const response = await axios({
      method: 'POST',
      url: `${API_BASE_URL}/questions`,
      ...config,
      data: req.body,
      timeout: 10000
    });
    
    logger.info(`QUESTIONS_ANSWERS - create_question: Success - Question created with ID ${response.data.id}`);
    res.status(201).json({ success: true, data: response.data });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`QUESTIONS_ANSWERS - create_question: ${error.message}`, {
      item_id: req.body?.item_id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to create question',
      details: errorData
    });
  }
});

/**
 * PUT /questions/{question_id}
 * Responder pergunta
 */
router.put('/questions/:question_id', authenticateToken, async (req, res) => {
  try {
    const { question_id } = req.params;
    
    // Validate question ID
    const idError = validateQuestionId(question_id);
    if (idError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: [idError]
      });
    }
    
    // Validate request body
    if (!req.body || !req.body.text) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: ['Answer text is required in request body']
      });
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.user?.token || ''}`
      }
    };
    
    logger.info(`QUESTIONS_ANSWERS - answer_question: Answering question ${question_id}`);
    
    const response = await axios({
      method: 'PUT',
      url: `${API_BASE_URL}/questions/${question_id}`,
      ...config,
      data: req.body,
      timeout: 10000
    });
    
    logger.info(`QUESTIONS_ANSWERS - answer_question: Success - Question ${question_id} answered`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    logger.error(`QUESTIONS_ANSWERS - answer_question: ${error.message}`, {
      question_id: req.params.question_id,
      status: statusCode
    });
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to answer question',
      details: errorData
    });
  }
});

module.exports = router;
