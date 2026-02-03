/**
 * Mercado Pago Webhooks Routes
 * Handles MP webhook notifications
 */

const express = require('express');
const router = express.Router();
const { createMercadoPagoService } = require('../../services/mercadopago');
const MPTransaction = require('../../db/models/MPTransaction');
const MPSubscription = require('../../db/models/MPSubscription');
const logger = require('../../logger');

/**
 * @swagger
 * /api/mp/webhooks/notifications:
 *   post:
 *     summary: Receive MP webhook notifications
 *     tags: [Mercado Pago - Webhooks]
 */
router.post('/notifications', async (req, res) => {
  try {
    const { action, type, data, id: notificationId } = req.body;

    logger.info('MP Webhook received:', {
      action,
      type,
      dataId: data?.id,
      notificationId,
    });

    // Acknowledge receipt immediately
    res.status(200).send('OK');

    // Process notification asynchronously
    processNotification(req.body).catch((err) => {
      logger.error('Error processing MP webhook:', { error: err.message });
    });
  } catch (error) {
    logger.error('Error handling MP webhook:', { error: error.message });
    res.status(500).send('Error');
  }
});

/**
 * Process notification asynchronously
 */
async function processNotification(notification) {
  const { action, type, data } = notification;
  const accessToken = process.env.MP_ACCESS_TOKEN;

  if (!accessToken) {
    logger.error('MP_ACCESS_TOKEN not configured');
    return;
  }

  const mpService = createMercadoPagoService(accessToken);

  // Handle different notification types
  switch (type) {
    case 'payment':
      await handlePaymentNotification(mpService, data.id, action);
      break;

    case 'plan':
      await handlePlanNotification(mpService, data.id, action);
      break;

    case 'subscription_preapproval':
      await handleSubscriptionNotification(mpService, data.id, action);
      break;

    case 'subscription_preapproval_plan':
      await handleSubscriptionPlanNotification(mpService, data.id, action);
      break;

    case 'subscription_authorized_payment':
      await handleSubscriptionPaymentNotification(mpService, data.id, action);
      break;

    case 'point_integration_wh':
      await handlePointNotification(mpService, data, action);
      break;

    case 'delivery':
      await handleDeliveryNotification(mpService, data.id, action);
      break;

    case 'delivery_cancellation':
      await handleDeliveryCancellationNotification(mpService, data.id, action);
      break;

    case 'topic_claims_integration_wh':
      await handleClaimNotification(mpService, data, action);
      break;

    case 'topic_card_id_wh':
      await handleCardNotification(mpService, data, action);
      break;

    case 'topic_chargebacks_wh':
      await handleChargebackNotification(mpService, data, action);
      break;

    case 'topic_merchant_order_wh':
    case 'merchant_order':
      await handleMerchantOrderNotification(mpService, data.id, action);
      break;

    default:
      logger.warn('Unknown webhook type:', { type, action });
  }
}

/**
 * Handle payment notification
 */
async function handlePaymentNotification(mpService, paymentId, action) {
  try {
    logger.info('Processing payment notification:', { paymentId, action });

    // Get payment details from MP
    const payment = await mpService.getPayment(paymentId);

    // Update or create local record
    await MPTransaction.findOneAndUpdate(
      { mpPaymentId: paymentId.toString() },
      {
        status: payment.status,
        statusDetail: payment.status_detail,
        dateApproved: payment.date_approved,
        dateLastUpdated: new Date(),
        lastWebhookAt: new Date(),
        $inc: { webhookCount: 1 },
        mpResponse: payment,
      },
      { upsert: false }
    );

    // If payment belongs to a subscription, update subscription
    if (payment.metadata?.preapproval_id) {
      await MPSubscription.findOneAndUpdate(
        { mpSubscriptionId: payment.metadata.preapproval_id },
        {
          $push: {
            payments: {
              mpPaymentId: paymentId.toString(),
              amount: payment.transaction_amount,
              status: payment.status,
              dateCreated: payment.date_created,
            },
          },
        }
      );
    }

    logger.info('Payment notification processed:', {
      paymentId,
      status: payment.status,
    });
  } catch (error) {
    logger.error('Error processing payment notification:', {
      error: error.message,
      paymentId,
    });
  }
}

/**
 * Handle subscription notification
 */
async function handleSubscriptionNotification(mpService, subscriptionId, action) {
  try {
    logger.info('Processing subscription notification:', { subscriptionId, action });

    // Get subscription details from MP
    const subscription = await mpService.getSubscription(subscriptionId);

    // Update local record
    await MPSubscription.findOneAndUpdate(
      { mpSubscriptionId: subscriptionId },
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
      },
      { upsert: false }
    );

    logger.info('Subscription notification processed:', {
      subscriptionId,
      status: subscription.status,
    });
  } catch (error) {
    logger.error('Error processing subscription notification:', {
      error: error.message,
      subscriptionId,
    });
  }
}

/**
 * Handle subscription plan notification
 */
async function handleSubscriptionPlanNotification(mpService, planId, action) {
  try {
    logger.info('Processing subscription plan notification:', { planId, action });

    const plan = await mpService.getSubscriptionPlan(planId);

    // Log plan update - implement storage if needed
    logger.info('Subscription plan updated:', {
      planId,
      status: plan.status,
    });
  } catch (error) {
    logger.error('Error processing subscription plan notification:', {
      error: error.message,
      planId,
    });
  }
}

/**
 * Handle subscription payment notification
 */
