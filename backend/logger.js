/**
 * Logger Configuration
 * Usando Pino para logging estruturado
 */

const pino = require('pino');
const path = require('path');

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Configuração base do Pino
const pinoConfig = {
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'password',
      'refreshToken',
      'accessToken',
      'clientSecret',
      'ML_CLIENT_SECRET',
      'MONGODB_URI',
      'req.headers.authorization'
    ],
    remove: false
  }
};

// Transport options
const pinoTransport = isDevelopment 
  ? pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false
      }
    })
  : undefined;

// Criar logger
const logger = pinoTransport 
  ? pino(pinoConfig, pinoTransport)
  : pino(pinoConfig);

/**
 * Wrapper para logging com contexto
 */
class Logger {
  constructor(context = 'APP') {
    this.context = context;
    this.logger = logger.child({ context });
  }

  error(message, meta = {}) {
    this.logger.error(meta, message);
  }

  warn(message, meta = {}) {
    this.logger.warn(meta, message);
  }

  info(message, meta = {}) {
    this.logger.info(meta, message);
  }

  debug(message, meta = {}) {
    this.logger.debug(meta, message);
  }

  /**
   * Log de requisição HTTP
   */
  logRequest(req, res, duration) {
    const meta = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userId: req.user?.id,
      accountId: req.body?.accountId
    };

    if (res.statusCode >= 500) {
      this.error(`${req.method} ${req.path} - ${res.statusCode}`, meta);
    } else if (res.statusCode >= 400) {
      this.warn(`${req.method} ${req.path} - ${res.statusCode}`, meta);
    } else {
      this.info(`${req.method} ${req.path} - ${res.statusCode}`, meta);
    }
  }

  /**
   * Log de erro
   */
  logError(error, context = {}) {
    const meta = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      ...context
    };

    this.error(`${error.name}: ${error.message}`, meta);
  }

  /**
   * Log de sincronização
   */
  logSync(accountId, status, details = {}) {
    const meta = {
      accountId,
      status,
      ...details
    };

    if (status === 'error') {
      this.error(`Sync failed for account ${accountId}`, meta);
    } else if (status === 'started') {
      this.info(`Sync started for account ${accountId}`, meta);
    } else if (status === 'completed') {
      this.info(`Sync completed for account ${accountId}`, meta);
    }
  }

  /**
   * Log de webhook
   */
  logWebhook(topic, resourceId, status, details = {}) {
    const meta = {
      topic,
      resourceId,
      status,
      ...details
    };

    if (status === 'error') {
      this.error(`Webhook error: ${topic}/${resourceId}`, meta);
    } else {
      this.info(`Webhook processed: ${topic}/${resourceId}`, meta);
    }
  }
}

// Exportar singleton logger e classe
module.exports = new Logger('APP');
module.exports.Logger = Logger;
