# API Integration Guide - Sales & Financial Dashboard

## Overview

This document provides comprehensive documentation for integrating the Sales & Financial Dashboard with a backend API. The frontend is built with vanilla JavaScript and supports both local storage (demo mode) and API integration (production mode).

## Architecture

### Current Setup
- **Frontend**: Vanilla JavaScript (ES6+) with localStorage persistence
- **Mode Detection**: Automatic API availability detection
- **Fallback**: Demo mode with local data when API is unavailable

### Mode Detection
```javascript
// Auto-detect API availability on app init
try {
  await apiService.getSummary();
  this.useAPI = true;  // API available - use live data
  console.log('✓ API available - using live data');
} catch (e) {
  this.useAPI = false; // API unavailable - use demo data
  console.warn('✗ API unavailable - using demo data');
}
```

## API Configuration

### Base Configuration (dashboard.js)
```javascript
const API_CONFIG = {
  baseURL: process.env.API_URL || 'http://localhost:3000/api',
  timeout: 10000,  // 10 seconds
  headers: {
    'Content-Type': 'application/json'
  }
};
```

### Environment Variables
```bash
# Set in .env or system environment
API_URL=http://your-api-domain.com/api
```

## Authentication Service

### Endpoints

#### 1. Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response 200:
{
  "token": "eyJhbGc...",
  "user": {
    "id": "123",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "manager"
  }
}
```

#### 2. Register
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "password123"
}

Response 200:
{
  "success": true
}
```

#### 3. Refresh Token
```http
POST /auth/refresh
Authorization: Bearer {token}

Response 200:
{
  "token": "eyJhbGc..."
}
```

### Token Management
- **Token Storage**: `localStorage.authToken`
- **User Storage**: `localStorage.authUser`
- **Expiry Storage**: `localStorage.authExpiry`
- **Expiry Duration**: 24 hours (client-side tracking)

### Usage in Frontend
```javascript
// Get token
const token = authService.getToken();

// Get current user
const user = authService.getUser();

// Check token validity
if (authService.isTokenValid()) {
  // Token is valid, can make API calls
}

// Save user data
authService.saveUser(userData);

// Require authentication (redirects to login if invalid)
authService.requireAuth();
```

## Data Models

### Products
```javascript
{
  id: "uuid",
  sku: "PROD-001",
  dataCadastro: "2024-01-22",
  status: "ativo" | "inativo"
}
```

### Categories
```javascript
{
  id: "uuid",
  name: "Eletrônicos",
  description: "Produtos eletrônicos diversos",
  status: "ativo" | "inativo",
  productCount: 15
}
```

### Sales
```javascript
{
  id: "uuid",
  sku: "PROD-001",
  quantity: 5,
  unitPrice: 99.90,
  discount: 10,  // percentage
  total: 449.55,
  marketplace: "mercado-livre" | "amazon" | "shopee" | "b2b-brasil" | "loja-propria",
  paymentMethod: "cartao-credito" | "cartao-debito" | "pix" | "boleto" | "dinheiro" | "cheque",
  status: "pendente" | "confirmada" | "enviada" | "entregue" | "cancelada",
  createdAt: "2024-01-22T10:30:00Z",
  notes: "Optional notes"
}
```

### Stock Movements
```javascript
{
  id: "uuid",
  sku: "PROD-001",
  type: "entrada" | "saída",
  quantity: 10,
  previousStock: 50,
  newStock: 60,
  timestamp: "2024-01-22T10:30:00Z",
  notes: "Restock from supplier"
}
```

### Users
```javascript
{
  id: "uuid",
  name: "John Doe",
  email: "user@example.com",
  role: "admin" | "manager" | "seller" | "viewer",
  avatar: "JD",
  createdAt: "2024-01-01"
}
```

## Dashboard API Endpoints

### 1. Get Summary
```http
GET /dashboard/summary
Authorization: Bearer {token}

Response 200:
{
  "totalProducts": 150,
  "totalCategories": 8,
  "totalSales": 245,
  "totalRevenue": 15234.50,
  "avgOrderValue": 62.18,
  "topProduct": "PROD-001",
  "lowStockItems": 5
}
```

### 2. Get Table Data
```http
GET /dashboard/rows?page=1&pageSize=30&sortField=sku&sortDir=asc&filter1=value
Authorization: Bearer {token}

Query Parameters:
- page: number (default: 1)
- pageSize: number (default: 30)
- sortField: string (sku, date, etc)
- sortDir: "asc" | "desc"
- filters: custom filters

Response 200:
{
  "data": [
    { "id": "...", "sku": "...", ... },
    ...
  ],
  "total": 150,
  "page": 1,
  "pageSize": 30
}
```

### 3. Get Chart Data
```http
GET /dashboard/chart
Authorization: Bearer {token}

Response 200:
{
  "salesByMarketplace": {
    "mercado-livre": 5000,
    "amazon": 3000,
    ...
  },
  "salesByPayment": {
    "pix": 4000,
    "cartao-credito": 3000,
    ...
  },
  "dailyRevenue": {
    "2024-01-22": 250.50,
    "2024-01-21": 180.00,
    ...
  }
}
```

