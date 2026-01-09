/**
 * Update Pinned Upcoming Events Message
 * Utility to update all pinned upcoming events messages when events change
 */

const TelegramApi = require('./telegramApi');
const TelegramController = require('../../Controller/Telegram/telegramController');
const EventsController = require('../../Controller/Events/eventsController');
const botConfig = require('../config/botConfig');

/**
 * Parse date string to Date object for sorting
 * Handles formats like "17/1/2026", "19/01/2026", etc.
 */
function parseEventDate(dateStr) {
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
function buildUpcomingMessage(upcomingEvents, monthYear) {
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
      const dateA = parseEventDate(a.Date);
      const dateB = parseEventDate(b.Date);
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
 * Build the "no events" message
 */
function buildNoEventsMessage(monthYear) {
  return `<b>📅 Upcoming Survey Events - ${monthYear}</b>\n\n📭 No upcoming survey events at the moment.\n\nStay tuned for announcements!`;
}

/**
 * Update all pinned upcoming events messages across all subscriber chats
 */
async function updateAllPinnedUpcomingMessages(io = null) {
  try {
    const telegramApi = new TelegramApi(botConfig.BOT_TOKEN);
    const telegramController = new TelegramController();
    const eventsController = new EventsController();
    
    // Set up Socket.IO for real-time updates
    if (io) {
      telegramController.setSocketIO(io);
    }
    
    // Set up storeChatHistoryFn so edited messages are stored
    telegramApi.setStoreChatHistory(
      telegramController.storeChatHistory.bind(telegramController)
    );
    
    // Get all upcoming events
    const result = await eventsController.getAllEvents();
    const events = result.events || [];
    const upcomingEvents = events.filter(e => e.Type === 'Upcoming');
    
    // Get current month and year for header
    const now = new Date();
    const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const expectedHeader = `📅 Upcoming Survey Events - ${monthYear}`;
    
    // Build the new message - show "no events" message if no upcoming events
    const newMessage = upcomingEvents.length === 0 
      ? buildNoEventsMessage(monthYear)
      : buildUpcomingMessage(upcomingEvents, monthYear);
    
    console.log(`Upcoming events count: ${upcomingEvents.length}`);
    
    // Get all subscribers (now includes pinnedUpcomingMessageId)
    const subscriberResult = await telegramController.getAllSubscribers();
    const subscribers = subscriberResult.subscribers || [];
    
    console.log(`Checking ${subscribers.length} subscribers for pinned upcoming events messages`);
    console.log(`Looking for header: "${expectedHeader}"`);
    
    let updatedCount = 0;
    
    for (const subscriber of subscribers) {
      const chatId = subscriber.chatId;
      const storedMessageId = subscriber.pinnedUpcomingMessageId;
      
      try {
        // First, try to update using stored message ID if available
        if (storedMessageId) {
          try {
            await telegramApi.editMessageText(chatId, storedMessageId, newMessage);
            console.log(`✅ Updated pinned upcoming message in chat ${chatId} using stored ID ${storedMessageId}`);
            updatedCount++;
            continue; // Successfully updated, move to next subscriber
          } catch (editError) {
            if (editError.response?.data?.description?.includes('message is not modified')) {
              console.log(`Pinned message unchanged in chat ${chatId}`);
              continue;
            } else if (editError.response?.data?.description?.includes('message to edit not found')) {
              console.log(`Stored message ID ${storedMessageId} no longer valid for chat ${chatId}, will try getChat`);
              // Fall through to getChat method
            } else {
              console.error(`Error updating pinned message in chat ${chatId}:`, editError.message);
              // Fall through to getChat method
            }
          }
        }
        
        // Fallback: Get chat info to find pinned message (only returns most recent pinned)
        const chatInfo = await telegramApi.getChat(chatId);
        
        console.log(`Chat ${chatId} info:`, JSON.stringify(chatInfo.result?.pinned_message?.text?.substring(0, 100) || 'no pinned message'));
        
        if (chatInfo.ok && chatInfo.result && chatInfo.result.pinned_message) {
          const pinnedMessage = chatInfo.result.pinned_message;
          const pinnedText = pinnedMessage.text || '';
          
          // Check if pinned message is an upcoming events message for current month
          // Note: Telegram strips HTML tags from text, so check without tags
          const headerWithoutEmoji = `Upcoming Survey Events - ${monthYear}`;
          if (pinnedText.includes(expectedHeader) || pinnedText.includes(headerWithoutEmoji)) {
            try {
              await telegramApi.editMessageText(chatId, pinnedMessage.message_id, newMessage);
              console.log(`✅ Updated pinned upcoming message in chat ${chatId}`);
              updatedCount++;
              
              // Store the message ID for future updates
              await telegramController.updatePinnedMessageId(chatId, pinnedMessage.message_id);
            } catch (editError) {
              if (editError.response?.data?.description?.includes('message is not modified')) {
                console.log(`Pinned message unchanged in chat ${chatId}`);
                // Still store the message ID for future updates
                await telegramController.updatePinnedMessageId(chatId, pinnedMessage.message_id);
              } else {
                console.error(`Error updating pinned message in chat ${chatId}:`, editError.message);
              }
            }
          }
        }
      } catch (chatError) {
        console.error(`Error checking chat ${chatId}:`, chatError.message);
      }
    }
    
    console.log(`Updated ${updatedCount} pinned upcoming events messages`);
    return { success: true, updated: updatedCount };
  } catch (error) {
    console.error('Error updating pinned upcoming messages:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { updateAllPinnedUpcomingMessages, buildUpcomingMessage, buildNoEventsMessage };
