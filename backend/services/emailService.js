const nodemailer = require('nodemailer');
const config = require('../config/config');
const { AppError } = require('../middleware/errorHandler');
const { logBusinessEvent } = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  // Initialize email transporter
  initializeTransporter() {
    try {
      if (!config.email.host || !config.email.user || !config.email.password) {
        console.warn('Email configuration missing. Email service will not be available.');
        return;
      }

      this.transporter = nodemailer.createTransporter({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.user,
          pass: config.email.password
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('Email service connection failed:', error);
        } else {
          console.log('Email service initialized successfully');
        }
      });
    } catch (error) {
      console.error('Failed to initialize email service:', error);
    }
  }

  // Send email
  async sendEmail(to, subject, text, html, attachments = []) {
    try {
      if (!this.transporter) {
        throw new AppError('Email service not configured', 500, 'EMAIL_SERVICE_NOT_CONFIGURED');
      }

      const mailOptions = {
        from: `"${config.email.fromName}" <${config.email.fromAddress}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        text,
        html,
        attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logBusinessEvent('EMAIL_SENT', null, {
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        messageId: result.messageId
      });

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      console.error('Send email error:', error);
      throw new AppError('Failed to send email', 500, 'EMAIL_SEND_ERROR');
    }
  }

  // Send welcome email to new user
  async sendWelcomeEmail(userEmail, userName, tempPassword = null) {
    try {
      const subject = 'Welcome to Inventory Management System';
      
      let text = `Welcome to our Inventory Management System, ${userName}!\n\n`;
      text += 'Your account has been created successfully.\n';
      if (tempPassword) {
        text += `Your temporary password is: ${tempPassword}\n`;
        text += 'Please log in and change your password immediately.\n';
      }
      text += '\nBest regards,\nInventory Management Team';

      let html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Inventory Management System</h2>
          <p>Hello ${userName},</p>
          <p>Your account has been created successfully.</p>
          ${tempPassword ? `
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Your temporary password is:</strong> <code style="background-color: #e9ecef; padding: 2px 4px; border-radius: 3px;">${tempPassword}</code></p>
              <p style="color: #dc3545; font-weight: bold;">Please log in and change your password immediately for security reasons.</p>
            </div>
          ` : ''}
          <p>You can access the system at: <a href="${config.server.frontendUrl}/login">${config.server.frontendUrl}/login</a></p>
          <p>Best regards,<br>Inventory Management Team</p>
        </div>
      `;

      return await this.sendEmail(userEmail, subject, text, html);
    } catch (error) {
      console.error('Send welcome email error:', error);
      throw new AppError('Failed to send welcome email', 500, 'WELCOME_EMAIL_ERROR');
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(userEmail, userName, resetToken) {
    try {
      const subject = 'Reset Your Password - Inventory Management System';
      const resetUrl = `${config.server.frontendUrl}/reset-password?token=${resetToken}`;
      
      const text = `Hello ${userName},\n\n` +
        'You have requested to reset your password for your Inventory Management System account.\n' +
        `Please click the following link to reset your password:\n${resetUrl}\n\n` +
        'This link will expire in 1 hour for security reasons.\n' +
        'If you did not request this password reset, please ignore this email.\n\n' +
        'Best regards,\nInventory Management Team';

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Reset Your Password</h2>
          <p>Hello ${userName},</p>
          <p>You have requested to reset your password for your Inventory Management System account.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p><small>If the button doesn't work, copy and paste this link into your browser:</small><br>
          <a href="${resetUrl}">${resetUrl}</a></p>
          <p style="color: #dc3545;"><strong>This link will expire in 1 hour for security reasons.</strong></p>
          <p>If you did not request this password reset, please ignore this email.</p>
          <p>Best regards,<br>Inventory Management Team</p>
        </div>
      `;

      return await this.sendEmail(userEmail, subject, text, html);
    } catch (error) {
      console.error('Send password reset email error:', error);
      throw new AppError('Failed to send password reset email', 500, 'PASSWORD_RESET_EMAIL_ERROR');
    }
  }

  // Send low stock alert email
  async sendLowStockAlert(recipients, lowStockItems, warehouseName = 'All Warehouses') {
    try {
      const subject = `Low Stock Alert - ${lowStockItems.length} Items Below Reorder Level`;
      
      let text = `Low Stock Alert for ${warehouseName}\n\n`;
      text += `${lowStockItems.length} items are currently below their reorder level:\n\n`;
      
      lowStockItems.forEach(item => {
        text += `- ${item.product_name} (${item.sku}): ${item.current_stock} ${item.unit || 'units'} remaining (Reorder level: ${item.reorder_level})\n`;
      });
      
      text += '\nPlease review and create purchase orders as needed.\n\n';
      text += 'Best regards,\nInventory Management System';

      let html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">🚨 Low Stock Alert</h2>
          <p><strong>Warehouse:</strong> ${warehouseName}</p>
          <p><strong>${lowStockItems.length} items</strong> are currently below their reorder level:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left;">Product</th>
                <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left;">SKU</th>
                <th style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">Current Stock</th>
                <th style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">Reorder Level</th>
              </tr>
            </thead>
            <tbody>
              ${lowStockItems.map(item => `
                <tr>
                  <td style="border: 1px solid #dee2e6; padding: 8px;">${item.product_name}</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px;">${item.sku}</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right; color: #dc3545; font-weight: bold;">
                    ${item.current_stock} ${item.unit || 'units'}
                  </td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${item.reorder_level}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <p>Please review and create purchase orders as needed.</p>
          <p>Best regards,<br>Inventory Management System</p>
        </div>
      `;

      return await this.sendEmail(recipients, subject, text, html);
    } catch (error) {
      console.error('Send low stock alert error:', error);
      throw new AppError('Failed to send low stock alert', 500, 'LOW_STOCK_ALERT_ERROR');
    }
  }

  // Send purchase order to supplier
  async sendPurchaseOrderToSupplier(supplierEmail, purchaseOrder, pdfAttachment = null) {
    try {
      const subject = `Purchase Order ${purchaseOrder.order_number} from ${config.company.name || 'Inventory Management System'}`;
      
      const text = `Dear ${purchaseOrder.suppliers.name},\n\n` +
        `Please find attached Purchase Order ${purchaseOrder.order_number}.\n\n` +
        `Order Details:\n` +
        `- Order Number: ${purchaseOrder.order_number}\n` +
        `- Order Date: ${new Date(purchaseOrder.created_at).toLocaleDateString()}\n` +
        `- Expected Delivery: ${purchaseOrder.expected_delivery_date ? new Date(purchaseOrder.expected_delivery_date).toLocaleDateString() : 'TBD'}\n` +
        `- Total Amount: $${purchaseOrder.total?.toFixed(2) || '0.00'}\n\n` +
        `Please confirm receipt of this order and provide delivery timeline.\n\n` +
        `Best regards,\n${config.company.name || 'Inventory Management System'}\n` +
        `${config.company.phone || ''}\n${config.company.email || ''}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Purchase Order ${purchaseOrder.order_number}</h2>
          <p>Dear ${purchaseOrder.suppliers.name},</p>
          <p>Please find attached Purchase Order ${purchaseOrder.order_number}.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Order Details</h3>
            <p><strong>Order Number:</strong> ${purchaseOrder.order_number}</p>
            <p><strong>Order Date:</strong> ${new Date(purchaseOrder.created_at).toLocaleDateString()}</p>
            <p><strong>Expected Delivery:</strong> ${purchaseOrder.expected_delivery_date ? new Date(purchaseOrder.expected_delivery_date).toLocaleDateString() : 'TBD'}</p>
            <p><strong>Total Amount:</strong> $${purchaseOrder.total?.toFixed(2) || '0.00'}</p>
          </div>
          
          <p>Please confirm receipt of this order and provide delivery timeline.</p>
          
          <hr style="margin: 30px 0;">
          <p>Best regards,<br>
          <strong>${config.company.name || 'Inventory Management System'}</strong><br>
          ${config.company.phone ? `Phone: ${config.company.phone}<br>` : ''}
          ${config.company.email ? `Email: ${config.company.email}` : ''}
          </p>
        </div>
      `;

      const attachments = [];
      if (pdfAttachment) {
        attachments.push({
          filename: `PO-${purchaseOrder.order_number}.pdf`,
          content: pdfAttachment,
          contentType: 'application/pdf'
        });
      }

      return await this.sendEmail(supplierEmail, subject, text, html, attachments);
    } catch (error) {
      console.error('Send purchase order email error:', error);
      throw new AppError('Failed to send purchase order email', 500, 'PO_EMAIL_ERROR');
    }
  }

  // Send report email
  async sendReportEmail(recipients, reportType, reportData, csvAttachment = null) {
    try {
      const subject = `${reportType} Report - ${new Date().toLocaleDateString()}`;
      
      const text = `Please find attached the ${reportType} report generated on ${new Date().toLocaleDateString()}.\n\n` +
        'This report was automatically generated by the Inventory Management System.\n\n' +
        'Best regards,\nInventory Management System';

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${reportType} Report</h2>
          <p>Please find attached the ${reportType} report generated on ${new Date().toLocaleDateString()}.</p>
          
          ${reportData.summary ? `
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Report Summary</h3>
              ${Object.entries(reportData.summary).map(([key, value]) => 
                `<p><strong>${key.replace(/_/g, ' ').toUpperCase()}:</strong> ${value}</p>`
              ).join('')}
            </div>
          ` : ''}
          
          <p><em>This report was automatically generated by the Inventory Management System.</em></p>
          <p>Best regards,<br>Inventory Management System</p>
        </div>
      `;

      const attachments = [];
      if (csvAttachment) {
        attachments.push({
          filename: `${reportType.toLowerCase().replace(/\s+/g, '_')}_report_${new Date().toISOString().split('T')[0]}.csv`,
          content: csvAttachment,
          contentType: 'text/csv'
        });
      }

      return await this.sendEmail(recipients, subject, text, html, attachments);
    } catch (error) {
      console.error('Send report email error:', error);
      throw new AppError('Failed to send report email', 500, 'REPORT_EMAIL_ERROR');
    }
  }

  // Send notification email
  async sendNotificationEmail(recipients, title, message, priority = 'normal') {
    try {
      const priorityColors = {
        low: '#28a745',
        normal: '#007bff',
        high: '#ffc107',
        urgent: '#dc3545'
      };

      const subject = priority === 'urgent' ? `🚨 URGENT: ${title}` : title;
      
      const text = `${title}\n\n${message}\n\nBest regards,\nInventory Management System`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${priorityColors[priority]}; color: white; padding: 15px; border-radius: 5px 5px 0 0;">
            <h2 style="margin: 0; color: white;">${priority === 'urgent' ? '🚨 ' : ''}${title}</h2>
          </div>
          <div style="border: 1px solid ${priorityColors[priority]}; border-top: none; padding: 20px; border-radius: 0 0 5px 5px;">
            <div style="white-space: pre-line;">${message}</div>
          </div>
          <p style="margin-top: 20px;">Best regards,<br>Inventory Management System</p>
        </div>
      `;

      return await this.sendEmail(recipients, subject, text, html);
    } catch (error) {
      console.error('Send notification email error:', error);
      throw new AppError('Failed to send notification email', 500, 'NOTIFICATION_EMAIL_ERROR');
    }
  }

  // Test email configuration
  async testEmailConfiguration() {
    try {
      if (!this.transporter) {
        throw new AppError('Email service not configured', 500, 'EMAIL_NOT_CONFIGURED');
      }

      const testResult = await this.transporter.verify();
      return { success: true, message: 'Email configuration is valid' };
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return { success: false, message: error.message };
    }
  }

  // Send test email
  async sendTestEmail(recipient) {
    try {
      const subject = 'Test Email - Inventory Management System';
      const text = 'This is a test email from the Inventory Management System. If you receive this, your email configuration is working correctly.';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">✅ Email Test Successful</h2>
          <p>This is a test email from the Inventory Management System.</p>
          <p>If you receive this, your email configuration is working correctly.</p>
          <p>Sent at: ${new Date().toLocaleString()}</p>
        </div>
      `;

      return await this.sendEmail(recipient, subject, text, html);
    } catch (error) {
      console.error('Send test email error:', error);
      throw new AppError('Failed to send test email', 500, 'TEST_EMAIL_ERROR');
    }
  }
}

module.exports = new EmailService();