/**
 * Armazenamento Seguro de Tokens Mercado Livre
 * Criptografa tokens com Web Crypto API (AES-256)
 */

class SecureTokenStorage {
  constructor() {
    this.STORAGE_KEY = 'ml_accounts_encrypted';
    this.ENCRYPTION_KEY = 'ml_encryption_password'; // Em produção, usar hash do password do usuário
  }

  /**
   * Salvar nova conta
   */
  async saveAccount(accountData) {
    try {
      const accounts = this.getAllAccounts();
      
      // Validar dados
      if (!accountData.user_id || !accountData.access_token) {
        throw new Error('Dados incompletos');
      }

      // Criptografar tokens
      const encrypted_access_token = await this._encryptToken(accountData.access_token);
      const encrypted_refresh_token = await this._encryptToken(accountData.refresh_token);

      const newAccount = {
        id: accountData.user_id,
        nickname: accountData.nickname || 'Sem nome',
        email: accountData.email || '',
        encrypted_access_token,
        encrypted_refresh_token,
        expires_at: Date.now() + (accountData.expires_in * 1000),
        created_at: new Date().toISOString(),
        active: true
      };

      accounts.push(newAccount);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(accounts));

      console.log(`✓ Conta ${newAccount.nickname} salva com sucesso`);
      return newAccount;

    } catch (error) {
      console.error('Erro ao salvar conta:', error);
      throw error;
    }
  }

  /**
   * Obter conta completa (com tokens descriptografados)
   */
  async getAccount(userId) {
    try {
      const accounts = this.getAllAccounts();
      const account = accounts.find(acc => acc.id === userId);
      
      if (!account) return null;

      // Descriptografar tokens
      account.access_token = await this._decryptToken(account.encrypted_access_token);
      account.refresh_token = await this._decryptToken(account.encrypted_refresh_token);

      return account;

    } catch (error) {
      console.error('Erro ao obter conta:', error);
      return null;
    }
  }

  /**
   * Listar todas as contas (sem tokens descriptografados)
   */
  getAllAccounts() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erro ao ler contas:', error);
      return [];
    }
  }

  /**
   * Atualizar tokens quando renovar
   */
  async updateToken(userId, newAccessToken, newRefreshToken) {
    try {
      const accounts = this.getAllAccounts();
      const accountIndex = accounts.findIndex(acc => acc.id === userId);
      
      if (accountIndex === -1) {
        throw new Error('Conta não encontrada');
      }

      // Criptografar novos tokens
      accounts[accountIndex].encrypted_access_token = await this._encryptToken(newAccessToken);
      accounts[accountIndex].encrypted_refresh_token = await this._encryptToken(newRefreshToken);
      accounts[accountIndex].expires_at = Date.now() + (3600 * 1000); // 1 hora

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(accounts));
      console.log(`✓ Token atualizado para conta ${userId}`);

    } catch (error) {
      console.error('Erro ao atualizar token:', error);
      throw error;
    }
  }

  /**
   * Remover conta
   */
  removeAccount(userId) {
    try {
      const accounts = this.getAllAccounts();
      const filtered = accounts.filter(acc => acc.id !== userId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      console.log(`✓ Conta ${userId} removida`);
    } catch (error) {
      console.error('Erro ao remover conta:', error);
      throw error;
    }
  }

  /**
   * Verificar se token está expirado
   */
  isTokenExpired(userId) {
    const accounts = this.getAllAccounts();
    const account = accounts.find(acc => acc.id === userId);
    
    if (!account) return true;
    
    return account.expires_at < Date.now();
  }

  /**
   * Criptografar token com AES-256-GCM
   */
  async _encryptToken(token) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      
      // Gerar salt e IV aleatórios
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Derivar chave usando PBKDF2
      const baseKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(this.ENCRYPTION_KEY),
        'PBKDF2',
        false,
        ['deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      // Criptografar
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data
      );

      // Combinar salt + iv + encrypted
      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      combined.set(salt);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encrypted), salt.length + iv.length);

      // Retornar como string Base64
      return btoa(String.fromCharCode(...combined));

    } catch (error) {
      console.error('Erro ao criptografar:', error);
      throw error;
    }
  }

  /**
   * Descriptografar token
   */
  async _decryptToken(encryptedData) {
    try {
      const encoder = new TextEncoder();
      
      // Converter Base64 para Uint8Array
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(c => c.charCodeAt(0))
      );

      // Separar salt, iv e encrypted
      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const encrypted = combined.slice(28);

      // Derivar chave
      const baseKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(this.ENCRYPTION_KEY),
        'PBKDF2',
        false,
        ['deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      // Descriptografar
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted
      );

      return new TextDecoder().decode(decrypted);

    } catch (error) {
      console.error('Erro ao descriptografar:', error);
      throw error;
    }
  }

  /**
   * Limpar todos os dados (logout total)
   */
  clearAll() {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('✓ Todos os dados foram limpos');
  }
}

// Exportar para uso global
window.SecureTokenStorage = SecureTokenStorage;
