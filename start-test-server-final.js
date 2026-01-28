const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');

async function main() {
  try {
    console.log('🚀 Iniciando MongoDB Memory Server...');
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    console.log('✓ MongoDB iniciado');
    console.log(`Connection: ${uri}`);
    
    process.env.MONGODB_URI = uri;
    process.env.NODE_ENV = 'development';
    process.env.PORT = '3000';
    process.env.ML_CLIENT_ID = '1706187223829083';
    process.env.ML_CLIENT_SECRET = 'vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG';
    process.env.ML_REDIRECT_URI = 'http://localhost:3000/auth/ml-callback';
    process.env.JWT_SECRET = 'test-secret-key-very-long-for-jwt-testing-purposes-12345';
    
    console.log('✓ Variáveis de ambiente configuradas');
    console.log('\n🔧 Iniciando servidor Express...\n');
    
    require('./backend/server.js');
    
    process.on('SIGINT', async () => {
      console.log('\n📍 Encerrando...');
      await mongoServer.stop();
      process.exit(0);
    });
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
}

main();
