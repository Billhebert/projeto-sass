/**
 * Mercado Pago Orders Routes
 * Handles MP Orders API endpoints
 */

const express = require('express');
const router = express.Router();
const { createMercadoPagoService } = require('../../services/mercadopago');
const MPTransaction = require('../../db/models/MPTransaction');
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
 * /api/mp/orders:
 *   get:
 *     summary: List/search MP orders
 *     tags: [Mercado Pago - Orders]
 */
router.get('/', async (req, res) => {
  try {
    const { external_reference, status, limit = 20, offset = 0 } = req.query;
    
    // Search in MP API
    const mpOrders = await req.mpService.searchOrders({
      external_reference,
      status,
      limit,
      offset,
    });

    // Also get from our database
    const localOrders = await MPTransaction.search(req.user?.id, {
      type: 'order',
      status,
      externalReference: external_reference,
      limit,
      offset,
    });

    res.json({
      mp: mpOrders,
      local: localOrders,
    });
  } catch (error) {
    logger.error('Error listing MP orders:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/orders:
 *   post:
 *     summary: Create new MP order
 *     tags: [Mercado Pago - Orders]
 */
router.post('/', async (req, res) => {
  try {
    const orderData = req.body;

    // Create order in MP
    const mpOrder = await req.mpService.createOrder(orderData);

    // Save to our database
    const transaction = new MPTransaction({
      userId: req.user?.id,
      type: 'order',
      mpId: mpOrder.id,
      mpOrderId: mpOrder.id,
      externalReference: orderData.external_reference,
      status: mpOrder.status,
      amount: parseFloat(mpOrder.total_amount),
      currencyId: mpOrder.currency_id || 'BRL',
      payer: {
        email: orderData.payer?.email,
        firstName: orderData.payer?.first_name,
        lastName: orderData.payer?.last_name,
        identification: orderData.payer?.identification,
      },
      items: orderData.items,
      dateCreated: new Date(),
      mpResponse: mpOrder,
    });

    await transaction.save();

    res.status(201).json({
      success: true,
      order: mpOrder,
      transactionId: transaction.id,
    });
  } catch (error) {
    logger.error('Error creating MP order:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/orders/{id}:
 *   get:
 *     summary: Get MP order by ID
 *     tags: [Mercado Pago - Orders]
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const mpOrder = await req.mpService.getOrder(id);

    // Update local record if exists
    await MPTransaction.findOneAndUpdate(
      { mpOrderId: id },
      {
        status: mpOrder.status,
        dateLastUpdated: new Date(),
        mpResponse: mpOrder,
      }
    );

    res.json(mpOrder);
  } catch (error) {
    logger.error('Error getting MP order:', { error: error.message, orderId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/orders/{id}/capture:
 *   post:
 *     summary: Capture MP order payment
 *     tags: [Mercado Pago - Orders]
 */
router.post('/:id/capture', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await req.mpService.captureOrder(id);

    // Update local record
    await MPTransaction.findOneAndUpdate(
      { mpOrderId: id },
      {
        status: result.status,
        dateLastUpdated: new Date(),
        dateApproved: new Date(),
        mpResponse: result,
      }
    );

    res.json({
      success: true,
      order: result,
    });
  } catch (error) {
    logger.error('Error capturing MP order:', { error: error.message, orderId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/orders/{id}/cancel:
 *   post:
 *     summary: Cancel MP order
 *     tags: [Mercado Pago - Orders]
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await req.mpService.cancelOrder(id);

    // Update local record
    await MPTransaction.findOneAndUpdate(
      { mpOrderId: id },
      {
        status: 'cancelled',
        dateLastUpdated: new Date(),
        mpResponse: result,
      }
    );

    res.json({
      success: true,
      order: result,
    });
  } catch (error) {
    logger.error('Error cancelling MP order:', { error: error.message, orderId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/orders/{id}/refund:
 *   post:
 *     summary: Refund MP order
 *     tags: [Mercado Pago - Orders]
 */
router.post('/:id/refund', async (req, res) => {
  try {
    const { id } = req.params;
    const refundData = req.body;

    const result = await req.mpService.refundOrder(id, refundData);

    // Create refund transaction
    const refundTransaction = new MPTransaction({
      userId: req.user?.id,
      type: 'refund',
      mpId: result.id,
      mpOrderId: id,
      status: result.status,
      amount: refundData.amount || 0,
      externalReference: `refund_${id}`,
      dateCreated: new Date(),
      mpResponse: result,
    });

    await refundTransaction.save();

    // Update original order
    await MPTransaction.findOneAndUpdate(
      { mpOrderId: id },
      {
        status: 'refunded',
        refundedAmount: refundData.amount,
        dateLastUpdated: new Date(),
      }
    );

    res.json({
      success: true,
      refund: result,
      transactionId: refundTransaction.id,
    });
  } catch (error) {
    logger.error('Error refunding MP order:', { error: error.message, orderId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/orders/{id}/process:
 *   post:
 *     summary: Process MP order
 *     tags: [Mercado Pago - Orders]
 */
router.post('/:id/process', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await req.mpService.processOrder(id);

    // Update local record
    await MPTransaction.findOneAndUpdate(
      { mpOrderId: id },
      {
        status: result.status,
        dateLastUpdated: new Date(),
        mpResponse: result,
      }
    );

    res.json({
      success: true,
      order: result,
    });
  } catch (error) {
    logger.error('Error processing MP order:', { error: error.message, orderId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/orders/{id}/transactions:
 *   post:
 *     summary: Add transaction to MP order
 *     tags: [Mercado Pago - Orders]
 */
router.post('/:id/transactions', async (req, res) => {
  try {
    const { id } = req.params;
    const transactionData = req.body;

    const result = await req.mpService.addTransaction(id, transactionData);

    res.json({
      success: true,
      transaction: result,
    });
  } catch (error) {
    logger.error('Error adding transaction to MP order:', { error: error.message, orderId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/orders/{id}/transactions/{transactionId}:
 *   put:
 *     summary: Update transaction in MP order
 *     tags: [Mercado Pago - Orders]
 */
router.put('/:id/transactions/:transactionId', async (req, res) => {
  try {
    const { id, transactionId } = req.params;
    const transactionData = req.body;

    const result = await req.mpService.updateTransaction(id, transactionId, transactionData);

    res.json({
      success: true,
      transaction: result,
    });
  } catch (error) {
    logger.error('Error updating transaction:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/orders/{id}/transactions/{transactionId}:
 *   delete:
 *     summary: Delete transaction from MP order
 *     tags: [Mercado Pago - Orders]
 */
router.delete('/:id/transactions/:transactionId', async (req, res) => {
  try {
    const { id, transactionId } = req.params;

    const result = await req.mpService.deleteTransaction(id, transactionId);

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error('Error deleting transaction:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

module.exports = router;
