/**
 * Mercado Pago Payments Routes
 * Handles MP Payments API endpoints
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
 * /api/mp/payments:
 *   get:
 *     summary: Search MP payments
 *     tags: [Mercado Pago - Payments]
 */
router.get('/', async (req, res) => {
  try {
    const {
      external_reference,
      status,
      begin_date,
      end_date,
      sort = 'date_created',
      criteria = 'desc',
      limit = 30,
      offset = 0,
    } = req.query;

    const params = {
      sort,
      criteria,
      limit,
      offset,
    };

    if (external_reference) params.external_reference = external_reference;
    if (status) params.status = status;
    if (begin_date) params.begin_date = begin_date;
    if (end_date) params.end_date = end_date;

    const mpPayments = await req.mpService.searchPayments(params);

    res.json(mpPayments);
  } catch (error) {
    logger.error('Error searching MP payments:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/payments:
 *   post:
 *     summary: Create new MP payment
 *     tags: [Mercado Pago - Payments]
 */
router.post('/', async (req, res) => {
  try {
    const paymentData = req.body;

    // Create payment in MP
    const mpPayment = await req.mpService.createPayment(paymentData);

    // Save to our database
    const transaction = new MPTransaction({
      userId: req.user?.id,
      type: 'payment',
      mpId: mpPayment.id.toString(),
      mpPaymentId: mpPayment.id.toString(),
      externalReference: paymentData.external_reference,
      status: mpPayment.status,
      statusDetail: mpPayment.status_detail,
      amount: mpPayment.transaction_amount,
      netAmount: mpPayment.transaction_details?.net_received_amount,
      feeAmount: mpPayment.fee_details?.reduce((acc, fee) => acc + fee.amount, 0) || 0,
      currencyId: mpPayment.currency_id,
      paymentMethodId: mpPayment.payment_method_id,
      paymentTypeId: mpPayment.payment_type_id,
      installments: mpPayment.installments,
      payer: {
        id: mpPayment.payer?.id,
        email: mpPayment.payer?.email,
        firstName: mpPayment.payer?.first_name,
        lastName: mpPayment.payer?.last_name,
        identification: mpPayment.payer?.identification,
      },
      dateCreated: mpPayment.date_created,
      dateApproved: mpPayment.date_approved,
      mpResponse: mpPayment,
    });

    await transaction.save();

    res.status(201).json({
      success: true,
      payment: mpPayment,
      transactionId: transaction.id,
    });
  } catch (error) {
    logger.error('Error creating MP payment:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/payments/pix:
 *   post:
 *     summary: Create Pix payment
 *     tags: [Mercado Pago - Payments]
 */
router.post('/pix', async (req, res) => {
  try {
    const paymentData = req.body;

    // Create Pix payment
    const mpPayment = await req.mpService.createPixPayment(paymentData);

    // Save to our database
    const transaction = new MPTransaction({
      userId: req.user?.id,
      type: 'payment',
      mpId: mpPayment.id.toString(),
      mpPaymentId: mpPayment.id.toString(),
      externalReference: paymentData.external_reference,
      status: mpPayment.status,
      statusDetail: mpPayment.status_detail,
      amount: mpPayment.transaction_amount,
      currencyId: mpPayment.currency_id,
      paymentMethodId: 'pix',
      paymentTypeId: 'bank_transfer',
      payer: {
        email: mpPayment.payer?.email,
        firstName: mpPayment.payer?.first_name,
        lastName: mpPayment.payer?.last_name,
        identification: mpPayment.payer?.identification,
      },
      dateCreated: mpPayment.date_created,
      mpResponse: mpPayment,
      metadata: {
        pixQrCode: mpPayment.point_of_interaction?.transaction_data?.qr_code,
        pixQrCodeBase64: mpPayment.point_of_interaction?.transaction_data?.qr_code_base64,
        pixTicketUrl: mpPayment.point_of_interaction?.transaction_data?.ticket_url,
      },
    });

    await transaction.save();

    res.status(201).json({
      success: true,
      payment: mpPayment,
      transactionId: transaction.id,
      pix: {
        qrCode: mpPayment.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: mpPayment.point_of_interaction?.transaction_data?.qr_code_base64,
        ticketUrl: mpPayment.point_of_interaction?.transaction_data?.ticket_url,
      },
    });
  } catch (error) {
    logger.error('Error creating Pix payment:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/payments/{id}:
 *   get:
 *     summary: Get MP payment by ID
 *     tags: [Mercado Pago - Payments]
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const mpPayment = await req.mpService.getPayment(id);

    // Update local record if exists
    await MPTransaction.findOneAndUpdate(
      { mpPaymentId: id },
      {
        status: mpPayment.status,
        statusDetail: mpPayment.status_detail,
        dateApproved: mpPayment.date_approved,
        dateLastUpdated: new Date(),
        mpResponse: mpPayment,
      }
    );

    res.json(mpPayment);
  } catch (error) {
    logger.error('Error getting MP payment:', { error: error.message, paymentId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/payments/{id}:
 *   put:
 *     summary: Update MP payment
 *     tags: [Mercado Pago - Payments]
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const mpPayment = await req.mpService.updatePayment(id, updateData);

    // Update local record
    await MPTransaction.findOneAndUpdate(
      { mpPaymentId: id },
      {
        status: mpPayment.status,
        statusDetail: mpPayment.status_detail,
        dateLastUpdated: new Date(),
        mpResponse: mpPayment,
      }
    );

    res.json({
      success: true,
      payment: mpPayment,
    });
  } catch (error) {
    logger.error('Error updating MP payment:', { error: error.message, paymentId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/payments/{id}/refund:
 *   post:
 *     summary: Refund MP payment (full)
 *     tags: [Mercado Pago - Payments]
 */
router.post('/:id/refund', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    let result;
    if (amount) {
      result = await req.mpService.partialRefundPayment(id, amount);
    } else {
      result = await req.mpService.refundPayment(id);
    }

    // Create refund transaction
    const refundTransaction = new MPTransaction({
      userId: req.user?.id,
      type: 'refund',
      mpId: result.id?.toString(),
      mpPaymentId: id,
      status: result.status,
      amount: amount || result.amount,
      externalReference: `refund_payment_${id}`,
      dateCreated: new Date(),
      mpResponse: result,
    });

    await refundTransaction.save();

    // Update original payment
    await MPTransaction.findOneAndUpdate(
      { mpPaymentId: id },
      {
        status: 'refunded',
        refundedAmount: amount || result.amount,
        dateLastUpdated: new Date(),
      }
    );

    res.json({
      success: true,
      refund: result,
      transactionId: refundTransaction.id,
    });
  } catch (error) {
    logger.error('Error refunding MP payment:', { error: error.message, paymentId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/payments/{id}/refunds:
 *   get:
 *     summary: Get refunds for MP payment
 *     tags: [Mercado Pago - Payments]
 */
router.get('/:id/refunds', async (req, res) => {
  try {
    const { id } = req.params;

    const refunds = await req.mpService.getPaymentRefunds(id);

    res.json(refunds);
  } catch (error) {
    logger.error('Error getting payment refunds:', { error: error.message, paymentId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/payments/methods:
 *   get:
 *     summary: Get available payment methods
 *     tags: [Mercado Pago - Payments]
 */
router.get('/methods/list', async (req, res) => {
  try {
    const methods = await req.mpService.getPaymentMethods();
    res.json(methods);
  } catch (error) {
    logger.error('Error getting payment methods:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/payments/installments:
 *   get:
 *     summary: Get installments for payment
 *     tags: [Mercado Pago - Payments]
 */
router.get('/installments/calculate', async (req, res) => {
  try {
    const { amount, payment_method_id, issuer_id } = req.query;

    const installments = await req.mpService.getInstallments({
      amount,
      payment_method_id,
      issuer_id,
    });

    res.json(installments);
  } catch (error) {
    logger.error('Error getting installments:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/payments/card-issuers:
 *   get:
 *     summary: Get card issuers
 *     tags: [Mercado Pago - Payments]
 */
router.get('/card-issuers/list', async (req, res) => {
  try {
    const { payment_method_id } = req.query;

    const issuers = await req.mpService.getCardIssuers({ payment_method_id });

    res.json(issuers);
  } catch (error) {
    logger.error('Error getting card issuers:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/payments/identification-types:
 *   get:
 *     summary: Get identification types
 *     tags: [Mercado Pago - Payments]
 */
router.get('/identification-types/list', async (req, res) => {
  try {
    const types = await req.mpService.getIdentificationTypes();
    res.json(types);
  } catch (error) {
    logger.error('Error getting identification types:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/payments/stats:
 *   get:
 *     summary: Get payment statistics
 *     tags: [Mercado Pago - Payments]
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const stats = await MPTransaction.getStats(req.user?.id, {
      start: dateFrom,
      end: dateTo,
    });

    res.json(stats);
  } catch (error) {
    logger.error('Error getting payment stats:', { error: error.message });
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/mp/payments/local:
 *   get:
 *     summary: Get local payment records
 *     tags: [Mercado Pago - Payments]
 */
router.get('/local/search', async (req, res) => {
  try {
    const result = await MPTransaction.search(req.user?.id, {
      ...req.query,
      type: 'payment',
    });

    res.json(result);
  } catch (error) {
    logger.error('Error searching local payments:', { error: error.message });
    res.status(500).json({
      error: error.message,
    });
  }
});

module.exports = router;
