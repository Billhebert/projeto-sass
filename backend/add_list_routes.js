/**
 * Script to add GET / list routes to all API endpoints
 * This helps test the frontend without needing actual Mercado Libre credentials
 */

const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'routes');

// Mock data generators
const mockDataGenerators = {
  'orders-sales.js': () => [
    { id: 'ORD1', status: 'pending', total: 299.99, created_at: new Date(Date.now() - 7*24*60*60*1000), buyer_id: 'USER1' },
    { id: 'ORD2', status: 'paid', total: 149.99, created_at: new Date(Date.now() - 5*24*60*60*1000), buyer_id: 'USER2' },
    { id: 'ORD3', status: 'cancelled', total: 89.99, created_at: new Date(Date.now() - 3*24*60*60*1000), buyer_id: 'USER3' },
    { id: 'ORD4', status: 'completed', total: 199.99, created_at: new Date(Date.now() - 2*24*60*60*1000), buyer_id: 'USER1' },
    { id: 'ORD5', status: 'paid', total: 499.99, created_at: new Date(Date.now() - 1*24*60*60*1000), buyer_id: 'USER4' }
  ],
  'shipping.js': () => [
    { id: 'SHIP1', status: 'pending', item_id: 'MLB1', created_at: new Date(Date.now() - 7*24*60*60*1000) },
    { id: 'SHIP2', status: 'shipped', item_id: 'MLB2', created_at: new Date(Date.now() - 5*24*60*60*1000), tracking_number: 'BR123456789' },
    { id: 'SHIP3', status: 'in_transit', item_id: 'MLB3', created_at: new Date(Date.now() - 3*24*60*60*1000), tracking_number: 'BR223456789' },
    { id: 'SHIP4', status: 'delivered', item_id: 'MLB4', created_at: new Date(Date.now() - 2*24*60*60*1000), tracking_number: 'BR323456789' }
  ],
  'questions-answers.js': () => [
    { id: 'Q1', item_id: 'MLB1', text: 'Qual é o tamanho?', status: 'open', created_at: new Date(Date.now() - 7*24*60*60*1000) },
    { id: 'Q2', item_id: 'MLB2', text: 'Qual é a voltagem?', status: 'answered', created_at: new Date(Date.now() - 5*24*60*60*1000) },
    { id: 'Q3', item_id: 'MLB1', text: 'Entrega rápida?', status: 'answered', created_at: new Date(Date.now() - 3*24*60*60*1000) }
  ],
  'feedback-reviews.js': () => [
    { id: 'FB1', rating: 5, text: 'Excelente produto!', item_id: 'MLB1', created_at: new Date(Date.now() - 7*24*60*60*1000) },
    { id: 'FB2', rating: 4, text: 'Bom, mas demorou', item_id: 'MLB2', created_at: new Date(Date.now() - 5*24*60*60*1000) },
    { id: 'FB3', rating: 5, text: 'Perfeito!', item_id: 'MLB3', created_at: new Date(Date.now() - 3*24*60*60*1000) },
    { id: 'FB4', rating: 2, text: 'Não é como descrito', item_id: 'MLB4', created_at: new Date(Date.now() - 2*24*60*60*1000) },
    { id: 'FB5', rating: 5, text: 'Voltaria a comprar', item_id: 'MLB5', created_at: new Date(Date.now() - 1*24*60*60*1000) }
  ],
  'categories-attributes.js': () => [
    { id: 'CAT1', name: 'Eletrônicos', listing_types: ['basic', 'premium'], attributes: [] },
    { id: 'CAT2', name: 'Livros', listing_types: ['basic'], attributes: [] },
    { id: 'CAT3', name: 'Roupas', listing_types: ['basic', 'premium', 'plus'], attributes: [] }
  ]
};

const getListRoute = (filename) => {
  const generator = mockDataGenerators[filename];
  if (!generator) return null;

  return `
/**
 * GET /
 * List all records with pagination
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const offsetNum = Math.max(parseInt(offset) || 0, 0);

    const mockData = ${generator.toString().replace('() => ', '')};
    const total = mockData.length;
    const data = mockData.slice(offsetNum, offsetNum + limitNum);

    logger.info(\`List route: Retrieved \${data.length} records (total: \${total})\`);

    res.json({
      success: true,
      data: data,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: total,
        has_more: offsetNum + limitNum < total
      }
    });
  } catch (error) {
    logger.error(\`List route error: \${error.message}\`);
    res.status(500).json({
      success: false,
      error: 'Failed to list records',
      details: [error.message]
    });
  }
});`;
};

// Files to process
const filesToProcess = [
  'orders-sales.js',
  'shipping.js',
  'questions-answers.js',
  'feedback-reviews.js',
  'categories-attributes.js'
];

console.log('✅ Script ready to add GET / routes');
console.log('This script needs manual application due to file structure differences');
