const axios = require('axios');
const schedule = require('node-schedule');
const EventsController = require('../Controller/Events/eventsController');
const parseCustomDate = require('./parseCustomDate');
const TelegramController = require('../Controller/Telegram/telegramController');
const botConfig = require('../Telegram/config/botConfig');
const { sendTelegramMessage } = require('../Telegram/utils/sendMessage');

async function setupTelegramFeatures(app, io) {
  const telegramController = new TelegramController();
  // Set Socket.IO instance for real-time chat updates
  if (io) {
    telegramController.setSocketIO(io);
  }
  const eventsController = new EventsController();

  // Helper function to send event reminders
  async function sendEventReminders(timeLabel) {
    try {
      console.log(`\n========== EVENT REMINDERS SCHEDULER ==========`);
      console.log(`Running at: ${timeLabel}`);
      console.log(`Current server time: ${new Date().toISOString()}`);
      
      const controller = new EventsController();
      const result = await controller.getAllEvents();
      const events = result.events;
      
      console.log(`Total events fetched: ${events ? events.length : 0}`);
      
      if (!events || events.length === 0) {
        console.log('No events found in database');
        return;
      }
      
      // Use Singapore timezone (UTC+8) for date comparison since cron runs at Singapore midnight
      const now = new Date();
      const singaporeTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // Add 8 hours for SGT
      const today = new Date(Date.UTC(singaporeTime.getUTCFullYear(), singaporeTime.getUTCMonth(), singaporeTime.getUTCDate()));
      console.log(`Today (Singapore date): ${today.toISOString()}`);
      console.log(`Singapore time now: ${singaporeTime.toISOString()}`);

      let upcomingEventsCount = 0;
      let remindersToSend = [];

      for (const event of events) {
        // Only process events with Type "Upcoming"
        if (event.Type !== "Upcoming") {
          continue;
        }
        
        upcomingEventsCount++;
        console.log(`\n--- Processing Upcoming Event: ${event._id} ---`);
        console.log(`Event Date string: ${event.Date}`);

        const eventDate = event.Date;
        if (!eventDate) {
          console.log(`Skipping: No date set for event ${event._id}`);
          continue;
        }
        
        const dateObj = parseCustomDate(eventDate);
        if (!dateObj) {
          console.log(`Skipping: Could not parse date "${eventDate}" for event ${event._id}`);
          continue;
        }
        
        // Convert to UTC midnight for consistent comparison
        const eventDateUTC = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
        console.log(`Event date (UTC midnight): ${eventDateUTC.toISOString()}`);

        // Calculate the date 2 days before the event
        const twoDaysBefore = new Date(eventDateUTC);
        twoDaysBefore.setUTCDate(twoDaysBefore.getUTCDate() - 2);
        console.log(`Two days before event: ${twoDaysBefore.toISOString()}`);
        console.log(`Today matches two days before? ${twoDaysBefore.getTime() === today.getTime()}`);

        // Check if today is exactly 2 days before the event
        if (twoDaysBefore.getTime() === today.getTime()) {
          remindersToSend.push(event);
          console.log(`Sending reminder for upcoming event: ${event._id} on ${eventDate}`);
          
          // Format event date as: Fri, Date dd Full Month YYYY
          const eventDay = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          const eventDayNum = dateObj.getDate();
          const eventMonth = dateObj.toLocaleDateString('en-US', { month: 'long' });
          const eventYear = dateObj.getFullYear();
          const eventDateStr = `${eventDay}, Date ${eventDayNum} ${eventMonth} ${eventYear}`;
          const location = event.Location || '';
          const meetingPoint = event.Location || '';
          let meetingPointHtml = meetingPoint;
          if (meetingPoint) {
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meetingPoint)}`;
            meetingPointHtml = `<a href=\"${mapsUrl}\">${meetingPoint}</a>`;
          }
          const time = event.Time || '';
          const trainingLink = 'https://drive.google.com/drive/folders/1aztfMfCVlNGqro492FS-3gvdaRA6kCGk?usp=drive_link';

          // Show event participants if available
          let participantsList = '';
          if (Array.isArray(event.Participants) && event.Participants.length > 0) {
            participantsList = event.Participants.map((name, idx) => `${idx + 1}. ${name}`).join("\n");
          } else {
            participantsList = 'No participants yet.';
          }

          const message = `Hi everyone!\n\nPlease find the details for <b>${eventDateStr}</b> survey below:\n\n<b>Survey Details</b>\nLocation: ${location}\nMeeting Point: ${meetingPointHtml}\nTime: ${time}\n\n<b>Participant List</b>\n${participantsList}\n\n<a href=\"${trainingLink}\">Training Material</a>`;
          await sendTelegramMessage(message, event._id, botConfig, {
            storeChatHistory: telegramController.storeChatHistory.bind(telegramController),
            saveMessageId: telegramController.saveTelegramMessageId.bind(telegramController)
          });
          
          // Mark reminder as sent
          await eventsController.markReminderSent(event._id);
          console.log(`✅ Reminder marked as sent for event: ${event._id}`);
          
          if (io) {
            io.emit('survey-updated', {
              message: 'Survey updated successfully',
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error sending event reminders at ${timeLabel}:`, error);
    }
  }

  /**
   * Get pending reminders - events that should have had reminders sent but didn't
   * Returns events where:
   * - Type is "Upcoming"
   * - Event date is 2 days from now or already passed (but not more than 7 days ago)
   * - No reminderSentAt field or reminderSentAt is null
   */
  async function getPendingReminders() {
    try {
      const controller = new EventsController();
      const result = await controller.getAllEvents();
      const events = result.events || [];
      
      const now = new Date();
      const singaporeTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      const today = new Date(Date.UTC(singaporeTime.getUTCFullYear(), singaporeTime.getUTCMonth(), singaporeTime.getUTCDate()));
      
      const pendingReminders = [];
      
      for (const event of events) {
        if (event.Type !== "Upcoming") continue;
        if (event.reminderSentAt) continue; // Already sent
        
        const eventDate = event.Date;
        if (!eventDate) continue;
        
        const dateObj = parseCustomDate(eventDate);
        if (!dateObj) continue;
        
        const eventDateUTC = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
        const twoDaysBefore = new Date(eventDateUTC);
        twoDaysBefore.setUTCDate(twoDaysBefore.getUTCDate() - 2);
        
        // Check if reminder should have been sent (today is on or after 2 days before event)
        // But not more than 7 days after the event (to avoid very old events)
        const sevenDaysAfterEvent = new Date(eventDateUTC);
        sevenDaysAfterEvent.setUTCDate(sevenDaysAfterEvent.getUTCDate() + 7);
        
        if (today.getTime() >= twoDaysBefore.getTime() && today.getTime() <= sevenDaysAfterEvent.getTime()) {
          const daysUntilEvent = Math.ceil((eventDateUTC.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          pendingReminders.push({
            ...event,
            daysUntilEvent,
            reminderDueDate: twoDaysBefore.toISOString().split('T')[0]
          });
        }
      }
      
      return pendingReminders;
    } catch (error) {
      console.error('Error getting pending reminders:', error);
      return [];
    }
  }

  /**
   * Send pending reminders that were missed
   */
  async function sendPendingReminders() {
    const pending = await getPendingReminders();
    console.log(`Found ${pending.length} pending reminder(s)`);
    
    const results = [];
    for (const event of pending) {
      try {
        const dateObj = parseCustomDate(event.Date);
        const eventDay = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const eventDayNum = dateObj.getDate();
        const eventMonth = dateObj.toLocaleDateString('en-US', { month: 'long' });
        const eventYear = dateObj.getFullYear();
        const eventDateStr = `${eventDay}, Date ${eventDayNum} ${eventMonth} ${eventYear}`;
        const location = event.Location || '';
        const meetingPoint = event.Location || '';
        let meetingPointHtml = meetingPoint;
        if (meetingPoint) {
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meetingPoint)}`;
          meetingPointHtml = `<a href="${mapsUrl}">${meetingPoint}</a>`;
        }
        const time = event.Time || '';
        const trainingLink = 'https://drive.google.com/drive/folders/1aztfMfCVlNGqro492FS-3gvdaRA6kCGk?usp=drive_link';
        
        let participantsList = '';
        if (Array.isArray(event.Participants) && event.Participants.length > 0) {
          participantsList = event.Participants.map((name, idx) => `${idx + 1}. ${name}`).join("\n");
        } else {
          participantsList = 'No participants yet.';
        }
        
        const message = `Hi everyone!\n\nPlease find the details for <b>${eventDateStr}</b> survey below:\n\n<b>Survey Details</b>\nLocation: ${location}\nMeeting Point: ${meetingPointHtml}\nTime: ${time}\n\n<b>Participant List</b>\n${participantsList}\n\n<a href="${trainingLink}">Training Material</a>`;
        
        await sendTelegramMessage(message, event._id, botConfig, {
          storeChatHistory: telegramController.storeChatHistory.bind(telegramController),
          saveMessageId: telegramController.saveTelegramMessageId.bind(telegramController)
        });
        
        await eventsController.markReminderSent(event._id);
        console.log(`✅ Sent pending reminder for event: ${event._id}`);
        results.push({ eventId: event._id, success: true });
        
        if (io) {
          io.emit('survey-updated', { message: 'Survey updated successfully' });
        }
      } catch (error) {
        console.error(`Error sending pending reminder for ${event._id}:`, error);
        results.push({ eventId: event._id, success: false, error: error.message });
      }
    }
    
    return results;
  }

  // Expose functions for external use (bot commands, API)
  app.locals.getPendingReminders = getPendingReminders;
  app.locals.sendPendingReminders = sendPendingReminders;

  /**
   * Retry sending pending reminders every 5 minutes until all are sent
   * Stops retrying after 1 hour (12 attempts) to prevent infinite loops
   */
  async function retryPendingReminders(attemptNumber = 1, maxAttempts = 12) {
    const pending = await getPendingReminders();
    
    if (pending.length === 0) {
      console.log('✅ No pending reminders - all sent successfully');
      return;
    }
    
    if (attemptNumber > maxAttempts) {
      console.log(`⚠️ Max retry attempts (${maxAttempts}) reached. ${pending.length} reminder(s) still pending.`);
      console.log('   Use /checkreminders send to manually send remaining reminders.');
      return;
    }
    
    console.log(`🔄 Retry attempt ${attemptNumber}/${maxAttempts}: Found ${pending.length} pending reminder(s), sending now...`);
    await sendPendingReminders();
    
    // Check if there are still pending reminders after sending
    const stillPending = await getPendingReminders();
    if (stillPending.length > 0) {
      console.log(`📋 ${stillPending.length} reminder(s) still pending. Scheduling retry in 5 minutes...`);
      setTimeout(() => retryPendingReminders(attemptNumber + 1, maxAttempts), 5 * 60 * 1000);
    } else {
      console.log('✅ All reminders sent successfully!');
    }
  }

  // --- Event Reminders Scheduler ---
  // Main reminder job: 10:00 UTC (18:00 Singapore time)
  schedule.scheduleJob('0 10 * * *', async () => {
 // schedule.scheduleJob('36 12 * * *', async () => {
    console.log('🔔 Running main event reminders job at 10:00 UTC (18:00 Singapore)');
    await sendEventReminders('10:00 UTC (18:00 Singapore time)');
    
    // Schedule retry 5 minutes later for any failed/pending reminders
    console.log('📋 Scheduling retry check in 5 minutes...');
    setTimeout(() => retryPendingReminders(1, 12), 5 * 60 * 1000);
  });

  // Additional backup job: 10:05 UTC (18:05 Singapore time) - starts retry loop if any pending
  // This catches cases where the main job's setTimeout didn't persist (e.g., Azure restart)
  schedule.scheduleJob('5 10 * * *', async () => {
  //  schedule.scheduleJob('41 12 * * *', async () => {
    console.log('🔄 Running backup job at 10:05 UTC (18:05 Singapore)');
    await retryPendingReminders(1, 100);
  });

  // --- Import Registration Bot from Telegram folder ---
  const registrationBot = require('../Telegram/Bot/Survey/registrationBot');
  
  // Initialize registration bot with app and io - await to ensure webhook route is registered
  try {
    await registrationBot.initialize(app, io, botConfig);
  } catch (err) {
    console.error('Failed to initialize registration bot:', err.message);
  }

  // --- Startup check for pending reminders (important for Azure restarts) ---
  // Wait 30 seconds after startup to allow database connections to stabilize
  setTimeout(async () => {
    console.log('🚀 Running startup check for pending reminders...');
    const pending = await getPendingReminders();
    if (pending.length > 0) {
      console.log(`⚠️ Found ${pending.length} pending reminder(s) on startup`);
      console.log('   These may have been missed due to server restart.');
      console.log('   Starting retry loop...');
      await retryPendingReminders(1, 12);
    } else {
      console.log('✅ No pending reminders on startup');
    }
  }, 30 * 1000); // 30 seconds delay

}

module.exports = setupTelegramFeatures;