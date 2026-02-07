/**
 * Items Routes - Refatorado com SDK Completa
 * Full item/listing management usando a SDK do Mercado Livre
 *
 * GET    /api/items/:accountId                   - List items
 * GET    /api/items/:accountId/:itemId           - Get item details
 * POST   /api/items/:accountId                   - Create new item
 * PUT    /api/items/:accountId/:itemId           - Update item
 * PUT    /api/items/:accountId/:itemId/description - Update description
 * PUT    /api/items/:accountId/:itemId/pictures  - Update pictures
 * PUT    /api/items/:accountId/:itemId/status    - Change status (pause/activate)
 * DELETE /api/items/:accountId/:itemId           - Close/delete item
 * POST   /api/items/:accountId/:itemId/relist    - Relist item
 */

const express = require("express");
const logger = require("../logger");
const { authenticateToken } = require("../middleware/auth");
const { validateMLToken } = require("../middleware/ml-token-validation");
const sdkManager = require("../services/sdk-manager");
const Product = require("../db/models/Product");
const { handleError, sendSuccess } = require('../middleware/response-helpers');

const router = express.Router();



/**
 * GET /api/items/:accountId
 * List items from ML API
 * Query params:
 *   - all=true: Fetch ALL items with auto-pagination (no limits)
 *   - limit: Items per page (default 50)
 *   - offset: Pagination offset (default 0)
 *   - status: Filter by status
 */
router.get(
  "/:accountId",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId } = req.params;
      const { all, limit = 50, offset = 0, status } = req.query;
      const account = req.mlAccount;

      logger.info({
        action: "LIST_ITEMS_REQUEST",
        accountId,
        all: all === "true",
        limit,
        offset,
        status,
      });

      // MODO ILIMITADO: Buscar TODOS os itens com paginação automática
      if (all === "true") {
        let allItems = [];
        let currentOffset = 0;
        const batchSize = 50;

        // Buscar todos os IDs dos itens
        while (true) {
          const params = {
            limit: batchSize,
            offset: currentOffset,
          };
          if (status) params.status = status;

          const result = await sdkManager.getItemsByUser(
            accountId,
            account.mlUserId,
            params,
          );

          const itemIds = result.data.results || [];
          if (itemIds.length === 0) break;

          // Buscar detalhes em lotes de 20
          for (let i = 0; i < itemIds.length; i += 20) {
            const batch = itemIds.slice(i, i + 20);
            const itemsData = await Promise.allSettled(
              batch.map((itemId) => sdkManager.getItem(accountId, itemId)),
            );

            const successfulItems = itemsData
              .filter((result) => result.status === "fulfilled")
              .map((result) => result.value.data);

            allItems.push(...successfulItems);
          }

          currentOffset += batchSize;

          // Parar se buscamos tudo
          const total = result.data.paging?.total || 0;
          if (currentOffset >= total) break;
        }

        logger.info({
          action: "LIST_ALL_ITEMS_SUCCESS",
          accountId,
          totalItems: allItems.length,
        });

        return res.json({
          success: true,
          data: {
            items: allItems,
            paging: {
              total: allItems.length,
              limit: allItems.length,
              offset: 0,
            },
            seller_id: account.mlUserId,
          },
        });
      }

      // MODO PAGINAÇÃO NORMAL
      const params = {
        limit: parseInt(limit),
        offset: parseInt(offset),
      };
      if (status) params.status = status;

      const result = await sdkManager.getItemsByUser(
        accountId,
        account.mlUserId,
        params,
      );

      const itemIds = result.data.results || [];

      // Buscar detalhes para cada item (limitar a 20 para performance)
      const itemsPromises = itemIds
        .slice(0, 20)
        .map((itemId) =>
          sdkManager.getItem(accountId, itemId).catch(() => null),
        );

      const items = await Promise.all(itemsPromises);
      const validItems = items
        .filter((item) => item !== null)
        .map((item) => item.data);

      logger.info({
        action: "LIST_ITEMS_SUCCESS",
        accountId,
        count: validItems.length,
      });

      res.json({
        success: true,
        data: {
          items: validItems,
          paging: result.data.paging || { total: 0 },
          seller_id: result.data.seller_id,
        },
      });
    } catch (error) {
      logger.error({
        action: "LIST_ITEMS_ERROR",
        accountId: req.params.accountId,
        error: error.message,
      });

      res.status(error.statusCode || 500).json({
        success: false,
        message: "Failed to list items",
        error: error.message,
      });
    }
  },
);

