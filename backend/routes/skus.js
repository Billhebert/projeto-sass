/**
 * SKU Routes
 * API endpoints for managing SKU costs and taxes
 */

const express = require('express');
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


const Sku = require('../db/models/Sku');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/skus
 * List all SKUs for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { userId: req.user.id, isActive: true };

    if (search) {
      query.$or = [
        { sku: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { gtin: new RegExp(search, 'i') },
      ];
    }

    const [skus, total] = await Promise.all([
      Sku.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Sku.countDocuments(query),
    ]);

    res.json({
      success: true,
      skus: skus.map((s) => s.getSummary()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching SKUs:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar SKUs',
      error: error.message,
    });
  }
});

/**
 * GET /api/skus/:sku
 * Get a specific SKU by code
 */
router.get('/:sku', async (req, res) => {
  try {
    const sku = await Sku.findOne({
      userId: req.user.id,
      sku: req.params.sku,
      isActive: true,
    });

    if (!sku) {
      return res.status(404).json({
        success: false,
        message: 'SKU não encontrado',
      });
    }

    res.json({
      success: true,
      sku: sku.getSummary(),
    });
  } catch (error) {
    console.error('Error fetching SKU:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar SKU',
      error: error.message,
    });
  }
});

/**
 * POST /api/skus
 * Create a new SKU
 */
router.post('/', async (req, res) => {
  try {
    const { sku, cost, taxPercent, gtin, description, fixedStock, stockSync } = req.body;

    if (!sku) {
      return res.status(400).json({
        success: false,
        message: 'Código SKU é obrigatório',
      });
    }

    // Check if SKU already exists
    const existingSku = await Sku.findOne({
      userId: req.user.id,
      sku: sku,
    });

    if (existingSku) {
      return res.status(400).json({
        success: false,
        message: 'SKU já cadastrado',
      });
    }

    const newSku = await Sku.create({
      userId: req.user.id,
      sku,
      cost: cost || 0,
      taxPercent: taxPercent || 0,
      gtin: gtin || null,
      description: description || null,
      fixedStock: fixedStock || { enabled: false, quantity: 1 },
      stockSync: stockSync || { disabled: false },
    });

    res.status(201).json({
      success: true,
      message: 'SKU criado com sucesso',
      sku: newSku.getSummary(),
    });
  } catch (error) {
    console.error('Error creating SKU:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar SKU',
      error: error.message,
    });
  }
});

/**
 * PUT /api/skus/:sku
 * Update a SKU
 */
router.put('/:sku', async (req, res) => {
  try {
    const { cost, taxPercent, gtin, description, fixedStock, stockSync } = req.body;

    const sku = await Sku.findOne({
      userId: req.user.id,
      sku: req.params.sku,
    });

    if (!sku) {
      return res.status(404).json({
        success: false,
        message: 'SKU não encontrado',
      });
    }

    // Update fields
    if (cost !== undefined) sku.cost = cost;
    if (taxPercent !== undefined) sku.taxPercent = taxPercent;
    if (gtin !== undefined) sku.gtin = gtin;
    if (description !== undefined) sku.description = description;
    if (fixedStock !== undefined) sku.fixedStock = fixedStock;
    if (stockSync !== undefined) sku.stockSync = stockSync;

    await sku.save();

    res.json({
      success: true,
      message: 'SKU atualizado com sucesso',
      sku: sku.getSummary(),
    });
  } catch (error) {
    console.error('Error updating SKU:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar SKU',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/skus/:sku
 * Soft delete a SKU
 */
router.delete('/:sku', async (req, res) => {
  try {
    const sku = await Sku.findOne({
      userId: req.user.id,
      sku: req.params.sku,
    });

    if (!sku) {
      return res.status(404).json({
        success: false,
        message: 'SKU não encontrado',
      });
    }

    sku.isActive = false;
    await sku.save();

    res.json({
      success: true,
      message: 'SKU removido com sucesso',
    });
  } catch (error) {
    console.error('Error deleting SKU:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao remover SKU',
      error: error.message,
    });
  }
});

/**
 * POST /api/skus/bulk-costs
 * Get costs for multiple SKUs (used in sales dashboard)
 */
router.post('/bulk-costs', async (req, res) => {
  try {
    const { skuCodes } = req.body;

    if (!skuCodes || !Array.isArray(skuCodes)) {
      return res.status(400).json({
        success: false,
        message: 'Lista de SKUs é obrigatória',
      });
    }

    const costs = await Sku.getCostsForSkus(req.user.id, skuCodes);

    res.json({
      success: true,
      costs,
    });
  } catch (error) {
    console.error('Error fetching bulk costs:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar custos',
      error: error.message,
    });
  }
});

/**
 * POST /api/skus/find-or-create
 * Find or create a SKU (useful when processing sales)
 */
router.post('/find-or-create', async (req, res) => {
  try {
    const { sku: skuCode } = req.body;

    if (!skuCode) {
      return res.status(400).json({
        success: false,
        message: 'Código SKU é obrigatório',
      });
    }

    const sku = await Sku.findOrCreate(req.user.id, skuCode);

    res.json({
      success: true,
      sku: sku.getSummary(),
      created: sku.createdAt === sku.updatedAt,
    });
  } catch (error) {
    console.error('Error finding/creating SKU:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar/criar SKU',
      error: error.message,
    });
  }
});

module.exports = router;
