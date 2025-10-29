// Email Service using Gmail SMTP with Nodemailer (with fallback)
const nodemailer = require('nodemailer');

// Create Gmail transporter or fallback
const createTransporter = () => {
  // Check if Gmail credentials are available
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    console.log('📧 Using Gmail SMTP for emails');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD, // App Password, not regular password
      },
    });
  } else {
    console.log('⚠️ Gmail credentials not found, using email simulation');
    // Return a fallback transporter that logs emails instead of sending them
    return {
      sendMail: async (mailOptions) => {
        console.log('📧 EMAIL SIMULATION (No Gmail configured):');
        console.log('=====================================');
        console.log('To:', mailOptions.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Content:', mailOptions.text);
        console.log('=====================================');
        
        // Simulate successful email sending
        return {
          messageId: `simulated-${Date.now()}@ekameti.local`,
          accepted: [mailOptions.to],
          rejected: [],
          pending: [],
          response: 'Email simulated successfully'
        };
      }
    };
  }
};

/**
 * Send OTP Email
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - OTP code
 * @param {string} userName - User's name (optional)
 */
const sendOTPEmail = async (toEmail, otp, userName = 'User') => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"eKameti" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: 'Your eKameti Verification Code 🔐',
      text: `Hello ${userName},\n\nYour OTP code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.\n\nBest regards,\neKameti Team`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f8fafc;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%);
              padding: 40px 20px;
              text-align: center;
            }
            .header h1 {
              color: white;
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 40px 30px;
              text-align: center;
            }
            .greeting {
              font-size: 18px;
              color: #334155;
              margin-bottom: 20px;
            }
            .message {
              font-size: 16px;
              color: #64748b;
              margin-bottom: 30px;
              line-height: 1.6;
            }
            .otp-box {
              background: #f1f5f9;
              border: 2px dashed #3b82f6;
              border-radius: 8px;
              padding: 20px;
              margin: 30px 0;
            }
            .otp-code {
              font-size: 36px;
              font-weight: bold;
              color: #1e40af;
              letter-spacing: 8px;
              font-family: 'Courier New', monospace;
            }
            .expiry {
              font-size: 14px;
              color: #ef4444;
              margin-top: 15px;
            }
            .footer {
              background: #f8fafc;
              padding: 20px 30px;
              text-align: center;
              border-top: 1px solid #e2e8f0;
            }
            .footer p {
              color: #64748b;
              font-size: 14px;
              margin: 5px 0;
            }
            .warning {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              text-align: left;
            }
            .warning p {
              color: #92400e;
              font-size: 14px;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 eKameti Verification</h1>
            </div>
            <div class="content">
              <p class="greeting">Hello ${userName}!</p>
              <p class="message">
                You've requested a verification code to access your eKameti account. 
                Use the code below to complete your verification:
              </p>
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
                <p class="expiry">⏰ This code expires in 10 minutes</p>
              </div>
              <div class="warning">
                <p><strong>⚠️ Security Notice:</strong> If you didn't request this code, please ignore this email and ensure your account is secure.</p>
              </div>
            </div>
            <div class="footer">
              <p><strong>eKameti</strong> - Your Trusted Kameti Platform</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ OTP Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending OTP email:', error.message);
    throw new Error('Failed to send OTP email: ' + error.message);
  }
};

/**
 * Send Welcome Email
 * @param {string} toEmail - Recipient email address
 * @param {string} userName - User's name
 */
const sendWelcomeEmail = async (toEmail, userName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"eKameti" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: 'Welcome to eKameti! 🎉',
      text: `Welcome to eKameti, ${userName}!\n\nThank you for joining our platform. Start saving with kametis today!\n\nBest regards,\neKameti Team`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; }
            .header { background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 32px; }
            .content { padding: 40px 30px; text-align: center; }
            .welcome-text { font-size: 18px; color: #334155; margin-bottom: 20px; }
            .cta-button { display: inline-block; background: #3b82f6; color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; }
            .footer p { color: #64748b; font-size: 14px; margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to eKameti!</h1>
            </div>
            <div class="content">
              <p class="welcome-text">Hello ${userName}!</p>
              <p>Thank you for joining eKameti, your trusted platform for managing kametis.</p>
              <p>Start your savings journey today by creating or joining a kameti!</p>
              <a href="http://localhost:5173/dashboard" class="cta-button">Get Started</a>
            </div>
            <div class="footer">
              <p><strong>eKameti</strong> - Your Trusted Kameti Platform</p>
              <p>Need help? Contact us at ${process.env.GMAIL_USER}</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error.message);
    throw new Error('Failed to send welcome email: ' + error.message);
  }
};

/**
 * Send Password Reset Email
 * @param {string} toEmail - Recipient email address
 * @param {string} userName - User's name
 * @param {string} resetToken - Password reset token
 */
const sendPasswordResetEmail = async (toEmail, userName, resetToken) => {
  const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;
  
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"eKameti" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: 'Reset Your eKameti Password 🔒',
      text: `Hello ${userName},\n\nYou requested to reset your password. Click the link below:\n\n${resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\neKameti Team`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; }
            .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { padding: 40px 30px; text-align: center; }
            .reset-button { display: inline-block; background: #3b82f6; color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; }
            .footer p { color: #64748b; font-size: 14px; margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello ${userName}!</p>
              <p>We received a request to reset your password. Click the button below to reset it:</p>
              <a href="${resetLink}" class="reset-button">Reset Password</a>
              <p style="color: #ef4444; font-size: 14px; margin-top: 20px;">⏰ This link expires in 1 hour</p>
              <p style="color: #64748b; font-size: 14px; margin-top: 20px;">If you didn't request this, please ignore this email.</p>
            </div>
            <div class="footer">
              <p><strong>eKameti</strong> - Your Trusted Kameti Platform</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error.message);
    throw new Error('Failed to send password reset email: ' + error.message);
  }
};

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail
};
