class ResetPasswordTemplate {
    constructor() {
        this.companyName = 'WWF SHB Survey System';
        this.supportEmail = 'wildlifemlxy@gmail.com';
        this.websiteUrl = process.env.FRONTEND_URL || 'https://gentle-dune-0405ec500.1.azurestaticapps.net';
        this.backendUrl = process.env.BACKEND_URL || 'https://shb-backend.azurewebsites.net';
        // Use frontend static URL for the logo (no download, no interaction)
        this.logoUrl = `https://ci3.googleusercontent.com/meips/ADKq_Nacqpcpt-_6DKQiXPyTz8CSRns_3-6DEBGoOWjFRZbrUgJ4uj4bwrN2tS9ed5Euf8gGmUdkyijp0u3C3E3iKmwrkqZiQkD23DASfB-CnX6FDdQq0jYhZyZBn0uPbVMuw3Wucsv4AwsNROlZgLHKpDs57iNgWiHRzXbZjszYazqX9TgzOWI3Wxyu8ZKhD4qKM_zGDuSMpT-JU8prJXHMYxZklpARsUevX-2uTSYGi0GHirWatwTUyg=s0-d-e1-ft#https://content.app-us1.com/cdn-cgi/image/format=auto,onerror=redirect,width=650,dpr=2,fit=scale-down/gv8MN/2021/09/22/0b8afc61-c414-4ece-a8eb-accfe9f54092.jpeg`;
    }

    generateResetEmailContent(email, resetLink = null) {
        const subject = `${this.companyName} - Password Reset Request`;
        
        // If no reset link provided, use a generic message
        const resetUrl = resetLink || `${this.websiteUrl}/reset-password`;
        
        const htmlContent = this.generateHTMLTemplate(email, resetUrl);

        return {
            subject: subject,
            html: htmlContent
        };
    }

    generateHTMLTemplate(email, resetUrl) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Request</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .email-container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo img {
            max-width: 200px;
            height: auto;
            display: block;
            margin: 0 auto 10px auto;
        }
        .logo h1 {
            color: #00B8EA;
            margin: 0;
            font-size: 28px;
        }
        .content {
            margin-bottom: 30px;
        }
        .reset-button {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #00ECFA 0%, #00B8EA 100%);
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
        }
        .reset-button:hover {
            background: linear-gradient(135deg, #00B8EA 0%, #0099CC 100%);
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 14px;
            color: #666;
        }
        .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="logo">
            <img src="${this.logoUrl}" alt="WWF Logo" style="max-width: 200px; height: auto; display: block; margin: 0 auto 10px auto; pointer-events: none; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; -webkit-touch-callout: none; -webkit-user-drag: none; cursor: default;" oncontextmenu="return false;" ondragstart="return false;" onselectstart="return false;" onmousedown="return false;" />
            <h1>${this.companyName}</h1>
        </div>
        
        <div class="content">
            <h2>Password Reset Request</h2>
            
            <p>Hello,</p>
            
            <p>We received a request to reset the password for your account associated with <strong>${email}</strong>.</p>
            
            <p>If you requested this password reset, please click the button below to proceed:</p>
            
            <div style="text-align: center;">
                <a href="${resetUrl}" class="reset-button">Reset Your Password</a>
            </div>
            
            <p>Alternatively, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #00B8EA;">${resetUrl}</p>
            
            <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul>
                    <li>This link will expire in 1 hour for security reasons</li>
                    <li>If you didn't request this reset, please ignore this email</li>
                    <li>Never share this link with anyone</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Need Help?</strong></p>
            <p>If you're having trouble with the button above, or if you didn't request this password reset, please contact our support team at <a href="mailto:${this.supportEmail}">${this.supportEmail}</a></p>
            
            <p>Best regards,<br>
            The ${this.companyName} Team</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">
                This is an automated email. Please do not reply to this message.
            </p>
        </div>
    </div>
</body>
</html>
        `;
    }

    // Method to generate a simple notification email (without reset link)
    generateNotificationEmailContent(email) {
        const subject = `${this.companyName} - Password Reset Notification`;
        
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Notification</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .container { background-color: white; padding: 30px; border-radius: 10px; border: 1px solid #ddd; }
        .logo { text-align: center; margin-bottom: 30px; }
        .logo img { max-width: 200px; height: auto; display: block; margin: 0 auto 10px auto; }
        .logo h1 { color: #00B8EA; margin: 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <img src="${this.logoUrl}" alt="WWF Logo" style="max-width: 200px; height: auto; display: block; margin: 0 auto 10px auto; pointer-events: none; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;" oncontextmenu="return false;" ondragstart="return false;" />
            <h1>${this.companyName}</h1>
        </div>
        
        <h2>Password Reset Request Received</h2>
        
        <p>Hello,</p>
        
        <p>We received a password reset request for your account (${email}).</p>
        
        <p>Please contact our administrator or check with your system administrator for password reset assistance.</p>
        
        <p>If you didn't request this reset, please contact us immediately at ${this.supportEmail}</p>
        
        <p>Best regards,<br>The ${this.companyName} Team</p>
    </div>
</body>
</html>
        `;
        
        const textContent = `
${this.companyName} - Password Reset Notification

Hello,

We received a password reset request for your account (${email}).

Please contact our administrator or check with your system administrator for password reset assistance.

If you didn't request this reset, please contact us immediately at ${this.supportEmail}

Best regards,
The ${this.companyName} Team
        `;

        return {
            subject: subject,
            html: htmlContent,
            text: textContent
        };
    }
}

module.exports = ResetPasswordTemplate;
