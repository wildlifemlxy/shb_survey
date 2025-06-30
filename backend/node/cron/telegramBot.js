const axios = require('axios');
const schedule = require('node-schedule');
const EventsController = require('../Controller/Events/eventsController');
const parseCustomDate = require('./parseCustomDate');
const TelegramController = require('../Controller/Telegram/telegramController');

function setupTelegramFeatures(app, io) {
  // --- Event Reminders Scheduler (10:00 AM every day) ---
  schedule.scheduleJob('0 10 * * *', async () => {
    try {
      console.log('Running event reminders scheduler at 10:00 AM');
      const controller = new EventsController();
      const result = await controller.getAllEvents();
      const events = result.events;
      const today = new Date();

      for (const event of events) {
        const eventDate = event.Date;
        if (!eventDate) continue;
        const dateObj = parseCustomDate(eventDate);
        if (!dateObj) continue;
        console.log('Parsed event date:', dateObj.toISOString());

        // Calculate the date 2 days before the event
        const twoDaysBefore = new Date(dateObj);
        twoDaysBefore.setDate(twoDaysBefore.getDate() - 2);

        // Set both dates to midnight for date-only comparison
        if (twoDaysBefore.getDate() === today.getDate()) {
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
          await sendTelegramMessage(message, event._id);
          if (io) {
            io.emit('survey-updated', {
              message: 'Survey updated successfully',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error sending event reminders:', error);
    }
  });

  // --- Telegram Webhook Route ---
  const TELEGRAM_BOT_TOKEN = '7968511707:AAF3ZRpt1q4kNik8cEpcskQjbnJy5kVm6N4';
  const telegramController = new TelegramController();
  const eventsController = new EventsController();

  app.post(`/telegram/webhook/${TELEGRAM_BOT_TOKEN}`, async (req, res) => {
    const update = req.body;
    try {
      // Handle poll responses
      if (update.poll_answer) {
        const pollAnswer = update.poll_answer;
        const user = pollAnswer.user;
        const optionIds = pollAnswer.option_ids;
        await telegramController.storeChatHistory(
          TELEGRAM_BOT_TOKEN,
          user.id,
          `Poll response: ${user.first_name || ''} ${user.last_name || ''} (${user.username || ''}) - Option IDs: ${optionIds.join(',')}`
        );
        console.log(`Stored poll response for user ${user.id}`);
        // --- Update participants in DB ---
        const event = await eventsController.getEventByPollId(pollAnswer.poll_id);
        if (event) {
          const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.id;
          let participants = Array.isArray(event.Participants) ? [...event.Participants] : [];
          if (!participants.includes(name)) {
            participants.push(name);
            await eventsController.updateEventParticipants(event._id, participants);
            console.log(`Updated participants for event ${event._id}`);
          }
        }
      }
      // Handle plain chat messages (add name to backend)
      if (update.message && update.message.text) {
        const msg = update.message;
        const user = msg.from;
        if (/^add me$/i.test(msg.text.trim())) {
          const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.id;
          await telegramController.storeChatHistory(
            TELEGRAM_BOT_TOKEN,
            msg.chat.id,
            `Manual participant: ${name}`
          );
          console.log(`Stored manual participant: ${name}`);
          // --- Update participants in DB ---
          const event = await eventsController.getEventByChatId(msg.chat.id);
          if (event) {
            let participants = Array.isArray(event.Participants) ? [...event.Participants] : [];
            if (!participants.includes(name)) {
              participants.push(name);
              await eventsController.updateEventParticipants(event._id, participants);
              console.log(`Updated participants for event ${event._id}`);
            }
          }
        }
      }
      res.sendStatus(200);
    } catch (err) {
      console.error('Error handling Telegram webhook update:', err.message);
      res.sendStatus(500);
    }
  });

  // --- Helper to send Telegram messages ---
  async function sendTelegramMessage(message, eventId) {
    const CHAT_IDS = ['-1002415651477']; // Only use group chat where bot is present
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    for (const chatId of CHAT_IDS) {
      try {
        await telegramController.storeChatHistory(TELEGRAM_BOT_TOKEN, chatId, message);
        const res = await axios.post(url, {
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        });
        // Store message_id and chatId in the event for later editing
        if (eventId && res.data && res.data.result && res.data.result.message_id) {
          await eventsController.saveTelegramMessageId(eventId, chatId, res.data.result.message_id);
        }
        console.log(`Message sent to ${chatId}:`, res.data);
      } catch (error) {
        console.error(`Error sending to ${chatId}:`, error.response ? error.response.data : error.message);
      }
    }
  }

}

module.exports = setupTelegramFeatures;