## Products API Endpoints

### 1. Get All Products
```http
GET /products
Authorization: Bearer {token}

Response 200:
{
  "data": [
    { "id": "...", "sku": "...", ... },
    ...
  ],
  "total": 150
}
```

### 2. Create Product
```http
POST /products
Authorization: Bearer {token}
Content-Type: application/json

{
  "sku": "PROD-001",
  "status": "ativo"
}

Response 201:
{
  "id": "uuid",
  "sku": "PROD-001",
  "status": "ativo",
  "dataCadastro": "2024-01-22"
}
```

### 3. Update Product
```http
PUT /products/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "inativo"
}

Response 200:
{
  "id": "uuid",
  "sku": "PROD-001",
  "status": "inativo"
}
```

### 4. Delete Product
```http
DELETE /products/{id}
Authorization: Bearer {token}

Response 204: No Content
```

## Sales API Endpoints

### 1. Get All Sales
```http
GET /sales?startDate=2024-01-01&endDate=2024-01-31&marketplace=mercado-livre
Authorization: Bearer {token}

Response 200:
{
  "data": [
    { "id": "...", "sku": "...", ... },
    ...
  ],
  "total": 50
}
```

### 2. Create Sale
```http
POST /sales
Authorization: Bearer {token}
Content-Type: application/json

{
  "sku": "PROD-001",
  "quantity": 5,
  "unitPrice": 99.90,
  "discount": 10,
  "marketplace": "mercado-livre",
  "paymentMethod": "pix",
  "status": "confirmada",
  "notes": "Optional notes"
}

Response 201:
{
  "id": "uuid",
  "sku": "PROD-001",
  "quantity": 5,
  "unitPrice": 99.90,
  "discount": 10,
  "total": 449.55,
  "marketplace": "mercado-livre",
  "paymentMethod": "pix",
  "status": "confirmada",
  "createdAt": "2024-01-22T10:30:00Z"
}
```

### 3. Update Sale
```http
PUT /sales/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "enviada"
}

Response 200: Updated sale object
```

### 4. Delete Sale
```http
DELETE /sales/{id}
Authorization: Bearer {token}

Response 204: No Content
```

## Stock API Endpoints

### 1. Get Stock by SKU
```http
GET /stock/{sku}
Authorization: Bearer {token}

Response 200:
{
  "sku": "PROD-001",
  "quantity": 150,
  "lastUpdated": "2024-01-22T10:30:00Z"
}
```

### 2. Update Stock
```http
POST /stock/{sku}
Authorization: Bearer {token}
Content-Type: application/json

{
  "quantity": 150,
  "type": "entrada" | "saída",
  "notes": "Restock from supplier"
}

Response 200:
{
  "sku": "PROD-001",
  "quantity": 160,
  "previousQuantity": 150
}
```

### 3. Get Stock Movements
```http
GET /stock/{sku}/movements?limit=50
Authorization: Bearer {token}

Response 200:
{
  "data": [
    {
      "id": "...",
      "type": "entrada",
      "quantity": 10,
      "previousStock": 150,
      "newStock": 160,
      "timestamp": "2024-01-22T10:30:00Z",
      "notes": "Restock"
    },
    ...
  ],
  "total": 50
}
```

## Categories API Endpoints

### 1. Get All Categories
```http
GET /categories
Authorization: Bearer {token}

Response 200:
{
  "data": [
    { "id": "...", "name": "...", "productCount": 15 },
    ...
  ],
  "total": 8
}
```

### 2. Create Category
```http
POST /categories
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Eletrônicos",
  "description": "Produtos eletrônicos diversos",
  "status": "ativo"
}

Response 201: Category object
```

### 3. Update Category
```http
PUT /categories/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Eletrônicos Premium",
  "status": "ativo"
}

Response 200: Updated category object
```

### 4. Delete Category
```http
DELETE /categories/{id}
Authorization: Bearer {token}

Response 204: No Content
```

## Reports API Endpoints

### 1. Generate Sales Report
```http
GET /reports/sales?startDate=2024-01-01&endDate=2024-01-31&marketplace=mercado-livre
Authorization: Bearer {token}

Response 200:
{
  "summary": {
    "totalSales": 45,
    "totalQuantity": 156,
    "totalRevenue": 12500.00,
    "avgTicket": 277.78
  },
  "byMarketplace": {
    "mercado-livre": { "count": 30, "revenue": 9000 },
    "amazon": { "count": 15, "revenue": 3500 }
  },
  "byPayment": {
    "pix": { "count": 20, "revenue": 5000 },
    "cartao-credito": { "count": 25, "revenue": 7500 }
  }
}
```

### 2. Generate Inventory Report
```http
GET /reports/inventory
Authorization: Bearer {token}

Response 200:
{
  "summary": {
    "totalProducts": 150,
    "totalStock": 5000,
    "lowStockItems": 5,
    "outOfStock": 2
  },
  "items": [
    { "sku": "PROD-001", "quantity": 100, "status": "in-stock" },
    ...
  ]
}
```

