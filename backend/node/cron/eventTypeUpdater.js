const cron = require('node-cron');
const EventsController = require('../Controller/Events/eventsController');
const parseCustomDate = require('./parseCustomDate');

// Export a function that takes io
function startEventTypeUpdater(io) {
  cron.schedule('* * * * *', async () => {
    try {
      const controller = new EventsController();
      const result = await controller.getAllEvents();
      const events = result.events;
      //console.log('Retrieved events:', events);
      const now = new Date();

      for (const event of events) {
        const eventDate = event.Date;
        const eventTime = event.Time;
        if (!eventDate || !eventTime) continue;
        const [startTime, endTime] = eventTime.split(' - ');
        if (!startTime || !endTime) continue;

        const dateObj = parseCustomDate(eventDate);
        if (!dateObj) continue;
        const startDateTime = new Date(`${dateObj.toDateString()} ${startTime}`);

        if (now > startDateTime) {
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