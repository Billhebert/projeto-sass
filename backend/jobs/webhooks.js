/**
 * Webhook Processing Job
 * Processa webhooks pendentes da fila
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const schedule = require('node-schedule');
const { connectDB } = require('../db/mongodb');
const Event = require('../db/models/Event');
const Account = require('../db/models/Account');
const logger = require('../logger');
const { MLAPIClient } = require('../api/ml-client');

const logger_job = new logger.Logger('WEBHOOK-JOB');

const MAX_RETRIES = 3;
const PROCESS_BATCH_SIZE = 50;

/**
 * Processar um evento webhook
 */
async function processEvent(event) {
  if (event.retryCount >= MAX_RETRIES) {
    logger_job.logWebhook(event.topic, event.resourceId, 'max_retries_reached', {
      accountId: event.accountId
    });
    event.status = 'failed';
    event.processError = 'Max retries reached';
    return event.save();
  }

  try {
    await event.startProcessing();

    const account = await Account.findOne({ accountId: event.accountId });
    if (!account || account.status !== 'connected') {
      throw new Error('Account not connected');
    }

    // Criar cliente
    const mlClient = new MLAPIClient(account.accessToken);

    // Processar por tipo
    let data = null;
    switch (event.topic) {
      case 'orders_v2':
        data = await mlClient.getOrder(event.resourceId);
        break;
      case 'items':
        data = await mlClient.getItem(event.resourceId);
        break;
      case 'shipments':
        data = await mlClient.getShipment(event.resourceId);
        break;
      case 'questions':
        data = await mlClient.getQuestion(event.resourceId);
        break;
      default:
        logger_job.logWebhook(event.topic, event.resourceId, 'unknown_topic', {
          accountId: event.accountId
        });
        break;
    }

    // Atualizar payload com dados completos
    if (data) {
      event.payload = data;
    }

    await event.markAsProcessed();

    logger_job.logWebhook(event.topic, event.resourceId, 'processed', {
      accountId: event.accountId
    });

  } catch (error) {
    logger_job.logWebhook(event.topic, event.resourceId, 'error', {
      accountId: event.accountId,
      error: error.message,
      retryCount: event.retryCount
    });

    await event.markAsFailed(error.message);
  }
}

/**
 * Processar eventos pendentes em lote
 */
async function processPendingEvents() {
  try {
    const pendingEvents = await Event.findPending().limit(PROCESS_BATCH_SIZE);

    if (pendingEvents.length === 0) {
      return;
    }

    logger_job.info(`Processing ${pendingEvents.length} pending events`);

    // Processar em paralelo com limite
    const CONCURRENT = 5;
    for (let i = 0; i < pendingEvents.length; i += CONCURRENT) {
      const batch = pendingEvents.slice(i, i + CONCURRENT);
      await Promise.all(batch.map(processEvent));
    }

    logger_job.info(`✓ Processed ${pendingEvents.length} events`);

  } catch (error) {
    logger_job.logError(error, { action: 'process_pending_events' });
  }
}

/**
 * Gerar relatório de webhooks
 */
async function generateWebhookReport() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const counts = await Event.countByTopic(thirtyDaysAgo, new Date());
    const failed = await Event.countDocuments({
      status: 'failed',
      createdAt: { $gte: thirtyDaysAgo }
    });

    const report = {
      period: 'Last 30 days',
      timestamp: new Date(),
      eventsByTopic: counts,
      failedEvents: failed,
      totalEvents: counts.reduce((sum, c) => sum + c.count, 0)
    };

    logger_job.info('Webhook Report', report);

  } catch (error) {
    logger_job.logError(error, { action: 'webhook_report' });
  }
}

/**
 * Inicializar schedules
 */
async function initializeSchedules() {
  try {
    // Conectar ao banco
    await connectDB();
    logger_job.info('✓ Connected to MongoDB');

    // Schedule: Processar eventos a cada minuto
    schedule.scheduleJob('* * * * *', async () => {
      await processPendingEvents();
    });
    logger_job.info('✓ Scheduled: Process pending events every minute');

    // Schedule: Relatório diário
    schedule.scheduleJob('0 1 * * *', async () => {
      await generateWebhookReport();
    });
    logger_job.info('✓ Scheduled: Generate webhook report daily at 1 AM');

    logger_job.info('✓ All webhook schedules initialized');

  } catch (error) {
    logger_job.logError(error);
    process.exit(1);
  }
}

// Iniciar job
if (require.main === module) {
  initializeSchedules().catch(error => {
    logger_job.logError(error);
    process.exit(1);
  });
}

module.exports = { processEvent, processPendingEvents, generateWebhookReport };
