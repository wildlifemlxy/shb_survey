class MFAPasswordTemplate {
    constructor() {
        this.companyName = 'WWF SHB Survey System';
        this.supportEmail = 'mossleegermany@gmail.com';
        this.websiteUrl = process.env.FRONTEND_URL || 'https://gentle-dune-0405ec500.1.azurestaticapps.net';
        this.backendUrl = process.env.BACKEND_URL || 'https://shb-backend.azurewebsites.net';
        // Use frontend static URL for the logo (no download, no interaction)
        this.logoUrl = `https://ci3.googleusercontent.com/meips/ADKq_Nacqpcpt-_6DKQiXPyTz8CSRns_3-6DEBGoOWjFRZbrUgJ4uj4bwrN2tS9ed5Euf8gGmUdkyijp0u3C3E3iKmwrkqZiQkD23DASfB-CnX6FDdQq0jYhZyZBn0uPbVMuw3Wucsv4AwsNROlZgLHKpDs57iNgWiHRzXbZjszYazqX9TgzOWI3Wxyu8ZKhD4qKM_zGDuSMpT-JU8prJXHMYxZklpARsUevX-2uTSYGi0GHirWatwTUyg=s0-d-e1-ft#https://content.app-us1.com/cdn-cgi/image/format=auto,onerror=redirect,width=650,dpr=2,fit=scale-down/gv8MN/2021/09/22/0b8afc61-c414-4ece-a8eb-accfe9f54092.jpeg`;
    }

    generateMFAEmailContent(email, mfaCode, expirationMinutes = 10) {
        const subject = `🔐 ${this.companyName} - Your Authentication Code`;
        
        const htmlContent = this.generateMFAHTMLTemplate(email, mfaCode, expirationMinutes);

        return {
            subject: subject,
            html: htmlContent
        };
    }

    generateMFAHTMLTemplate(email, mfaCode, expirationMinutes) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multi-Factor Authentication Code</title>
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
        .mfa-code {
            background: linear-gradient(135deg, #00ECFA 0%, #00B8EA 100%);
            color: white;
            font-size: 36px;
            font-weight: bold;
            text-align: center;
            padding: 20px;
            margin: 20px 0;
            border-radius: 10px;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 14px;
            color: #666;
        }
        .security-notice {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
        .expire-notice {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
            color: #721c24;
            text-align: center;
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
            <h2>🔐 Your Authentication Code</h2>
            
            <p>Hello,</p>
            
            <p>A login attempt was made for your account (<strong>${email}</strong>) and requires multi-factor authentication.</p>
            
            <p>Please use the following authentication code to complete your login:</p>
            
            <div class="mfa-code">${mfaCode}</div>
            
            <div class="expire-notice">
                <strong>⏰ Important:</strong> This code will expire in <strong>${expirationMinutes} minutes</strong>
            </div>
            
            <p>Enter this code in your application to complete the authentication process.</p>
            
            <div class="security-notice">
                <strong>🔒 Security Notice:</strong>
                <ul>
                    <li>This code is only valid for ${expirationMinutes} minutes</li>
                    <li>If you didn't attempt to log in, please secure your account immediately</li>
                    <li>Never share this code with anyone</li>
                    <li>Our support team will never ask for this code</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Need Help?</strong></p>
            <p>If you didn't request this authentication code or are having trouble accessing your account, please contact our support team immediately at <a href="mailto:${this.supportEmail}">${this.supportEmail}</a></p>
            
            <p>Best regards,<br>
            The ${this.companyName} Security Team</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">
                This is an automated security email. Please do not reply to this message.
            </p>
        </div>
    </div>
</body>
</html>
        `;
    }

    // Method to generate a simple MFA notification email (text version)
    generateMFANotificationEmailContent(email, mfaCode, expirationMinutes = 10) {
        const subject = `🔐 ${this.companyName} - Authentication Code Required`;
        
        const htmlContent = this.generateMFAHTMLTemplate(email, mfaCode, expirationMinutes);
        
        const textContent = `
${this.companyName} - Authentication Code Required

Hello,

A login attempt was made for your account (${email}) and requires multi-factor authentication.

Your Authentication Code: ${mfaCode}

IMPORTANT: This code will expire in ${expirationMinutes} minutes.

Enter this code in your application to complete the authentication process.

SECURITY NOTICE:
- This code is only valid for ${expirationMinutes} minutes
- If you didn't attempt to log in, please secure your account immediately
- Never share this code with anyone
- Our support team will never ask for this code

Need Help?
If you didn't request this authentication code or are having trouble accessing your account, please contact our support team immediately at ${this.supportEmail}

Best regards,
The ${this.companyName} Security Team

---
This is an automated security email. Please do not reply to this message.
        `;

        return {
            subject: subject,
            html: htmlContent,
            text: textContent
        };
    }
}

module.exports = MFAPasswordTemplate;
