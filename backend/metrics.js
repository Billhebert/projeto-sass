/**
 * Metrics Collection Module
 * Coleta de métricas de performance e saúde da aplicação
 */

class Metrics {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        avgResponseTime: 0,
      },
      database: {
        connections: 0,
        queries: 0,
        avgQueryTime: 0,
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
      },
      webhooks: {
        received: 0,
        processed: 0,
        failed: 0,
      },
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0,
      },
      uptime: 0,
    }
    this.startTime = Date.now()
    this.requestTimes = []
    this.queryTimes = []
  }

  recordRequest(duration, statusCode) {
    this.metrics.requests.total++
    this.requestTimes.push(duration)
    
    if (statusCode < 400) {
      this.metrics.requests.success++
    } else {
      this.metrics.requests.errors++
    }

    // Keep only last 1000 requests for average
    if (this.requestTimes.length > 1000) {
      this.requestTimes.shift()
    }

    this.metrics.requests.avgResponseTime =
      this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length
  }

  recordQuery(duration) {
    this.metrics.database.queries++
    this.queryTimes.push(duration)

    if (this.queryTimes.length > 1000) {
      this.queryTimes.shift()
    }

    this.metrics.database.avgQueryTime =
      this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length
  }

  recordCacheHit() {
    this.metrics.cache.hits++
    this.updateCacheHitRate()
  }

  recordCacheMiss() {
    this.metrics.cache.misses++
    this.updateCacheHitRate()
  }

  updateCacheHitRate() {
    const total = this.metrics.cache.hits + this.metrics.cache.misses
    if (total > 0) {
      this.metrics.cache.hitRate = (this.metrics.cache.hits / total * 100).toFixed(2)
    }
  }

  recordWebhook(status) {
    this.metrics.webhooks.received++
    if (status === 'processed') {
      this.metrics.webhooks.processed++
    } else if (status === 'failed') {
      this.metrics.webhooks.failed++
    }
  }

  updateMemory() {
    const mem = process.memoryUsage()
    this.metrics.memory = {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      external: Math.round(mem.external / 1024 / 1024),
      rss: Math.round(mem.rss / 1024 / 1024),
    }
  }

  updateUptime() {
    this.metrics.uptime = Math.floor((Date.now() - this.startTime) / 1000)
  }

  getMetrics() {
    this.updateMemory()
    this.updateUptime()
    return this.metrics
  }

  reset() {
    this.metrics = {
      requests: { total: 0, success: 0, errors: 0, avgResponseTime: 0 },
      database: { connections: 0, queries: 0, avgQueryTime: 0 },
      cache: { hits: 0, misses: 0, hitRate: 0 },
      webhooks: { received: 0, processed: 0, failed: 0 },
      memory: { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 },
      uptime: 0,
    }
    this.requestTimes = []
    this.queryTimes = []
  }
}

module.exports = new Metrics()
