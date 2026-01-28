/**
 * Swagger/OpenAPI Configuration
 * API Documentation
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Projeto SASS API',
      version: '1.0.0',
      description: 'Production-ready Dashboard SASS with Mercado Livre Integration - Full Stack API Documentation',
      contact: {
        name: 'API Support',
        email: 'support@projeto-sass.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server',
      },
      {
        url: 'https://api.yourdomain.com/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme.',
        },
      },
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            id: {
              type: 'string',
              description: 'User unique identifier',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            firstName: {
              type: 'string',
              description: 'User first name',
            },
            lastName: {
              type: 'string',
              description: 'User last name',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation date',
            },
          },
        },
        MLAccount: {
          type: 'object',
          required: ['accountName', 'mercadoLivreUser'],
          properties: {
            id: {
              type: 'string',
              description: 'Account unique identifier',
            },
            accountName: {
              type: 'string',
              description: 'Account name',
            },
            mercadoLivreUser: {
              type: 'string',
              description: 'Mercado Livre username',
            },
            userId: {
              type: 'string',
              description: 'Owner user ID',
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'suspended'],
              description: 'Account status',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'Error code',
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './backend/routes/authRoutes.js',
    './backend/routes/accountRoutes.js',
    './backend/routes/syncRoutes.js',
    './backend/routes/webhookRoutes.js',
    './backend/routes/mlAccountRoutes.js',
    './backend/server.js',
  ],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
