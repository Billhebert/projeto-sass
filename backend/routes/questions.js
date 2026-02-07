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

const express = require("express");
const logger = require("../logger");
const sdkManager = require("../services/sdk-manager");
const { authenticateToken } = require("../middleware/auth");
const { validateMLToken } = require("../middleware/ml-token-validation");
const Question = require("../db/models/Question");
const MLAccount = require("../db/models/MLAccount");
const { handleError, sendSuccess } = require('../middleware/response-helpers');

const router = express.Router();

/**
 * Validate and return ML account
 * @param {string} accountId - Account ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Account object
 */
const getAndValidateAccount = async (accountId, userId) => {
  const account = await MLAccount.findOne({ id: accountId, userId });
  if (!account) throw new Error("Account not found");
  return account;
};

/**
 * Find question by ID or ML question ID
 * @param {string} questionId - Question ID
 * @param {string} accountId - Account ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Question object
 */
const findQuestion = async (questionId, accountId, userId) => {
  return Question.findOne({
    $or: [{ id: questionId }, { mlQuestionId: questionId }],
    accountId,
    userId,
  });
};

/**
 * GET /api/questions
 * List all questions for the authenticated user
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { limit: queryLimit, offset = 0, status, sort = "-dateCreated", all } = req.query;
    const limit = all === "true" ? 999999 : queryLimit || 100;

    const query = { userId: req.user.userId };
    if (status) query.status = status;

    const questions = await Question.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Question.countDocuments(query);

    sendSuccess(res, {
      questions: questions.map((q) => q.getSummary()),
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    handleError(res, 500, "Failed to fetch questions", error, {
      action: "GET_QUESTIONS_ERROR",
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/questions/:accountId/stats
 * Get question statistics for an account
 */
