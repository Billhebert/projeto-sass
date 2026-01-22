/**
 * Dashboard Widget Customization Module
 * Allows users to customize dashboard layout and widgets
 */

const dashboardCustomizationModule = (() => {
  const STORAGE_KEY = 'dashboard_widgets_config';
  const DEFAULT_WIDGETS = [
    { id: 'mom-growth', name: 'Crescimento MoM', enabled: true, size: 'small', position: 0 },
    { id: 'sales-velocity', name: 'Velocidade de Vendas', enabled: true, size: 'small', position: 1 },
    { id: 'conversion-rate', name: 'Taxa de Conversão', enabled: true, size: 'small', position: 2 },
    { id: 'inventory-health', name: 'Saúde do Estoque', enabled: true, size: 'small', position: 3 },
    { id: 'repeat-rate', name: 'Taxa de Recompra', enabled: true, size: 'small', position: 4 },
    { id: 'discount-impact', name: 'Impacto do Desconto', enabled: true, size: 'small', position: 5 },
    { id: 'marketplace-analysis', name: 'Análise por Marketplace', enabled: true, size: 'medium', position: 6 },
    { id: 'payment-methods', name: 'Métodos de Pagamento', enabled: true, size: 'medium', position: 7 },
    { id: 'top-products', name: 'Top Produtos', enabled: true, size: 'medium', position: 8 },
    { id: 'sales-chart', name: 'Gráfico de Vendas', enabled: true, size: 'medium', position: 9 },
    { id: 'revenue-chart', name: 'Gráfico de Receita', enabled: true, size: 'medium', position: 10 },
    { id: 'inventory-chart', name: 'Gráfico de Estoque', enabled: true, size: 'medium', position: 11 }
  ];

  // Initialize widget configuration
  function initializeConfig() {
    const config = localStorage.getItem(STORAGE_KEY);
    return config ? JSON.parse(config) : DEFAULT_WIDGETS;
  }

  // Get current configuration
  function getConfig() {
    return initializeConfig();
  }

  // Update widget enabled status
  function toggleWidget(widgetId, enabled) {
    const config = initializeConfig();
    const widget = config.find(w => w.id === widgetId);
    
    if (widget) {
      widget.enabled = enabled;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      return widget;
    }
    
    return null;
  }

  // Reorder widgets
  function reorderWidgets(newOrder) {
    const config = initializeConfig();
    
    newOrder.forEach((widgetId, index) => {
      const widget = config.find(w => w.id === widgetId);
      if (widget) {
        widget.position = index;
      }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return config;
  }

  // Change widget size
  function resizeWidget(widgetId, size) {
    const config = initializeConfig();
    const widget = config.find(w => w.id === widgetId);
    
    if (widget && ['small', 'medium', 'large'].includes(size)) {
      widget.size = size;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      return widget;
    }
    
    return null;
  }

  // Get enabled widgets in order
  function getEnabledWidgets() {
    const config = initializeConfig();
    return config
      .filter(w => w.enabled)
      .sort((a, b) => a.position - b.position);
  }

  // Reset to default configuration
  function resetToDefault() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_WIDGETS));
    return DEFAULT_WIDGETS;
  }

  // Save preset configuration
  function savePreset(name, config) {
    const presets = JSON.parse(localStorage.getItem('dashboard_presets') || '[]');
    
    const preset = {
      id: Date.now(),
      name,
      config,
      createdAt: new Date().toISOString()
    };

    presets.push(preset);
    localStorage.setItem('dashboard_presets', JSON.stringify(presets));
    return preset;
  }

  // Load preset configuration
  function loadPreset(presetId) {
    const presets = JSON.parse(localStorage.getItem('dashboard_presets') || '[]');
    const preset = presets.find(p => p.id === presetId);
    
    if (preset) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preset.config));
      return preset.config;
    }
    
    return null;
  }

  // Get all presets
  function getPresets() {
    return JSON.parse(localStorage.getItem('dashboard_presets') || '[]');
  }

  // Delete preset
  function deletePreset(presetId) {
    let presets = JSON.parse(localStorage.getItem('dashboard_presets') || '[]');
    presets = presets.filter(p => p.id !== presetId);
    localStorage.setItem('dashboard_presets', JSON.stringify(presets));
    return presets;
  }

  // Create customization UI
  function renderCustomizationPanel(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const config = getConfig();
    const presets = getPresets();

    let html = `
      <div style="padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h2 style="margin-top: 0; color: #333;">⚙️ Personalizar Dashboard</h2>
        
        <!-- Presets -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #333; margin-bottom: 15px;">Presets Salvos</h3>
          <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
            ${presets.length > 0 
              ? presets.map(preset => `
                  <button onclick="dashboardCustomizationModule.loadPreset(${preset.id}); location.reload();"
                    style="padding: 8px 12px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                    ${preset.name}
                  </button>
                  <button onclick="dashboardCustomizationModule.deletePreset(${preset.id}); location.reload();"
                    style="padding: 6px 10px; background: #fee; color: #c33; border: 1px solid #fcc; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    ✕
                  </button>
                `).join('')
              : '<p style="color: #999; font-size: 14px;">Nenhum preset salvo</p>'
            }
          </div>
          <button onclick="dashboardCustomizationModule.savePresetUI();"
            style="padding: 8px 16px; background: #5D4DB3; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">
            💾 Salvar Preset Atual
          </button>
          <button onclick="dashboardCustomizationModule.resetToDefault(); location.reload();"
            style="padding: 8px 16px; background: #999; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; margin-left: 10px;">
            ↻ Restaurar Padrão
          </button>
        </div>

        <!-- Widget Configuration -->
        <div>
          <h3 style="color: #333; margin-bottom: 15px;">Configurar Widgets</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
            ${config.map(widget => `
              <div style="padding: 15px; background: #f9f9f9; border: 1px solid #eee; border-radius: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <strong style="color: #333;">${widget.name}</strong>
                  <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" ${widget.enabled ? 'checked' : ''} 
                      onchange="dashboardCustomizationModule.toggleWidget('${widget.id}', this.checked); location.reload();"
                      style="cursor: pointer;">
                    <span style="font-size: 12px; color: #666;">Ativado</span>
                  </label>
                </div>
                
                <div style="font-size: 12px; margin-bottom: 10px;">
                  <label style="display: block; margin-bottom: 8px; color: #666;">
                    Tamanho:
                    <select onchange="dashboardCustomizationModule.resizeWidget('${widget.id}', this.value); location.reload();"
                      style="padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">
                      <option value="small" ${widget.size === 'small' ? 'selected' : ''}>Pequeno</option>
                      <option value="medium" ${widget.size === 'medium' ? 'selected' : ''}>Médio</option>
                      <option value="large" ${widget.size === 'large' ? 'selected' : ''}>Grande</option>
                    </select>
                  </label>
                </div>

                <div style="font-size: 11px; color: #999;">
                  Posição: ${widget.position + 1}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // Save preset UI helper
  function savePresetUI() {
    const name = prompt('Nome do preset:');
    if (name) {
      const config = getConfig();
      savePreset(name, config);
      alert('Preset salvo com sucesso!');
      location.reload();
    }
  }

  // Create profile-based configurations
  function createProfileConfig(profileType) {
    const profiles = {
      'executive': [
        { id: 'mom-growth', name: 'Crescimento MoM', enabled: true, size: 'medium', position: 0 },
        { id: 'sales-velocity', name: 'Velocidade de Vendas', enabled: true, size: 'small', position: 1 },
        { id: 'revenue-chart', name: 'Gráfico de Receita', enabled: true, size: 'large', position: 2 },
        { id: 'sales-chart', name: 'Gráfico de Vendas', enabled: true, size: 'large', position: 3 },
        { id: 'marketplace-analysis', name: 'Análise por Marketplace', enabled: true, size: 'medium', position: 4 }
      ],
      'manager': [
        { id: 'mom-growth', name: 'Crescimento MoM', enabled: true, size: 'small', position: 0 },
        { id: 'sales-velocity', name: 'Velocidade de Vendas', enabled: true, size: 'small', position: 1 },
        { id: 'top-products', name: 'Top Produtos', enabled: true, size: 'medium', position: 2 },
        { id: 'inventory-health', name: 'Saúde do Estoque', enabled: true, size: 'small', position: 3 },
        { id: 'payment-methods', name: 'Métodos de Pagamento', enabled: true, size: 'medium', position: 4 }
      ],
      'seller': [
        { id: 'sales-velocity', name: 'Velocidade de Vendas', enabled: true, size: 'small', position: 0 },
        { id: 'conversion-rate', name: 'Taxa de Conversão', enabled: true, size: 'small', position: 1 },
        { id: 'top-products', name: 'Top Produtos', enabled: true, size: 'medium', position: 2 },
        { id: 'sales-chart', name: 'Gráfico de Vendas', enabled: true, size: 'large', position: 3 }
      ],
      'minimal': [
        { id: 'mom-growth', name: 'Crescimento MoM', enabled: true, size: 'small', position: 0 },
        { id: 'sales-velocity', name: 'Velocidade de Vendas', enabled: true, size: 'small', position: 1 },
        { id: 'revenue-chart', name: 'Gráfico de Receita', enabled: true, size: 'medium', position: 2 }
      ]
    };

    const config = profiles[profileType] || DEFAULT_WIDGETS;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return config;
  }

  return {
    getConfig,
    toggleWidget,
    reorderWidgets,
    resizeWidget,
    getEnabledWidgets,
    resetToDefault,
    savePreset,
    loadPreset,
    getPresets,
    deletePreset,
    renderCustomizationPanel,
    savePresetUI,
    createProfileConfig,
    initializeConfig
  };
})();
