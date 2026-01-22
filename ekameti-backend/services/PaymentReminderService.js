const Kameti = require('../models/Kameti');
const User = require('../models/User');
const PayoutService = require('./PayoutService');
const { sendOTPEmail } = require('./emailService');

/**
 * Send payment reminder email to a member
 */
async function sendPaymentReminderEmail(memberEmail, memberName, kametiName, kametiId, amount) {
  try {
    const nodemailer = require('nodemailer');
    const transporter = (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) ?
      nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      }) : {
        sendMail: async (mailOptions) => {
          console.log('📧 EMAIL SIMULATION (No Gmail configured):');
          console.log('To:', mailOptions.to);
          console.log('Subject:', mailOptions.subject);
          return { messageId: `simulated-${Date.now()}@ekameti.local`, accepted: [mailOptions.to] };
        }
      };

    const mailOptions = {
      from: `"eKameti Admin" <${process.env.GMAIL_USER || 'noreply@ekameti.com'}>`,
      to: memberEmail,
      subject: `💰 Payment Reminder: ${kametiName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { padding: 40px 30px; }
            .greeting { font-size: 18px; color: #334155; margin-bottom: 20px; }
            .message { font-size: 16px; color: #64748b; margin-bottom: 30px; line-height: 1.6; }
            .amount-box { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center; }
            .amount { font-size: 32px; font-weight: bold; color: #92400e; }
            .cta-button { display: inline-block; background: #3b82f6; color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; }
            .footer p { color: #64748b; font-size: 14px; margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💰 Payment Reminder</h1>
            </div>
            <div class="content">
              <p class="greeting">Hello ${memberName || 'Member'}!</p>
              <p class="message">
                This is a friendly reminder that your payment for <strong>${kametiName}</strong> is still pending.
                Please complete your contribution to keep the kameti running smoothly.
              </p>
              <div class="amount-box">
                <div style="font-size: 14px; color: #92400e; margin-bottom: 8px;">Amount Due</div>
                <div class="amount">Rs. ${amount.toLocaleString()}</div>
              </div>
              <p class="message">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/kameti/${kametiId}" class="cta-button">Pay Now</a>
              </p>
            </div>
            <div class="footer">
              <p><strong>eKameti</strong> - Your Trusted Kameti Platform</p>
              <p>This is an automated reminder. If you've already paid, please ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hello ${memberName || 'Member'}!\n\nYour payment for ${kametiName} is still pending. Amount: Rs. ${amount.toLocaleString()}\n\nPay now: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/kameti/${kametiId}\n\nIf you've already paid, please ignore this email.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Payment reminder email sent to ${memberEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Error sending payment reminder email to ${memberEmail}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send in-app notification to a user
 */
async function sendPaymentReminderNotification(userId, memberEmail, kametiName, kametiId, amount) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log(`⚠️ User not found for notification: ${memberEmail}`);
      return { success: false, error: 'User not found' };
    }

    const notification = {
      type: 'payment_reminder',
      title: '💰 Payment Reminder',
      message: `Your payment of Rs. ${amount.toLocaleString()} for "${kametiName}" is still pending. Please complete your contribution.`,
      data: {
        kametiId,
        kametiName,
        amount,
        timestamp: new Date()
      },
      read: false,
      createdAt: new Date()
    };

    if (!user.notifications) {
      user.notifications = [];
    }
    user.notifications.unshift(notification);
    
    // Keep only last 50 notifications
    if (user.notifications.length > 50) {
      user.notifications = user.notifications.slice(0, 50);
    }

    await user.save();
    console.log(`✅ Payment reminder notification sent to ${memberEmail}`);
    return { success: true, notification };
  } catch (error) {
    console.error(`❌ Error sending payment reminder notification to ${memberEmail}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send payment reminders to all unpaid members (called when someone pays)
 */
async function sendPaymentReminders(kametiId, notifyAdmin = true) {
  try {
    const kameti = await Kameti.findOne({ kametiId });
    if (!kameti) {
      return { message: 'Kameti not found', remindersSent: 0, unpaidCount: 0, reminders: [] };
    }

    const unpaidMembers = kameti.members?.filter(m => m.paymentStatus !== 'paid') || [];
    
    if (unpaidMembers.length === 0) {
      return {
        message: 'No unpaid members',
        remindersSent: 0,
        unpaidCount: 0,
        reminders: []
      };
    }

    const results = [];
    for (const member of unpaidMembers) {
      // Send email
      const emailResult = await sendPaymentReminderEmail(
        member.email,
        member.name,
        kameti.name,
        kametiId,
        kameti.amount
      );

      // Send in-app notification
      let notificationResult = { success: false };
      if (member.userId) {
        notificationResult = await sendPaymentReminderNotification(
          member.userId,
          member.email,
          kameti.name,
          kametiId,
          kameti.amount
        );
      }

      results.push({
        email: member.email,
        name: member.name,
        emailSent: emailResult.success,
        notificationSent: notificationResult.success
      });
    }

    console.log(`✅ Payment reminders sent to ${unpaidMembers.length} unpaid member(s) for kameti ${kametiId}`);

    return {
      message: `Reminders sent to ${unpaidMembers.length} unpaid member(s)`,
      remindersSent: unpaidMembers.length,
      unpaidCount: unpaidMembers.length,
      reminders: results
    };
  } catch (error) {
    console.error('❌ Error sending payment reminders:', error.message);
    return {
      message: 'Failed to send reminders',
      remindersSent: 0,
      unpaidCount: 0,
      reminders: [],
      error: error.message
    };
  }
}

/**
 * Send admin notification when round is ready for payout
 */
async function sendAdminRoundReadyNotification(kametiId) {
  try {
    const kameti = await Kameti.findOne({ kametiId });
    if (!kameti) {
      return { success: false, error: 'Kameti not found' };
    }

    const admin = await User.findById(kameti.createdBy);
    if (!admin) {
      return { success: false, error: 'Admin not found' };
    }

    const readiness = await PayoutService.checkRoundReadiness(kametiId);
    const eligibleRecipients = await PayoutService.getEligibleRecipients(kametiId);

    // Send in-app notification
    const notification = {
      type: 'round_ready',
      title: '🎉 Round Ready for Payout',
      message: `All members have paid for Round ${readiness.round} of "${kameti.name}". You can now process the payout.`,
      data: {
        kametiId,
        kametiName: kameti.name,
        round: readiness.round,
        poolAmount: readiness.poolAmount,
        eligibleRecipients: eligibleRecipients.length,
        timestamp: new Date()
      },
      read: false,
      createdAt: new Date()
    };

    if (!admin.notifications) {
      admin.notifications = [];
    }
    admin.notifications.unshift(notification);
    
    // Keep only last 50 notifications
    if (admin.notifications.length > 50) {
      admin.notifications = admin.notifications.slice(0, 50);
    }

    await admin.save();
    console.log(`✅ Round ready notification sent to admin ${admin.email} for kameti ${kametiId}`);

    // Send email to admin
    try {
      const transporter = require('nodemailer').createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      const mailOptions = {
        from: `"eKameti" <${process.env.GMAIL_USER || 'noreply@ekameti.com'}>`,
        to: admin.email,
        subject: `🎉 Round Ready: ${kameti.name}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; }
              .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 20px; text-align: center; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { padding: 40px 30px; }
              .message { font-size: 16px; color: #64748b; margin-bottom: 30px; line-height: 1.6; }
              .info-box { background: #ecfdf5; border: 2px solid #059669; border-radius: 8px; padding: 20px; margin: 30px 0; }
              .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
              .cta-button { display: inline-block; background: #3b82f6; color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }
              .footer { background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Round Ready for Payout</h1>
              </div>
              <div class="content">
                <p class="message">
                  Great news! All members have completed their payments for <strong>Round ${readiness.round}</strong> of "${kameti.name}".
                </p>
                <div class="info-box">
                  <div class="info-row">
                    <span><strong>Round:</strong></span>
                    <span>${readiness.round} of ${readiness.totalRounds}</span>
                  </div>
                  <div class="info-row">
                    <span><strong>Pool Amount:</strong></span>
                    <span>Rs. ${readiness.poolAmount.toLocaleString()}</span>
                  </div>
                  <div class="info-row">
                    <span><strong>Eligible Recipients:</strong></span>
                    <span>${eligibleRecipients.length}</span>
                  </div>
                </div>
                <p class="message">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/payouts/${kametiId}" class="cta-button">Process Payout Now</a>
                </p>
              </div>
              <div class="footer">
                <p><strong>eKameti</strong> - Your Trusted Kameti Platform</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Round Ready for Payout!\n\nAll members have paid for Round ${readiness.round} of "${kameti.name}".\n\nPool Amount: Rs. ${readiness.poolAmount.toLocaleString()}\nEligible Recipients: ${eligibleRecipients.length}\n\nProcess payout: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/payouts/${kametiId}`
      };

      const emailInfo = await transporter.sendMail(mailOptions);
      console.log(`✅ Round ready email sent to admin ${admin.email}:`, emailInfo.messageId);
    } catch (emailError) {
      console.error(`⚠️ Failed to send round ready email to admin:`, emailError.message);
    }

    return { success: true, notification, emailSent: true };
  } catch (error) {
    console.error('❌ Error sending admin round ready notification:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Auto-send reminders if needed (called by payout routes)
 */
async function autoSendRemindersIfNeeded(kametiId) {
  return sendPaymentReminders(kametiId, true);
}

module.exports = {
  sendPaymentReminders,
  sendPaymentReminderEmail,
  sendPaymentReminderNotification,
  sendAdminRoundReadyNotification,
  autoSendRemindersIfNeeded
};
