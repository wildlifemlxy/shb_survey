const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // Email configuration - you'll need to set up your email service credentials
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            secure: true, // Use SSL
            auth: {
                user: process.env.EMAIL_USER || 'mossleegermany@gmail.com',
                pass: process.env.EMAIL_PASS || 'ttak lsry mfeq kepi' // Replace with Gmail App Password
            },
            tls: {
                rejectUnauthorized: false
            }
        });
    }

    async sendEmail(to, subject, htmlContent, textContent = '') {
        try {
            console.log('Sending email to:', to);
            
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'mossleegermany@gmail.com',
                to: to,
                subject: subject,
                text: textContent,
                html: htmlContent
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('Email sent successfully:', result.messageId);
            
            return {
                success: true,
                messageId: result.messageId,
                message: 'Email sent successfully'
            };
        } catch (error) {
            console.error('Error sending email:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to send email'
            };
        }
    }

    async sendFirstLoginCongratulationsEmail(email, userInfo = null) {
        try {
            const ResetPasswordTemplate = require('./ChangePassword');
            const template = new ResetPasswordTemplate();
            
            // Generate the congratulations email content
            // Pass userInfo object containing email, password, and name if available
            const emailContent = template.generateResetEmailContent(email, userInfo);
            
            // Send the email
            const result = await this.sendEmail(
                email,
                emailContent.subject,
                emailContent.html
            );

            return result;
        } catch (error) {
            console.error('Error sending first login congratulations email:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to send first login congratulations email'
            };
        }
    }

    // Keep the old method name for backward compatibility, but redirect to new functionality
    async sendResetPasswordEmail(email, resetLink = null) {
        return this.sendFirstLoginCongratulationsEmail(email, resetLink);
    }

    async sendMFAEmail(email, mfaCode, expirationMinutes = 10) {
        try {
            const MFAPasswordTemplate = require('./MFA');
            const template = new MFAPasswordTemplate();
            
            // Generate the MFA email content
            const emailContent = template.generateMFAEmailContent(email, mfaCode, expirationMinutes);
            
            // Send the email
            const result = await this.sendEmail(
                email,
                emailContent.subject,
                emailContent.html
            );

            return result;
        } catch (error) {
            console.error('Error sending MFA email:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to send MFA authentication email'
            };
        }
    }

    async sendMFANotificationEmail(email, mfaCode, expirationMinutes = 10) {
        try {
            const MFAPasswordTemplate = require('./MFA');
            const template = new MFAPasswordTemplate();
            
            // Generate the MFA notification email content (with both HTML and text)
            const emailContent = template.generateMFANotificationEmailContent(email, mfaCode, expirationMinutes);
            
            // Send the email
            const result = await this.sendEmail(
                email,
                emailContent.subject,
                emailContent.html,
                emailContent.text
            );

            return result;
        } catch (error) {
            console.error('Error sending MFA notification email:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to send MFA notification email'
            };
        }
    }

    async testConnection() {
        try {
            await this.transporter.verify();
            console.log('Email service connection verified successfully');
            return { success: true, message: 'Email service is ready' };
        } catch (error) {
            console.error('Email service connection failed:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = EmailService;
