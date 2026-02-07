/**
 * Database Module for Accounts
 *
 * This module provides data persistence for:
 * - Mercado Livre account connections
 * - OAuth tokens and credentials
 * - Sync status and metadata
 * - Webhook events
 *
 * Currently uses in-memory storage for development.
 * For production, implement with MongoDB, PostgreSQL, or Firebase.
 */

const fs = require("fs");
const path = require("path");

// Data storage location
const DATA_DIR = path.join(__dirname, "..", "data");
const ACCOUNTS_FILE = path.join(DATA_DIR, "accounts.json");
const EVENTS_FILE = path.join(DATA_DIR, "events.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache
let accountsCache = [];
let eventsCache = [];

// Initialize from files
function loadFromStorage() {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      const data = fs.readFileSync(ACCOUNTS_FILE, "utf8");
      accountsCache = JSON.parse(data);
      console.log(`Loaded ${accountsCache.length} accounts from storage`);
    }
  } catch (error) {
    console.error("Error loading accounts from storage:", error.message);
    accountsCache = [];
  }

  try {
    if (fs.existsSync(EVENTS_FILE)) {
      const data = fs.readFileSync(EVENTS_FILE, "utf8");
      eventsCache = JSON.parse(data);
      // Keep only recent events (last 1000)
      if (eventsCache.length > 1000) {
        eventsCache = eventsCache.slice(-1000);
        saveEventsToStorage();
      }
      console.log(`Loaded ${eventsCache.length} events from storage`);
    }
  } catch (error) {
    console.error("Error loading events from storage:", error.message);
    eventsCache = [];
  }
}

/**
 * Save accounts to persistent storage
 */
function saveAccountsToStorage() {
  try {
    fs.writeFileSync(
      ACCOUNTS_FILE,
      JSON.stringify(accountsCache, null, 2),
      "utf8",
    );
  } catch (error) {
    console.error("Error saving accounts to storage:", error.message);
  }
}

/**
 * Save events to persistent storage
 */
function saveEventsToStorage() {
  try {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(eventsCache, null, 2), "utf8");
  } catch (error) {
    console.error("Error saving events to storage:", error.message);
  }
}

/**
 * Get all accounts
 */
async function getAllAccounts() {
  return accountsCache;
}

/**
 * Get account by ID or user ID
 */
async function getAccount(identifier, searchBy = "id") {
  if (searchBy === "id") {
    return accountsCache.find((acc) => acc.id === identifier) || null;
  } else if (searchBy === "userId") {
    return accountsCache.find((acc) => acc.userId === identifier) || null;
  }
  return null;
}

/**
 * Get account by user ID
 */
async function getAccountByUserId(userId) {
  return accountsCache.find((acc) => acc.userId === userId) || null;
}

/**
 * Save new account
 */
async function saveAccount(account) {
  // Check if account already exists
  const existing = accountsCache.find((acc) => acc.id === account.id);
  if (existing) {
    throw new Error(`Account with ID ${account.id} already exists`);
  }

  accountsCache.push(account);
  saveAccountsToStorage();
  console.log(`Account saved: ${account.id}`);
  return account;
}

/**
 * Update account
 */
async function updateAccount(accountId, updates) {
  const index = accountsCache.findIndex((acc) => acc.id === accountId);

  if (index === -1) {
    throw new Error(`Account with ID ${accountId} not found`);
  }

  accountsCache[index] = {
    ...accountsCache[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveAccountsToStorage();
  console.log(`Account updated: ${accountId}`);
  return accountsCache[index];
}

/**
 * Delete account
 */
async function deleteAccount(accountId) {
  const index = accountsCache.findIndex((acc) => acc.id === accountId);

  if (index === -1) {
    throw new Error(`Account with ID ${accountId} not found`);
  }

  const deleted = accountsCache.splice(index, 1);
  saveAccountsToStorage();
  console.log(`Account deleted: ${accountId}`);
  return deleted[0];
}

/**
 * Save webhook event
 */
async function saveEvent(event) {
  eventsCache.push(event);

  // Keep only recent events
  if (eventsCache.length > 5000) {
    eventsCache = eventsCache.slice(-5000);
  }

  saveEventsToStorage();
  return event;
}

/**
 * Get events by account
 */
async function getEventsByAccount(accountId, limit = 100) {
  return eventsCache
    .filter((evt) => evt.accountId === accountId)
    .slice(-limit)
    .reverse();
}

/**
 * Get events by topic
 */
async function getEventsByTopic(topic, limit = 100) {
  return eventsCache
    .filter((evt) => evt.topic === topic)
    .slice(-limit)
    .reverse();
}

/**
 * Clear old events (for maintenance)
 */
async function clearOldEvents(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const before = eventsCache.length;
  eventsCache = eventsCache.filter((evt) => {
    return new Date(evt.processedAt) > cutoffDate;
  });

  const removed = before - eventsCache.length;
  if (removed > 0) {
    saveEventsToStorage();
    console.log(`Cleaned up ${removed} old events`);
  }

  return removed;
}

/**
 * Get all accounts for a user
 */
async function getAccountsByUserId(userId) {
  return accountsCache.filter((acc) => acc.userId === userId);
}

// Initialize on module load
loadFromStorage();

module.exports = {
  getAllAccounts,
  getAccount,
  getAccountByUserId,
  saveAccount,
  updateAccount,
  deleteAccount,
  saveEvent,
  getEventsByAccount,
  getEventsByTopic,
  clearOldEvents,
  getAccountsByUserId,
};
