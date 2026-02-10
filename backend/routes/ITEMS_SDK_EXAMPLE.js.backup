/**
 * EXEMPLO: Como usar o novo Mercado Libre SDK nas rotas
 * 
 * Este arquivo mostra como refatorar as rotas existentes para usar
 * o novo SDK que tem 791 métodos disponíveis
 */

// ============================================================================
// ANTES (Usando axios direto - código antigo)
// ============================================================================

/*
const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/:accountId/:itemId', async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const account = req.mlAccount;

    const response = await axios.get(
      `https://api.mercadolibre.com/items/${itemId}`,
      {
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
});
*/

// ============================================================================
// DEPOIS (Usando o novo SDK - código refatorado)
// ============================================================================

const express = require('express');
const logger = require('../logger');
const mlSDK = require('../services/ml-sdk-service');
const { authenticateToken } = require('../middleware/auth');
const { validateMLToken } = require('../middleware/ml-token-validation');
const MLAccount = require('../db/models/MLAccount');

const router = express.Router();

/**
 * GET /api/items/:accountId/:itemId
 * Get item details using the new SDK
 * 
 * VANTAGENS DO SDK:
 * ✅ Sem axios (SDK usa native https)
 * ✅ Retry automático
 * ✅ Timeout configurável
 * ✅ Logging nativo
 * ✅ Validação de dados
 * ✅ Tratamento de erros robusto
 */
router.get('/:accountId/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const account = req.mlAccount;

    // Atualiza tokens do SDK
    mlSDK.updateTokens({
      mlAccessToken: account.accessToken,
      mlRefreshToken: account.refreshToken
    });

    // Chamada simples usando o SDK
    const item = await mlSDK.getItem(itemId);

    logger.info('Item obtido com sucesso', {
      itemId,
      accountId,
      userId: account.mlUserId
    });

    res.json({
      success: true,
      data: item
    });

  } catch (error) {
    logger.error('Erro ao obter item', {
      itemId: req.params.itemId,
      accountId: req.params.accountId,
      error: error.message
    });

    res.status(error.status || 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/items/:accountId
 * Create a new item using the new SDK
 * 
 * O SDK valida automaticamente o item antes de criar
 */
router.post('/:accountId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = req.mlAccount;
    const itemData = req.body;

    // Atualiza tokens do SDK
    mlSDK.updateTokens({
      mlAccessToken: account.accessToken
    });

    // Cria item - o SDK já valida automaticamente
    const newItem = await mlSDK.createItem(itemData);

    logger.info('Item criado com sucesso', {
      itemId: newItem.id,
      accountId,
      userId: account.mlUserId
    });

    res.status(201).json({
      success: true,
      data: newItem
    });

  } catch (error) {
    logger.error('Erro ao criar item', {
      accountId: req.params.accountId,
      error: error.message
    });

    res.status(error.status || 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/items/:accountId/:itemId
 * Update an item using the new SDK
 */
router.put('/:accountId/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const account = req.mlAccount;
    const updateData = req.body;

    mlSDK.updateTokens({
      mlAccessToken: account.accessToken
    });

    const updatedItem = await mlSDK.updateItem(itemId, updateData);

    logger.info('Item atualizado com sucesso', {
      itemId,
      accountId
    });

    res.json({
      success: true,
      data: updatedItem
    });

  } catch (error) {
    logger.error('Erro ao atualizar item', {
      itemId: req.params.itemId,
      error: error.message
    });

    res.status(error.status || 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/items/:accountId/:itemId
 * Delete an item using the new SDK
 */
router.delete('/:accountId/:itemId', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const account = req.mlAccount;

    mlSDK.updateTokens({
      mlAccessToken: account.accessToken
    });

    await mlSDK.deleteItem(itemId);

    logger.info('Item deletado com sucesso', {
      itemId,
      accountId
    });

    res.json({
      success: true,
      message: 'Item deletado com sucesso'
    });

  } catch (error) {
    logger.error('Erro ao deletar item', {
      itemId: req.params.itemId,
      error: error.message
    });

    res.status(error.status || 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/items/:accountId/search
 * Search items using the new SDK
 * 
 * O SDK suporta busca avançada com muitos filtros
 */
router.get('/:accountId/search', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = req.mlAccount;
    const { q, category_id, sort, limit, offset } = req.query;

    mlSDK.updateTokens({
      mlAccessToken: account.accessToken
    });

    const searchResults = await mlSDK.searchItems({
      q,
      category_id,
      sort,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0
    });

    logger.info('Busca de itens realizada', {
      query: q,
      accountId,
      resultsCount: searchResults.results?.length || 0
    });

    res.json({
      success: true,
      data: searchResults
    });

  } catch (error) {
    logger.error('Erro ao buscar itens', {
      accountId: req.params.accountId,
      error: error.message
    });

    res.status(error.status || 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/items/:accountId/:itemId/pictures
 * Upload image to item using the new SDK
 * 
 * O SDK trata automaticamente a conversão de FormData
 */
router.post('/:accountId/:itemId/pictures', authenticateToken, validateMLToken('accountId'), async (req, res) => {
  try {
    const { accountId, itemId } = req.params;
    const account = req.mlAccount;
    const imageData = req.file || req.body;

    mlSDK.updateTokens({
      mlAccessToken: account.accessToken
    });

    const uploadResult = await mlSDK.uploadItemImage(itemId, imageData);

    logger.info('Imagem enviada com sucesso', {
      itemId,
      accountId
    });

    res.json({
      success: true,
      data: uploadResult
    });

  } catch (error) {
    logger.error('Erro ao enviar imagem', {
      itemId: req.params.itemId,
      error: error.message
    });

    res.status(error.status || 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * MÉTODOS ADICIONAIS DISPONÍVEIS NO SDK:
 * 
 * ✅ getItemWithDescription()     - Item com descrição
 * ✅ validateItem()               - Validar antes de criar
 * ✅ getItemsByUser()             - Itens do usuário
 * ✅ getItemsByCategory()         - Itens por categoria
 * ✅ getItemVariations()          - Variações do item
 * ✅ createVariation()            - Criar variação
 * ✅ relistItem()                 - Relisting de item
 * 
 * E MUITOS MAIS! Acesse mlSDK.getSDKInstance() para usar todos os 791 métodos
 */

module.exports = router;
