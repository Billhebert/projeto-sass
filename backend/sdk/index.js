/**
 * SDK Initialization Module
 * Inicializa e exporta o Mercado Libre SDK
 */

const { MercadoLibreSDK } = require('./complete-sdk');
const logger = require('../logger');

// Instância global do SDK
let sdkInstance = null;

/**
 * Inicializa o SDK com as variáveis de ambiente
 */
function initializeSDK() {
  try {
    const sdkConfig = {
      mlAccessToken: process.env.ML_ACCESS_TOKEN,
      mlRefreshToken: process.env.ML_REFRESH_TOKEN,
      mpAccessToken: process.env.MP_ACCESS_TOKEN,
      gsAccessToken: process.env.GS_ACCESS_TOKEN,
      
      // Configurações opcionais
      timeout: parseInt(process.env.SDK_TIMEOUT) || 30000,
      retries: parseInt(process.env.SDK_RETRIES) || 3,
      retryDelay: parseInt(process.env.SDK_RETRY_DELAY) || 1000
    };

    sdkInstance = new MercadoLibreSDK(sdkConfig);
    
    logger.info('Mercado Libre SDK inicializado com sucesso', {
      hasMLToken: !!sdkConfig.mlAccessToken,
      hasMPToken: !!sdkConfig.mpAccessToken,
      hasGSToken: !!sdkConfig.gsAccessToken
    });

    return sdkInstance;
  } catch (error) {
    logger.error('Erro ao inicializar SDK', { error: error.message });
    throw error;
  }
}

/**
 * Obtém a instância do SDK
 */
function getSDK() {
  if (!sdkInstance) {
    sdkInstance = initializeSDK();
  }
  return sdkInstance;
}

/**
 * Define tokens manualmente
 */
function setTokens(tokens) {
  const sdk = getSDK();
  
  if (tokens.mlAccessToken) {
    sdk.setMLAccessToken(tokens.mlAccessToken);
  }
  if (tokens.mlRefreshToken) {
    sdk.setMLRefreshToken(tokens.mlRefreshToken);
  }
  if (tokens.mpAccessToken) {
    sdk.setMPAccessToken(tokens.mpAccessToken);
  }
  if (tokens.gsAccessToken) {
    sdk.setGSAccessToken(tokens.gsAccessToken);
  }

  logger.debug('Tokens atualizados no SDK');
}

module.exports = {
  initializeSDK,
  getSDK,
  setTokens,
  MercadoLibreSDK
};
