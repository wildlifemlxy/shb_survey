/**
 * Survey Registration Bot
 * Handles survey event registration with inline buttons
 * - Displays survey message with event details
 * - Shows Join/Leave buttons
 * - Handles button responses and updates participant list
 */

const TelegramApi = require('../../utils/telegramApi');
const { buildSurveyMessage, formatEventDate, buildGoogleCalendarLink, buildLocationLink } = require('../../utils/messageTemplates');
const EventsController = require('../../../Controller/strawHeadedBulbul/eventsController');
const TelegramController = require('../../../Controller/strawHeadedBulbul/telegramController');
const parseCustomDate = require('../../../cron/parseCustomDate');

class RegistrationBot {
  constructor() {
    this.telegramApi = null;
    this.config = null;
    this.app = null;
    this.isPolling = false;
    this.lastUpdateId = 0;
    this.pollRetryDelayMs = 1000;
    this.eventsController = new EventsController();
    this.telegramController = new TelegramController();
    this.botUsername = null; // Store bot username for command filtering
    // Tracks the message_id of each join-confirmation DM, keyed by "userId_eventId",
    // so it can be deleted again if the user later leaves the event.
    this.joinConfirmationMessages = new Map();
  }

  /**
   * Build a clean display name from a Telegram `from` object.
   * Some Telegram profiles have a purely-numeric first name (e.g. a self-assigned
   * number/rank like "95"), which looks odd standalone in messages ("95 Moses").
   * In that case, skip it and prefer the last name instead.
   */
  getDisplayName(from) {
    const firstName = (from.first_name || '').trim();
    const lastName = (from.last_name || '').trim();
    const isNumeric = /^\d+$/.test(firstName);
    const nameParts = isNumeric ? [lastName] : [firstName, lastName];
    const fullName = nameParts.filter(Boolean).join(' ').trim();
    return fullName || from.username || from.id;
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
    
    // Check if Telegram bot is explicitly disabled (e.g., to avoid 409 conflict with Azure)
    if (process.env.DISABLE_TELEGRAM_BOT === 'true') {
      console.log('⏸️  DISABLE_TELEGRAM_BOT environment variable set - Telegram bot polling disabled');
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
      const groupCommands = [
        { command: 'start', description: 'Start the bot and subscribe to updates' },
        { command: 'help', description: 'Show available commands' },
        { command: 'upcoming', description: 'View upcoming survey events' },
        { command: 'checkreminders', description: 'Check pending reminders (admin)' }
      ];

      // DM is broadcast-only (channel-style) - only /start does anything there
      // (silently subscribes), so that's the only command shown in private chats.
      const privateCommands = [
        { command: 'start', description: 'Subscribe to survey announcements' }
      ];
      
      // Set commands for all private chats (default)
      await this.telegramApi.setMyCommands(privateCommands);
      
      // Set commands for all group chats
      await this.telegramApi.setMyCommands(groupCommands, { type: 'all_group_chats' });
      
      // Set commands for all chat administrators in groups
      await this.telegramApi.setMyCommands(groupCommands, { type: 'all_chat_administrators' });
      
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
        this.pollRetryDelayMs = 1000;
      } catch (error) {
        // Silently ignore 409 conflicts (Azure instance running)
        if (error.message && error.message.includes('409')) {
          console.log('409 Conflict detected - Azure instance may be running. Retrying in 5s...');
          // Wait a bit before retrying on conflict
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
        console.error('Polling error:', error.message);
        await new Promise(resolve => setTimeout(resolve, this.pollRetryDelayMs));
        this.pollRetryDelayMs = Math.min(this.pollRetryDelayMs * 2, 30000);
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
        // Let pollLoop apply backoff so temporary network failures do not spin.
        throw error;
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
    const userName = this.getDisplayName(from);
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

    const isGroup = chatType === 'group' || chatType === 'supergroup';

    // Handle /start command (may carry a deep-link payload, e.g. "/start joined").
    // Always handled (even in DM) since it's what registers the subscriber.
    if (command === '/start') {
      const startPayload = text.split(' ')[1];
      await this.handleStartCommand(chatId, userName, chatType, chat.title, startPayload);
      return;
    }

    // DM behaves like a channel - broadcast/confirmation messages only, no command
    // replies. Interaction only happens through the buttons on bot-sent messages
    // (e.g. Join/Leave in the group, Add to Calendar in the DM confirmation).
    if (!isGroup) {
      console.log(`Ignoring command ${command} in private chat ${chatId} (DM is broadcast-only)`);
      return;
    }

    // Handle /help command
    if (command === '/help') {
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
   * @param {string} [startPayload] - Optional deep-link payload (e.g. "joined" from the
   *   Join button's t.me/<bot>?start=joined redirect). When set to "joined", the normal
   *   welcome message is skipped since the user already has a join confirmation message
   *   waiting in the chat - we just needed Telegram to open the chat for them.
   */
  async handleStartCommand(chatId, userName, chatType = 'private', chatTitle = null, startPayload = null) {
    // Save user/group as subscriber so they receive future announcements
    // Pass the bot token to link subscriber to this specific bot
    const botToken = this.config?.BOT_TOKEN || null;
    
    // For groups, use the group title; for private chats, use the user name
    const isGroup = chatType === 'group' || chatType === 'supergroup';
    const displayName = isGroup ? (chatTitle || `Group ${chatId}`) : userName;
    
    await this.telegramController.addSubscriber(chatId, displayName, botToken, chatType);
    
    // DM is broadcast-only (channel-style) - just silently subscribe, never send a
    // welcome/tutorial reply. Only the group gets the full interactive welcome message.
    if (!isGroup) {
      console.log(`Subscribed ${chatId} silently (DM is broadcast-only, no welcome message)`);
      return;
    }

    // Deep-linked in from the Join button - the confirmation message is already in the
    // chat, so there's nothing more to send. Just let Telegram bring them into the chat.
    if (startPayload === 'joined') {
      console.log(`Skipped welcome message for ${chatId} (opened via join deep link)`);
      return;
    }
    
    // Build commands list with @bot suffix for group chats
    const botSuffix = this.botUsername ? `@${this.botUsername}` : '';
    
    // Group welcome message - show commands with @bot format for groups
    const welcomeMessage = `👋 Hello everyone!

I'm the <b>SHB Survey Registration Bot</b>.

I'll post upcoming Straw-headed Bulbul survey events here. When a survey is posted, you can click the <b>✅ Join</b> or <b>❌ Leave</b> buttons to register.

<b>Commands:</b>
/upcoming${botSuffix} - View upcoming survey events
/help${botSuffix} - Show available commands`;

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
    const userName = this.getDisplayName(from);
    
    console.log(`Button clicked by ${userName}: ${data}`);

    try {
      // Parse callback data
      if (data.startsWith(this.config.CALLBACK.JOIN)) {
        const eventId = data.replace(this.config.CALLBACK.JOIN, '');
        await this.handleJoin(eventId, userName, message, id, from.id);
      } else if (data.startsWith(this.config.CALLBACK.LEAVE)) {
        const eventId = data.replace(this.config.CALLBACK.LEAVE, '');
        await this.handleLeave(eventId, userName, message, id, from.id);
      }
    } catch (error) {
      console.error('Error handling callback:', error.message);
      await this.telegramApi.answerCallbackQuery(id, 'An error occurred. Please try again.');
    }
  }

  /**
   * Handle Join button click
   */
  async handleJoin(eventId, userName, message, callbackQueryId, userId) {
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
      
      // event with the up-to-date participant list, used for the DM confirmation and socket emit below
      const updatedEvent = { ...event, _id: eventId, Participants: participants };
      
      // Send a persistent DM confirmation directly to the user who joined
      if (userId) {
        await this.sendJoinConfirmationDM(userId, updatedEvent, eventId);
      }
      
      // Acknowledge button press, and jump the user straight into their DM with the bot.
      // Telegram only allows `url` in answerCallbackQuery if it's a Game URL, or a
      // t.me/<bot>?start=XXXX deep link (a bare t.me/<bot> link is rejected as URL_INVALID).
      // Opening this link makes Telegram's client auto-send a "/start joined" message into
      // the chat - that bubble can't be suppressed (it's the client's own behavior). Always
      // redirect regardless of subscription status, per request.
      const deepLink = this.botUsername ? `https://t.me/${this.botUsername}?start=joined` : null;
      try {
        await this.telegramApi.answerCallbackQuery(callbackQueryId, `✅ ${userName} joined!`, false, deepLink);
      } catch (ackError) {
        // Don't let a bad deep link break the whole join flow - fall back to a plain toast.
        console.error('Error answering callback with deep link, retrying without url:', ackError.message);
        await this.telegramApi.answerCallbackQuery(callbackQueryId, `✅ ${userName} joined!`);
      }
      
      // Emit socket event with full event data for frontend card update
      if (this.io) {
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
   * Send a private DM confirming the user's registration for an event.
   * This is sent to the user's private chat with the bot, separate from
   * wherever they clicked the Join button (e.g. a group/channel copy of the message).
   * Fails silently (logged only) if the user has never started a private
   * chat with the bot, since Telegram bots cannot initiate DMs.
   */
  async sendJoinConfirmationDM(userId, event, eventId) {
    try {
      const parsedDate = parseCustomDate(event.Date);
      const dateText = event.formattedDate || (parsedDate ? formatEventDate(parsedDate) : event.Date);
      const calendarUrl = buildGoogleCalendarLink(event);

      const buttons = [];
      if (calendarUrl) buttons.push([{ text: '📅 Add to Google Calendar', url: calendarUrl }]);

      // Link the location to a Google Maps search so Telegram renders a map preview
      // image beneath the message (Telegram auto-generates this from the link itself).
      const meetingPoint = event.Location || '';
      const locationHtml = buildLocationLink(meetingPoint) || meetingPoint;

      // Show who's registered so far - names only (no emails/Telegram IDs available)
      let participantsText = 'No participants yet.';
      if (Array.isArray(event.Participants) && event.Participants.length > 0) {
        participantsText = event.Participants.map((name, idx) => `${idx + 1}. ${name}`).join('\n');
      }

      const confirmationText = `✅ <b>You're registered!</b>

Date: ${dateText}
Location: ${locationHtml}
Time: ${event.Time || ''}

<b>Participants:</b>
${participantsText}

See you there!`;

      const options = buttons.length > 0 ? { inlineKeyboard: buttons } : {};

      const sendResult = await this.telegramApi.sendMessage(userId, confirmationText, options);
      const sentMessageId = sendResult?.result?.message_id;
      if (sentMessageId && eventId) {
        this.joinConfirmationMessages.set(`${userId}_${eventId}`, sentMessageId);
      }
      console.log(`Sent join confirmation DM to user ${userId}`);
    } catch (error) {
      console.error(`Could not send join confirmation DM to user ${userId}:`, error.response?.data || error.message);
    }
  }

  /**
   * Handle Leave button click
   */
  async handleLeave(eventId, userName, message, callbackQueryId, userId) {
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
      
      // Delete the earlier join-confirmation DM, if we sent one
      if (userId) {
        const key = `${userId}_${eventId}`;
        const confirmationMessageId = this.joinConfirmationMessages.get(key);
        if (confirmationMessageId) {
          try {
            await this.telegramApi.deleteMessage(userId, confirmationMessageId);
          } catch (deleteError) {
            console.error(`Could not delete join confirmation DM for user ${userId}:`, deleteError.response?.data || deleteError.message);
          }
          this.joinConfirmationMessages.delete(key);
        }
      }
      
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
