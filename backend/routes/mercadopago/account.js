/**
 * Mercado Pago Account Routes
 * Handles MP account info, balance, reports
 */

const express = require('express');
const router = express.Router();
const { createMercadoPagoService } = require('../../services/mercadopago');
const logger = require('../../logger');

// Middleware to get MP service
const getMPService = (req, res, next) => {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(500).json({
      error: 'Mercado Pago access token not configured',
      code: 'MP_TOKEN_MISSING',
    });
  }
  req.mpService = createMercadoPagoService(accessToken);
  next();
};

router.use(getMPService);

/**
 * @swagger
 * /api/mp/account/me:
 *   get:
 *     summary: Get current user info
 *     tags: [Mercado Pago - Account]
 */
router.get('/me', async (req, res) => {
  try {
    const userInfo = await req.mpService.getUserInfo();
    res.json(userInfo);
  } catch (error) {
    logger.error('Error getting user info:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/account/balance:
 *   get:
 *     summary: Get account balance
 *     tags: [Mercado Pago - Account]
 */
router.get('/balance', async (req, res) => {
  try {
    // First get user info to get user_id
    const userInfo = await req.mpService.getUserInfo();
    const balance = await req.mpService.getAccountBalance(userInfo.id);
    
    res.json({
      userId: userInfo.id,
      balance,
    });
  } catch (error) {
    logger.error('Error getting account balance:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/account/chargebacks:
 *   get:
 *     summary: Get chargebacks
 *     tags: [Mercado Pago - Account]
 */
router.get('/chargebacks', async (req, res) => {
  try {
    const { limit = 30, offset = 0 } = req.query;
    
    const chargebacks = await req.mpService.getChargebacks({
      limit,
      offset,
    });
    
    res.json(chargebacks);
  } catch (error) {
    logger.error('Error getting chargebacks:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/account/chargebacks/{id}:
 *   get:
 *     summary: Get chargeback by ID
 *     tags: [Mercado Pago - Account]
 */
router.get('/chargebacks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const chargeback = await req.mpService.getChargeback(id);
    
    res.json(chargeback);
  } catch (error) {
    logger.error('Error getting chargeback:', { error: error.message, chargebackId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

// ============================================
// REPORTS
// ============================================

/**
 * @swagger
 * /api/mp/account/reports:
 *   get:
 *     summary: Get settlement reports
 *     tags: [Mercado Pago - Account]
 */
router.get('/reports', async (req, res) => {
  try {
    const reports = await req.mpService.getSettlementReports();
    res.json(reports);
  } catch (error) {
    logger.error('Error getting reports:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/account/reports:
 *   post:
 *     summary: Create settlement report
 *     tags: [Mercado Pago - Account]
 */
router.post('/reports', async (req, res) => {
  try {
    const reportData = req.body;
    
    const report = await req.mpService.createSettlementReport(reportData);
    
    res.status(201).json({
      success: true,
      report,
    });
  } catch (error) {
    logger.error('Error creating report:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/account/reports/{fileName}:
 *   get:
 *     summary: Download settlement report
 *     tags: [Mercado Pago - Account]
 */
router.get('/reports/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    const stream = await req.mpService.downloadSettlementReport(fileName);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    stream.pipe(res);
  } catch (error) {
    logger.error('Error downloading report:', { error: error.message, fileName: req.params.fileName });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

// ============================================
// MERCHANT ORDERS
// ============================================

/**
 * @swagger
 * /api/mp/account/merchant-orders:
 *   get:
 *     summary: Search merchant orders
 *     tags: [Mercado Pago - Account]
 */
router.get('/merchant-orders', async (req, res) => {
  try {
    const { external_reference, preference_id, limit = 30, offset = 0 } = req.query;
    
    const orders = await req.mpService.searchMerchantOrders({
      external_reference,
      preference_id,
      limit,
      offset,
    });
    
    res.json(orders);
  } catch (error) {
    logger.error('Error searching merchant orders:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/account/merchant-orders:
 *   post:
 *     summary: Create merchant order
 *     tags: [Mercado Pago - Account]
 */
router.post('/merchant-orders', async (req, res) => {
  try {
    const orderData = req.body;
    
    const order = await req.mpService.createMerchantOrder(orderData);
    
    res.status(201).json({
      success: true,
      order,
    });
  } catch (error) {
    logger.error('Error creating merchant order:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/account/merchant-orders/{id}:
 *   get:
 *     summary: Get merchant order by ID
 *     tags: [Mercado Pago - Account]
 */
router.get('/merchant-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await req.mpService.getMerchantOrder(id);
    
    res.json(order);
  } catch (error) {
    logger.error('Error getting merchant order:', { error: error.message, orderId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/account/merchant-orders/{id}:
 *   put:
 *     summary: Update merchant order
 *     tags: [Mercado Pago - Account]
 */
router.put('/merchant-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const order = await req.mpService.updateMerchantOrder(id, updateData);
    
    res.json({
      success: true,
      order,
    });
  } catch (error) {
    logger.error('Error updating merchant order:', { error: error.message, orderId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

// ============================================
// POS (Point of Sale)
// ============================================

/**
 * @swagger
 * /api/mp/account/pos:
 *   get:
 *     summary: Get POS list
 *     tags: [Mercado Pago - Account]
 */
router.get('/pos', async (req, res) => {
  try {
    const posList = await req.mpService.getPOSList();
    res.json(posList);
  } catch (error) {
    logger.error('Error getting POS list:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/account/pos:
 *   post:
 *     summary: Create POS
 *     tags: [Mercado Pago - Account]
 */
router.post('/pos', async (req, res) => {
  try {
    const posData = req.body;
    
    const pos = await req.mpService.createPOS(posData);
    
    res.status(201).json({
      success: true,
      pos,
    });
  } catch (error) {
    logger.error('Error creating POS:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/account/pos/{id}:
 *   get:
 *     summary: Get POS by ID
 *     tags: [Mercado Pago - Account]
 */
router.get('/pos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const pos = await req.mpService.getPOS(id);
    
    res.json(pos);
  } catch (error) {
    logger.error('Error getting POS:', { error: error.message, posId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/account/pos/{id}:
 *   put:
 *     summary: Update POS
 *     tags: [Mercado Pago - Account]
 */
router.put('/pos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const pos = await req.mpService.updatePOS(id, updateData);
    
    res.json({
      success: true,
      pos,
    });
  } catch (error) {
    logger.error('Error updating POS:', { error: error.message, posId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/account/pos/{id}:
 *   delete:
 *     summary: Delete POS
 *     tags: [Mercado Pago - Account]
 */
router.delete('/pos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await req.mpService.deletePOS(id);
    
    res.json({
      success: true,
      message: 'POS deleted',
    });
  } catch (error) {
    logger.error('Error deleting POS:', { error: error.message, posId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

// ============================================
// QR CODE
// ============================================

/**
 * @swagger
 * /api/mp/account/qr/{posId}:
 *   post:
 *     summary: Create QR Code for POS
 *     tags: [Mercado Pago - Account]
 */
router.post('/qr/:posId', async (req, res) => {
  try {
    const { posId } = req.params;
    const qrData = req.body;
    
    // Get user info for collector_id
    const userInfo = await req.mpService.getUserInfo();
    
    const qr = await req.mpService.createQRCode(userInfo.id, posId, qrData);
    
    res.status(201).json({
      success: true,
      qr,
    });
  } catch (error) {
    logger.error('Error creating QR code:', { error: error.message, posId: req.params.posId });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/account/qr/{posId}/order:
 *   get:
 *     summary: Get QR Code order
 *     tags: [Mercado Pago - Account]
 */
router.get('/qr/:posId/order', async (req, res) => {
  try {
    const { posId } = req.params;
    
    const userInfo = await req.mpService.getUserInfo();
    const order = await req.mpService.getQRCodeOrder(userInfo.id, posId);
    
    res.json(order);
  } catch (error) {
    logger.error('Error getting QR code order:', { error: error.message, posId: req.params.posId });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/account/qr/{posId}/order:
 *   delete:
 *     summary: Delete QR Code order
 *     tags: [Mercado Pago - Account]
 */
router.delete('/qr/:posId/order', async (req, res) => {
  try {
    const { posId } = req.params;
    
    const userInfo = await req.mpService.getUserInfo();
    await req.mpService.deleteQRCodeOrder(userInfo.id, posId);
    
    res.json({
      success: true,
      message: 'QR order deleted',
    });
  } catch (error) {
    logger.error('Error deleting QR code order:', { error: error.message, posId: req.params.posId });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

module.exports = router;
