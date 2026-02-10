/**
 * Sistema de logging para o frontend
 * Em produção, apenas errors são registrados
 * Em desenvolvimento, todos os logs são exibidos
 */

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

/**
 * Logger class com níveis de log
 */
class Logger {
  constructor(context = "APP") {
    this.context = context;
  }

  /**
   * Formata a mensagem com contexto e timestamp
   */
  _format(level, ...args) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [${this.context}]`;
    return [prefix, ...args];
  }

  /**
   * Log de debug - apenas em desenvolvimento
   */
  debug(...args) {
    if (isDevelopment) {
      console.log(...this._format("DEBUG", ...args));
    }
  }

  /**
   * Log informativo - apenas em desenvolvimento
   */
  log(...args) {
    if (isDevelopment) {
      console.log(...this._format("INFO", ...args));
    }
  }

  /**
   * Log informativo (alias para log)
   */
  info(...args) {
    if (isDevelopment) {
      console.info(...this._format("INFO", ...args));
    }
  }

  /**
   * Log de warning - sempre exibido
   */
  warn(...args) {
    console.warn(...this._format("WARN", ...args));
  }

  /**
   * Log de erro - sempre exibido
   * Em produção, pode ser enviado para serviço de monitoramento
   */
  error(...args) {
    console.error(...this._format("ERROR", ...args));

    // Em produção, poderia enviar para Sentry, LogRocket, etc.
    if (isProduction) {
      // TODO: Integrar com serviço de monitoramento
      // Exemplo: Sentry.captureException(args[0]);
    }
  }

  /**
   * Log de tabela - apenas em desenvolvimento
   */
  table(data) {
    if (isDevelopment && console.table) {
      console.table(data);
    }
  }

  /**
   * Group logs - apenas em desenvolvimento
   */
  group(label) {
    if (isDevelopment && console.group) {
      console.group(label);
    }
  }

  groupEnd() {
    if (isDevelopment && console.groupEnd) {
      console.groupEnd();
    }
  }

  /**
   * Marca tempo de execução - apenas em desenvolvimento
   */
  time(label) {
    if (isDevelopment && console.time) {
      console.time(label);
    }
  }

  timeEnd(label) {
    if (isDevelopment && console.timeEnd) {
      console.timeEnd(label);
    }
  }
}

// Logger padrão da aplicação
export const logger = new Logger("APP");

// Factory para criar loggers com contexto específico
export const createLogger = (context) => new Logger(context);

// Exports para compatibilidade com console.log direto
export const log = (...args) => logger.log(...args);
export const debug = (...args) => logger.debug(...args);
export const info = (...args) => logger.info(...args);
export const warn = (...args) => logger.warn(...args);
export const error = (...args) => logger.error(...args);

export default logger;
