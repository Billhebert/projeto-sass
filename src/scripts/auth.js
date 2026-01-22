// ======================
// AUTHENTICATION SERVICE
// ======================

const authService = {
  // API endpoint for auth
  apiURL: process.env.API_URL || 'http://localhost:3000/api',
  tokenKey: 'authToken',
  userKey: 'authUser',
  expiryKey: 'authExpiry',

  // Get stored token
  getToken() {
    return localStorage.getItem(this.tokenKey);
  },

  // Get stored user
  getUser() {
    try {
      const user = localStorage.getItem(this.userKey);
      return user ? JSON.parse(user) : null;
    } catch (e) {
      return null;
    }
  },

  // Save user to localStorage
  saveUser(user) {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  },

  // Check if token is valid
  isTokenValid() {
    const token = this.getToken();
    if (!token) return false;

    const expiry = localStorage.getItem(this.expiryKey);
    if (!expiry) return false;

    return new Date().getTime() < parseInt(expiry);
  },

  // Redirect to login if not authenticated
  requireAuth() {
    if (!this.isTokenValid()) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
      localStorage.removeItem(this.expiryKey);
      window.location.href = '../login.html';
    }
  },

  // Login with email/password
  async login(email, password) {
    try {
      const response = await fetch(`${this.apiURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();

      // Store token and user info
      localStorage.setItem(this.tokenKey, data.token);
      localStorage.setItem(this.userKey, JSON.stringify(data.user));
      
      // Set expiry (typically JWT tokens expire in 24 hours)
      const expiryTime = new Date().getTime() + (24 * 60 * 60 * 1000);
      localStorage.setItem(this.expiryKey, expiryTime.toString());

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.message || 'Erro ao fazer login'
      };
    }
  },

  // Login with demo account (for testing without backend)
  async loginDemo(email, password) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simple demo validation
    if (!email || !password) {
      return { 
        success: false, 
        error: 'Por favor, preencha e-mail e senha' 
      };
    }

    // Accept any non-empty credentials for demo
    const user = {
      id: '123',
      name: 'Demo User',
      email: email,
      avatar: 'DU',
      role: 'admin'
    };

    // Create a fake JWT token
    const token = 'demo_token_' + btoa(JSON.stringify(user));

    // Store token and user info
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    
    // Set expiry (24 hours)
    const expiryTime = new Date().getTime() + (24 * 60 * 60 * 1000);
    localStorage.setItem(this.expiryKey, expiryTime.toString());

    return { success: true, user: user };
  },

  // Logout
  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.expiryKey);
    window.location.href = '../login.html';
  },

  // Register new account
  async register(name, email, password) {
    try {
      const response = await fetch(`${this.apiURL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      return { success: true };
    } catch (error) {
      console.error('Register error:', error);
      return { 
        success: false, 
        error: error.message || 'Erro ao registrar'
      };
    }
  },

  // Refresh token
  async refreshToken() {
    try {
      const token = this.getToken();
      if (!token) return false;

      const response = await fetch(`${this.apiURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      localStorage.setItem(this.tokenKey, data.token);
      
      // Update expiry
      const expiryTime = new Date().getTime() + (24 * 60 * 60 * 1000);
      localStorage.setItem(this.expiryKey, expiryTime.toString());

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }
};
