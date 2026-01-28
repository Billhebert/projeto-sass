/**
 * Health Check Module
 * Verifica a saúde de todos os componentes da aplicação
 */

const mongoose = require('mongoose')
const redis = require('ioredis')
const logger = require('./logger')

class HealthChecker {
  constructor() {
    this.checks = {
      database: false,
      cache: false,
      memory: false,
      uptime: true,
    }
    this.lastCheck = null
  }

  /**
   * Verifica conexão com MongoDB
   */
  async checkDatabase() {
    try {
      // Usa a conexão existente do mongoose
      if (mongoose.connection.readyState === 1) {
        const result = await mongoose.connection.db.admin().ping()
        this.checks.database = result.ok === 1
        return this.checks.database
      }
      this.checks.database = false
      return false
    } catch (error) {
      logger.logError(error, { component: 'database-health-check' })
      this.checks.database = false
      return false
    }
  }

  /**
   * Verifica conexão com Redis
   */
  async checkCache() {
    try {
      // Tenta usar Redis se estiver configurado
      const redisUrl = process.env.REDIS_URL
      if (!redisUrl) {
        this.checks.cache = true // Assume ok se não estiver configurado
        return true
      }

      const redis = new (require('ioredis'))(redisUrl)
      const result = await redis.ping()
      await redis.quit()

      this.checks.cache = result === 'PONG'
      return this.checks.cache
    } catch (error) {
      logger.debug('Redis not available', { error: error.message })
      this.checks.cache = false
      return false
    }
  }

  /**
   * Verifica uso de memória
   */
  checkMemory() {
    const mem = process.memoryUsage()
    const heapUsed = Math.round(mem.heapUsed / 1024 / 1024)
    const heapTotal = Math.round(mem.heapTotal / 1024 / 1024)
    const heapUsedPercent = (heapUsed / heapTotal) * 100

    // Alerta se usar mais de 80% da heap
    const healthy = heapUsedPercent < 80

    if (!healthy) {
      logger.warn('High memory usage detected', {
        heapUsedMB: heapUsed,
        heapTotalMB: heapTotal,
        usagePercent: heapUsedPercent.toFixed(2),
      })
    }

    this.checks.memory = healthy
    return {
      healthy,
      heapUsedMB: heapUsed,
      heapTotalMB: heapTotal,
      usagePercent: heapUsedPercent.toFixed(2),
    }
  }

  /**
   * Executa todos os health checks
   */
  async runAll() {
    const startTime = Date.now()

    const [database, cache, memory] = await Promise.all([
      this.checkDatabase(),
      this.checkCache(),
      this.checkMemory(),
    ])

    const duration = Date.now() - startTime
    this.lastCheck = {
      timestamp: new Date().toISOString(),
      duration,
      status: database && cache && memory ? 'healthy' : 'degraded',
      checks: {
        database,
        cache,
        memory: memory.healthy,
      },
      details: memory,
    }

    return this.lastCheck
  }

  /**
   * Retorna status do último health check
   */
  getStatus() {
    if (!this.lastCheck) {
      return {
        status: 'unknown',
        message: 'No health check has been run yet',
      }
    }

    return this.lastCheck
  }
}

module.exports = new HealthChecker()
