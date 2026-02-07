/**
 * Survey Registration Bot
 * Handles survey event registration with inline buttons
 * - Displays survey message with event details
 * - Shows Join/Leave buttons
 * - Handles button responses and updates participant list
 */

const TelegramApi = require('../../utils/telegramApi');
const { buildSurveyMessage, formatEventDate } = require('../../utils/messageTemplates');
const EventsController = require('../../../Controller/Events/eventsController');
const TelegramController = require('../../../Controller/Telegram/telegramController');
const parseCustomDate = require('../../../cron/parseCustomDate');

class RegistrationBot {
  constructor() {
    this.telegramApi = null;
    this.config = null;
    this.app = null;
    this.isPolling = false;
    this.lastUpdateId = 0;
    this.eventsController = new EventsController();
    this.telegramController = new TelegramController();
    this.botUsername = null; // Store bot username for command filtering
  }

  /**
   * Check if running on Azure (production)
   */
  isAzureEnvironment() {
    // Check multiple Azure environment indicators OR NODE_ENV=production
    const isAzure = !!(
      process.env.WEBSITE_HOSTNAME || 
      process.env.WEBSITE_SITE_NAME ||
      process.env.WEBSITE_INSTANCE_ID ||
      process.env.NODE_ENV === 'production'
    );
    console.log('Azure environment check:', {
      WEBSITE_HOSTNAME: process.env.WEBSITE_HOSTNAME || 'not set',
      NODE_ENV: process.env.NODE_ENV || 'not set',
      isAzure: isAzure
    });
    return isAzure;
  }

  /**
   * Get the webhook base URL for Azure
   */
  getWebhookBaseUrl() {
    // Use WEBSITE_HOSTNAME if available, otherwise use hardcoded Azure URL
    const hostname = process.env.WEBSITE_HOSTNAME || 'shb-backend.azurewebsites.net';
    return `https://${hostname}`;
  }

