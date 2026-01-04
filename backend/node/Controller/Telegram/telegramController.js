const DatabaseConnectivity = require("../../Database/databaseConnectivity");
const axios = require("axios");


class TelegramController {
  // Validate bot token with Telegram API
  async validateBotToken(token) {
    try {
      const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
      if (response.data && response.data.ok) {
        return {
          valid: true,
          botInfo: response.data.result
        };
      }
      return { valid: false, error: 'Invalid bot token' };
    } catch (err) {
      console.error('Error validating bot token:', err.message);
      return { valid: false, error: err.response?.data?.description || 'Failed to validate token' };
    }
  }

  // Check if bot already exists in database
  async botExists(token) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Telegram Bots";
      const existingBot = await db.getDocument(databaseName, collectionName, { token });
      return !!existingBot;
    } catch (err) {
      console.error('Error checking bot existence:', err);
      return false;
    }
  }

  // Create a new Telegram bot entry in the database
  async createBot(token, name, description) {
    const db = DatabaseConnectivity.getInstance();
    try {
      // Validate token with Telegram API first
      const validation = await this.validateBotToken(token);
      if (!validation.valid) {
        return {
          success: false,
          message: 'Invalid bot token',
          error: validation.error
        };
      }

      // Check if bot already exists
      const exists = await this.botExists(token);
      if (exists) {
        return {
          success: false,
          message: 'Bot with this token already exists',
          error: 'Duplicate bot token'
        };
      }

      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Telegram Bots";
      
      // Use validated bot info if name not provided
      const botInfo = validation.botInfo;
      const bot = {
        token,
        name: name || botInfo.first_name || 'Unnamed Bot',
        description: description || '',
        username: botInfo.username || null,
        telegramBotId: botInfo.id,
        createdAt: new Date(),
        isActive: true
      };
      
      const result = await db.insertDocument(databaseName, collectionName, bot);
      return {
        success: true,
        message: 'Bot created successfully',
        insertedId: result.insertedId || null,
        bot: {
          ...bot,
          token: undefined // Don't return token in response for security
        }
      };
    } catch (err) {
      console.error('Error inserting bot:', err);
      return {
        success: false,
        message: 'Error inserting bot',
        error: err.message
      };
    }
  }

  // Retrieve all Telegram bot entries from the database
  async getAllBots() {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Telegram Bots";
      const bots = await db.getAllDocuments(databaseName, collectionName);
      console.log('Retrieved bots:', bots);
     return {
        success: true,
        message: 'Bots retrieved',
        data: bots
      };
    } catch (err) {
      console.error('Error retrieving bots:', err);
      return {
        success: false,
        message: 'Error retrieving bots',
        error: err.message
      };
    }
  }

  // Set Socket.IO instance for real-time updates
  setSocketIO(io) {
    this.io = io;
  }

  // Store chat history - update existing survey messages, insert others
  async storeChatHistory(token, chatId, message, senderType = 'bot', userName = null) {
    console.log('🔵 storeChatHistory called - chatId:', chatId, 'senderType:', senderType);
    console.log('🔵 Socket.IO instance in storeChatHistory:', !!this.io);
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Chat History";
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Only date, ignore time
      const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

      // Check if this is a survey event message (contains "survey below")
      const eventDateMatch = message.match(/details for.*?<b>([^<]+)<\/b>.*?survey below/);
      
      // Check if this is an "Upcoming Survey Events" message
      const isUpcomingEventsMessage = message.includes('Upcoming Survey Events');
      
      let result;
      let chatEntry;
      
      // Handle "Upcoming Survey Events" message - update existing or insert new
      if (isUpcomingEventsMessage && senderType === 'bot') {
        // Look for existing "Upcoming Survey Events" message for this chat (any month)
        const existingFilter = {
          token,
          chatId: chatId.toString(),
          senderType: 'bot',
          message: { $regex: 'Upcoming Survey Events', $options: 'i' }
        };
        
        console.log('🔍 Looking for existing Upcoming Survey Events message with filter:', JSON.stringify(existingFilter));
        const existing = await db.getDocument(databaseName, collectionName, existingFilter);
        console.log('🔍 Found existing:', !!existing, existing?._id);
        
        if (existing) {
          // Update existing message
          const updateFilter = { _id: existing._id };
          const updateData = { $set: { message, sentAt: new Date(), date: dateStr } };
          await db.updateDocument(databaseName, collectionName, updateFilter, updateData);
          
          chatEntry = {
            ...existing,
            message,
            sentAt: new Date(),
            date: dateStr
          };
          
          // Emit update event via Socket.IO
          console.log('📡 Socket.IO instance exists (upcoming update):', !!this.io);
          if (this.io) {
            console.log('📡 Emitting chatMessageUpdated event for Upcoming Survey Events');
            this.io.emit('chatMessageUpdated', chatEntry);
          } else {
            console.log('⚠️ No Socket.IO instance - cannot emit chatMessageUpdated');
          }
          
          return { success: true, message: 'Upcoming events chat history updated.' };
        } else {
          // No existing entry - insert new one for "Upcoming Survey Events"
          console.log('📝 No existing Upcoming Survey Events entry, inserting new one');
          chatEntry = {
            token,
            chatId: chatId.toString(),
            date: dateStr,
            message,
            senderType,
            userName,
            sentAt: new Date()
          };

          result = await db.insertDocument(databaseName, collectionName, chatEntry);
          
          if (this.io) {
            console.log('📡 Emitting newChatMessage event for new Upcoming Survey Events');
            this.io.emit('newChatMessage', {
              ...chatEntry,
              _id: result.insertedId
            });
          }
          
          return { success: true, message: 'Upcoming events chat history stored.' };
        }
      }
      
      if (eventDateMatch && senderType === 'bot') {
        const eventDate = eventDateMatch[1];
        
        // Look for existing message with same event date
        const existingFilter = {
          token,
          senderType: 'bot',
          message: { $regex: `details for.*?<b>${eventDate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/b>.*?survey below` }
        };
        
        const existing = await db.getDocument(databaseName, collectionName, existingFilter);
        
        if (existing) {
          // Update existing message
          const updateFilter = { _id: existing._id };
          const updateData = { $set: { message, sentAt: new Date() } };
          await db.updateDocument(databaseName, collectionName, updateFilter, updateData);
          
          chatEntry = {
            ...existing,
            message,
            sentAt: new Date()
          };
          
          // Emit update event via Socket.IO
          console.log('📡 Socket.IO instance exists (update):', !!this.io);
          if (this.io) {
            console.log('📡 Emitting chatMessageUpdated event');
            this.io.emit('chatMessageUpdated', chatEntry);
          } else {
            console.log('⚠️ No Socket.IO instance - cannot emit chatMessageUpdated');
          }
          
          return { success: true, message: 'Chat history updated.' };
        }
      }
      
      // Insert new message (non-survey or first survey message)
      chatEntry = {
        token,
        chatId: chatId.toString(),
        date: dateStr,
        message,
        senderType, // 'bot' or 'user'
        userName,   // user's name if from user
        sentAt: new Date()
      };

      result = await db.insertDocument(databaseName, collectionName, chatEntry);
      
      // Emit real-time update via Socket.IO
      console.log('📡 Socket.IO instance exists:', !!this.io);
      if (this.io) {
        console.log('📡 Emitting newChatMessage event for chatId:', chatId);
        this.io.emit('newChatMessage', {
          ...chatEntry,
          _id: result.insertedId
        });
      } else {
        console.log('⚠️ No Socket.IO instance - cannot emit newChatMessage');
      }
      
      return { success: true, message: 'Chat history stored.' };
    } catch (err) {
      console.error('Error storing chat history:', err);
      return { success: false, message: 'Error storing chat history', error: err.message };
    }
  }

  // Save the Telegram messageId and chatId for an event
  async saveTelegramMessageId(eventId, chatId, messageId) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Survey Events";
      // Store as an array of objects to support multiple chats per event
      const update = {
        $addToSet: {
          TelegramMessages: { chatId, messageId }
        }
      };
      const filter = { _id: eventId };
      await db.updateDocument(databaseName, collectionName, filter, update);
      return { success: true, message: 'Telegram messageId saved.' };
    } catch (err) {
      console.error('Error saving Telegram messageId:', err);
      return { success: false, message: 'Error saving Telegram messageId', error: err.message };
    }
  }

  // Retrieve the Telegram messageId for an event and chat
  async getTelegramMessageId(eventId, chatId) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Survey Events";
      const event = await db.getDocument(databaseName, collectionName, { _id: eventId });
      if (event && Array.isArray(event.TelegramMessages)) {
        const found = event.TelegramMessages.find(m => m.chatId === chatId);
        return found ? found.messageId : null;
      }
      return null;
    } catch (err) {
      console.error('Error retrieving Telegram messageId:', err);
      return null;
    }
  }

  // Retrieve chat history for a given token and chatId (optionally filter by date)
  async getChatHistory(token, chatId, date = null) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Chat History";
      const query = { token, chatId: chatId.toString() };
      if (date) {
        // date should be in YYYY-MM-DD format
        query.date = date;
      }
      const history = await db.getAllDocuments(databaseName, collectionName, query, { sentAt: 1 });
      console.log(`Retrieved ${history?.length || 0} chat messages for chatId ${chatId}`);
      return {
        success: true,
        message: 'Chat history retrieved.',
        data: history || []
      };
    } catch (err) {
      console.error('Error retrieving chat history:', err);
      return {
        success: false,
        message: 'Error retrieving chat history',
        error: err.message
      };
    }
  }

  // Get all chat history for a bot token (all chats combined)
  async getAllChatHistoryForBot(token) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Chat History";
      const history = await db.getAllDocuments(databaseName, collectionName, { token }, { sentAt: 1 });
      console.log(`Retrieved ${history?.length || 0} total chat messages for bot`);
      return {
        success: true,
        message: 'All chat history retrieved.',
        data: history || []
      };
    } catch (err) {
      console.error('Error retrieving all chat history:', err);
      return {
        success: false,
        message: 'Error retrieving chat history',
        error: err.message
      };
    }
  }

  // Delete chat history for a specific event date (used when event is deleted)
  async deleteChatHistoryForEventDate(token, eventDateStr) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Chat History";
      
      // Escape special regex characters in the event date string
      const escapedDate = eventDateStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      console.log(`🔍 Deleting chat history for event date: "${eventDateStr}"`);
      console.log(`🔍 Escaped date: "${escapedDate}"`);
      
      // Find and delete messages containing this event date (simplified regex)
      // Just look for the date string wrapped in <b> tags
      const filter = {
        token,
        senderType: 'bot',
        message: { $regex: `<b>${escapedDate}</b>`, $options: 'i' }
      };
      
      console.log(`🔍 Delete filter:`, JSON.stringify(filter));
      
      const result = await db.delete(collectionName, filter, { deleteMany: true });
      console.log(`✅ Deleted ${result?.deletedCount || 0} chat history entries for event date: ${eventDateStr}`);
      
      // Emit real-time update via Socket.IO
      if (this.io) {
        this.io.emit('chatMessageDeleted', {
          token,
          eventDate: eventDateStr
        });
      }
      
      return {
        success: true,
        message: 'Chat history deleted for event.',
        deletedCount: result?.deletedCount || 0
      };
    } catch (err) {
      console.error('Error deleting chat history for event:', err);
      return {
        success: false,
        message: 'Error deleting chat history',
        error: err.message
      };
    }
  }

  // Clear all chat history from database
  async clearChatHistory() {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Chat History";
      const result = await db.delete(collectionName, {}, { deleteMany: true });
      console.log('Cleared chat history:', result);
      return {
        success: true,
        message: 'Chat history cleared.',
        deletedCount: result.deletedCount || 0
      };
    } catch (err) {
      console.error('Error clearing chat history:', err);
      return {
        success: false,
        message: 'Error clearing chat history',
        error: err.message
      };
    }
  }

  // Send a message using a bot
  async sendMessage(token, chatId, message, options = {}) {
    try {
      const payload = {
        chat_id: chatId,
        text: message,
        parse_mode: options.parseMode || 'HTML',
        disable_web_page_preview: options.disablePreview || false
      };

      if (options.replyMarkup) {
        payload.reply_markup = options.replyMarkup;
      }

      const response = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, payload);
      
      if (response.data && response.data.ok) {
        return {
          success: true,
          message: 'Message sent successfully',
          data: response.data.result
        };
      }
      return {
        success: false,
        message: 'Failed to send message',
        error: response.data?.description || 'Unknown error'
      };
    } catch (err) {
      console.error('Error sending message:', err.message);
      return {
        success: false,
        message: 'Error sending message',
        error: err.response?.data?.description || err.message
      };
    }
  }

  // Delete a bot from the database
  async deleteBot(botId) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Telegram Bots";
      
      const { ObjectId } = require('mongodb');
      const filter = { _id: new ObjectId(botId) };
      
      const result = await db.deleteDocument(databaseName, collectionName, filter);
      
      if (result.deletedCount > 0) {
        return {
          success: true,
          message: 'Bot deleted successfully'
        };
      }
      return {
        success: false,
        message: 'Bot not found',
        error: 'No bot with the given ID exists'
      };
    } catch (err) {
      console.error('Error deleting bot:', err);
      return {
        success: false,
        message: 'Error deleting bot',
        error: err.message
      };
    }
  }

  // Update bot status (active/inactive)
  async updateBotStatus(botId, isActive) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Telegram Bots";
      
      const { ObjectId } = require('mongodb');
      const filter = { _id: new ObjectId(botId) };
      const update = { $set: { isActive, updatedAt: new Date() } };
      
      const result = await db.updateDocument(databaseName, collectionName, filter, update);
      
      if (result.modifiedCount > 0) {
        return {
          success: true,
          message: `Bot ${isActive ? 'activated' : 'deactivated'} successfully`
        };
      }
      return {
        success: false,
        message: 'Bot not found or status unchanged',
        error: 'No update performed'
      };
    } catch (err) {
      console.error('Error updating bot status:', err);
      return {
        success: false,
        message: 'Error updating bot status',
        error: err.message
      };
    }
  }

  // Get a single bot by ID
  async getBotById(botId) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Telegram Bots";
      
      const { ObjectId } = require('mongodb');
      const bot = await db.getDocument(databaseName, collectionName, { _id: new ObjectId(botId) });
      
      if (bot) {
        return {
          success: true,
          message: 'Bot retrieved',
          data: bot
        };
      }
      return {
        success: false,
        message: 'Bot not found',
        error: 'No bot with the given ID exists'
      };
    } catch (err) {
      console.error('Error retrieving bot:', err);
      return {
        success: false,
        message: 'Error retrieving bot',
        error: err.message
      };
    }
  }

  // Add a subscriber (user who clicked /start)
  // chatType can be 'private', 'group', or 'supergroup'
  async addSubscriber(chatId, userName, botToken = null, chatType = 'private') {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Telegram Subscribers";
      
      // Determine if it's a group or private chat
      const isGroup = chatType === 'group' || chatType === 'supergroup';
      
      // Check if subscriber already exists for this bot
      const query = { chatId: chatId.toString() };
      if (botToken) {
        query.botToken = botToken;
      }
      
      const existing = await db.getDocument(databaseName, collectionName, query);
      if (existing) {
        console.log(`Subscriber ${chatId} already exists for this bot`);
        // Update the subscriber info if needed
        await db.updateDocument(databaseName, collectionName, query, {
          $set: { 
            userName: userName, 
            chatType: chatType,
            isActive: true, 
            updatedAt: new Date() 
          }
        });
        return { success: true, message: 'Subscriber updated.' };
      }
      
      // Add new subscriber
      const subscriberData = {
        chatId: chatId.toString(),
        userName: userName,
        chatType: chatType,
        botToken: botToken,
        subscribedAt: new Date(),
        isActive: true
      };
      
      const result = await db.insertDocument(databaseName, collectionName, subscriberData);
      
      // Emit real-time update via Socket.IO
      if (this.io) {
        this.io.emit('newSubscriber', {
          ...subscriberData,
          _id: result.insertedId,
          id: chatId.toString(),
          title: userName || (isGroup ? `Group ${chatId}` : `User ${chatId}`),
          type: chatType
        });
      }
      
      console.log(`New subscriber added: ${chatId} (${userName}) - ${chatType}`);
      return { success: true, message: 'Subscriber added.' };
    } catch (err) {
      console.error('Error adding subscriber:', err);
      return { success: false, message: 'Error adding subscriber', error: err.message };
    }
  }

  // Get all active subscribers (optionally filtered by bot token)
  async getAllSubscribers(botToken = null) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Telegram Subscribers";
      
      const query = { isActive: true };
      if (botToken) {
        query.botToken = botToken;
      }
      
      const subscribers = await db.getAllDocuments(databaseName, collectionName, query);
      return {
        success: true,
        subscribers: subscribers || [],
        chatIds: (subscribers || []).map(s => s.chatId)
      };
    } catch (err) {
      console.error('Error getting subscribers:', err);
      return { success: false, subscribers: [], chatIds: [] };
    }
  }

  // Get subscribers for a specific bot as groups/users
  async getSubscribersAsGroups(botToken) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Telegram Subscribers";
      
      // Get all active subscribers - include those with matching botToken OR no botToken (legacy)
      const query = { 
        isActive: true,
        $or: [
          { botToken: botToken },
          { botToken: { $exists: false } },
          { botToken: null }
        ]
      };
      
      const subscribers = await db.getAllDocuments(databaseName, collectionName, query);
      
      // Transform subscribers to group format for display
      const groups = (subscribers || []).map(s => ({
        id: s.chatId,
        title: s.userName || `User ${s.chatId}`,
        type: 'private',
        subscribedAt: s.subscribedAt
      }));
      
      console.log(`Retrieved ${groups.length} subscribers for bot`);
      return {
        success: true,
        groups: groups
      };
    } catch (err) {
      console.error('Error getting subscribers as groups:', err);
      return { success: false, groups: [], error: err.message };
    }
  }

  // Remove a subscriber (user blocked the bot or unsubscribed)
  async removeSubscriber(chatId) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const collectionName = "Telegram Subscribers";
      await db.update(collectionName, { chatId: chatId.toString() }, { $set: { isActive: false } });
      console.log(`Subscriber ${chatId} marked as inactive`);
      return { success: true, message: 'Subscriber removed.' };
    } catch (err) {
      console.error('Error removing subscriber:', err);
      return { success: false, message: 'Error removing subscriber', error: err.message };
    }
  }

  // Save pinned upcoming events message for a chat
  async savePinnedUpcomingMessage(chatId, messageId) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const collectionName = "Telegram Pinned Messages";
      
      // Use update with upsert option
      await db.update(collectionName, 
        { chatId: chatId.toString(), type: 'upcoming_events' },
        { 
          $set: {
            chatId: chatId.toString(), 
            messageId: messageId,
            type: 'upcoming_events',
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      console.log(`Saved pinned upcoming message ${messageId} for chat ${chatId}`);
      return { success: true };
    } catch (err) {
      console.error('Error saving pinned message:', err);
      return { success: false, error: err.message };
    }
  }

  // Get pinned upcoming events message for a chat
  async getPinnedUpcomingMessage(chatId) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const collectionName = "Telegram Pinned Messages";
      
      const results = await db.find(collectionName, { 
        chatId: chatId.toString(), 
        type: 'upcoming_events' 
      });
      
      const pinned = results && results.length > 0 ? results[0] : null;
      return { success: true, pinned };
    } catch (err) {
      console.error('Error getting pinned message:', err);
      return { success: false, pinned: null };
    }
  }

  // Delete pinned upcoming events message record for a chat
  async deletePinnedUpcomingMessage(chatId) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const collectionName = "Telegram Pinned Messages";
      
      await db.delete(collectionName, { 
        chatId: chatId.toString(), 
        type: 'upcoming_events' 
      });
      console.log(`Deleted pinned upcoming message record for chat ${chatId}`);
      return { success: true };
    } catch (err) {
      console.error('Error deleting pinned message record:', err);
      return { success: false, error: err.message };
    }
  }

  // Store or update a bot group/chat in the database
  async storeBotGroup(botToken, chatData) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Bot Groups";
      
      const chatId = chatData.id.toString();
      
      // Check if group already exists
      const existing = await db.getDocument(databaseName, collectionName, { 
        botToken, 
        chatId 
      });
      
      if (existing) {
        // Update existing group
        await db.updateDocument(databaseName, collectionName, 
          { botToken, chatId },
          { $set: {
            title: chatData.title || chatData.username || chatData.first_name || chatId,
            type: chatData.type || 'unknown',
            updatedAt: new Date()
          }}
        );
        console.log(`Updated bot group: ${chatId}`);
      } else {
        // Insert new group
        await db.insertDocument(databaseName, collectionName, {
          botToken,
          chatId,
          title: chatData.title || chatData.username || chatData.first_name || chatId,
          type: chatData.type || 'unknown',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`Stored new bot group: ${chatId}`);
      }
      
      return { success: true };
    } catch (err) {
      console.error('Error storing bot group:', err);
      return { success: false, error: err.message };
    }
  }

  // Get all stored groups for a bot
  async getBotGroups(botToken) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Bot Groups";
      
      const groups = await db.getAllDocuments(databaseName, collectionName, { botToken });
      
      // Transform to expected format
      const formattedGroups = (groups || []).map(g => ({
        id: g.chatId,
        title: g.title,
        type: g.type
      }));
      
      console.log(`Retrieved ${formattedGroups.length} groups for bot`);
      return {
        success: true,
        groups: formattedGroups
      };
    } catch (err) {
      console.error('Error retrieving bot groups:', err);
      return { success: false, groups: [], error: err.message };
    }
  }

  // Get unique chat IDs from chat history for a bot token
  async getGroupsFromChatHistory(botToken) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Chat History";
      
      // Get all chat history for this bot token
      const history = await db.getAllDocuments(databaseName, collectionName, { token: botToken });
      
      // Extract unique chat IDs
      const chatIds = [...new Set((history || []).map(h => h.chatId).filter(id => id))];
      
      console.log(`Found ${chatIds.length} unique chats from history for bot`);
      return {
        success: true,
        chatIds
      };
    } catch (err) {
      console.error('Error getting groups from chat history:', err);
      return { success: false, chatIds: [], error: err.message };
    }
  }
}

module.exports = TelegramController;
