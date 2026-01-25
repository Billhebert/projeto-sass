/**
 * Background Sync Job
 * Executa sincronizações periódicas de contas
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const schedule = require('node-schedule');
const { connectDB } = require('../db/mongodb');
const Account = require('../db/models/Account');
const logger = require('../logger');
const { MLAPIClient } = require('../api/ml-client');

const logger_job = new logger.Logger('SYNC-JOB');

/**
 * Sincronizar dados de uma conta
 */
async function syncAccount(account) {
  try {
    logger_job.logSync(account.accountId, 'started');

    // Marcar como sincronizando
    account.status = 'syncing';
    await account.save();

    // Criar cliente API
    const mlClient = new MLAPIClient(account.accessToken);

    // Fetch dados em paralelo
    const [items, orders, metrics] = await Promise.all([
      mlClient.getItems(account.userId, 100),
      mlClient.getOrdersLastDays(30),
      mlClient.getUserReputation(account.userId)
    ]);

    // Salvar dados de sincronização
    account.lastSyncData = {
      itemsCount: items?.results?.length || 0,
      ordersCount: orders?.results?.length || 0,
      metrics: metrics || {},
      syncedAt: new Date()
    };
    account.lastSyncStatus = 'success';
    account.lastSyncTime = new Date();
    account.status = 'connected';
    account.lastActiveAt = new Date();
    await account.save();

    logger_job.logSync(account.accountId, 'completed', {
      itemsCount: account.lastSyncData.itemsCount,
      ordersCount: account.lastSyncData.ordersCount
    });

  } catch (error) {
    logger_job.logError(error, {
      accountId: account.accountId,
      action: 'sync'
    });

    account.status = 'error';
    account.lastSyncStatus = 'failed';
    account.lastSyncError = error.message;
    await account.save();
  }
}

/**
 * Sincronizar todas as contas ativas
 */
async function syncAllAccounts() {
  try {
    logger_job.info('Starting bulk sync of all accounts');

    const accounts = await Account.findActive();

    if (accounts.length === 0) {
      logger_job.info('No active accounts to sync');
      return;
    }

    logger_job.info(`Found ${accounts.length} active accounts to sync`);

    // Sincronizar em paralelo com limite de concorrência
    const BATCH_SIZE = 5;
    for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
      const batch = accounts.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(syncAccount));
      
      // Aguardar entre batches para não sobrecarregar ML API
      if (i + BATCH_SIZE < accounts.length) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    logger_job.info('✓ Bulk sync completed');

  } catch (error) {
    logger_job.logError(error, { action: 'bulk_sync' });
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

    // Schedule: Sincronizar a cada 5 minutos
    schedule.scheduleJob('*/5 * * * *', async () => {
      await syncAllAccounts();
    });
    logger_job.info('✓ Scheduled: Sync every 5 minutes');

    // Schedule: Limpar eventos antigos a cada dia
    schedule.scheduleJob('0 2 * * *', async () => {
      try {
        const Event = require('../db/models/Event');
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const result = await Event.deleteMany({
          createdAt: { $lt: thirtyDaysAgo }
        });
        
        logger_job.info(`✓ Cleaned ${result.deletedCount} old events`);
      } catch (error) {
        logger_job.logError(error, { action: 'cleanup_events' });
      }
    });
    logger_job.info('✓ Scheduled: Cleanup old events daily at 2 AM');

    // Schedule: Health check
    schedule.scheduleJob('*/10 * * * *', async () => {
      const accountCount = await Account.countDocuments({ status: 'connected' });
      logger_job.info(`✓ Health check: ${accountCount} active accounts`);
    });
    logger_job.info('✓ Scheduled: Health check every 10 minutes');

    logger_job.info('✓ All schedules initialized');

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

module.exports = { syncAccount, syncAllAccounts, initializeSchedules };
