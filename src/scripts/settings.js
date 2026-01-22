// Settings Management Module

const settingsModule = (() => {
  const ACCOUNT_SETTINGS_KEY = 'account_settings';
  const COMPANY_SETTINGS_KEY = 'company_settings';
  const NOTIFICATIONS_SETTINGS_KEY = 'notifications_settings';
  const PREFERENCES_SETTINGS_KEY = 'preferences_settings';

  // Initialize settings
  function init() {
    setupAccountForm();
    setupCompanyForm();
    setupNotificationsForm();
    setupPreferencesForm();
    loadSettings();
  }

  // Load all settings
  function loadSettings() {
    loadAccountSettings();
    loadCompanySettings();
    loadNotificationsSettings();
    loadPreferencesSettings();
  }

  // Load account settings
  function loadAccountSettings() {
    const settings = getSetting(ACCOUNT_SETTINGS_KEY);
    if (settings) {
      document.getElementById('phone').value = settings.phone || '';
    }
  }

  // Load company settings
  function loadCompanySettings() {
    const settings = getSetting(COMPANY_SETTINGS_KEY);
    if (settings) {
      document.getElementById('companyName').value = settings.companyName || '';
      document.getElementById('cnpj').value = settings.cnpj || '';
      document.getElementById('website').value = settings.website || '';
      document.getElementById('address').value = settings.address || '';
    }
  }

  // Load notifications settings
  function loadNotificationsSettings() {
    const settings = getSetting(NOTIFICATIONS_SETTINGS_KEY);
    if (settings) {
      document.getElementById('emailNewSale').checked = settings.emailNewSale !== false;
      document.getElementById('emailLowStock').checked = settings.emailLowStock !== false;
      document.getElementById('emailNewMessage').checked = settings.emailNewMessage !== false;
      document.getElementById('emailWeeklyReport').checked = settings.emailWeeklyReport !== false;
    }
  }

  // Load preferences settings
  function loadPreferencesSettings() {
    const settings = getSetting(PREFERENCES_SETTINGS_KEY);
    if (settings) {
      document.getElementById('language').value = settings.language || 'pt-BR';
      document.getElementById('currency').value = settings.currency || 'BRL';
      document.getElementById('dateFormat').value = settings.dateFormat || 'DD/MM/YYYY';
      document.getElementById('theme').value = settings.theme || 'light';
    }
  }

  // Setup account form
  function setupAccountForm() {
    const form = document.getElementById('accountForm');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
    const successMessage = document.getElementById('accountSuccessMessage');

    // Show confirm password field when typing in new password
    newPasswordInput.addEventListener('input', () => {
      if (newPasswordInput.value) {
        confirmPasswordGroup.style.display = 'block';
      } else {
        confirmPasswordGroup.style.display = 'none';
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveAccountSettings();
      showSuccess(successMessage);
    });
  }

  // Setup company form
  function setupCompanyForm() {
    const form = document.getElementById('companyForm');
    const successMessage = document.getElementById('companySuccessMessage');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveCompanySettings();
      showSuccess(successMessage);
    });
  }

  // Setup notifications form
  function setupNotificationsForm() {
    const form = document.getElementById('notificationsForm');
    const successMessage = document.getElementById('notificationsSuccessMessage');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveNotificationsSettings();
      showSuccess(successMessage);
    });
  }

  // Setup preferences form
  function setupPreferencesForm() {
    const form = document.getElementById('preferencesForm');
    const successMessage = document.getElementById('preferencesSuccessMessage');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      savePreferencesSettings();
      showSuccess(successMessage);
    });
  }

  // Save account settings
  function saveAccountSettings() {
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!fullName || !email) {
      alert('Nome e e-mail são obrigatórios');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        alert('A nova senha deve ter pelo menos 6 caracteres');
        return;
      }
      if (newPassword !== confirmPassword) {
        alert('As senhas não correspondem');
        return;
      }
    }

    const settings = {
      fullName,
      email,
      phone,
      updatedAt: new Date().toISOString()
    };

    saveSetting(ACCOUNT_SETTINGS_KEY, settings);

    // Update auth user data
    const user = authService.getUser();
    if (user) {
      user.name = fullName;
      user.email = email;
      authService.saveUser(user);
    }

    // Clear password fields
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('confirmPasswordGroup').style.display = 'none';
  }

  // Save company settings
  function saveCompanySettings() {
    const companyName = document.getElementById('companyName').value;
    const cnpj = document.getElementById('cnpj').value;
    const website = document.getElementById('website').value;
    const address = document.getElementById('address').value;

    const settings = {
      companyName,
      cnpj,
      website,
      address,
      updatedAt: new Date().toISOString()
    };

    saveSetting(COMPANY_SETTINGS_KEY, settings);
  }

  // Save notifications settings
  function saveNotificationsSettings() {
    const settings = {
      emailNewSale: document.getElementById('emailNewSale').checked,
      emailLowStock: document.getElementById('emailLowStock').checked,
      emailNewMessage: document.getElementById('emailNewMessage').checked,
      emailWeeklyReport: document.getElementById('emailWeeklyReport').checked,
      updatedAt: new Date().toISOString()
    };

    saveSetting(NOTIFICATIONS_SETTINGS_KEY, settings);
  }

  // Save preferences settings
  function savePreferencesSettings() {
    const settings = {
      language: document.getElementById('language').value,
      currency: document.getElementById('currency').value,
      dateFormat: document.getElementById('dateFormat').value,
      theme: document.getElementById('theme').value,
      updatedAt: new Date().toISOString()
    };

    saveSetting(PREFERENCES_SETTINGS_KEY, settings);

    // Apply theme if changed
    const currentTheme = settings.theme;
    if (currentTheme === 'dark') {
      document.body.style.background = '#1a1a1a';
      document.body.style.color = '#fff';
    } else {
      document.body.style.background = '#f5f5f5';
      document.body.style.color = '#333';
    }
  }

  // Get setting from localStorage
  function getSetting(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  // Save setting to localStorage
  function saveSetting(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Show success message
  function showSuccess(messageEl) {
    messageEl.style.display = 'block';
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 3000);
  }

  return {
    init,
    loadSettings,
    saveAccountSettings,
    saveCompanySettings,
    saveNotificationsSettings,
    savePreferencesSettings
  };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  settingsModule.init();
});