  /**
   * Initialize the bot with config
   */
  async initialize(app, io, config) {
    // Check if bot token is available
    if (!config.BOT_TOKEN) {
      console.error('❌ TELEGRAM_BOT_TOKEN not set - Telegram bot disabled');
      return;
    }
    
    this.config = config;
    this.app = app;
    this.telegramApi = new TelegramApi(config.BOT_TOKEN);
    this.io = io;
    
    // Fetch and store the bot's username for command filtering
    try {
      const botInfo = await this.telegramApi.getMe();
      if (botInfo.ok && botInfo.result?.username) {
        this.botUsername = botInfo.result.username;
        console.log(`Bot username: @${this.botUsername}`);
      }
    } catch (err) {
      console.error('Failed to fetch bot info:', err.message);
    }
    
    // Set Socket.IO on the controller for real-time updates
    this.telegramController.setSocketIO(io);
    
    // Set the storeChatHistory function on telegramApi so all sent messages are stored
    this.telegramApi.setStoreChatHistory(
      this.telegramController.storeChatHistory.bind(this.telegramController)
    );
    
    console.log('Registration Bot initialized');
    console.log('Environment:', this.isAzureEnvironment() ? 'Azure' : 'Local');
    
    // Set bot commands (shows menu when user types /)
    await this.setBotCommands();
    
    // Use webhook on Azure, polling locally
    if (this.isAzureEnvironment()) {
      console.log('Azure environment detected - using webhook');
      await this.setupWebhook(app);
    } else {
      console.log('Local environment detected - using polling');
      // Delete any existing webhook before starting polling
      try {
        await this.telegramApi.deleteWebhook(true); // drop pending updates
        console.log('Webhook deleted, waiting for Telegram to process...');
        // Small delay to ensure Telegram has processed the webhook deletion
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Starting polling mode');
      } catch (err) {
        console.log('No webhook to delete or error:', err.message);
      }
      this.startPolling();
    }
    
    // Proper cleanup when server stops
    const cleanup = async () => {
      console.log('Stopping bot...');
      this.stopPolling();
      process.exit(0);
    };
    
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  /**
   * Set bot commands (shows in menu when user types /)
   */
  async setBotCommands() {
    try {
      const commands = [
        { command: 'start', description: 'Start the bot and subscribe to updates' },
        { command: 'help', description: 'Show available commands' },
        { command: 'upcoming', description: 'View upcoming survey events' },
        { command: 'checkreminders', description: 'Check pending reminders (admin)' }
      ];
      
      // Set commands for all private chats (default)
      await this.telegramApi.setMyCommands(commands);
      
      // Set commands for all group chats
      await this.telegramApi.setMyCommands(commands, { type: 'all_group_chats' });
      
      // Set commands for all chat administrators in groups
      await this.telegramApi.setMyCommands(commands, { type: 'all_chat_administrators' });
      
      console.log('✅ Bot commands menu set for all chat types');
    } catch (error) {
      console.error('Failed to set bot commands:', error.message);
    }
  }

  /**
   * Start polling for Telegram updates (local development)
   */
  startPolling() {
    if (this.isPolling) {
      return; // Already polling
    }
    
    this.isPolling = true;
    console.log('Starting Telegram polling for button responses...');
    
    // Use recursive polling instead of setInterval for long polling
    this.pollLoop();
  }

  /**
   * Continuous polling loop using long polling
   */
  async pollLoop() {
    console.log('Poll loop started, isPolling:', this.isPolling);
    while (this.isPolling) {
      try {
        await this.processUpdates();
      } catch (error) {
        // Silently ignore 409 conflicts (Azure instance running)
        if (error.message && error.message.includes('409')) {
          console.log('409 Conflict detected - Azure instance may be running. Retrying in 5s...');
          // Wait a bit before retrying on conflict
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
        if (!error.message.includes('timeout')) {
          console.error('Polling error:', error.message);
        }
        // Small delay before retrying on error
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    console.log('Poll loop ended');
  }

  /**
   * Stop polling
   */
  stopPolling() {
    this.isPolling = false;
    console.log('Polling stopped');
  }

  /**
   * Process Telegram updates (for polling mode)
   */
  async processUpdates() {
    try {
      // Use 30 second timeout for long polling (Telegram recommended)
      const result = await this.telegramApi.getUpdates(this.lastUpdateId + 1, 30);
      
      if (!result.ok || !result.result || result.result.length === 0) {
        return;
      }

      console.log(`📥 Received ${result.result.length} update(s) from Telegram`);
      
      for (const update of result.result) {
        this.lastUpdateId = update.update_id;
        console.log(`Processing update ${update.update_id}`);
        
        if (update.callback_query) {
          console.log('📥 Processing callback_query:', update.callback_query.data);
          await this.handleCallbackQuery(update.callback_query);
        }
        
        if (update.message && update.message.text) {
          console.log('📥 Processing message:', update.message.text);
          await this.handleMessage(update.message);
        }
      }
    } catch (error) {
      if (!error.message.includes('timeout')) {
        if (error.message.includes('409') || error.message.includes('Conflict')) {
          throw error; // Re-throw to handle in pollLoop
        }
        console.error('Error processing updates:', error.message);
      }
    }
  }

  /**
   * Setup webhook for receiving Telegram updates (Azure)
   */
  async setupWebhook(app) {
    const tokenHash = require('crypto').createHash('sha256').update(this.config.BOT_TOKEN).digest('hex').substring(0, 16);
    const webhookPath = `/${tokenHash}`; // Just the hash, router handles /telegram/webhook prefix
    const fullWebhookPath = `/telegram/webhook/${tokenHash}`;
    const baseUrl = this.getWebhookBaseUrl();
    const webhookUrl = `${baseUrl}${fullWebhookPath}`;
    
    console.log(`Setting up webhook at: ${webhookUrl}`);
    console.log(`Webhook path: ${fullWebhookPath}`);
    
    // Use the pre-registered router from app.js to avoid 404 handler issue
    const webhookRouter = app.telegramWebhookRouter;
    if (!webhookRouter) {
      console.error('❌ telegramWebhookRouter not found in app - webhook will not work');
      return;
    }
    
    // Register webhook route on the router
    webhookRouter.post(webhookPath, async (req, res) => {
      console.log('📨 Webhook received update:', JSON.stringify(req.body).substring(0, 200));
      try {
        const update = req.body;
        
        if (!update || Object.keys(update).length === 0) {
          console.log('⚠️ Empty webhook body');
          return res.sendStatus(200);
        }
        
        if (update.callback_query) {
          console.log('📨 Processing callback_query');
          await this.handleCallbackQuery(update.callback_query);
        }
        
        if (update.message && update.message.text) {
          console.log('📨 Processing message:', update.message.text);
          await this.handleMessage(update.message);
        }
        
        res.sendStatus(200);
      } catch (error) {
        console.error('Webhook error:', error.message, error.stack);
        res.sendStatus(200);
      }
    });
    
    console.log(`✅ Webhook route registered: POST ${fullWebhookPath}`);
    
    // Delete existing webhook and set fresh one
    try {
      console.log('Deleting existing webhook...');
      await this.telegramApi.deleteWebhook(true);
      console.log('Setting new webhook...');
      const result = await this.telegramApi.setWebhook(webhookUrl);
      console.log('Webhook setup result:', result);
      
      // Verify webhook was set correctly
      const info = await this.telegramApi.getWebhookInfo();
      console.log('Webhook info:', info);
    } catch (error) {
      console.error('Failed to set webhook:', error.message);
    }
  }

  /**
   * Handle text messages (commands like /start, /help)
   */
  async handleMessage(message) {
    const { chat, text, from } = message;
    const chatId = chat.id;
    const chatType = chat.type; // 'private', 'group', or 'supergroup'
    const userName = `${from.first_name || ''} ${from.last_name || ''}`.trim() || from.username || from.id;
    const botToken = this.config?.BOT_TOKEN || null;
    
    console.log(`Message from ${userName} in ${chatType}: ${text}`);

    // Store user message in chat history
    if (botToken) {
      await this.telegramController.storeChatHistory(botToken, chatId, text, 'user', userName);
    }

    // Extract command and bot username from text (handles both /command and /command@botusername in groups)
    const commandParts = text.split(' ')[0].split('@');
    const command = commandParts[0].toLowerCase();
    const targetBotUsername = commandParts[1]?.toLowerCase(); // e.g., 'wwf_animal_id_bot'
    
    // If command targets a specific bot, check if it's for this bot
    if (targetBotUsername && this.botUsername) {
      if (targetBotUsername !== this.botUsername.toLowerCase()) {
        console.log(`Ignoring command for different bot: @${targetBotUsername} (this bot: @${this.botUsername})`);
        return; // Ignore commands meant for other bots
      }
    }

    // Handle /start command
    if (command === '/start') {
      await this.handleStartCommand(chatId, userName, chatType, chat.title);
    }
    // Handle /help command
    else if (command === '/help') {
      await this.handleHelpCommand(chatId, chatType);
    }
    // Handle /upcoming command - show upcoming events
    else if (command === '/upcoming') {
      await this.handleUpcomingCommand(chatId);
    }
    // Handle /checkreminders command - check and optionally send pending reminders
    else if (command === '/checkreminders') {
      await this.handleCheckRemindersCommand(chatId, text);
    }
  }

  /**
   * Handle /start command
   */
  async handleStartCommand(chatId, userName, chatType = 'private', chatTitle = null) {
    // Save user/group as subscriber so they receive future announcements
    // Pass the bot token to link subscriber to this specific bot
    const botToken = this.config?.BOT_TOKEN || null;
    
    // For groups, use the group title; for private chats, use the user name
    const isGroup = chatType === 'group' || chatType === 'supergroup';
    const displayName = isGroup ? (chatTitle || `Group ${chatId}`) : userName;
    
    await this.telegramController.addSubscriber(chatId, displayName, botToken, chatType);
    
    let welcomeMessage;
    // Build commands list with @bot suffix for group chats
    const botSuffix = this.botUsername ? `@${this.botUsername}` : '';
    
    if (isGroup) {
      // Group welcome message - show commands with @bot format for groups
      welcomeMessage = `👋 Hello everyone!

I'm the <b>SHB Survey Registration Bot</b>.

I'll post upcoming Straw-headed Bulbul survey events here. When a survey is posted, you can click the <b>✅ Join</b> or <b>❌ Leave</b> buttons to register.

<b>Commands:</b>
/upcoming${botSuffix} - View upcoming survey events
/help${botSuffix} - Show available commands`;
    } else {
      // Private chat welcome message - no @bot suffix needed for private chats
      welcomeMessage = `👋 Welcome <b>${userName}</b>!

I'm the <b>SHB Survey Registration Bot</b>.

I help you register for upcoming Straw-headed Bulbul survey events.

<b>Commands:</b>
/upcoming - View upcoming survey events
/help - Show available commands

When a survey is posted, you can click the <b>✅ Join</b> or <b>❌ Leave</b> buttons to register or unregister.`;
    }

    try {
      await this.telegramApi.sendMessage(chatId, welcomeMessage);
      console.log(`Sent welcome message to ${chatType} chat ${chatId}`);
    } catch (error) {
      console.error('Error sending welcome message:', error.message);
    }
  }

  /**
   * Handle /help command
   */
  async handleHelpCommand(chatId, chatType) {
    const isGroup = chatType === 'group' || chatType === 'supergroup';
    const botSuffix = isGroup && this.botUsername ? `@${this.botUsername}` : '';
    
    const helpMessage = `<b>📋 Available Commands:</b>

/start${botSuffix} - Show welcome message
/help${botSuffix} - Show this help message
/upcoming${botSuffix} - View upcoming survey events
/checkreminders${botSuffix} - Check pending reminders

<b>How to register:</b>
When a survey is posted, click:
• <b>✅ Join</b> - to register for the survey
• <b>❌ Leave</b> - to unregister from the survey

Your name will be automatically added/removed from the participant list.

<b>Admin:</b>
Use <code>/checkreminders send</code> to send all pending reminders.`;

    try {
      await this.telegramApi.sendMessage(chatId, helpMessage);
    } catch (error) {
      console.error('Error sending help message:', error.message);
    }
  }

  /**
   * Handle /upcoming command - show upcoming events grouped by organizer
   */
  async handleUpcomingCommand(chatId) {
    try {
      const result = await this.eventsController.getAllEvents();
      const events = result.events || [];
      
      // Filter for upcoming events
      const upcomingEvents = events.filter(e => e.Type === 'Upcoming');
      
      if (upcomingEvents.length === 0) {
        await this.telegramApi.sendMessage(chatId, '📅 No upcoming survey events at the moment.\n\nStay tuned for announcements!');
        return;
      }

      // Get current month and year for header
      const now = new Date();
      const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      // Check if there's already a pinned message with upcoming events header in the chat
      try {
        const chatInfo = await this.telegramApi.getChat(chatId);
        if (chatInfo.ok && chatInfo.result && chatInfo.result.pinned_message) {
          const pinnedMessage = chatInfo.result.pinned_message;
          const pinnedText = pinnedMessage.text || '';
          
          // Check if pinned message contains the exact upcoming events header with current month/year
          const expectedHeader = `📅 Upcoming Survey Events - ${monthYear}`;
          if (pinnedText.includes(expectedHeader)) {
            console.log(`Found existing pinned upcoming events message for ${monthYear} (ID: ${pinnedMessage.message_id})`);
            
            // Store the pinned message ID for future updates
            await this.telegramController.updatePinnedMessageId(chatId, pinnedMessage.message_id);
            
            // Build the new message content
            const newMessage = this.buildUpcomingMessage(upcomingEvents, monthYear);
            
            // Try to update the existing pinned message
            try {
              await this.telegramApi.editMessageText(chatId, pinnedMessage.message_id, newMessage);
              console.log(`Updated existing pinned message`);
            } catch (editError) {
              // If "message is not modified" - content is same, that's OK
              if (editError.response?.data?.description?.includes('message is not modified')) {
                console.log('Pinned message content unchanged');
              } else {
                console.error('Error updating pinned message:', editError.message);
              }
            }
            
            // Tell user to check the pinned message
            await this.telegramApi.sendMessage(chatId, '📌 Please see the pinned message for upcoming events.');
            
            return;
          }
        }
      } catch (chatError) {
        console.log('Could not check pinned message:', chatError.message);
      }

      // No pinned upcoming events message found - create new one
      const message = this.buildUpcomingMessage(upcomingEvents, monthYear);
      const sentMessage = await this.telegramApi.sendMessage(chatId, message);
      
      // Store the message ID for future updates (regardless of pin success)
      if (sentMessage.ok && sentMessage.result && sentMessage.result.message_id) {
        // Store the message ID first so live updates work even if pinning fails
        await this.telegramController.updatePinnedMessageId(chatId, sentMessage.result.message_id);
        console.log(`Stored message ID ${sentMessage.result.message_id} for chat ${chatId}`);
        
        // Try to auto-pin the message (silently, without notification)
        try {
          await this.telegramApi.pinChatMessage(chatId, sentMessage.result.message_id, true);
          console.log(`Pinned new upcoming events message in chat ${chatId}`);
        } catch (pinError) {
          console.error('Error pinning message (bot may need admin rights):', pinError.message);
          // Message ID is already stored, so live updates will still work
        }
      }
    } catch (error) {
      console.error('Error fetching upcoming events:', error.message);
      await this.telegramApi.sendMessage(chatId, '❌ Error fetching upcoming events. Please try again later.');
    }
  }

  /**
   * Parse date string to Date object for sorting
   * Handles formats like "17/1/2026", "19/01/2026", etc.
   */
  parseEventDate(dateStr) {
    if (!dateStr || dateStr === 'TBD') return new Date(9999, 11, 31); // TBD goes to end
    
    // Handle DD/MM/YYYY or D/M/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date(dateStr);
  }

  /**
   * Build the upcoming events message grouped by organizer
   */
  buildUpcomingMessage(upcomingEvents, monthYear) {
    // Group events by Organizer
    const eventsByOrganizer = {};
    for (const event of upcomingEvents) {
      const organizer = event.Organizer || 'Unassigned';
      if (!eventsByOrganizer[organizer]) {
        eventsByOrganizer[organizer] = [];
      }
      eventsByOrganizer[organizer].push(event);
    }

    let message = `<b>📅 Upcoming Survey Events - ${monthYear}</b>\n`;
    
    // Define the preferred order of organizers (WWF-led first, then Volunteer-led, then others)
    const preferredOrder = ['WWF-led', 'Volunteer-led'];
    const sortedOrganizers = Object.keys(eventsByOrganizer).sort((a, b) => {
      const indexA = preferredOrder.indexOf(a);
      const indexB = preferredOrder.indexOf(b);
      // If both are in preferred order, sort by their position
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      // If only a is in preferred order, a comes first
      if (indexA !== -1) return -1;
      // If only b is in preferred order, b comes first
      if (indexB !== -1) return 1;
      // Otherwise, sort alphabetically
      return a.localeCompare(b);
    });
    
    // Build message grouped by organizer in sorted order
    for (const organizer of sortedOrganizers) {
      const organizerEvents = eventsByOrganizer[organizer];
      
      // Sort events chronologically by date
      organizerEvents.sort((a, b) => {
        const dateA = this.parseEventDate(a.Date);
        const dateB = this.parseEventDate(b.Date);
        return dateA - dateB;
      });
      
      message += `\n<b>👤 ${organizer}</b>\n`;
      message += '─────────────────\n';
      
      let eventNum = 1;
      for (const event of organizerEvents) {
        const location = event.Location || 'TBD';
        const date = event.Date || 'TBD';
        const time = event.Time || 'TBD';
        
        message += `\n<b>${eventNum}.</b>\n`;
        message += `   📍 <b>Location:</b> ${location}\n`;
        message += `   📅 <b>Date:</b> ${date}\n`;
        message += `   ⏰ <b>Time:</b> ${time}\n`;
        eventNum++;
      }
    }
    
    return message;
  }

  /**
   * Handle /checkreminders command - check and optionally send pending reminders
   * Usage: /checkreminders - list pending reminders
   *        /checkreminders send - send all pending reminders
   */
  async handleCheckRemindersCommand(chatId, fullText) {
    try {
      // Check if 'send' argument was provided
      const args = fullText.split(' ');
      const shouldSend = args.length > 1 && args[1].toLowerCase() === 'send';
      
      // Get the functions from app.locals (set in telegramBotService)
      const getPendingReminders = this.app?.locals?.getPendingReminders;
      const sendPendingReminders = this.app?.locals?.sendPendingReminders;
      
      if (!getPendingReminders) {
        await this.telegramApi.sendMessage(chatId, '❌ Reminder check not available. Server may need restart.');
        return;
      }
      
      const pending = await getPendingReminders();
      
      if (pending.length === 0) {
        await this.telegramApi.sendMessage(chatId, '✅ No pending reminders. All reminders have been sent!');
        return;
      }
      
      if (shouldSend) {
        // Send all pending reminders
        await this.telegramApi.sendMessage(chatId, `📤 Sending ${pending.length} pending reminder(s)...`);
        
        const results = await sendPendingReminders();
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        
        let resultMessage = `✅ Sent ${successCount}/${results.length} reminder(s) successfully.`;
        if (failCount > 0) {
          resultMessage += `\n⚠️ ${failCount} reminder(s) failed to send.`;
        }
        
        await this.telegramApi.sendMessage(chatId, resultMessage);
      } else {
        // List pending reminders
        let message = `📋 <b>Pending Reminders (${pending.length})</b>\n\n`;
        
        for (const event of pending) {
          const daysText = event.daysUntilEvent > 0 
            ? `in ${event.daysUntilEvent} day(s)` 
            : event.daysUntilEvent === 0 
              ? 'TODAY!' 
              : `${Math.abs(event.daysUntilEvent)} day(s) ago`;
          
          message += `• <b>${event.Location || 'Unknown Location'}</b>\n`;
          message += `  📅 Date: ${event.Date}\n`;
          message += `  ⏰ Event ${daysText}\n`;
          message += `  🔔 Reminder was due: ${event.reminderDueDate}\n\n`;
        }
        
        message += `\nTo send all pending reminders, use:\n<code>/checkreminders send</code>`;
        
        await this.telegramApi.sendMessage(chatId, message);
      }
    } catch (error) {
      console.error('Error checking reminders:', error.message);
      await this.telegramApi.sendMessage(chatId, '❌ Error checking reminders. Please try again later.');
    }
  }

  /**
   * Handle button click (callback query)
   */
  async handleCallbackQuery(callbackQuery) {
    const { id, from, message, data } = callbackQuery;
    const userName = `${from.first_name || ''} ${from.last_name || ''}`.trim() || from.username || from.id;
    
    console.log(`Button clicked by ${userName}: ${data}`);

    try {
      // Parse callback data
      if (data.startsWith(this.config.CALLBACK.JOIN)) {
        const eventId = data.replace(this.config.CALLBACK.JOIN, '');
        await this.handleJoin(eventId, userName, message, id);
      } else if (data.startsWith(this.config.CALLBACK.LEAVE)) {
        const eventId = data.replace(this.config.CALLBACK.LEAVE, '');
        await this.handleLeave(eventId, userName, message, id);
      }
    } catch (error) {
      console.error('Error handling callback:', error.message);
      await this.telegramApi.answerCallbackQuery(id, 'An error occurred. Please try again.');
    }
  }

  /**
   * Handle Join button click
   */
  async handleJoin(eventId, userName, message, callbackQueryId) {
    try {
      // Get event from database
      const result = await this.eventsController.getEventById(eventId);
      const event = result.event;
      
      if (!event) {
        await this.telegramApi.answerCallbackQuery(callbackQueryId, 'Event not found.', true);
        return;
      }

      // Check if already joined
      let participants = Array.isArray(event.Participants) ? [...event.Participants] : [];
      
      if (participants.includes(userName)) {
        await this.telegramApi.answerCallbackQuery(callbackQueryId, 'You are already registered!');
        return;
      }

      // Add participant
      participants.push(userName);
      await this.eventsController.updateEventParticipants(eventId, participants);
      
      // Update the message with new participant list (pass eventId explicitly)
      await this.updateEventMessage(eventId, event, participants, message.chat.id, message.message_id);
      
      // Acknowledge button press
      await this.telegramApi.answerCallbackQuery(callbackQueryId, `✅ ${userName} joined!`);
      
      // Emit socket event with full event data for frontend card update
      if (this.io) {
        const updatedEvent = { ...event, _id: eventId, Participants: participants };
        this.io.emit('survey-updated', { 
          message: 'Participant joined',
          event: updatedEvent,
          eventId: eventId,
          participants: participants,
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`${userName} joined event ${eventId}`);
    } catch (error) {
      console.error('Error handling join:', error.message);
      throw error;
    }
  }

  /**
   * Handle Leave button click
   */
  async handleLeave(eventId, userName, message, callbackQueryId) {
    try {
      // Get event from database
      const result = await this.eventsController.getEventById(eventId);
      const event = result.event;
      
      if (!event) {
        await this.telegramApi.answerCallbackQuery(callbackQueryId, 'Event not found.', true);
        return;
      }

      // Check if registered
      let participants = Array.isArray(event.Participants) ? [...event.Participants] : [];
      
      if (!participants.includes(userName)) {
        await this.telegramApi.answerCallbackQuery(callbackQueryId, 'You are not registered.');
        return;
      }

      // Remove participant
      participants = participants.filter(name => name !== userName);
      await this.eventsController.updateEventParticipants(eventId, participants);
      
      // Update the message with new participant list (pass eventId explicitly)
      await this.updateEventMessage(eventId, event, participants, message.chat.id, message.message_id);
      
      // Acknowledge button press
      await this.telegramApi.answerCallbackQuery(callbackQueryId, `❌ ${userName} left.`);
      
      // Emit socket event with full event data for frontend card update
      if (this.io) {
        const updatedEvent = { ...event, _id: eventId, Participants: participants };
        this.io.emit('survey-updated', { 
          message: 'Participant left',
          event: updatedEvent,
          eventId: eventId,
          participants: participants,
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`${userName} left event ${eventId}`);
    } catch (error) {
      console.error('Error handling leave:', error.message);
      throw error;
    }
  }

  /**
   * Update the event message with new participant list for ALL subscribers
   */
  async updateEventMessage(eventId, event, participants, chatId, messageId) {
    // eventId is passed explicitly to avoid issues with event._id
    console.log(`Updating message for event: ${eventId}`);
    
    // Use parseCustomDate to correctly parse D/M/YYYY format
    const parsedDate = parseCustomDate(event.Date);
    const eventData = {
      date: event.formattedDate || (parsedDate ? formatEventDate(parsedDate) : event.Date),
      location: event.Location || '',
      meetingPoint: event.Location || '',
      time: event.Time || '',
      participants: participants
    };

    const messageText = buildSurveyMessage(eventData, this.config.TRAINING_LINK);
    const buttons = this.telegramApi.createRegistrationButtons(eventId, this.config);

    // Update the message for the user who clicked the button
    try {
      await this.telegramApi.editMessageText(chatId, messageId, messageText, {
        inlineKeyboard: buttons
      });
      console.log(`Updated message for chat ${chatId}`);
    } catch (error) {
      console.error(`Error updating message for chat ${chatId}:`, error.message);
    }

    // Also update messages for all other subscribers
    if (event.TelegramMessages && Array.isArray(event.TelegramMessages)) {
      for (const msg of event.TelegramMessages) {
        // Skip the message we already updated
        if (msg.chatId === chatId.toString() || msg.chatId === chatId) {
          continue;
        }
        try {
          await this.telegramApi.editMessageText(msg.chatId, msg.messageId, messageText, {
            inlineKeyboard: buttons
          });
          console.log(`Updated message for subscriber chat ${msg.chatId}`);
        } catch (error) {
          console.error(`Error updating message for chat ${msg.chatId}:`, error.message);
        }
      }
    }
  }

  /**
   * Send a new survey event message with buttons
   */
  async sendEventMessage(event) {
    const eventData = {
      date: event.formattedDate || formatEventDate(new Date(event.Date)),
      location: event.Location || '',
      meetingPoint: event.Location || '',
      time: event.Time || '',
      participants: event.Participants || []
    };

    const messageText = buildSurveyMessage(eventData, this.config.TRAINING_LINK);
    const buttons = this.telegramApi.createRegistrationButtons(event._id, this.config);

    // Get subscribers from database, fallback to config
    const subscriberResult = await this.telegramController.getAllSubscribers();
    const chatIds = subscriberResult.chatIds.length > 0 
      ? subscriberResult.chatIds 
      : this.config.CHAT_IDS;
    
    console.log(`sendEventMessage: Sending to ${chatIds.length} subscriber(s)`);

    const results = [];
    for (const chatId of chatIds) {
      try {
        const result = await this.telegramApi.sendMessage(chatId, messageText, {
          inlineKeyboard: buttons
        });
        
        // Store message ID for later editing
        if (result.ok && result.result) {
          await this.eventsController.saveTelegramMessageId(
            event._id,
            chatId,
            result.result.message_id
          );
        }
        
        results.push({ chatId, success: true, result });
        console.log(`Event message sent to ${chatId}`);
      } catch (error) {
        results.push({ chatId, success: false, error: error.message });
        console.error(`Failed to send to ${chatId}:`, error.message);
      }
    }

    return results;
  }
}

// Export singleton instance
module.exports = new RegistrationBot();
