/**
 * Questions Routes
 * Manage questions and answers from Mercado Livre
 *
 * GET    /api/questions                           - List all questions for user
 * GET    /api/questions/:accountId                - List questions for specific account
 * GET    /api/questions/:accountId/unanswered     - List unanswered questions
 * GET    /api/questions/:accountId/:questionId    - Get question details
 * POST   /api/questions/:accountId/:questionId/answer - Answer a question
 * POST   /api/questions/:accountId/sync           - Sync questions from ML
 * GET    /api/questions/:accountId/stats          - Get question statistics
 * DELETE /api/questions/:accountId/:questionId    - Delete/hide question
 */

const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const { authenticateToken } = require('../middleware/auth');
const { validateMLToken } = require('../middleware/ml-token-validation');
const Question = require('../db/models/Question');
const MLAccount = require('../db/models/MLAccount');

const router = express.Router();

const ML_API_BASE = 'https://api.mercadolibre.com';

/**
 * GET /api/questions
 * List all questions for the authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, status, sort = '-dateCreated' } = req.query;

    const query = { userId: req.user.userId };
    if (status) query.status = status;

    const questions = await Question.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Question.countDocuments(query);

    res.json({
      success: true,
      data: {
        questions: questions.map(q => q.getSummary()),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_QUESTIONS_ERROR',
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions',
      error: error.message,
    });
  }
});

/**
 * GET /api/questions/:accountId/stats
 * Get question statistics for an account
 */
router.get('/:accountId/stats', authenticateToken, async (req, res) => {
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
        message: 'Account not found',
      });
    }

    const stats = await Question.getStats(accountId);

    // Get today's unanswered
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayUnanswered = await Question.countDocuments({
      accountId,
      status: 'UNANSWERED',
      dateCreated: { $gte: today },
    });

    res.json({
      success: true,
      data: {
        accountId,
        ...stats,
        todayUnanswered,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_QUESTION_STATS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get question statistics',
      error: error.message,
    });
  }
});

/**
 * GET /api/questions/:accountId/unanswered
 * List unanswered questions for specific account
 */
router.get('/:accountId/unanswered', authenticateToken, async (req, res) => {
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
        message: 'Account not found',
      });
    }

    const questions = await Question.findUnanswered(accountId, { limit: parseInt(limit) });

    res.json({
      success: true,
      data: {
        account: {
          id: account.id,
          nickname: account.nickname,
        },
        questions: questions.map(q => q.getSummary()),
        total: questions.length,
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_UNANSWERED_QUESTIONS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch unanswered questions',
      error: error.message,
    });
  }
});

/**
 * GET /api/questions/:accountId
 * List questions for specific account
 */
router.get('/:accountId', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit = 20, offset = 0, status, itemId, sort = '-dateCreated' } = req.query;

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
    if (status) query.status = status;
    if (itemId) query.itemId = itemId;

    const questions = await Question.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Question.countDocuments(query);

    res.json({
      success: true,
      data: {
        account: {
          id: account.id,
          nickname: account.nickname,
        },
        questions: questions.map(q => q.getSummary()),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error({
      action: 'GET_ACCOUNT_QUESTIONS_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions',
      error: error.message,
    });
  }
});

/**
 * GET /api/questions/:accountId/:questionId
 * Get detailed question information
 */
