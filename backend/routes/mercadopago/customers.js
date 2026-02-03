/**
 * Mercado Pago Customers Routes
 * Handles MP Customers API
 */

const express = require('express');
const router = express.Router();
const { createMercadoPagoService } = require('../../services/mercadopago');
const MPCustomer = require('../../db/models/MPCustomer');
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
 * /api/mp/customers:
 *   get:
 *     summary: Search customers
 *     tags: [Mercado Pago - Customers]
 */
router.get('/', async (req, res) => {
  try {
    const { email, limit = 30, offset = 0 } = req.query;

    // Search in MP
    const mpCustomers = await req.mpService.searchCustomers({ email });

    // Also get from local database
    const localCustomers = await MPCustomer.search(req.user?.id, {
      email,
      limit,
      offset,
    });

    res.json({
      mp: mpCustomers,
      local: localCustomers,
    });
  } catch (error) {
    logger.error('Error searching customers:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/customers:
 *   post:
 *     summary: Create customer
 *     tags: [Mercado Pago - Customers]
 */
router.post('/', async (req, res) => {
  try {
    const customerData = req.body;

    // Create in MP
    const mpCustomer = await req.mpService.createCustomer(customerData);

    // Save to local database
    const localCustomer = await MPCustomer.findOrCreate(
      req.user?.id,
      customerData.email,
      mpCustomer
    );

    res.status(201).json({
      success: true,
      customer: mpCustomer,
      localId: localCustomer.id,
    });
  } catch (error) {
    logger.error('Error creating customer:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Mercado Pago - Customers]
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await req.mpService.getCustomer(id);

    // Update local record
    await MPCustomer.findOneAndUpdate(
      { mpCustomerId: id },
      {
        firstName: customer.first_name,
        lastName: customer.last_name,
        identification: customer.identification,
        phone: customer.phone,
        address: customer.address,
        dateLastUpdated: customer.date_last_updated,
        mpResponse: customer,
      }
    );

    res.json(customer);
  } catch (error) {
    logger.error('Error getting customer:', { error: error.message, customerId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/customers/{id}:
 *   put:
 *     summary: Update customer
 *     tags: [Mercado Pago - Customers]
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const customer = await req.mpService.updateCustomer(id, updateData);

    // Update local record
    await MPCustomer.findOneAndUpdate(
      { mpCustomerId: id },
      {
        firstName: customer.first_name,
        lastName: customer.last_name,
        identification: customer.identification,
        phone: customer.phone,
        address: customer.address,
        dateLastUpdated: new Date(),
        mpResponse: customer,
      }
    );

    res.json({
      success: true,
      customer,
    });
  } catch (error) {
    logger.error('Error updating customer:', { error: error.message, customerId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/customers/{id}:
 *   delete:
 *     summary: Delete customer
 *     tags: [Mercado Pago - Customers]
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await req.mpService.deleteCustomer(id);

    // Mark as deleted locally
    await MPCustomer.findOneAndUpdate(
      { mpCustomerId: id },
      { status: 'deleted' }
    );

    res.json({
      success: true,
      message: 'Customer deleted',
    });
  } catch (error) {
    logger.error('Error deleting customer:', { error: error.message, customerId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/customers/{id}/cards:
 *   get:
 *     summary: Get customer cards
 *     tags: [Mercado Pago - Customers]
 */
router.get('/:id/cards', async (req, res) => {
  try {
    const { id } = req.params;

    const cards = await req.mpService.getCustomerCards(id);

    res.json(cards);
  } catch (error) {
    logger.error('Error getting customer cards:', { error: error.message, customerId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/customers/{id}/cards:
 *   post:
 *     summary: Add card to customer
 *     tags: [Mercado Pago - Customers]
 */
router.post('/:id/cards', async (req, res) => {
  try {
    const { id } = req.params;
    const cardData = req.body;

    const card = await req.mpService.createCard(id, cardData);

    // Update local record
    const customer = await MPCustomer.findOne({ mpCustomerId: id });
    if (customer) {
      customer.addCard(card);
      await customer.save();
    }

    res.status(201).json({
      success: true,
      card,
    });
  } catch (error) {
    logger.error('Error adding card:', { error: error.message, customerId: req.params.id });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/customers/{customerId}/cards/{cardId}:
 *   get:
 *     summary: Get specific card
 *     tags: [Mercado Pago - Customers]
 */
router.get('/:customerId/cards/:cardId', async (req, res) => {
  try {
    const { customerId, cardId } = req.params;

    const card = await req.mpService.getCard(customerId, cardId);

    res.json(card);
  } catch (error) {
    logger.error('Error getting card:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/customers/{customerId}/cards/{cardId}:
 *   put:
 *     summary: Update card
 *     tags: [Mercado Pago - Customers]
 */
router.put('/:customerId/cards/:cardId', async (req, res) => {
  try {
    const { customerId, cardId } = req.params;
    const updateData = req.body;

    const card = await req.mpService.updateCard(customerId, cardId, updateData);

    res.json({
      success: true,
      card,
    });
  } catch (error) {
    logger.error('Error updating card:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/mp/customers/{customerId}/cards/{cardId}:
 *   delete:
 *     summary: Delete card
 *     tags: [Mercado Pago - Customers]
 */
router.delete('/:customerId/cards/:cardId', async (req, res) => {
  try {
    const { customerId, cardId } = req.params;

    await req.mpService.deleteCard(customerId, cardId);

    // Update local record
    const customer = await MPCustomer.findOne({ mpCustomerId: customerId });
    if (customer) {
      customer.removeCard(cardId);
      await customer.save();
    }

    res.json({
      success: true,
      message: 'Card deleted',
    });
  } catch (error) {
    logger.error('Error deleting card:', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    });
  }
});

/**
 * Get local customers
 */
router.get('/local/search', async (req, res) => {
  try {
    const result = await MPCustomer.search(req.user?.id, req.query);
    res.json(result);
  } catch (error) {
    logger.error('Error searching local customers:', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
