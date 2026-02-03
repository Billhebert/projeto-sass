/**
 * Mercado Pago Preferences Routes
 * Handles Checkout Pro preferences
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
 * /api/mp/preferences:
 *   get:
 *     summary: Search checkout preferences
 *     tags: [Mercado Pago - Preferences]
 */
router.get('/', async (req, res) => {
  try {
    const { external_reference, limit = 30, offset = 0 } = req.query;

    const preferences = await req.mpService.searchPreferences({
      external_reference,
      limit,
      offset,
    });

    res.json(preferences);
  } catch (error) {
    logger.error('Error searching preferences:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/preferences:
 *   post:
 *     summary: Create checkout preference
 *     tags: [Mercado Pago - Preferences]
 */
router.post('/', async (req, res) => {
  try {
    const preferenceData = req.body;

    // Set default back URLs if not provided
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    const defaultBackUrls = {
      success: `${frontendUrl}/mp/checkout/success`,
      failure: `${frontendUrl}/mp/checkout/failure`,
      pending: `${frontendUrl}/mp/checkout/pending`,
    };

    const dataWithDefaults = {
      ...preferenceData,
      back_urls: preferenceData.back_urls || defaultBackUrls,
      auto_return: preferenceData.auto_return || 'approved',
      notification_url: preferenceData.notification_url || `${process.env.BACKEND_URL || 'http://localhost:3011'}/api/mp/webhooks/notifications`,
    };

    // Create preference in MP
    const preference = await req.mpService.createPreference(dataWithDefaults);

    // Save to our database
    const transaction = new MPTransaction({
      userId: req.user?.id,
      type: 'preference',
      mpId: preference.id,
      mpPreferenceId: preference.id,
      externalReference: preferenceData.external_reference,
      status: 'pending',
      amount: preferenceData.items?.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0) || 0,
      currencyId: preferenceData.items?.[0]?.currency_id || 'BRL',
      payer: {
        email: preferenceData.payer?.email,
        firstName: preferenceData.payer?.name,
      },
      items: preferenceData.items,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      backUrls: preference.back_urls,
      notificationUrl: preference.notification_url,
      dateCreated: new Date(),
      mpResponse: preference,
    });

    await transaction.save();

    res.status(201).json({
      success: true,
      preference: {
        id: preference.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
        collector_id: preference.collector_id,
        date_created: preference.date_created,
        external_reference: preference.external_reference,
      },
      transactionId: transaction.id,
      checkoutUrl: preference.init_point,
      sandboxUrl: preference.sandbox_init_point,
    });
  } catch (error) {
    logger.error('Error creating preference:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/preferences/{id}:
 *   get:
 *     summary: Get preference by ID
 *     tags: [Mercado Pago - Preferences]
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const preference = await req.mpService.getPreference(id);

    res.json(preference);
  } catch (error) {
    logger.error('Error getting preference:', { error: error.message, preferenceId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/preferences/{id}:
 *   put:
 *     summary: Update preference
 *     tags: [Mercado Pago - Preferences]
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const preference = await req.mpService.updatePreference(id, updateData);

    // Update local record
    await MPTransaction.findOneAndUpdate(
      { mpPreferenceId: id },
      {
        items: updateData.items,
        dateLastUpdated: new Date(),
        mpResponse: preference,
      }
    );

    res.json({
      success: true,
      preference,
    });
  } catch (error) {
    logger.error('Error updating preference:', { error: error.message, preferenceId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * Create preference for product
 * Simplified endpoint for common use case
 */
router.post('/product', async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      quantity = 1,
      picture_url,
      category_id,
      external_reference,
      payer_email,
      payer_name,
    } = req.body;

    const preferenceData = {
      items: [
        {
          id: external_reference || `item_${Date.now()}`,
          title,
          description,
          picture_url,
          category_id,
          quantity: parseInt(quantity),
          currency_id: 'BRL',
          unit_price: parseFloat(price),
        },
      ],
      payer: {
        email: payer_email,
        name: payer_name,
      },
      external_reference: external_reference || `order_${Date.now()}`,
      statement_descriptor: 'SASS Dashboard',
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    preferenceData.back_urls = {
      success: `${frontendUrl}/mp/checkout/success`,
      failure: `${frontendUrl}/mp/checkout/failure`,
      pending: `${frontendUrl}/mp/checkout/pending`,
    };
    preferenceData.auto_return = 'approved';

    const preference = await req.mpService.createPreference(preferenceData);

    // Save to database
    const transaction = new MPTransaction({
      userId: req.user?.id,
      type: 'preference',
      mpId: preference.id,
      mpPreferenceId: preference.id,
      externalReference: preferenceData.external_reference,
      status: 'pending',
      amount: price * quantity,
      currencyId: 'BRL',
      payer: {
        email: payer_email,
        firstName: payer_name,
      },
      items: preferenceData.items,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      dateCreated: new Date(),
      mpResponse: preference,
    });

    await transaction.save();

    res.status(201).json({
      success: true,
      checkoutUrl: preference.init_point,
      sandboxUrl: preference.sandbox_init_point,
      preferenceId: preference.id,
      transactionId: transaction.id,
    });
  } catch (error) {
    logger.error('Error creating product preference:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * Create preference for cart (multiple items)
 */
router.post('/cart', async (req, res) => {
  try {
    const {
      items,
      external_reference,
      payer,
      shipment,
    } = req.body;

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Items array is required',
        code: 'INVALID_ITEMS',
      });
    }

    // Format items for MP
    const formattedItems = items.map((item, index) => ({
      id: item.id || `item_${index}`,
      title: item.title,
      description: item.description,
      picture_url: item.picture_url,
      category_id: item.category_id,
      quantity: parseInt(item.quantity) || 1,
      currency_id: 'BRL',
      unit_price: parseFloat(item.unit_price || item.price),
    }));

    const totalAmount = formattedItems.reduce(
      (acc, item) => acc + item.unit_price * item.quantity,
      0
    );

    const preferenceData = {
      items: formattedItems,
      payer: payer || {},
      external_reference: external_reference || `cart_${Date.now()}`,
      statement_descriptor: 'SASS Dashboard',
    };

    // Add shipment if provided
    if (shipment) {
      preferenceData.shipments = {
        cost: shipment.cost,
        mode: shipment.mode || 'not_specified',
        receiver_address: shipment.receiver_address,
      };
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    preferenceData.back_urls = {
      success: `${frontendUrl}/mp/checkout/success`,
      failure: `${frontendUrl}/mp/checkout/failure`,
      pending: `${frontendUrl}/mp/checkout/pending`,
    };
    preferenceData.auto_return = 'approved';

    const preference = await req.mpService.createPreference(preferenceData);

    // Save to database
    const transaction = new MPTransaction({
      userId: req.user?.id,
      type: 'preference',
      mpId: preference.id,
      mpPreferenceId: preference.id,
      externalReference: preferenceData.external_reference,
      status: 'pending',
      amount: totalAmount,
      currencyId: 'BRL',
      payer: {
        email: payer?.email,
        firstName: payer?.name,
      },
      items: formattedItems,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      dateCreated: new Date(),
      mpResponse: preference,
    });

    await transaction.save();

    res.status(201).json({
      success: true,
      checkoutUrl: preference.init_point,
      sandboxUrl: preference.sandbox_init_point,
      preferenceId: preference.id,
      transactionId: transaction.id,
      totalAmount,
      itemsCount: formattedItems.length,
    });
  } catch (error) {
    logger.error('Error creating cart preference:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * Get local preferences
 */
router.get('/local/search', async (req, res) => {
  try {
    const result = await MPTransaction.search(req.user?.id, {
      ...req.query,
      type: 'preference',
    });

    res.json(result);
  } catch (error) {
    logger.error('Error searching local preferences:', { error: error.message });
    res.status(500).json({
      error: error.message,
    });
  }
});

module.exports = router;
