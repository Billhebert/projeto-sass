/**
 * Mock Data Generator for Frontend Testing
 * Provides realistic test data for all API endpoints
 */

const mockDataByEndpoint = {
  '/api/items-publications': {
    data: [
      {
        id: 'MLB1',
        title: 'Produto Premium 1',
        category_id: 'MLB1000',
        price: 299.99,
        stock: 15,
        condition: 'new',
        currency_id: 'BRL',
        description: 'Descrição do produto 1',
        status: 'active',
        created_at: new Date(Date.now() - 7*24*60*60*1000)
      },
      {
        id: 'MLB2',
        title: 'Eletrônico Popular',
        category_id: 'MLB2000',
        price: 149.99,
        stock: 8,
        condition: 'new',
        currency_id: 'BRL',
        description: 'Descrição do produto 2',
        status: 'active',
        created_at: new Date(Date.now() - 5*24*60*60*1000)
      },
      {
        id: 'MLB3',
        title: 'Acessório Importado',
        category_id: 'MLB3000',
        price: 89.99,
        stock: 25,
        condition: 'new',
        currency_id: 'BRL',
        description: 'Descrição do produto 3',
        status: 'active',
        created_at: new Date(Date.now() - 3*24*60*60*1000)
      },
      {
        id: 'MLB4',
        title: 'Produto Reembalado',
        category_id: 'MLB1000',
        price: 199.99,
        stock: 3,
        condition: 'used',
        currency_id: 'BRL',
        description: 'Descrição do produto 4',
        status: 'active',
        created_at: new Date(Date.now() - 2*24*60*60*1000)
      },
      {
        id: 'MLB5',
        title: 'Produto em Destaque',
        category_id: 'MLB2000',
        price: 499.99,
        stock: 1,
        condition: 'new',
        currency_id: 'BRL',
        description: 'Descrição do produto 5',
        status: 'active',
        created_at: new Date(Date.now() - 1*24*60*60*1000)
      }
    ]
  },
  '/api/orders-sales': {
    data: [
      { id: 'ORD1', status: 'pending', total: 299.99, created_at: new Date(Date.now() - 7*24*60*60*1000), buyer_id: 'USER1', quantity: 1 },
      { id: 'ORD2', status: 'paid', total: 149.99, created_at: new Date(Date.now() - 5*24*60*60*1000), buyer_id: 'USER2', quantity: 2 },
      { id: 'ORD3', status: 'cancelled', total: 89.99, created_at: new Date(Date.now() - 3*24*60*60*1000), buyer_id: 'USER3', quantity: 1 },
      { id: 'ORD4', status: 'completed', total: 199.99, created_at: new Date(Date.now() - 2*24*60*60*1000), buyer_id: 'USER1', quantity: 3 },
      { id: 'ORD5', status: 'paid', total: 499.99, created_at: new Date(Date.now() - 1*24*60*60*1000), buyer_id: 'USER4', quantity: 1 }
    ]
  },
  '/api/shipping-ml': {
    data: [
      { id: 'SHIP1', status: 'pending', item_id: 'MLB1', created_at: new Date(Date.now() - 7*24*60*60*1000), receiver_address: { city: 'São Paulo' } },
      { id: 'SHIP2', status: 'shipped', item_id: 'MLB2', created_at: new Date(Date.now() - 5*24*60*60*1000), tracking_number: 'BR123456789', receiver_address: { city: 'Rio de Janeiro' } },
      { id: 'SHIP3', status: 'in_transit', item_id: 'MLB3', created_at: new Date(Date.now() - 3*24*60*60*1000), tracking_number: 'BR223456789', receiver_address: { city: 'Brasília' } },
      { id: 'SHIP4', status: 'delivered', item_id: 'MLB4', created_at: new Date(Date.now() - 2*24*60*60*1000), tracking_number: 'BR323456789', receiver_address: { city: 'Salvador' } }
    ]
  },
  '/api/questions-answers': {
    data: [
      { id: 'Q1', item_id: 'MLB1', text: 'Qual é o tamanho?', status: 'open', created_at: new Date(Date.now() - 7*24*60*60*1000), answer_text: '' },
      { id: 'Q2', item_id: 'MLB2', text: 'Qual é a voltagem?', status: 'answered', created_at: new Date(Date.now() - 5*24*60*60*1000), answer_text: '110V' },
      { id: 'Q3', item_id: 'MLB1', text: 'Entrega rápida?', status: 'answered', created_at: new Date(Date.now() - 3*24*60*60*1000), answer_text: 'Sim, 2-3 dias úteis' }
    ]
  },
  '/api/feedback-reviews': {
    data: [
      { id: 'FB1', rating: 5, text: 'Excelente produto!', item_id: 'MLB1', created_at: new Date(Date.now() - 7*24*60*60*1000), from_user_id: 'USER1' },
      { id: 'FB2', rating: 4, text: 'Bom, mas demorou', item_id: 'MLB2', created_at: new Date(Date.now() - 5*24*60*60*1000), from_user_id: 'USER2' },
      { id: 'FB3', rating: 5, text: 'Perfeito!', item_id: 'MLB3', created_at: new Date(Date.now() - 3*24*60*60*1000), from_user_id: 'USER3' },
      { id: 'FB4', rating: 2, text: 'Não é como descrito', item_id: 'MLB4', created_at: new Date(Date.now() - 2*24*60*60*1000), from_user_id: 'USER4' },
      { id: 'FB5', rating: 5, text: 'Voltaria a comprar', item_id: 'MLB5', created_at: new Date(Date.now() - 1*24*60*60*1000), from_user_id: 'USER5' }
    ]
  },
  '/api/categories-attributes': {
    data: [
      { id: 'CAT1', name: 'Eletrônicos', listing_types: ['basic', 'premium'], attributes_count: 15 },
      { id: 'CAT2', name: 'Livros', listing_types: ['basic'], attributes_count: 8 },
      { id: 'CAT3', name: 'Roupas e Acessórios', listing_types: ['basic', 'premium', 'plus'], attributes_count: 25 }
    ]
  }
};

/**
 * Mock data middleware
 * Intercepts GET requests to / with mock pagination
 */
const mockListMiddleware = (req, res, next) => {
  if (req.method === 'GET' && req.path === '/') {
    const mockData = mockDataByEndpoint[req.baseUrl];
    
    if (mockData) {
      const { limit = 20, offset = 0 } = req.query;
      const limitNum = Math.min(parseInt(limit) || 20, 100);
      const offsetNum = Math.max(parseInt(offset) || 0, 0);
      
      const total = mockData.data.length;
      const data = mockData.data.slice(offsetNum, offsetNum + limitNum);
      
      return res.json({
        success: true,
        data: data,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: total,
          has_more: offsetNum + limitNum < total
        }
      });
    }
  }
  
  next();
};

module.exports = {
  mockDataByEndpoint,
  mockListMiddleware
};
