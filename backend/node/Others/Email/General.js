const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // Gmail OAuth2 configuration
        // Set these environment variables in your .env file or deployment environment:
        //   GMAIL_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.GMAIL_USER || 'wildlifemlxy@gmail.com',
                clientId: process.env.GMAIL_CLIENT_ID || '389626720765-5n54fet0fftskf03e89t97gjnu1r7rbt.apps.googleusercontent.com',
                clientSecret: process.env.GMAIL_CLIENT_SECRET || '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',
                refreshToken: process.env.GMAIL_REFRESH_TOKEN || 'YOUR_REFRESH_TOKEN_HERE', // <-- Replace with your refresh token
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
