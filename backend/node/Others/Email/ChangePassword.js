class ResetPasswordTemplate {
    constructor() {
        this.companyName = 'WWF SHB Survey System';
        this.supportEmail = 'mossleegermany@gmail.com';
        this.websiteUrl = process.env.FRONTEND_URL || 'https://gentle-dune-0405ec500.1.azurestaticapps.net';
        this.backendUrl = process.env.BACKEND_URL || 'https://shb-backend.azurewebsites.net';
        // Use frontend static URL for the logo (no download, no interaction)
        this.logoUrl = `https://ci3.googleusercontent.com/meips/ADKq_Nacqpcpt-_6DKQiXPyTz8CSRns_3-6DEBGoOWjFRZbrUgJ4uj4bwrN2tS9ed5Euf8gGmUdkyijp0u3C3E3iKmwrkqZiQkD23DASfB-CnX6FDdQq0jYhZyZBn0uPbVMuw3Wucsv4AwsNROlZgLHKpDs57iNgWiHRzXbZjszYazqX9TgzOWI3Wxyu8ZKhD4qKM_zGDuSMpT-JU8prJXHMYxZklpARsUevX-2uTSYGi0GHirWatwTUyg=s0-d-e1-ft#https://content.app-us1.com/cdn-cgi/image/format=auto,onerror=redirect,width=650,dpr=2,fit=scale-down/gv8MN/2021/09/22/0b8afc61-c414-4ece-a8eb-accfe9f54092.jpeg`;
    }

    generateResetEmailContent(email, resetLink = null) {
        const subject = `🎉 Welcome to ${this.companyName} - Congratulations on Your First Login!`;
        
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
        .celebration {
            background-color: #e8f5e8;
            border: 1px solid #4caf50;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
            color: #2e7d32;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="logo">
            <h1>🦅 ${this.companyName}</h1>
        </div>
        
        <div class="content">
            <h2>🎉 Congratulations on Your First Login!</h2>
            
            <p>Hello and Welcome!</p>
            
            <div class="celebration">
                <h3>🌟 You've Successfully Logged In! 🌟</h3>
                <p>Congratulations on completing your first login to the <strong>${this.companyName}</strong>!</p>
            </div>
            
            <p>We're thrilled to have you join our conservation community. Your account (<strong>${email}</strong>) is now active and ready to use.</p>
            
            <p>Here's what you can do next:</p>
            <ul>
                <li>🦅 Explore wildlife survey data and contribute to conservation efforts</li>
                <li>📊 Access detailed analytics and reports</li>
                <li>🌍 View interactive maps and ecological data</li>
                <li>👥 Connect with other conservation enthusiasts</li>
            </ul>
            
            <div style="text-align: center;">
                <a href="${this.websiteUrl}" class="reset-button">Start Exploring Now</a>
            </div>
            
            <div class="celebration">
                <strong>🎊 Welcome to the Team!</strong>
                <p>Together, we're making a difference in wildlife conservation and environmental protection.</p>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Need Help Getting Started?</strong></p>
            <p>If you have any questions or need assistance navigating the platform, please don't hesitate to contact our support team at <a href="mailto:${this.supportEmail}">${this.supportEmail}</a></p>
            
            <p>Welcome aboard!<br>
            The ${this.companyName} Team</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">
                This is an automated welcome email. We're excited to have you as part of our conservation community!
            </p>
        </div>
    </div>
</body>
</html>
        `;
    }

    // Method to generate a simple notification email (without reset link)
    generateNotificationEmailContent(email) {
        const subject = `🎉 Welcome to ${this.companyName} - First Login Celebration!`;
        
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome - First Login Celebration</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .container { background-color: white; padding: 30px; border-radius: 10px; border: 1px solid #ddd; }
        .logo { text-align: center; margin-bottom: 30px; }
        .logo img { max-width: 200px; height: auto; display: block; margin: 0 auto 10px auto; }
        .logo h1 { color: #00B8EA; margin: 0; }
        .celebration { background-color: #e8f5e8; border: 1px solid #4caf50; border-radius: 5px; padding: 15px; margin: 20px 0; color: #2e7d32; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <img src="${this.logoUrl}" alt="WWF Logo" style="max-width: 200px; height: auto; display: block; margin: 0 auto 10px auto; pointer-events: none; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;" oncontextmenu="return false;" ondragstart="return false;" />
            <h1>${this.companyName}</h1>
        </div>
        
        <h2>🎉 Congratulations on Your First Login!</h2>
        
        <p>Hello and Welcome!</p>
        
        <div class="celebration">
            <h3>🌟 You've Successfully Logged In! 🌟</h3>
            <p>Congratulations on completing your first login to our conservation platform!</p>
        </div>
        
        <p>We're excited to have you join our wildlife conservation community with your account (${email}).</p>
        
        <p>Your journey in conservation and environmental protection starts now. Explore survey data, contribute to wildlife research, and connect with fellow conservationists!</p>
        
        <p>If you have any questions or need assistance, please contact us at ${this.supportEmail}</p>
        
        <p>Welcome aboard!<br>The ${this.companyName} Team</p>
    </div>
</body>
</html>
        `;
        
        const textContent = `
🎉 Welcome to ${this.companyName} - First Login Celebration!

Hello and Welcome!

🌟 You've Successfully Logged In! 🌟
Congratulations on completing your first login to our conservation platform!

We're excited to have you join our wildlife conservation community with your account (${email}).

Your journey in conservation and environmental protection starts now. Explore survey data, contribute to wildlife research, and connect with fellow conservationists!

If you have any questions or need assistance, please contact us at ${this.supportEmail}

Welcome aboard!
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
