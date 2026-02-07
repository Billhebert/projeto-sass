/**
 * Product Costs Routes
 * Manage COGS (Cost of Goods Sold) for products
 *
 * GET    /api/product-costs/:accountId           - List all product costs
 * GET    /api/product-costs/:accountId/:itemId   - Get specific product cost
 * POST   /api/product-costs/:accountId           - Create/Update product cost
 * PUT    /api/product-costs/:accountId/:itemId   - Update product cost
 * DELETE /api/product-costs/:accountId/:itemId   - Delete product cost
 * POST   /api/product-costs/:accountId/import    - Bulk import costs
 */

const express = require("express");
const logger = require("../logger");
const { authenticateToken } = require("../middleware/auth");
const ProductCost = require("../db/models/ProductCost");
const Order = require("../db/models/Order");

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
 * GET /api/product-costs/:accountId
 * List all product costs for an account
 */
router.get("/:accountId", authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const userId = req.user.userId;

    const costs = await ProductCost.find({ userId, accountId }).sort({
      updatedAt: -1,
    });

    logger.info({
      action: "LIST_PRODUCT_COSTS",
      userId,
      accountId,
      count: costs.length,
    });

    res.json({
      success: true,
      data: costs,
    });
  } catch (error) {
    logger.error({
      action: "LIST_PRODUCT_COSTS_ERROR",
      error: error.message,
      accountId: req.params.accountId,
      userId: req.user.userId,
    });

    res.status(500).json({
      success: false,
      error: "Erro ao buscar custos de produtos",
    });
  }
});

/**
 * GET /api/product-costs/:accountId/:itemId
 * Get specific product cost
 */
router.get("/:accountId/:itemId", authenticateToken, async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const userId = req.user.userId;

    const cost = await ProductCost.findOne({ userId, accountId, itemId });

    if (!cost) {
      return res.status(404).json({
        success: false,
        error: "Custo de produto não encontrado",
      });
    }

    res.json({
      success: true,
      data: cost,
    });
  } catch (error) {
    logger.error({
      action: "GET_PRODUCT_COST_ERROR",
      error: error.message,
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
    });

    res.status(500).json({
      success: false,
      error: "Erro ao buscar custo do produto",
    });
  }
});

/**
 * POST /api/product-costs/:accountId
 * Create or update product cost
 */
router.post("/:accountId", authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const userId = req.user.userId;
    const { itemId, title, cogs, notes } = req.body;

    // Validation
    if (!itemId || !title || cogs === undefined || cogs === null) {
      return res.status(400).json({
        success: false,
        error: "itemId, title e cogs são obrigatórios",
      });
    }

    if (cogs < 0) {
      return res.status(400).json({
        success: false,
        error: "COGS não pode ser negativo",
      });
    }

    // Upsert (update or insert)
    const cost = await ProductCost.findOneAndUpdate(
      { userId, accountId, itemId },
      {
        userId,
        accountId,
        itemId,
        title,
        cogs: parseFloat(cogs),
        notes: notes || "",
        updatedBy: userId,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      },
    );

    logger.info({
      action: "UPSERT_PRODUCT_COST",
      userId,
      accountId,
      itemId,
      cogs: cost.cogs,
    });

    res.json({
      success: true,
      data: cost,
    });
  } catch (error) {
    logger.error({
      action: "UPSERT_PRODUCT_COST_ERROR",
      error: error.message,
      accountId: req.params.accountId,
      userId: req.user.userId,
    });

    res.status(500).json({
      success: false,
      error: "Erro ao salvar custo do produto",
    });
  }
});

/**
 * PUT /api/product-costs/:accountId/:itemId
 * Update existing product cost
 */
router.put("/:accountId/:itemId", authenticateToken, async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const userId = req.user.userId;
    const { cogs, notes } = req.body;

    if (cogs !== undefined && cogs < 0) {
      return res.status(400).json({
        success: false,
        error: "COGS não pode ser negativo",
      });
    }

    const updateData = {
      updatedBy: userId,
    };

    if (cogs !== undefined) {
      updateData.cogs = parseFloat(cogs);
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const cost = await ProductCost.findOneAndUpdate(
      { userId, accountId, itemId },
      updateData,
      { new: true, runValidators: true },
    );

    if (!cost) {
      return res.status(404).json({
        success: false,
        error: "Custo de produto não encontrado",
      });
    }

    logger.info({
      action: "UPDATE_PRODUCT_COST",
      userId,
      accountId,
      itemId,
      cogs: cost.cogs,
    });

    res.json({
      success: true,
      data: cost,
    });
  } catch (error) {
    logger.error({
      action: "UPDATE_PRODUCT_COST_ERROR",
      error: error.message,
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
    });

    res.status(500).json({
      success: false,
      error: "Erro ao atualizar custo do produto",
    });
  }
});

