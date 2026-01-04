/**
 * Bot Configuration
 * Central configuration for Telegram bot settings
 */

// Load environment variables
require('dotenv').config();

module.exports = {
  // Bot token - Get from @BotFather in Telegram (stored in .env)
  BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  
  // Default chat IDs for sending messages (stored in .env)
  CHAT_IDS: [process.env.TELEGRAM_CHAT_ID],
  
  // Training material link (static)
  TRAINING_LINK: 'https://drive.google.com/drive/folders/1aztfMfCVlNGqro492FS-3gvdaRA6kCGk?usp=drive_link',
  
  // Button callback data prefixes
  CALLBACK: {
    JOIN: 'join_survey_',
    LEAVE: 'leave_survey_'
  },
  
  // Button text
  BUTTONS: {
    JOIN: '✅ Join',
    LEAVE: '❌ Leave'
  }
};
