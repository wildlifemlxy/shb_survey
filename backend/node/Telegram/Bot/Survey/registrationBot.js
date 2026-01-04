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
    this.eventsController = new EventsController();
    this.telegramController = new TelegramController();
    this.pollingInterval = null;
    this.lastUpdateId = 0;
  }

  /**
   * Initialize the bot with config
   */
  initialize(app, io, config) {
    // Stop any existing polling first
    this.stopPolling();
    
    this.config = config;
    this.telegramApi = new TelegramApi(config.BOT_TOKEN);
    this.io = io;
    
    // Set Socket.IO on the controller for real-time updates
    this.telegramController.setSocketIO(io);
    
    // Set the storeChatHistory function on telegramApi so all sent messages are stored
    this.telegramApi.setStoreChatHistory(
      this.telegramController.storeChatHistory.bind(this.telegramController)
    );
    
    console.log('Registration Bot initialized');
    
    // Start polling for updates (button clicks)
    this.startPolling();
    
    // Proper cleanup when server stops
    const cleanup = () => {
      console.log('Stopping bot polling...');
      this.stopPolling();
      process.exit(0);
    };
    
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  /**
   * Start polling for Telegram updates
   */
  startPolling() {
    // Clear any existing interval first
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    console.log('Starting Telegram polling for button responses...');
    
    this.pollingInterval = setInterval(async () => {
      try {
        await this.processUpdates();
      } catch (error) {
        // Handle conflict error - another instance is running
        if (error.message && error.message.includes('409')) {
          console.log('Another bot instance detected, waiting...');
          return;
        }
        console.error('Polling error:', error.message);
      }
    }, 3000); // Poll every 3 seconds
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('Polling stopped');
    }
  }

  /**
   * Process Telegram updates (button clicks)
   */
  async processUpdates() {
    try {
      const result = await this.telegramApi.getUpdates(this.lastUpdateId + 1, 1);
      
      if (!result.ok || !result.result || result.result.length === 0) {
        return;
      }

      for (const update of result.result) {
        this.lastUpdateId = update.update_id;
        
        // Handle callback query (button click)
        if (update.callback_query) {
          await this.handleCallbackQuery(update.callback_query);
        }
        
        // Handle text messages (commands like /start)
        if (update.message && update.message.text) {
          await this.handleMessage(update.message);
        }
      }
    } catch (error) {
      // Silently handle timeout errors during polling
      if (!error.message.includes('timeout')) {
        // Handle 409 Conflict - another bot instance is polling, just skip this cycle
        if (error.message.includes('409') || error.message.includes('Conflict')) {
          // Silently continue - conflict will resolve itself
          return;
        }
        console.error('Error processing updates:', error.message);
      }
    }
  }

  /**
   * Handle text messages (commands like /start, /help)
   */
  async handleMessage(message) {
    const { chat, text, from } = message;
    const chatId = chat.id;
    const userName = `${from.first_name || ''} ${from.last_name || ''}`.trim() || from.username || from.id;
    const botToken = this.config?.BOT_TOKEN || null;
    
    console.log(`Message from ${userName}: ${text}`);

    // Store user message in chat history
    if (botToken) {
      await this.telegramController.storeChatHistory(botToken, chatId, text, 'user', userName);
    }

    // Handle /start command
    if (text === '/start' || text.startsWith('/start ')) {
      await this.handleStartCommand(chatId, userName);
    }
    // Handle /help command
    else if (text === '/help') {
      await this.handleHelpCommand(chatId);
    }
    // Handle /upcoming command - show upcoming events
    else if (text === '/upcoming') {
      await this.handleUpcomingCommand(chatId);
    }
  }

  /**
   * Handle /start command
   */
  async handleStartCommand(chatId, userName) {
    // Save user as subscriber so they receive future announcements
    // Pass the bot token to link subscriber to this specific bot
    const botToken = this.config?.BOT_TOKEN || null;
    await this.telegramController.addSubscriber(chatId, userName, botToken);
    
    const welcomeMessage = `👋 Welcome <b>${userName}</b>!

I'm the <b>SHB Survey Registration Bot</b>.

I help you register for upcoming Straw-headed Bulbul survey events.

<b>Commands:</b>
/start - Show this welcome message
/upcoming - View upcoming survey events

When a survey is posted, you can click the <b>✅ Join</b> or <b>❌ Leave</b> buttons to register or unregister.`;

    try {
      await this.telegramApi.sendMessage(chatId, welcomeMessage);
      console.log(`Sent welcome message to ${chatId}`);
    } catch (error) {
      console.error('Error sending welcome message:', error.message);
    }
  }

  /**
   * Handle /help command
   */
  async handleHelpCommand(chatId) {
    const helpMessage = `<b>📋 Available Commands:</b>

/start - Show welcome message
/help - Show this help message
/upcoming - View upcoming survey events

<b>How to register:</b>
When a survey is posted, click:
• <b>✅ Join</b> - to register for the survey
• <b>❌ Leave</b> - to unregister from the survey

Your name will be automatically added/removed from the participant list.`;

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
      
      // Auto-pin the message (silently, without notification)
      if (sentMessage.ok && sentMessage.result && sentMessage.result.message_id) {
        try {
          await this.telegramApi.pinChatMessage(chatId, sentMessage.result.message_id, true);
          console.log(`Pinned new upcoming events message in chat ${chatId}`);
        } catch (pinError) {
          console.error('Error pinning message (bot may need admin rights):', pinError.message);
        }
      }
    } catch (error) {
      console.error('Error fetching upcoming events:', error.message);
      await this.telegramApi.sendMessage(chatId, '❌ Error fetching upcoming events. Please try again later.');
    }
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
    
    // Build message grouped by organizer
    for (const [organizer, organizerEvents] of Object.entries(eventsByOrganizer)) {
      message += `\n<b>👤 ${organizer}</b>\n`;
      message += '─────────────────\n';
      
      let eventNum = 1;
      for (const event of organizerEvents) {
        const location = event.Location || 'TBD';
        const date = event.Date || 'TBD';
        const time = event.Time || 'TBD';
        
        message += `${eventNum}) ${location}, ${date} • ${time}\n`;
        eventNum++;
      }
      message += '\n';
    }
    
    return message;
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
      
      // Emit socket event
      if (this.io) {
        this.io.emit('survey-updated', { message: 'Participant joined' });
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
      
      // Emit socket event
      if (this.io) {
        this.io.emit('survey-updated', { message: 'Participant left' });
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
