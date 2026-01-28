const { MongoMemoryServer } = require('mongodb-memory-server');

async function main() {
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  // Set environment and start server
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = 'development';
  process.env.PORT = '3000';
  process.env.ML_CLIENT_ID = '1706187223829083';
  process.env.ML_CLIENT_SECRET = 'vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG';
  process.env.ML_REDIRECT_URI = 'http://localhost:3000/auth/ml-callback';
  process.env.JWT_SECRET = 'test-secret-key-very-long-for-jwt-testing-purposes-12345';
  
  console.log('✓ MongoDB iniciado:', uri);
  console.log('✓ Iniciando Express...\n');
  
  require('./backend/server.js');
}

main().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
