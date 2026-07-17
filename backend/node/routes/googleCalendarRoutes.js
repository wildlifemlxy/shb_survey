const express = require('express');
const router = express.Router();
const EventsController = require('../Controller/Events/eventsController');
const { buildIcsContent } = require('../Telegram/utils/icsGenerator');

const eventsController = new EventsController();

/**
 * Universal calendar-file fallback for users who don't use Google Calendar.
 * Works with Apple Calendar, Outlook, and any app that supports .ics import.
 */
router.get('/ics/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const result = await eventsController.getEventById(eventId);
    const event = result.event;

    if (!event) {
      return res.status(404).send('Event not found.');
    }

    const icsContent = buildIcsContent({ ...event, _id: eventId });
    if (!icsContent) {
      return res.status(400).send('Could not generate a calendar file for this event (invalid date).');
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="shb-survey-${eventId}.ics"`);
    res.send(icsContent);
  } catch (error) {
    console.error('Error generating ICS file:', error.message);
    res.status(500).send('Error generating calendar file.');
  }
});

module.exports = router;
