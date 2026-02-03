/**
 * Mercado Pago Subscriptions Routes
 * Handles MP Subscriptions/Preapproval API
 */

const express = require('express');
const router = express.Router();
const { createMercadoPagoService } = require('../../services/mercadopago');
const MPSubscription = require('../../db/models/MPSubscription');
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

// ============================================
// SUBSCRIPTION PLANS
// ============================================

/**
 * @swagger
 * /api/mp/subscriptions/plans:
 *   get:
 *     summary: Search subscription plans
 *     tags: [Mercado Pago - Subscriptions]
 */
router.get('/plans', async (req, res) => {
  try {
    const { status, limit = 30, offset = 0 } = req.query;

    const plans = await req.mpService.searchSubscriptionPlans({
      status,
      limit,
      offset,
    });

    res.json(plans);
  } catch (error) {
    logger.error('Error searching subscription plans:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/subscriptions/plans:
 *   post:
 *     summary: Create subscription plan
 *     tags: [Mercado Pago - Subscriptions]
 */
router.post('/plans', async (req, res) => {
  try {
    const planData = req.body;

    // Set default back URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    const dataWithDefaults = {
      ...planData,
      back_url: planData.back_url || `${frontendUrl}/mp/subscriptions/callback`,
    };

    const plan = await req.mpService.createSubscriptionPlan(dataWithDefaults);

    res.status(201).json({
      success: true,
      plan,
    });
  } catch (error) {
    logger.error('Error creating subscription plan:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/subscriptions/plans/{id}:
 *   get:
 *     summary: Get subscription plan
 *     tags: [Mercado Pago - Subscriptions]
 */
router.get('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await req.mpService.getSubscriptionPlan(id);

    res.json(plan);
  } catch (error) {
    logger.error('Error getting subscription plan:', { error: error.message, planId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/subscriptions/plans/{id}:
 *   put:
 *     summary: Update subscription plan
 *     tags: [Mercado Pago - Subscriptions]
 */
router.put('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const plan = await req.mpService.updateSubscriptionPlan(id, updateData);

    res.json({
      success: true,
      plan,
    });
  } catch (error) {
    logger.error('Error updating subscription plan:', { error: error.message, planId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

// ============================================
// SUBSCRIPTIONS (Preapproval)
// ============================================

/**
 * @swagger
 * /api/mp/subscriptions:
 *   get:
 *     summary: Search subscriptions
 *     tags: [Mercado Pago - Subscriptions]
 */
router.get('/', async (req, res) => {
  try {
    const { status, payer_email, limit = 30, offset = 0 } = req.query;

    // Search in MP
    const mpSubscriptions = await req.mpService.searchSubscriptions({
      status,
      payer_email,
      limit,
      offset,
    });

    // Also get local subscriptions
    const localSubscriptions = await MPSubscription.search(req.user?.id, {
      status,
      limit,
      offset,
    });

    res.json({
      mp: mpSubscriptions,
      local: localSubscriptions,
    });
  } catch (error) {
    logger.error('Error searching subscriptions:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/subscriptions:
 *   post:
 *     summary: Create subscription
 *     tags: [Mercado Pago - Subscriptions]
 */
router.post('/', async (req, res) => {
  try {
    const subscriptionData = req.body;

    // Set default back URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    const dataWithDefaults = {
      ...subscriptionData,
      back_url: subscriptionData.back_url || `${frontendUrl}/mp/subscriptions/callback`,
    };

    const mpSubscription = await req.mpService.createSubscription(dataWithDefaults);

    // Save to local database
    const localSubscription = new MPSubscription({
      userId: req.user?.id,
      mpSubscriptionId: mpSubscription.id,
      mpPlanId: subscriptionData.preapproval_plan_id,
      mpPayerId: mpSubscription.payer_id,
      externalReference: subscriptionData.external_reference,
      status: mpSubscription.status,
      reason: mpSubscription.reason,
      autoRecurring: {
        frequency: mpSubscription.auto_recurring?.frequency,
        frequencyType: mpSubscription.auto_recurring?.frequency_type,
        transactionAmount: mpSubscription.auto_recurring?.transaction_amount,
        currencyId: mpSubscription.auto_recurring?.currency_id,
        startDate: mpSubscription.auto_recurring?.start_date,
        endDate: mpSubscription.auto_recurring?.end_date,
      },
      payer: {
        id: mpSubscription.payer_id,
        email: subscriptionData.payer_email,
      },
      initPoint: mpSubscription.init_point,
      sandboxInitPoint: mpSubscription.sandbox_init_point,
      backUrl: mpSubscription.back_url,
      dateCreated: mpSubscription.date_created,
      mpResponse: mpSubscription,
    });

    await localSubscription.save();

    res.status(201).json({
      success: true,
      subscription: mpSubscription,
      localId: localSubscription.id,
      checkoutUrl: mpSubscription.init_point,
      sandboxUrl: mpSubscription.sandbox_init_point,
    });
  } catch (error) {
    logger.error('Error creating subscription:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/subscriptions/{id}:
 *   get:
 *     summary: Get subscription by ID
 *     tags: [Mercado Pago - Subscriptions]
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await req.mpService.getSubscription(id);

    // Update local record
    await MPSubscription.findOneAndUpdate(
      { mpSubscriptionId: id },
      {
        status: subscription.status,
        lastModified: subscription.last_modified,
        nextPaymentDate: subscription.next_payment_date,
        summarized: {
          quotas: subscription.summarized?.quotas,
          chargedQuantity: subscription.summarized?.charged_quantity,
          pendingChargeQuantity: subscription.summarized?.pending_charge_quantity,
          chargedAmount: subscription.summarized?.charged_amount,
          pendingChargeAmount: subscription.summarized?.pending_charge_amount,
          semaphore: subscription.summarized?.semaphore,
          lastChargedDate: subscription.summarized?.last_charged_date,
          lastChargedAmount: subscription.summarized?.last_charged_amount,
        },
        mpResponse: subscription,
      }
    );

    res.json(subscription);
  } catch (error) {
    logger.error('Error getting subscription:', { error: error.message, subscriptionId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/subscriptions/{id}:
 *   put:
 *     summary: Update subscription
 *     tags: [Mercado Pago - Subscriptions]
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const subscription = await req.mpService.updateSubscription(id, updateData);

    // Update local record
    await MPSubscription.findOneAndUpdate(
      { mpSubscriptionId: id },
      {
        status: subscription.status,
        lastModified: subscription.last_modified,
        mpResponse: subscription,
      }
    );

    res.json({
      success: true,
      subscription,
    });
  } catch (error) {
    logger.error('Error updating subscription:', { error: error.message, subscriptionId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/subscriptions/{id}/pause:
 *   post:
 *     summary: Pause subscription
 *     tags: [Mercado Pago - Subscriptions]
 */
router.post('/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await req.mpService.pauseSubscription(id);

    // Update local record
    await MPSubscription.findOneAndUpdate(
      { mpSubscriptionId: id },
      {
        status: 'paused',
        lastModified: new Date(),
        mpResponse: subscription,
      }
    );

    res.json({
      success: true,
      subscription,
      message: 'Subscription paused',
    });
  } catch (error) {
    logger.error('Error pausing subscription:', { error: error.message, subscriptionId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/subscriptions/{id}/cancel:
 *   post:
 *     summary: Cancel subscription
 *     tags: [Mercado Pago - Subscriptions]
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await req.mpService.cancelSubscription(id);

    // Update local record
    await MPSubscription.findOneAndUpdate(
      { mpSubscriptionId: id },
      {
        status: 'cancelled',
        lastModified: new Date(),
        mpResponse: subscription,
      }
    );

    res.json({
      success: true,
      subscription,
      message: 'Subscription cancelled',
    });
  } catch (error) {
    logger.error('Error cancelling subscription:', { error: error.message, subscriptionId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/subscriptions/{id}/reactivate:
 *   post:
 *     summary: Reactivate paused subscription
 *     tags: [Mercado Pago - Subscriptions]
 */
router.post('/:id/reactivate', async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await req.mpService.updateSubscription(id, {
      status: 'authorized',
    });

    // Update local record
    await MPSubscription.findOneAndUpdate(
      { mpSubscriptionId: id },
      {
        status: 'authorized',
        lastModified: new Date(),
        mpResponse: subscription,
      }
    );

    res.json({
      success: true,
      subscription,
      message: 'Subscription reactivated',
    });
  } catch (error) {
    logger.error('Error reactivating subscription:', { error: error.message, subscriptionId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

// ============================================
// STATISTICS & LOCAL
// ============================================

/**
 * Get subscription statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await MPSubscription.getStats(req.user?.id);
    res.json(stats);
  } catch (error) {
    logger.error('Error getting subscription stats:', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get active subscriptions
 */
router.get('/local/active', async (req, res) => {
  try {
    const subscriptions = await MPSubscription.getActive(req.user?.id);
    res.json(subscriptions);
  } catch (error) {
    logger.error('Error getting active subscriptions:', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get subscriptions due for payment
 */
router.get('/local/due', async (req, res) => {
  try {
    const { daysAhead = 7 } = req.query;
    const subscriptions = await MPSubscription.getDueForPayment(
      req.user?.id,
      parseInt(daysAhead)
    );
    res.json(subscriptions);
  } catch (error) {
    logger.error('Error getting due subscriptions:', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Search local subscriptions
 */
router.get('/local/search', async (req, res) => {
  try {
    const result = await MPSubscription.search(req.user?.id, req.query);
    res.json(result);
  } catch (error) {
    logger.error('Error searching local subscriptions:', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