### 3. Generate Financial Report
```http
GET /reports/financial?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {token}

Response 200:
{
  "summary": {
    "totalRevenue": 12500.00,
    "totalDiscount": 250.00,
    "avgMargin": 35.5,
    "avgTicket": 277.78
  },
  "dailyRevenue": {
    "2024-01-22": 500.00,
    "2024-01-21": 450.00,
    ...
  }
}
```

## Import API Endpoints

### 1. Bulk Import Products
```http
POST /import/products
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
- file: CSV file (SKU, Estoque, Status)

Response 200:
{
  "imported": 45,
  "skipped": 2,
  "errors": [
    { "row": 3, "error": "Invalid SKU format" }
  ]
}
```

### 2. Bulk Import Sales
```http
POST /import/sales
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
- file: CSV file (SKU, Quantidade, PrecoUnitario, Desconto, Marketplace, Pagamento, Status)

Response 200:
{
  "imported": 128,
  "skipped": 5,
  "errors": [...]
}
```

## Error Handling

### Standard Error Response
```javascript
{
  "error": true,
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": { /* additional info */ }
}
```

### HTTP Status Codes
- **200**: Success
- **201**: Created
- **204**: No Content
- **400**: Bad Request (validation error)
- **401**: Unauthorized (invalid/missing token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **409**: Conflict (duplicate)
- **500**: Server Error

### Example Error Response
```javascript
{
  "error": true,
  "message": "Invalid email format",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "email",
    "value": "invalid-email"
  }
}
```

## Rate Limiting

### Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1234567890
```

### Limits
- **Per minute**: 60 requests
- **Per hour**: 1000 requests
- **Per day**: 10000 requests

## CORS Configuration

### Required CORS Headers
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

## Webhooks (Optional)

### Webhook Events
- `sale.created`
- `sale.updated`
- `product.created`
- `product.updated`
- `stock.updated`

### Webhook Payload
```javascript
{
  "event": "sale.created",
  "timestamp": "2024-01-22T10:30:00Z",
  "data": {
    "id": "uuid",
    "sku": "PROD-001",
    "quantity": 5,
    ...
  }
}
```

## Testing the API Integration

### Using cURL
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get Products (with token)
curl -X GET http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create Sale
curl -X POST http://localhost:3000/api/sales \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sku": "PROD-001",
    "quantity": 5,
    "unitPrice": 99.90,
    "marketplace": "mercado-livre",
    "paymentMethod": "pix",
    "status": "confirmada"
  }'
```

### Using Postman
1. Import collection from `/postman/dashboard-api.json`
2. Set `{{baseUrl}}` to your API endpoint
3. Set `{{token}}` after login request
4. Run requests with authorization

## Migration Guide: From LocalStorage to API

### Step 1: Enable API Mode
```javascript
// Change in app.init()
const response = await apiService.getSummary();
this.useAPI = true; // Now using API
```

### Step 2: Update Module Functions
```javascript
// Before (localStorage):
function getAll() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

// After (API):
async function getAll() {
  const response = await apiService.fetchWithTimeout(`/products`);
  return response.data;
}
```

### Step 3: Handle Async Operations
```javascript
// Update event handlers to await API calls
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const result = await add(...);
  if (result.success) {
    await renderSales();
  }
});
```

## Security Considerations

1. **Token Storage**: Store tokens in httpOnly cookies if possible (current: localStorage)
2. **HTTPS**: Always use HTTPS in production
3. **CORS**: Restrict CORS to your domain
4. **Input Validation**: Validate on both client and server
5. **Rate Limiting**: Implement on server
6. **CSRF Protection**: Implement CSRF tokens for state-changing operations
7. **SQL Injection**: Use parameterized queries on backend
8. **Authentication**: Validate token expiry and refresh

## Monitoring & Logging

### Client-Side Logging
```javascript
// Enable debug logging
API_CONFIG.debug = true;

// All requests are logged to console
console.log('API Request', method, endpoint);
console.log('API Response', status, data);
```

### Server-Side Logging
Recommended to log:
- All API requests with timestamps
- User actions and IP addresses
- Errors and exceptions
- Performance metrics (response time)
- Failed authentication attempts

## Performance Optimization

1. **Pagination**: Use for large datasets
2. **Caching**: Cache frequently accessed data
3. **Compression**: Enable gzip compression
4. **CDN**: Serve static assets via CDN
5. **Database**: Create indexes on frequently queried fields
6. **API Endpoints**: Return only necessary fields

## Support & Troubleshooting

### Common Issues

**401 Unauthorized**
- Check token validity
- Refresh token if expired
- Verify credentials

**403 Forbidden**
- Check user role and permissions
- Contact admin if role is insufficient

**Network Timeout**
- Check API server status
- Increase timeout if needed
- Check network connectivity

**CORS Error**
- Verify CORS headers on backend
- Check origin in CORS configuration

---

**Last Updated**: January 22, 2024
**Version**: 1.0
**Maintained by**: Development Team