router.get("/:accountId/stats", authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;

    await getAndValidateAccount(accountId, req.user.userId);

    const stats = await Question.getStats(accountId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayUnanswered = await Question.countDocuments({
      accountId,
      status: "UNANSWERED",
      dateCreated: { $gte: today },
    });

    sendSuccess(res, {
      accountId,
      ...stats,
      todayUnanswered,
    });
  } catch (error) {
    if (error.message === "Account not found") {
      return res.status(404).json({ success: false, message: "Account not found" });
    }
    handleError(res, 500, "Failed to get question statistics", error, {
      action: "GET_QUESTION_STATS_ERROR",
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/questions/:accountId/unanswered
 * List unanswered questions for specific account
 */
router.get("/:accountId/unanswered", authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit: queryLimit, all } = req.query;

    const limit = all === "true" ? 999999 : queryLimit || 50;

    const account = await getAndValidateAccount(accountId, req.user.userId);

    const questions = await Question.findUnanswered(accountId, { limit: parseInt(limit) });

    sendSuccess(res, {
      account: { id: account.id, nickname: account.nickname },
      questions: questions.map((q) => q.getSummary()),
      total: questions.length,
    });
  } catch (error) {
    if (error.message === "Account not found") {
      return res.status(404).json({ success: false, message: "Account not found" });
    }
    handleError(res, 500, "Failed to fetch unanswered questions", error, {
      action: "GET_UNANSWERED_QUESTIONS_ERROR",
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/questions/:accountId
 * List questions for specific account
 */
router.get("/:accountId", authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit: queryLimit, offset = 0, status, itemId, sort = "-dateCreated", all } = req.query;

    const limit = all === "true" ? 999999 : queryLimit || 100;

    const account = await getAndValidateAccount(accountId, req.user.userId);

    const query = { accountId, userId: req.user.userId };
    if (status) query.status = status;
    if (itemId) query.itemId = itemId;

    const questions = await Question.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Question.countDocuments(query);

    sendSuccess(res, {
      account: { id: account.id, nickname: account.nickname },
      questions: questions.map((q) => q.getSummary()),
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    if (error.message === "Account not found") {
      return res.status(404).json({ success: false, message: "Account not found" });
    }
    handleError(res, 500, "Failed to fetch questions", error, {
      action: "GET_ACCOUNT_QUESTIONS_ERROR",
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});

/**
 * GET /api/questions/:accountId/:questionId
 * Get detailed question information
 */
router.get("/:accountId/:questionId", authenticateToken, async (req, res) => {
  try {
    const { accountId, questionId } = req.params;

    const question = await findQuestion(questionId, accountId, req.user.userId);

    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    sendSuccess(res, question.getDetails());
  } catch (error) {
    handleError(res, 500, "Failed to fetch question", error, {
      action: "GET_QUESTION_ERROR",
      questionId: req.params.questionId,
      userId: req.user.userId,
    });
  }
});

/**
 * POST /api/questions/:accountId/:questionId/answer
 * Answer a question on Mercado Livre
 */
router.post("/:accountId/:questionId/answer", authenticateToken, validateMLToken("accountId"), async (req, res) => {
  try {
    const { accountId, questionId } = req.params;
    const { text } = req.body;
    const account = req.mlAccount;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Answer text is required" });
    }

    const question = await findQuestion(questionId, accountId, req.user.userId);

    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    await sdkManager.answerQuestion(accountId, question.mlQuestionId, text.trim());

    question.answer = {
      text: text.trim(),
      status: "ACTIVE",
      dateCreated: new Date(),
    };
    question.status = "ANSWERED";
    question.lastSyncedAt = new Date();
    await question.save();

    logger.info({
      action: "QUESTION_ANSWERED",
      questionId: question.mlQuestionId,
      accountId,
      userId: req.user.userId,
    });

    sendSuccess(res, question.getDetails(), "Question answered successfully");
  } catch (error) {
    handleError(res, 500, "Failed to answer question", error, {
      action: "ANSWER_QUESTION_ERROR",
      questionId: req.params.questionId,
      userId: req.user.userId,
    });
  }
});

/**
 * POST /api/questions/:accountId/sync
 * Sync questions from Mercado Livre
 * Body params:
 *   - status: Question status (default 'UNANSWERED')
 *   - all: If true, fetch ALL questions with auto-pagination (default false)
 */
router.post("/:accountId/sync", authenticateToken, validateMLToken("accountId"), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { status = "UNANSWERED", all = false } = req.body;
    const account = req.mlAccount;

    logger.info({
      action: "QUESTIONS_SYNC_STARTED",
      accountId,
      userId: req.user.userId,
      all,
      timestamp: new Date().toISOString(),
    });

    const mlQuestions = await fetchMLQuestions(account.mlUserId, accountId, { status, all });
    const savedQuestions = await saveQuestions(accountId, req.user.userId, account.mlUserId, mlQuestions);

    logger.info({
      action: "QUESTIONS_SYNC_COMPLETED",
      accountId,
      userId: req.user.userId,
      questionsCount: savedQuestions.length,
      timestamp: new Date().toISOString(),
    });

    sendSuccess(
      res,
      {
        accountId,
        questionsCount: savedQuestions.length,
        questions: savedQuestions.map((q) => q.getSummary()),
        syncedAt: new Date().toISOString(),
      },
      `Synchronized ${savedQuestions.length} questions`
    );
  } catch (error) {
    handleError(res, 500, "Failed to sync questions", error, {
      action: "QUESTIONS_SYNC_ERROR",
      accountId: req.params.accountId,
      userId: req.user.userId,
    });
  }
});

/**
 * DELETE /api/questions/:accountId/:questionId
 * Delete/hide question from ML
 */
router.delete("/:accountId/:questionId", authenticateToken, validateMLToken("accountId"), async (req, res) => {
  try {
    const { accountId, questionId } = req.params;
    const account = req.mlAccount;

    const question = await findQuestion(questionId, accountId, req.user.userId);

    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    await sdkManager
      .execute(accountId, async (sdk) => {
        return await sdk.questions.deleteQuestion(question.mlQuestionId);
      })
      .catch((err) => {
        logger.warn({
          action: "DELETE_QUESTION_ML_ERROR",
          questionId: question.mlQuestionId,
          error: err.message,
        });
      });

    question.status = "DISABLED";
    question.deletedFromListing = true;
    await question.save();

    logger.info({
      action: "QUESTION_DELETED",
      questionId: question.mlQuestionId,
      accountId,
      userId: req.user.userId,
    });

    sendSuccess(res, null, "Question deleted successfully");
  } catch (error) {
    handleError(res, 500, "Failed to delete question", error, {
      action: "DELETE_QUESTION_ERROR",
      questionId: req.params.questionId,
      userId: req.user.userId,
    });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Fetch questions from Mercado Livre API using SDK Manager
 * Options:
 *   - accountId: Account ID for SDK Manager
 *   - status: Question status filter (default 'UNANSWERED')
 *   - all: If true, fetch ALL questions with auto-pagination (default false)
 */
async function fetchMLQuestions(mlUserId, accountId, options = {}) {
  try {
    const { status = "UNANSWERED", all = false } = options;

    // Base search params
    const searchParams = {
      seller_id: mlUserId,
      sort_fields: "date_created",
      sort_types: "DESC",
    };

    // Only apply status filter if NOT in unlimited mode
    if (!all) {
      searchParams.status = status;
    }

    // UNLIMITED MODE: Fetch ALL questions with auto-pagination
    if (all) {
      let allQuestions = [];
      let currentOffset = 0;
      const batchSize = 50; // ML API max per request

      logger.info({
        action: "FETCH_ALL_QUESTIONS_START",
        mlUserId,
        note: "Fetching ALL questions (all statuses)",
      });

      while (true) {
        const response = await sdkManager.execute(accountId, async (sdk) => {
          return await sdk.questions.searchQuestions({
            ...searchParams,
            limit: batchSize,
            offset: currentOffset,
          });
        });

        const questions = response.questions || [];
        if (questions.length === 0) break;

        allQuestions.push(...questions);
        currentOffset += batchSize;

        // Stop if we've fetched everything
        const total = response.total || 0;
        if (currentOffset >= total) break;
      }

      logger.info({
        action: "FETCH_ALL_QUESTIONS_SUCCESS",
        mlUserId,
        totalQuestions: allQuestions.length,
      });

      return allQuestions;
    }

    // NORMAL MODE: Single request with limit
    const response = await sdkManager.execute(accountId, async (sdk) => {
      return await sdk.questions.searchQuestions({
        ...searchParams,
        limit: 50,
      });
    });

    return response.questions || [];
  } catch (error) {
    logger.error({
      action: "FETCH_ML_QUESTIONS_ERROR",
      mlUserId,
      error: error.message,
    });
    throw new Error(
      `Failed to fetch questions from Mercado Livre: ${error.message}`,
    );
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
        answer: mlQuestion.answer
          ? {
              text: mlQuestion.answer.text,
              status: mlQuestion.answer.status,
              dateCreated: mlQuestion.answer.date_created
                ? new Date(mlQuestion.answer.date_created)
                : null,
            }
          : null,
        from: mlQuestion.from
          ? {
              id: mlQuestion.from.id?.toString(),
              nickname: mlQuestion.from.nickname,
              answeredQuestions: mlQuestion.from.answered_questions,
            }
          : null,
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
        action: "SAVE_QUESTION_ERROR",
        mlQuestionId: mlQuestion.id,
        accountId,
        error: error.message,
      });
    }
  }

  return savedQuestions;
}

module.exports = router;
