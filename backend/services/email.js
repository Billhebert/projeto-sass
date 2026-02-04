/**
 * Email Service
 * Handles email sending for verification, password reset, and notifications
 * Uses Nodemailer for SMTP support
 */

const nodemailer = require('nodemailer');
const logger = require('../logger');

/**
 * Email Service Class
 * Manages email sending with retry logic and templating
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter based on environment configuration
   * Supports SMTP, Gmail, and test mode
   */
  initializeTransporter() {
    try {
      const emailProvider = process.env.EMAIL_PROVIDER || 'test';
      const from = process.env.EMAIL_FROM || 'noreply@vendata.com.br';

      let transportConfig = {};

      switch (emailProvider) {
        case 'smtp':
          // Custom SMTP configuration
          transportConfig = {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            },
          };
          break;

        case 'gmail':
          // Gmail SMTP configuration
          transportConfig = {
            service: 'gmail',
            auth: {
              user: process.env.GMAIL_ADDRESS,
              pass: process.env.GMAIL_APP_PASSWORD, // Use App-specific password, not regular password
            },
          };
          break;

        case 'sendgrid':
          // SendGrid configuration via SMTP
          transportConfig = {
            host: 'smtp.sendgrid.net',
            port: 587,
            auth: {
              user: 'apikey',
              pass: process.env.SENDGRID_API_KEY,
            },
          };
          break;

        case 'test':
          // Test mode - emails are logged but not sent
          logger.info('Email service initialized in TEST mode. Emails will be logged but not sent.');
          this.initialized = true;
          return;

        default:
          throw new Error(`Unknown email provider: ${emailProvider}`);
      }

      this.transporter = nodemailer.createTransport(transportConfig);
      this.initialized = true;
      logger.info(`Email service initialized with provider: ${emailProvider}`);
    } catch (error) {
      logger.error({
        action: 'EMAIL_SERVICE_INIT_ERROR',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      this.initialized = false;
    }
  }

  /**
   * Send verification email to new user
   * @param {string} email - User email address
   * @param {string} verificationToken - Email verification token
   * @param {string} userName - User display name
   */
  async sendVerificationEmail(email, verificationToken, userName = '') {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://vendata.com.br';
      const verificationLink = `${frontendUrl}/verify-email/${verificationToken}`;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@vendata.com.br',
        to: email,
        subject: '🔐 Confirme seu email - Vendata',
        html: this.getVerificationEmailTemplate(verificationLink, userName),
        text: this.getVerificationEmailText(verificationLink, userName),
      };

      const result = await this.sendEmail(mailOptions);

      logger.info({
        action: 'VERIFICATION_EMAIL_SENT',
        email,
        userId: userName,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      logger.error({
        action: 'SEND_VERIFICATION_EMAIL_ERROR',
        email,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Send password reset email to user
   * @param {string} email - User email address
   * @param {string} resetToken - Password reset token
   * @param {string} userName - User display name
   */
  async sendPasswordResetEmail(email, resetToken, userName = '') {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://vendata.com.br';
      const resetLink = `${frontendUrl}/reset-password/${resetToken}`;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@vendata.com.br',
        to: email,
        subject: '🔑 Redefinir sua senha - Vendata',
        html: this.getPasswordResetEmailTemplate(resetLink, userName),
        text: this.getPasswordResetEmailText(resetLink, userName),
      };

      const result = await this.sendEmail(mailOptions);

      logger.info({
        action: 'PASSWORD_RESET_EMAIL_SENT',
        email,
        userId: userName,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      logger.error({
        action: 'SEND_PASSWORD_RESET_EMAIL_ERROR',
        email,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Send welcome email to new user
   * @param {string} email - User email address
   * @param {string} userName - User display name
   */
  async sendWelcomeEmail(email, userName = '') {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://vendata.com.br';

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@vendata.com.br',
        to: email,
        subject: '👋 Bem-vindo ao Vendata!',
        html: this.getWelcomeEmailTemplate(userName, frontendUrl),
        text: this.getWelcomeEmailText(userName, frontendUrl),
      };

      const result = await this.sendEmail(mailOptions);

      logger.info({
        action: 'WELCOME_EMAIL_SENT',
        email,
        userId: userName,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      logger.error({
        action: 'SEND_WELCOME_EMAIL_ERROR',
        email,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Send notification email to user
   * @param {string} email - User email address
   * @param {string} subject - Email subject
   * @param {string} content - Email content (HTML)
   */
  async sendNotificationEmail(email, subject, content) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@vendata.com.br',
        to: email,
        subject,
        html: content,
      };

      const result = await this.sendEmail(mailOptions);

      logger.info({
        action: 'NOTIFICATION_EMAIL_SENT',
        email,
        subject,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      logger.error({
        action: 'SEND_NOTIFICATION_EMAIL_ERROR',
        email,
        subject,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Core email sending function with retry logic
   * @param {object} mailOptions - Nodemailer mail options
   * @param {number} retries - Number of retry attempts
   */
  async sendEmail(mailOptions, retries = 3) {
    // Test mode - log email instead of sending
    if (process.env.EMAIL_PROVIDER === 'test' || !this.initialized) {
      logger.info({
        action: 'EMAIL_TEST_MODE',
        to: mailOptions.to,
        subject: mailOptions.subject,
        timestamp: new Date().toISOString(),
      });
      return { messageId: 'test_mode', success: true };
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const info = await this.transporter.sendMail(mailOptions);
        logger.info({
          action: 'EMAIL_SENT',
          messageId: info.messageId,
          to: mailOptions.to,
          subject: mailOptions.subject,
          timestamp: new Date().toISOString(),
        });
        return { success: true, messageId: info.messageId };
      } catch (error) {
        logger.error({
          action: 'EMAIL_SEND_ATTEMPT',
          attempt,
          maxRetries: retries,
          to: mailOptions.to,
          error: error.message,
          timestamp: new Date().toISOString(),
        });

        if (attempt === retries) {
          throw error;
        }

        // Exponential backoff: wait 1s, 2s, 4s, etc.
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }
  }

  /**
   * Email templates
   */

  getVerificationEmailTemplate(verificationLink, userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
          .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Confirme seu email</h1>
          </div>
          <div class="content">
            <p>Olá${userName ? ', ' + userName : ''},</p>
            <p>Obrigado por se cadastrar no <strong>Vendata</strong>!</p>
            <p>Para completar seu registro, clique no botão abaixo para confirmar seu email:</p>
            <a href="${verificationLink}" class="button">Confirmar Email</a>
            <p>Ou copie e cole este link no seu navegador:</p>
            <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 5px;">
              ${verificationLink}
            </p>
            <div class="warning">
              <strong>⚠️ Importante:</strong> Este link expira em 24 horas. Se você não solicitou este email, ignore-o.
            </div>
            <p>Com dúvidas? Entre em contato conosco em support@vendata.com.br</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Vendata. Todos os direitos reservados.</p>
            <p>Este é um email automático. Por favor, não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getVerificationEmailText(verificationLink, userName) {
    return `
Confirmação de Email - Vendata

Olá${userName ? ', ' + userName : ''},

Obrigado por se cadastrar no Vendata!

Para completar seu registro, clique ou copie e cole o link abaixo no seu navegador:
${verificationLink}

Este link expira em 24 horas.

Se você não solicitou este email, ignore-o.

Com dúvidas? Entre em contato conosco em support@vendata.com.br

---
© 2024 Vendata. Todos os direitos reservados.
Este é um email automático. Por favor, não responda.
    `;
  }

  getPasswordResetEmailTemplate(resetLink, userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
          .warning { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; border-radius: 5px; margin: 20px 0; color: #721c24; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔑 Redefinir sua Senha</h1>
          </div>
          <div class="content">
            <p>Olá${userName ? ', ' + userName : ''},</p>
            <p>Recebemos uma solicitação para redefinir sua senha.</p>
            <p>Clique no botão abaixo para criar uma nova senha:</p>
            <a href="${resetLink}" class="button">Redefinir Senha</a>
            <p>Ou copie e cole este link no seu navegador:</p>
            <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 5px;">
              ${resetLink}
            </p>
            <div class="warning">
              <strong>⚠️ Segurança:</strong> Este link expira em 30 minutos. Se você não solicitou isso, ignore este email e sua senha permanecerá segura.
            </div>
            <p>Sempre use uma senha forte com letras maiúsculas, minúsculas, números e caracteres especiais.</p>
            <p>Com dúvidas? Entre em contato conosco em support@vendata.com.br</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Vendata. Todos os direitos reservados.</p>
            <p>Este é um email automático. Por favor, não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPasswordResetEmailText(resetLink, userName) {
    return `
Redefinição de Senha - Vendata

Olá${userName ? ', ' + userName : ''},

Recebemos uma solicitação para redefinir sua senha.

Clique ou copie e cole o link abaixo no seu navegador para criar uma nova senha:
${resetLink}

Este link expira em 30 minutos.

Se você não solicitou isso, ignore este email e sua senha permanecerá segura.

Com dúvidas? Entre em contato conosco em support@vendata.com.br

---
© 2024 Vendata. Todos os direitos reservados.
Este é um email automático. Por favor, não responda.
    `;
  }

  getWelcomeEmailTemplate(userName, frontendUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .features { list-style: none; padding: 0; }
          .features li { padding: 10px; border-bottom: 1px solid #eee; }
          .features li:before { content: "✓ "; color: #667eea; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👋 Bem-vindo ao Vendata!</h1>
          </div>
          <div class="content">
            <p>Olá${userName ? ', ' + userName : ''},</p>
            <p>Sua conta foi criada com sucesso! Estamos animados para tê-lo conosco.</p>
            <p>Aqui está o que você pode fazer agora:</p>
            <ul class="features">
              <li>Conectar sua conta do Mercado Livre</li>
              <li>Visualizar seus anúncios e vendas</li>
              <li>Acessar relatórios e análises detalhadas</li>
              <li>Gerenciar múltiplas lojas</li>
              <li>Otimizar seus preços automaticamente</li>
            </ul>
            <a href="${frontendUrl}/dashboard" class="button">Acessar Dashboard</a>
            <p>Se tiver alguma dúvida ou precisar de ajuda, nossa equipe de suporte está disponível.</p>
            <p>Contato: support@vendata.com.br</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Vendata. Todos os direitos reservados.</p>
            <p>Este é um email automático. Por favor, não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getWelcomeEmailText(userName, frontendUrl) {
    return `
Bem-vindo ao Vendata!

Olá${userName ? ', ' + userName : ''},

Sua conta foi criada com sucesso! Estamos animados para tê-lo conosco.

Aqui está o que você pode fazer agora:
✓ Conectar sua conta do Mercado Livre
✓ Visualizar seus anúncios e vendas
✓ Acessar relatórios e análises detalhadas
✓ Gerenciar múltiplas lojas
✓ Otimizar seus preços automaticamente

Acesse seu dashboard: ${frontendUrl}/dashboard

Se tiver alguma dúvida ou precisar de ajuda, nossa equipe de suporte está disponível.
Contato: support@vendata.com.br

---
© 2024 Vendata. Todos os direitos reservados.
Este é um email automático. Por favor, não responda.
    `;
  }

  /**
   * Verify email service is ready
   */
  isReady() {
    return this.initialized;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      provider: process.env.EMAIL_PROVIDER || 'test',
      from: process.env.EMAIL_FROM || 'noreply@vendata.com.br',
    };
  }
}

// Export singleton instance
module.exports = new EmailService();
