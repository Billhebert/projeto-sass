/**
 * Mercado Pago Routes - DISABLED
 * Feature not implemented
 */

const express = require('express');
const router = express.Router();

// Stub middleware - MP integration disabled
const notImplemented = (req, res) => {
  return res.status(501).json({
    success: false,
    error: 'Mercado Pago integration not available',
    code: 'MP_NOT_IMPLEMENTED',
    message: 'This feature is currently disabled. Please use Mercado Livre integration instead.',
  });
};

// All routes return "not implemented"
router.all('*', notImplemented);

module.exports = router;
