/**
 * Sales Dashboard Routes
 * Advanced sales analytics with margin calculations
 */

const express = require('express');
const logger = require('../logger');
const { authenticateToken } = require('../middleware/auth');
const Order = require('../db/models/Order');
const Sku = require('../db/models/Sku');
const MLAccount = require('../db/models/MLAccount');
const { handleError, sendSuccess } = require('../middleware/response-helpers');

const router = express.Router();
router.get('/accounts', authenticateToken, async (req, res) => {
  try {
    const accounts = await MLAccount.find({ userId: req.user.userId });
    
    res.json({
      success: true,
      accounts: accounts.map(a => ({
        id: a.id,
        nickname: a.nickname,
        mlUserId: a.mlUserId
      }))
    });
  } catch (error) {
    logger.error({ action: 'GET_DASHBOARD_ACCOUNTS_ERROR', error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/sales-dashboard/data
 * Get complete dashboard data with all calculations
 */
router.get('/data', authenticateToken, async (req, res) => {
  try {
    const { accountId, dateFrom, dateTo } = req.query;
    
    // Build query
    const query = { userId: req.user.userId };
    
    if (accountId && accountId !== 'all') {
      query.accountId = accountId;
    }
    
    // Date filter
    if (dateFrom || dateTo) {
      query.dateCreated = {};
      if (dateFrom) query.dateCreated.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.dateCreated.$lte = endDate;
      }
    }

    // Fetch orders
    const orders = await Order.find(query).sort({ dateCreated: -1 }).lean();
    
    // Get all accounts for reference
    const accounts = await MLAccount.find({ userId: req.user.userId }).lean();
    const accountMap = {};
    accounts.forEach(a => { accountMap[a.id] = a.nickname || a.mlUserId; });

    // Get all SKUs for the user
    const skus = await Sku.find({ userId: req.user.userId, isActive: true }).lean();
    const skuMap = {};
    skus.forEach(s => { 
      skuMap[s.sku] = { 
        cost: s.cost || 0, 
        taxPercent: s.taxPercent || 0 
      }; 
    });

    // Process each order and calculate metrics
    const salesDetails = [];
    let totalRevenue = 0;
    let totalCancelledRevenue = 0;
    let totalCost = 0;
    let totalTax = 0;
    let totalSaleFee = 0;
    let totalShippingBuyer = 0;
    let totalShippingSeller = 0;
    let totalMargin = 0;
    let totalQuantity = 0;
    let cancelledQuantity = 0;
    let approvedCount = 0;
    let cancelledCount = 0;

    const byModality = {
      'Full': 0,
      'Flex': 0,
      'Places / Coleta': 0,
      'Outros': 0
    };

    const byDate = {};
    const byProduct = {};

    for (const order of orders) {
      const isPaid = order.status === 'paid';
      const isCancelled = order.status === 'cancelled';

      // Get shipping costs from order
      const orderShippingCost = order.shippingCost || 0;
      
      // Get marketplace fee from payments
      let orderMarketplaceFee = 0;
      if (order.payments && order.payments.length > 0) {
        orderMarketplaceFee = order.payments.reduce((sum, p) => sum + (p.marketplaceFee || 0), 0);
      }

      for (const item of (order.orderItems || [])) {
        const sku = item.sellerSku || item.sku || item.itemId || '';
        const skuData = skuMap[sku] || { cost: 0, taxPercent: 0 };
        
        const quantity = item.quantity || 1;
        const unitPrice = item.unitPrice || item.unit_price || 0;
        const mlRevenue = unitPrice * quantity;
        
        // Calculate costs
        const itemCost = skuData.cost * quantity;
        const itemTax = mlRevenue * (skuData.taxPercent / 100);
        
        // Sale fee - use from item if available, otherwise estimate
        const itemSaleFee = item.saleFee || item.sale_fee || (mlRevenue * 0.16);
        
        // Shipping costs - distribute proportionally if multiple items
        const itemCount = (order.orderItems || []).length;
        const shippingBuyer = (order.shipping?.shippingOption?.cost || 0) / itemCount;
        const shippingSeller = orderShippingCost / itemCount;
        
        // Calculate margin
        const margin = mlRevenue - itemCost - itemTax - itemSaleFee - shippingSeller;
        const marginPercent = mlRevenue > 0 ? (margin / mlRevenue) * 100 : 0;

        // Determine modality
        const listingType = item.listingTypeId || item.listing_type_id || '';
        let modality = 'Outros';
        if (listingType.includes('gold_pro') || listingType.includes('full')) {
          modality = 'Full';
        } else if (listingType.includes('gold_special') || listingType.includes('flex')) {
          modality = 'Flex';
        } else if (listingType.includes('gold_premium') || listingType.includes('coleta')) {
          modality = 'Places / Coleta';
        }

        const saleDetail = {
          orderId: order.mlOrderId,
          orderDate: order.dateCreated,
          accountId: order.accountId,
          accountNickname: accountMap[order.accountId] || 'N/A',
          itemId: item.itemId,
          title: item.title || 'Produto sem título',
          sku: sku,
          quantity,
          unitPrice,
          mlRevenue,
          cost: itemCost,
          tax: itemTax,
          saleFee: itemSaleFee,
          shippingCostBuyer: shippingBuyer,
          shippingCostSeller: shippingSeller,
          margin,
          marginPercent,
          status: order.status,
          listingType,
          modality,
          hasSku: skuData.cost > 0 || skuData.taxPercent > 0
        };

        salesDetails.push(saleDetail);

        // Accumulate totals
        if (isPaid) {
          totalRevenue += mlRevenue;
          totalCost += itemCost;
          totalTax += itemTax;
          totalSaleFee += itemSaleFee;
          totalShippingBuyer += shippingBuyer;
          totalShippingSeller += shippingSeller;
          totalMargin += margin;
          totalQuantity += quantity;
          approvedCount++;
          
          byModality[modality] = (byModality[modality] || 0) + mlRevenue;

          // By date
          const dateKey = new Date(order.dateCreated).toISOString().split('T')[0];
          if (!byDate[dateKey]) {
            byDate[dateKey] = { date: dateKey, revenue: 0, margin: 0, qty: 0, cost: 0 };
          }
          byDate[dateKey].revenue += mlRevenue;
          byDate[dateKey].margin += margin;
          byDate[dateKey].qty += quantity;
          byDate[dateKey].cost += itemCost;

          // By product
          const productKey = sku || item.title || item.itemId;
          if (!byProduct[productKey]) {
            byProduct[productKey] = { 
              name: (item.title || productKey || '').substring(0, 40), 
              sku: sku,
              qty: 0, 
              revenue: 0,
              margin: 0
            };
          }
          byProduct[productKey].qty += quantity;
          byProduct[productKey].revenue += mlRevenue;
          byProduct[productKey].margin += margin;

        } else if (isCancelled) {
          totalCancelledRevenue += mlRevenue;
          cancelledQuantity += quantity;
          cancelledCount++;
        }
      }
    }

    // Calculate averages
    const avgTicket = approvedCount > 0 ? totalRevenue / approvedCount : 0;
    const avgMargin = approvedCount > 0 ? totalMargin / approvedCount : 0;
    const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    // Prepare chart data
    const dailyData = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    const topProducts = Object.values(byProduct)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        // Summary metrics
        metrics: {
          totalRevenue,
          cancelledRevenue: totalCancelledRevenue,
          totalCostAndTax: totalCost + totalTax,
          totalCost,
          totalTax,
          totalSaleFee,
          totalShipping: totalShippingBuyer + totalShippingSeller,
          totalShippingBuyer,
          totalShippingSeller,
          totalMargin,
          marginPercent,
          totalQuantity,
          cancelledQuantity,
          avgTicket,
          avgMargin,
          avgMarginPercent: marginPercent,
          approvedCount,
          cancelledCount,
          partialReturns: 0,
          partialReturnsQty: 0
        },
        
        // Modality breakdown
        byModality,
        
        // Chart data
        charts: {
          daily: dailyData,
          topProducts
        },
        
        // Detailed sales list
        sales: salesDetails,
        
        // Total count
        totalSales: salesDetails.length
      }
    });

  } catch (error) {
    logger.error({ 
      action: 'GET_SALES_DASHBOARD_ERROR', 
      userId: req.user.userId,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao carregar dados do dashboard',
      error: error.message 
    });
  }
});

/**
 * GET /api/sales-dashboard/skus
 * Get all SKUs for the user
 */
router.get('/skus', authenticateToken, async (req, res) => {
  try {
    const skus = await Sku.find({ userId: req.user.userId, isActive: true }).lean();
    
    const skuMap = {};
    skus.forEach(s => {
      skuMap[s.sku] = {
        id: s.id,
        sku: s.sku,
        cost: s.cost || 0,
        taxPercent: s.taxPercent || 0,
        gtin: s.gtin,
        fixedStock: s.fixedStock,
        stockSync: s.stockSync
      };
    });

    res.json({
      success: true,
      skus: skuMap
    });
  } catch (error) {
    logger.error({ action: 'GET_DASHBOARD_SKUS_ERROR', error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/sales-dashboard/sku
 * Create or update a SKU
 */
router.post('/sku', authenticateToken, async (req, res) => {
  try {
    const { sku, cost, taxPercent, gtin, fixedStock, stockSync } = req.body;

    if (!sku) {
      return res.status(400).json({ success: false, message: 'SKU é obrigatório' });
    }

    let skuDoc = await Sku.findOne({ userId: req.user.userId, sku });

    if (skuDoc) {
      // Update
      if (cost !== undefined) skuDoc.cost = parseFloat(cost) || 0;
      if (taxPercent !== undefined) skuDoc.taxPercent = parseFloat(taxPercent) || 0;
      if (gtin !== undefined) skuDoc.gtin = gtin;
      if (fixedStock !== undefined) skuDoc.fixedStock = fixedStock;
      if (stockSync !== undefined) skuDoc.stockSync = stockSync;
      await skuDoc.save();
    } else {
      // Create
      skuDoc = await Sku.create({
        userId: req.user.userId,
        sku,
        cost: parseFloat(cost) || 0,
        taxPercent: parseFloat(taxPercent) || 0,
        gtin: gtin || null,
        fixedStock: fixedStock || { enabled: false, quantity: 1 },
        stockSync: stockSync || { disabled: false }
      });
    }

    res.json({
      success: true,
      message: 'SKU salvo com sucesso',
      sku: skuDoc.getSummary()
    });
  } catch (error) {
    logger.error({ action: 'SAVE_SKU_ERROR', error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
