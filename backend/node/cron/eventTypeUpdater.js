const schedule = require('node-schedule');
const EventsController = require('../Controller/Events/eventsController');
const parseCustomDate = require('./parseCustomDate');
const e = require('express');

// Helper: Convert Singapore time (UTC+8) to GMT/UTC
function sgTimeToUTC(dateObj, timeStr) {
  // timeStr: 'HH:mm' or 'HH:mm:ss'
  const [h, m, s] = timeStr.split(':').map(Number);
  // Singapore is UTC+8, so subtract 8 hours to get UTC
  return new Date(Date.UTC(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate(),
    (h || 0) - 8, // convert to UTC
    m || 0,
    s || 0
  ));
}

// Export a function that takes io
function startEventTypeUpdater(io) {
  schedule.scheduleJob('* * * * *', async () => {
    try {
      console.log('Running event type updater scheduler...');
      const controller = new EventsController();
      const result = await controller.getAllEvents();
      const events = result.events;
      const nowUTC = new Date(); // This is in UTC by default

      for (const event of events) {
        const eventDate = event.Date;
        const eventTime = event.Time;
        if (!eventDate || !eventTime) continue;
        const [startTime, endTime] = eventTime.split(' - ');
        if (!startTime || !endTime) continue;

        const dateObj = parseCustomDate(eventDate);
        if (!dateObj) continue;
        const startDateTimeUTC = sgTimeToUTC(dateObj, startTime);

        console.log(`Checking event ${even}: startDateTimeUTC=${startDateTimeUTC.toISOString()}, nowUTC=${nowUTC.toISOString()}`);

        if (nowUTC > startDateTimeUTC) {
          if (event.Type === "Upcoming") {
            await controller.updateEventFields(event._id, { Type: "Past" });
            if (io) {
              io.emit('survey-updated', {
                message: 'Event updated successfully',
              });
            }
            console.log(`Event ${event._id} is now marked as Past.`);
          }
        }
      }
    } catch (error) {
      console.error('Error updating event types:', error);
    }
  });
}

module.exports = startEventTypeUpdater;