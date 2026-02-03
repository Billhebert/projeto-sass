/**
 * Mercado Pago Routes Index
 * Exports all MP route modules
 */

const ordersRoutes = require('./orders');
const paymentsRoutes = require('./payments');
const preferencesRoutes = require('./preferences');
const webhooksRoutes = require('./webhooks');
const customersRoutes = require('./customers');
const subscriptionsRoutes = require('./subscriptions');
const accountRoutes = require('./account');

module.exports = {
  ordersRoutes,
  paymentsRoutes,
  preferencesRoutes,
  webhooksRoutes,
  customersRoutes,
  subscriptionsRoutes,
  accountRoutes,
};
