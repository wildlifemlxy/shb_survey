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

    async sendResetPasswordEmail(email, resetLink = null) {
        try {
            const ResetPasswordTemplate = require('./ResetPassword');
            const template = new ResetPasswordTemplate();
            
            // Generate the email content
            const emailContent = template.generateResetEmailContent(email, resetLink);
            
            // Send the email
            const result = await this.sendEmail(
                email,
                emailContent.subject,
                emailContent.html,
                emailContent.text
            );

            return result;
        } catch (error) {
            console.error('Error sending reset password email:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to send reset password email'
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
