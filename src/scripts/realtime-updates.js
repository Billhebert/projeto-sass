/**
 * Real-time Updates Module
 * WebSocket integration for live metric updates
 */

const realtimeModule = (() => {
  let ws = null;
  const listeners = {};
  const reconnectAttempts = 5;
  let currentReconnectAttempt = 0;
  const reconnectDelay = 3000;

  // WebSocket configuration
  const WS_CONFIG = {
    url: process.env.WS_URL || 'ws://localhost:3000/live',
    timeout: 30000,
    heartbeatInterval: 30000
  };

  let heartbeatTimer = null;

  // Connect to WebSocket
  function connect() {
    return new Promise((resolve, reject) => {
      try {
        ws = new WebSocket(WS_CONFIG.url);

        ws.onopen = () => {
          console.log('✓ WebSocket connected');
          currentReconnectAttempt = 0;
          startHeartbeat();
          resolve(ws);
          emit('connected', { timestamp: Date.now() });
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          emit('error', { message: 'Connection error', error });
          reject(error);
        };

        ws.onclose = () => {
          console.warn('WebSocket disconnected');
          stopHeartbeat();
          emit('disconnected', { timestamp: Date.now() });
          attemptReconnect();
        };

        // Set timeout for connection attempt
        setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            ws.close();
            reject(new Error('Connection timeout'));
          }
        }, WS_CONFIG.timeout);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Attempt reconnection
  function attemptReconnect() {
    if (currentReconnectAttempt < reconnectAttempts) {
      currentReconnectAttempt++;
      console.log(`Reconnecting... (attempt ${currentReconnectAttempt}/${reconnectAttempts})`);
      
      setTimeout(() => {
        connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, reconnectDelay * currentReconnectAttempt);
    }
  }

  // Handle incoming messages
  function handleMessage(message) {
    const { type, data, timestamp } = message;
    
    console.log(`📨 Received: ${type}`, data);
    
    // Handle different message types
    switch (type) {
      case 'sales:new':
        updateSalesMetrics(data);
        emit('sales:new', { ...data, timestamp });
        break;

      case 'sales:updated':
        updateSalesMetrics(data);
        emit('sales:updated', { ...data, timestamp });
        break;

      case 'stock:updated':
        updateStockMetrics(data);
        emit('stock:updated', { ...data, timestamp });
        break;

      case 'metrics:update':
        emit('metrics:update', { ...data, timestamp });
        break;

      case 'dashboard:summary':
        emit('dashboard:summary', { ...data, timestamp });
        break;

      case 'pong':
        console.log('Heartbeat acknowledged');
        break;

      default:
        emit('unknown', { type, data, timestamp });
    }
  }

  // Send message to server
  function send(type, data = {}) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return false;
    }

    try {
      ws.send(JSON.stringify({
        type,
        data,
        timestamp: Date.now()
      }));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  // Heartbeat to keep connection alive
  function startHeartbeat() {
    heartbeatTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        send('ping');
      }
    }, WS_CONFIG.heartbeatInterval);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  // Subscribe to events
  function on(eventType, callback) {
    if (!listeners[eventType]) {
      listeners[eventType] = [];
    }
    listeners[eventType].push(callback);
    return () => off(eventType, callback); // Return unsubscribe function
  }

  // Unsubscribe from events
  function off(eventType, callback) {
    if (listeners[eventType]) {
      listeners[eventType] = listeners[eventType].filter(cb => cb !== callback);
    }
  }

  // Emit event
  function emit(eventType, data) {
    if (listeners[eventType]) {
      listeners[eventType].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener for ${eventType}:`, error);
        }
      });
    }
  }

  // Update sales metrics in real-time
  function updateSalesMetrics(saleData) {
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    
    // Check if sale exists
    const existingIndex = sales.findIndex(s => s.id === saleData.id);
    
    if (existingIndex >= 0) {
      sales[existingIndex] = { ...sales[existingIndex], ...saleData };
    } else {
      sales.push(saleData);
    }

    localStorage.setItem('sales', JSON.stringify(sales));
    
    // Trigger dashboard update
    if (app && typeof app.updateStatistics === 'function') {
      app.updateStatistics();
      app.initializeAnalytics();
    }
  }

  // Update stock metrics in real-time
  function updateStockMetrics(stockData) {
    const stock = JSON.parse(localStorage.getItem('product_stock') || '{}');
    
    Object.entries(stockData).forEach(([sku, quantity]) => {
      stock[sku] = quantity;
    });

    localStorage.setItem('product_stock', JSON.stringify(stock));
    
    // Trigger dashboard update
    if (app && typeof app.initializeCharts === 'function') {
      app.initializeCharts();
    }
  }

  // Subscribe to live sales
  function subscribeToSales() {
    send('subscribe', { channel: 'sales' });
    return on('sales:new', (data) => {
      console.log('New sale received:', data);
    });
  }

  // Subscribe to live stock updates
  function subscribeToStock() {
    send('subscribe', { channel: 'stock' });
    return on('stock:updated', (data) => {
      console.log('Stock updated:', data);
    });
  }

  // Subscribe to live metrics
  function subscribeToMetrics() {
    send('subscribe', { channel: 'metrics' });
    return on('metrics:update', (data) => {
      console.log('Metrics updated:', data);
    });
  }

  // Subscribe to dashboard updates
  function subscribeToDashboard() {
    send('subscribe', { channel: 'dashboard' });
    return on('dashboard:summary', (data) => {
      console.log('Dashboard updated:', data);
    });
  }

  // Unsubscribe from all
  function unsubscribeAll() {
    send('unsubscribe', { channel: '*' });
  }

  // Disconnect WebSocket
  function disconnect() {
    stopHeartbeat();
    if (ws) {
      ws.close();
      ws = null;
    }
  }

  // Get connection status
  function getStatus() {
    if (!ws) return 'disconnected';
    switch (ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }

  // Create connection indicator UI
  function createStatusIndicator(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const updateIndicator = () => {
      const status = getStatus();
      const colors = {
        'connected': '#33A37A',
        'disconnected': '#E74C3C',
        'connecting': '#F4C85A',
        'unknown': '#999'
      };

      container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
          <span style="width: 8px; height: 8px; background: ${colors[status] || colors['unknown']}; border-radius: 50%; display: inline-block;"></span>
          <span style="color: #666;">${status === 'connected' ? '🔴 Live' : '⚪ Offline'}</span>
        </div>
      `;
    };

    updateIndicator();
    
    // Update every 5 seconds
    setInterval(updateIndicator, 5000);
  }

  return {
    connect,
    disconnect,
    send,
    on,
    off,
    emit,
    getStatus,
    subscribeToSales,
    subscribeToStock,
    subscribeToMetrics,
    subscribeToDashboard,
    unsubscribeAll,
    createStatusIndicator,
    isConnected: () => ws && ws.readyState === WebSocket.OPEN
  };
})();