router.get('/:accountId/:questionId', authenticateToken, async (req, res) => {
  try {
    const { accountId, questionId } = req.params;

    const question = await Question.findOne({
      $or: [{ id: questionId }, { mlQuestionId: questionId }],
      accountId,
      userId: req.user.userId,
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    res.json({
      success: true,
      data: question.getDetails(),
    });
  } catch (error) {
    logger.error({
      action: 'GET_QUESTION_ERROR',
      questionId: req.params.questionId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch question',
      error: error.message,
    });
  }
});

/**
 * POST /api/questions/:accountId/:questionId/answer
 * Answer a question on Mercado Livre
 */
router.post('/:accountId/:questionId/answer', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, questionId } = req.params;
    const { text } = req.body;
    const account = req.mlAccount;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Answer text is required',
      });
    }

    // Find question in DB
    const question = await Question.findOne({
      $or: [{ id: questionId }, { mlQuestionId: questionId }],
      accountId,
      userId: req.user.userId,
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    // Send answer to ML API
    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.post(
      `${ML_API_BASE}/answers`,
      {
        question_id: parseInt(question.mlQuestionId),
        text: text.trim(),
      },
      { headers }
    );

    // Update question in DB
    question.answer = {
      text: text.trim(),
      status: 'ACTIVE',
      dateCreated: new Date(),
    };
    question.status = 'ANSWERED';
    question.lastSyncedAt = new Date();
    await question.save();

    logger.info({
      action: 'QUESTION_ANSWERED',
      questionId: question.mlQuestionId,
      accountId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Question answered successfully',
      data: question.getDetails(),
    });
  } catch (error) {
    logger.error({
      action: 'ANSWER_QUESTION_ERROR',
      questionId: req.params.questionId,
      userId: req.user.userId,
      error: error.response?.data || error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to answer question',
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * POST /api/questions/:accountId/sync
 * Sync questions from Mercado Livre
 */
router.post('/:accountId/sync', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { status = 'UNANSWERED' } = req.body;
    const account = req.mlAccount;

    logger.info({
      action: 'QUESTIONS_SYNC_STARTED',
      accountId,
      userId: req.user.userId,
      timestamp: new Date().toISOString(),
    });

    // Fetch questions from ML
    const mlQuestions = await fetchMLQuestions(account.mlUserId, account.accessToken, { status });

    // Store/update questions in database
    const savedQuestions = await saveQuestions(accountId, req.user.userId, account.mlUserId, mlQuestions);

    logger.info({
      action: 'QUESTIONS_SYNC_COMPLETED',
      accountId,
      userId: req.user.userId,
      questionsCount: savedQuestions.length,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `Synchronized ${savedQuestions.length} questions`,
      data: {
        accountId,
        questionsCount: savedQuestions.length,
        questions: savedQuestions.map(q => q.getSummary()),
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error({
      action: 'QUESTIONS_SYNC_ERROR',
      accountId: req.params.accountId,
      userId: req.user.userId,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: 'Failed to sync questions',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/questions/:accountId/:questionId
 * Delete/hide question from ML
 */
router.delete('/:accountId/:questionId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, questionId } = req.params;
    const account = req.mlAccount;

    const question = await Question.findOne({
      $or: [{ id: questionId }, { mlQuestionId: questionId }],
      accountId,
      userId: req.user.userId,
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    // Delete from ML API
    const headers = {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    };

    await axios.delete(
      `${ML_API_BASE}/questions/${question.mlQuestionId}`,
      { headers }
    ).catch(err => {
      logger.warn({
        action: 'DELETE_QUESTION_ML_ERROR',
        questionId: question.mlQuestionId,
        error: err.response?.data || err.message,
      });
    });

    // Update in DB
    question.status = 'DISABLED';
    question.deletedFromListing = true;
    await question.save();

    logger.info({
      action: 'QUESTION_DELETED',
      questionId: question.mlQuestionId,
      accountId,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (error) {
    logger.error({
      action: 'DELETE_QUESTION_ERROR',
      questionId: req.params.questionId,
      userId: req.user.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to delete question',
      error: error.message,
    });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Fetch questions from Mercado Livre API
 */
async function fetchMLQuestions(mlUserId, accessToken, options = {}) {
  try {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const { status = 'UNANSWERED' } = options;

    // Get questions list
    const response = await axios.get(
      `${ML_API_BASE}/questions/search`,
      {
        headers,
        params: {
          seller_id: mlUserId,
          status,
          sort_fields: 'date_created',
          sort_types: 'DESC',
          limit: 50,
        },
      }
    );

    return response.data.questions || [];
  } catch (error) {
    logger.error({
      action: 'FETCH_ML_QUESTIONS_ERROR',
      mlUserId,
      error: error.response?.data || error.message,
    });
    throw new Error(`Failed to fetch questions from Mercado Livre: ${error.message}`);
  }
}

/**
 * Save or update questions in database
 */
async function saveQuestions(accountId, userId, sellerId, mlQuestions) {
  const savedQuestions = [];

  for (const mlQuestion of mlQuestions) {
    try {
      const questionData = {
        accountId,
        userId,
        mlQuestionId: mlQuestion.id.toString(),
        itemId: mlQuestion.item_id,
        text: mlQuestion.text,
        status: mlQuestion.status,
        answer: mlQuestion.answer ? {
          text: mlQuestion.answer.text,
          status: mlQuestion.answer.status,
          dateCreated: mlQuestion.answer.date_created ? new Date(mlQuestion.answer.date_created) : null,
        } : null,
        from: mlQuestion.from ? {
          id: mlQuestion.from.id?.toString(),
          nickname: mlQuestion.from.nickname,
          answeredQuestions: mlQuestion.from.answered_questions,
        } : null,
        sellerId: sellerId.toString(),
        dateCreated: new Date(mlQuestion.date_created),
        holdStatus: mlQuestion.hold_status,
        deletedFromListing: mlQuestion.deleted_from_listing || false,
        lastSyncedAt: new Date(),
      };

      // Find or create question
      let question = await Question.findOne({
        accountId,
        mlQuestionId: mlQuestion.id.toString(),
      });

      if (question) {
        Object.assign(question, questionData);
        await question.save();
      } else {
        question = new Question(questionData);
        await question.save();
      }

      savedQuestions.push(question);
    } catch (error) {
      logger.error({
        action: 'SAVE_QUESTION_ERROR',
        mlQuestionId: mlQuestion.id,
        accountId,
        error: error.message,
      });
    }
  }

  return savedQuestions;
}

module.exports = router;