async function handleSubscriptionPaymentNotification(mpService, paymentId, action) {
  try {
    logger.info('Processing subscription payment notification:', { paymentId, action });

    const payment = await mpService.getPayment(paymentId);

    // Update subscription if we have preapproval_id
    if (payment.metadata?.preapproval_id) {
      const subscription = await MPSubscription.findOne({
        mpSubscriptionId: payment.metadata.preapproval_id,
      });

      if (subscription) {
        subscription.addPayment(payment);
        await subscription.save();
      }
    }

    logger.info('Subscription payment notification processed:', {
      paymentId,
      status: payment.status,
    });
  } catch (error) {
    logger.error('Error processing subscription payment notification:', {
      error: error.message,
      paymentId,
    });
  }
}

/**
 * Handle plan notification
 */
async function handlePlanNotification(mpService, planId, action) {
  try {
    logger.info('Processing plan notification:', { planId, action });
    // Implement plan handling if needed
  } catch (error) {
    logger.error('Error processing plan notification:', { error: error.message, planId });
  }
}

/**
 * Handle Point notification
 */
async function handlePointNotification(mpService, data, action) {
  try {
    logger.info('Processing Point notification:', { data, action });
    // Implement Point handling if needed
  } catch (error) {
    logger.error('Error processing Point notification:', { error: error.message });
  }
}

/**
 * Handle delivery notification
 */
async function handleDeliveryNotification(mpService, deliveryId, action) {
  try {
    logger.info('Processing delivery notification:', { deliveryId, action });
    // Implement delivery handling if needed
  } catch (error) {
    logger.error('Error processing delivery notification:', { error: error.message, deliveryId });
  }
}

/**
 * Handle delivery cancellation notification
 */
async function handleDeliveryCancellationNotification(mpService, deliveryId, action) {
  try {
    logger.info('Processing delivery cancellation notification:', { deliveryId, action });
    // Implement delivery cancellation handling if needed
  } catch (error) {
    logger.error('Error processing delivery cancellation:', { error: error.message, deliveryId });
  }
}

/**
 * Handle claim notification
 */
async function handleClaimNotification(mpService, data, action) {
  try {
    logger.info('Processing claim notification:', { data, action });
    // Implement claim handling if needed
  } catch (error) {
    logger.error('Error processing claim notification:', { error: error.message });
  }
}

/**
 * Handle card notification
 */
async function handleCardNotification(mpService, data, action) {
  try {
    logger.info('Processing card notification:', { data, action });
    // Implement card handling if needed
  } catch (error) {
    logger.error('Error processing card notification:', { error: error.message });
  }
}

/**
 * Handle chargeback notification
 */
async function handleChargebackNotification(mpService, data, action) {
  try {
    logger.info('Processing chargeback notification:', { data, action });

    // Create chargeback transaction
    const transaction = new MPTransaction({
      type: 'chargeback',
      mpId: data.id?.toString(),
      status: 'charged_back',
      dateCreated: new Date(),
      metadata: data,
    });

    await transaction.save();

    logger.info('Chargeback notification processed');
  } catch (error) {
    logger.error('Error processing chargeback notification:', { error: error.message });
  }
}

/**
 * Handle merchant order notification
 */
async function handleMerchantOrderNotification(mpService, orderId, action) {
  try {
    logger.info('Processing merchant order notification:', { orderId, action });

    const order = await mpService.getMerchantOrder(orderId);

    // Update preference if linked
    if (order.preference_id) {
      await MPTransaction.findOneAndUpdate(
        { mpPreferenceId: order.preference_id },
        {
          status: order.status === 'closed' ? 'approved' : order.status,
          dateLastUpdated: new Date(),
          lastWebhookAt: new Date(),
          $inc: { webhookCount: 1 },
        }
      );
    }

    logger.info('Merchant order notification processed:', {
      orderId,
      status: order.status,
    });
  } catch (error) {
    logger.error('Error processing merchant order notification:', {
      error: error.message,
      orderId,
    });
  }
}

/**
 * IPN (Instant Payment Notification) endpoint - legacy format
 */
router.post('/ipn', async (req, res) => {
  try {
    const { topic, id } = req.query;

    logger.info('MP IPN received:', { topic, id });

    res.status(200).send('OK');

    // Process IPN
    if (topic === 'payment' && id) {
      const accessToken = process.env.MP_ACCESS_TOKEN;
      if (accessToken) {
        const mpService = createMercadoPagoService(accessToken);
        await handlePaymentNotification(mpService, id, 'payment.updated');
      }
    } else if (topic === 'merchant_order' && id) {
      const accessToken = process.env.MP_ACCESS_TOKEN;
      if (accessToken) {
        const mpService = createMercadoPagoService(accessToken);
        await handleMerchantOrderNotification(mpService, id, 'merchant_order.updated');
      }
    }
  } catch (error) {
    logger.error('Error handling IPN:', { error: error.message });
    res.status(500).send('Error');
  }
});

/**
 * Test webhook endpoint
 */
router.post('/test', async (req, res) => {
  try {
    logger.info('Test webhook received:', req.body);

    res.json({
      success: true,
      message: 'Webhook test received',
      received: req.body,
    });
  } catch (error) {
    logger.error('Error in test webhook:', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get webhook logs
 */
router.get('/logs', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const transactions = await MPTransaction.find({
      webhookCount: { $gt: 0 },
    })
      .sort('-lastWebhookAt')
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .select('type mpId status lastWebhookAt webhookCount createdAt');

    res.json({
      transactions,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    logger.error('Error getting webhook logs:', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
