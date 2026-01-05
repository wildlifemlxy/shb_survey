const axios = require('axios');
const schedule = require('node-schedule');
const EventsController = require('../Controller/Events/eventsController');
const parseCustomDate = require('./parseCustomDate');
const TelegramController = require('../Controller/Telegram/telegramController');
const botConfig = require('../Telegram/config/botConfig');
const { sendTelegramMessage } = require('../Telegram/utils/sendMessage');

function setupTelegramFeatures(app, io) {
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

  // --- Event Reminders Scheduler (17:02 UTC = 01:02 Singapore time) ---
  schedule.scheduleJob('0 10 * * *', async () => {
    await sendEventReminders('10:00 UTC (18:00 Singapore time)');
  });

  /*schedule.scheduleJob('0 4 * * *', async () => {
    await sendEventReminders('17:02 UTC (01:02 Singapore time)');
  });*/

  // --- Import Registration Bot from Telegram folder ---
  const registrationBot = require('../Telegram/Bot/Survey/registrationBot');
  const botConfig = require('../Telegram/config/botConfig');
  
  // Initialize registration bot with app and io (async for webhook setup)
  registrationBot.initialize(app, io, botConfig).catch(err => {
    console.error('Failed to initialize registration bot:', err.message);
  });

}

module.exports = setupTelegramFeatures;