/**
 * DELETE /api/product-costs/:accountId/:itemId
 * Delete product cost
 */
router.delete("/:accountId/:itemId", authenticateToken, async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const userId = req.user.userId;

    const cost = await ProductCost.findOneAndDelete({
      userId,
      accountId,
      itemId,
    });

    if (!cost) {
      return res.status(404).json({
        success: false,
        error: "Custo de produto não encontrado",
      });
    }

    logger.info({
      action: "DELETE_PRODUCT_COST",
      userId,
      accountId,
      itemId,
    });

    res.json({
      success: true,
      message: "Custo de produto deletado com sucesso",
    });
  } catch (error) {
    logger.error({
      action: "DELETE_PRODUCT_COST_ERROR",
      error: error.message,
      accountId: req.params.accountId,
      itemId: req.params.itemId,
      userId: req.user.userId,
    });

    res.status(500).json({
      success: false,
      error: "Erro ao deletar custo do produto",
    });
  }
});

/**
 * POST /api/product-costs/:accountId/import
 * Bulk import product costs from CSV
 * Expected format: [{ itemId, title, cogs, notes }]
 */
router.post("/:accountId/import", authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const userId = req.user.userId;
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Lista de produtos inválida",
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const product of products) {
      try {
        if (
          !product.itemId ||
          !product.title ||
          product.cogs === undefined ||
          product.cogs === null
        ) {
          results.failed++;
          results.errors.push({
            itemId: product.itemId || "unknown",
            error: "Dados incompletos",
          });
          continue;
        }

        if (product.cogs < 0) {
          results.failed++;
          results.errors.push({
            itemId: product.itemId,
            error: "COGS negativo",
          });
          continue;
        }

        await ProductCost.findOneAndUpdate(
          { userId, accountId, itemId: product.itemId },
          {
            userId,
            accountId,
            itemId: product.itemId,
            title: product.title,
            cogs: parseFloat(product.cogs),
            notes: product.notes || "",
            updatedBy: userId,
          },
          {
            upsert: true,
            new: true,
            runValidators: true,
          },
        );

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          itemId: product.itemId,
          error: error.message,
        });
      }
    }

    logger.info({
      action: "BULK_IMPORT_PRODUCT_COSTS",
      userId,
      accountId,
      success: results.success,
      failed: results.failed,
    });

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error({
      action: "BULK_IMPORT_PRODUCT_COSTS_ERROR",
      error: error.message,
      accountId: req.params.accountId,
      userId: req.user.userId,
    });

    res.status(500).json({
      success: false,
      error: "Erro ao importar custos de produtos",
    });
  }
});

/**
 * GET /api/product-costs/:accountId/sync
 * Sync product costs with actual products from orders
 * Creates entries for products that don't have costs yet
 */
router.get("/:accountId/sync", authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const userId = req.user.userId;

    // Get all unique products from orders
    const orders = await Order.find({ userId, accountId }).select("orderItems");

    const uniqueProducts = new Map();

    orders.forEach((order) => {
      order.orderItems.forEach((item) => {
        if (item.itemId && !uniqueProducts.has(item.itemId)) {
          uniqueProducts.set(item.itemId, {
            itemId: item.itemId,
            title: item.title || "Produto sem título",
          });
        }
      });
    });

    // Check which products don't have costs yet
    const existingCosts = await ProductCost.find({
      userId,
      accountId,
    }).select("itemId");

    const existingItemIds = new Set(existingCosts.map((cost) => cost.itemId));

    const newProducts = Array.from(uniqueProducts.values()).filter(
      (product) => !existingItemIds.has(product.itemId),
    );

    // Create entries for new products with COGS = 0
    const created = [];
    for (const product of newProducts) {
      const cost = await ProductCost.create({
        userId,
        accountId,
        itemId: product.itemId,
        title: product.title,
        cogs: 0,
        updatedBy: userId,
      });
      created.push(cost);
    }

    logger.info({
      action: "SYNC_PRODUCT_COSTS",
      userId,
      accountId,
      totalProducts: uniqueProducts.size,
      existingCosts: existingCosts.length,
      newCosts: created.length,
    });

    res.json({
      success: true,
      data: {
        totalProducts: uniqueProducts.size,
        existingCosts: existingCosts.length,
        newCosts: created.length,
        created,
      },
    });
  } catch (error) {
    logger.error({
      action: "SYNC_PRODUCT_COSTS_ERROR",
      error: error.message,
      accountId: req.params.accountId,
      userId: req.user.userId,
    });

    res.status(500).json({
      success: false,
      error: "Erro ao sincronizar custos de produtos",
    });
  }
});


module.exports = router;