/**
 * GET /api/items/:accountId/:itemId
 * Get item details
 */
router.get(
  "/:accountId/:itemId",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, itemId } = req.params;
      const { includeDescription = "true" } = req.query;

      logger.info({
        action: "GET_ITEM_REQUEST",
        accountId,
        itemId,
        includeDescription,
      });

      let itemData, descriptionData;

      if (includeDescription === "true") {
        // Buscar item com descrição
        const result = await sdkManager.getItemWithDescription(
          accountId,
          itemId,
        );
        [itemData, descriptionData] = result;
      } else {
        // Buscar apenas item
        itemData = await sdkManager.getItem(accountId, itemId);
      }

      logger.info({
        action: "GET_ITEM_SUCCESS",
        accountId,
        itemId,
      });

      res.json({
        success: true,
        data: {
          item: itemData.data,
          description: descriptionData?.data || null,
        },
      });
    } catch (error) {
      logger.error({
        action: "GET_ITEM_ERROR",
        accountId: req.params.accountId,
        itemId: req.params.itemId,
        error: error.message,
      });

      res.status(error.statusCode || 500).json({
        success: false,
        message: "Failed to get item",
        error: error.message,
      });
    }
  },
);

/**
 * POST /api/items/:accountId
 * Create new item
 */
router.post(
  "/:accountId",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId } = req.params;
      const itemData = req.body;

      logger.info({
        action: "CREATE_ITEM_REQUEST",
        accountId,
        title: itemData.title,
      });

      // Criar item usando SDK
      const result = await sdkManager.createItem(accountId, itemData);

      logger.info({
        action: "CREATE_ITEM_SUCCESS",
        accountId,
        itemId: result.data.id,
      });

      // Salvar no banco local
      try {
        await Product.create({
          id: result.data.id,
          accountId,
          userId: req.user.userId,
          title: result.data.title,
          price: result.data.price,
          status: result.data.status,
          categoryId: result.data.category_id,
          mlData: result.data,
        });
      } catch (dbError) {
        logger.warn({
          action: "SAVE_PRODUCT_TO_DB_ERROR",
          error: dbError.message,
        });
      }

      res.status(201).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error({
        action: "CREATE_ITEM_ERROR",
        accountId: req.params.accountId,
        error: error.message,
      });

      res.status(error.statusCode || 500).json({
        success: false,
        message: "Failed to create item",
        error: error.message,
        details: error.apiError || null,
      });
    }
  },
);

/**
 * PUT /api/items/:accountId/:itemId
 * Update item
 */
router.put(
  "/:accountId/:itemId",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, itemId } = req.params;
      const updates = req.body;

      logger.info({
        action: "UPDATE_ITEM_REQUEST",
        accountId,
        itemId,
        updates: Object.keys(updates),
      });

      // Atualizar item usando SDK
      const result = await sdkManager.updateItem(accountId, itemId, updates);

      logger.info({
        action: "UPDATE_ITEM_SUCCESS",
        accountId,
        itemId,
      });

      // Atualizar no banco local
      try {
        await Product.findOneAndUpdate(
          { id: itemId, accountId },
          {
            $set: {
              ...updates,
              updatedAt: new Date(),
            },
          },
        );
      } catch (dbError) {
        logger.warn({
          action: "UPDATE_PRODUCT_DB_ERROR",
          error: dbError.message,
        });
      }

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error({
        action: "UPDATE_ITEM_ERROR",
        accountId: req.params.accountId,
        itemId: req.params.itemId,
        error: error.message,
      });

      res.status(error.statusCode || 500).json({
        success: false,
        message: "Failed to update item",
        error: error.message,
      });
    }
  },
);

/**
 * PUT /api/items/:accountId/:itemId/description
 * Update item description
 */
router.put(
  "/:accountId/:itemId/description",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, itemId } = req.params;
      const { plain_text } = req.body;

      logger.info({
        action: "UPDATE_DESCRIPTION_REQUEST",
        accountId,
        itemId,
      });

      // Usar SDK para atualizar descrição
      const sdk = await sdkManager.getSDK(accountId);
      const result = await sdk.items.updateDescription(itemId, { plain_text });

      logger.info({
        action: "UPDATE_DESCRIPTION_SUCCESS",
        accountId,
        itemId,
      });

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error({
        action: "UPDATE_DESCRIPTION_ERROR",
        accountId: req.params.accountId,
        itemId: req.params.itemId,
        error: error.message,
      });

      res.status(error.statusCode || 500).json({
        success: false,
        message: "Failed to update description",
        error: error.message,
      });
    }
  },
);

/**
 * PUT /api/items/:accountId/:itemId/status
 * Change item status (pause/activate)
 */
router.put(
  "/:accountId/:itemId/status",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, itemId } = req.params;
      const { status } = req.body;

      if (!["active", "paused", "closed"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Must be: active, paused, or closed",
        });
      }

      logger.info({
        action: "CHANGE_ITEM_STATUS_REQUEST",
        accountId,
        itemId,
        newStatus: status,
      });

      const result = await sdkManager.updateItem(accountId, itemId, { status });

      logger.info({
        action: "CHANGE_ITEM_STATUS_SUCCESS",
        accountId,
        itemId,
        newStatus: status,
      });

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error({
        action: "CHANGE_ITEM_STATUS_ERROR",
        accountId: req.params.accountId,
        itemId: req.params.itemId,
        error: error.message,
      });

      res.status(error.statusCode || 500).json({
        success: false,
        message: "Failed to change item status",
        error: error.message,
      });
    }
  },
);

/**
 * DELETE /api/items/:accountId/:itemId
 * Close/delete item
 */
router.delete(
  "/:accountId/:itemId",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, itemId } = req.params;

      logger.info({
        action: "DELETE_ITEM_REQUEST",
        accountId,
        itemId,
      });

      const result = await sdkManager.deleteItem(accountId, itemId);

      logger.info({
        action: "DELETE_ITEM_SUCCESS",
        accountId,
        itemId,
      });

      // Atualizar status no banco local
      try {
        await Product.findOneAndUpdate(
          { id: itemId, accountId },
          { $set: { status: "closed", updatedAt: new Date() } },
        );
      } catch (dbError) {
        logger.warn({
          action: "UPDATE_PRODUCT_DB_ERROR",
          error: dbError.message,
        });
      }

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error({
        action: "DELETE_ITEM_ERROR",
        accountId: req.params.accountId,
        itemId: req.params.itemId,
        error: error.message,
      });

      res.status(error.statusCode || 500).json({
        success: false,
        message: "Failed to delete item",
        error: error.message,
      });
    }
  },
);

/**
 * POST /api/items/:accountId/:itemId/relist
 * Relist item
 */
router.post(
  "/:accountId/:itemId/relist",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, itemId } = req.params;
      const relistData = req.body;

      logger.info({
        action: "RELIST_ITEM_REQUEST",
        accountId,
        itemId,
      });

      const sdk = await sdkManager.getSDK(accountId);
      const result = await sdk.items.relistItem(itemId, relistData);

      logger.info({
        action: "RELIST_ITEM_SUCCESS",
        accountId,
        oldItemId: itemId,
        newItemId: result.data.id,
      });

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error({
        action: "RELIST_ITEM_ERROR",
        accountId: req.params.accountId,
        itemId: req.params.itemId,
        error: error.message,
      });

      res.status(error.statusCode || 500).json({
        success: false,
        message: "Failed to relist item",
        error: error.message,
      });
    }
  },
);

/**
 * GET /api/items/:accountId/:itemId/visits
 * Get item visits/views statistics
 */
router.get(
  "/:accountId/:itemId/visits",
  authenticateToken,
  validateMLToken("accountId"),
  async (req, res) => {
    try {
      const { accountId, itemId } = req.params;

      logger.info({
        action: "GET_ITEM_VISITS_REQUEST",
        accountId,
        itemId,
      });

      const sdk = await sdkManager.getSDK(accountId);
      const result = await sdk.visits.getItemVisits(itemId);

      logger.info({
        action: "GET_ITEM_VISITS_SUCCESS",
        accountId,
        itemId,
      });

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error({
        action: "GET_ITEM_VISITS_ERROR",
        accountId: req.params.accountId,
        itemId: req.params.itemId,
        error: error.message,
      });

      res.status(error.statusCode || 500).json({
        success: false,
        message: "Failed to get item visits",
        error: error.message,
      });
    }
  },
);


module.exports = router;
