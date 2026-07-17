/**
 * Message Templates
 * Templates for Telegram bot messages
 */

const parseCustomDate = require('../../cron/parseCustomDate');

/**
 * Escape text for safe use inside a Telegram HTML parse-mode message.
 * Telegram requires literal '&', '<', '>' to be escaped as entities anywhere
 * in the text, including inside <a href="..."> attribute values.
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Build an HTML <a> tag linking a location's display text to a Google Maps search,
 * safe for use in Telegram HTML parse-mode messages. Returns the escaped plain text
 * (no link) if location is empty.
 * @param {string} location - Raw location/meeting point text
 * @returns {string} HTML-safe, hyperlinked text
 */
function buildLocationLink(location) {
  const text = escapeHtml(location);
  if (!text) return '';
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`.replace(/&/g, '&amp;');
  return `<a href="${mapsUrl}">${text}</a>`;
}

/**
 * Compute the UTC start/end instants (or all-day dates) for an event.
 * Event times are stored as Singapore local time (UTC+8) in the format "HH:mm - HH:mm".
 * Shared by buildGoogleCalendarLink() and the .ics generator so the date math
 * only lives in one place.
 * @param {Object} event - Raw event object with Date, Time fields
 * @returns {Object|null} { allDay: false, startUTC: Date, endUTC: Date } or
 *                         { allDay: true, startDate: Date, endDate: Date }, or null if no valid date
 */
function getEventUtcRange(event) {
  const parsedDate = parseCustomDate(event.Date);
  if (!parsedDate) return null;

  if (event.Time && event.Time.includes(' - ')) {
    const [startStr, endStr] = event.Time.split(' - ').map(s => s.trim());
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);

    // Times are Singapore local (UTC+8); subtract 8 hours to convert to UTC
    const startUTC = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), (startH || 0) - 8, startM || 0));
    const endUTC = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), (endH || 0) - 8, endM || 0));

    return { allDay: false, startUTC, endUTC };
  }

  // All-day fallback (end date is exclusive in both Google Calendar and .ics, so add 1 day)
  const nextDay = new Date(parsedDate);
  nextDay.setDate(nextDay.getDate() + 1);
  return { allDay: true, startDate: parsedDate, endDate: nextDay };
}

/**
 * Build a Google Calendar "add event" link for a survey event.
 * Falls back to an all-day event link if the time can't be parsed, or returns null
 * if the event date itself can't be parsed.
 * @param {Object} event - Raw event object with Date, Time, Location fields
 * @returns {string|null} Google Calendar render URL, or null if no valid date
 */
function buildGoogleCalendarLink(event) {
  const range = getEventUtcRange(event);
  if (!range) return null;

  const pad = (n) => n.toString().padStart(2, '0');
  const toUTCStamp = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const toDateStamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

  const title = encodeURIComponent(`SHB Survey - ${event.Location || 'Survey'}`);

  // Include the participant list in the event description so it shows up in Google Calendar
  let detailsText = 'Straw-headed Bulbul survey event.';
  if (Array.isArray(event.Participants) && event.Participants.length > 0) {
    const participantsText = event.Participants.map((name, idx) => `${idx + 1}. ${name}`).join('\n');
    detailsText += `\n\nParticipants:\n${participantsText}`;
  }
  const details = encodeURIComponent(detailsText);
  const location = encodeURIComponent(event.Location || '');

  const datesParam = range.allDay
    ? `${toDateStamp(range.startDate)}/${toDateStamp(range.endDate)}`
    : `${toUTCStamp(range.startUTC)}/${toUTCStamp(range.endUTC)}`;

  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesParam}&details=${details}&location=${location}`;
}

/**
 * Build survey event message with dynamic fields
 * @param {Object} eventData - Event data object
 * @param {string} eventData.date - Formatted date string (e.g., "Tue, Date 16 December 2025")
 * @param {string} eventData.location - Event location
 * @param {string} eventData.meetingPoint - Meeting point (with Google Maps link)
 * @param {string} eventData.time - Event time
 * @param {Array} eventData.participants - Array of participant names
 * @param {string} trainingLink - Static training material link
 * @returns {string} Formatted HTML message
 */
function buildSurveyMessage(eventData, trainingLink) {
  const { date, location, meetingPoint, time, participants } = eventData;

  // Build participants list
  let participantsList = '';
  if (Array.isArray(participants) && participants.length > 0) {
    participantsList = participants.map((name, idx) => `${idx + 1}. ${name}`).join('\n');
  } else {
    participantsList = 'No participants yet.';
  }

  // Build meeting point with Google Maps link
  const meetingPointHtml = buildLocationLink(meetingPoint) || (meetingPoint || '');

  const message = `Hi everyone!

Please find the details for <b>${date}</b> survey below:

<b>Survey Details</b>
Location: ${location || ''}
Meeting Point: ${meetingPointHtml}
Time: ${time || ''}

<b>Participant List</b>
${participantsList}

<a href="${trainingLink}">Training Material</a>`;

  return message;
}

/**
 * Compute the start/end date (or dateTime) range for an event, suitable for
 * passing directly into the Google Calendar API's events.insert `start`/`end` fields.
 * Event times are stored as Singapore local time (UTC+8) in the format "HH:mm - HH:mm";
 * the Calendar API accepts a `timeZone` field so no manual UTC conversion is needed here.
 * @param {Object} event - Raw event object with Date, Time fields
 * @returns {Object|null} { allDay: true, startDate, endDate } or
 *                         { allDay: false, startLocal, endLocal, timeZone }, or null if no valid date
 */
function getEventDateTimeRange(event) {
  const parsedDate = parseCustomDate(event.Date);
  if (!parsedDate) return null;

  const pad = (n) => n.toString().padStart(2, '0');

  if (event.Time && event.Time.includes(' - ')) {
    const [startStr, endStr] = event.Time.split(' - ').map(s => s.trim());
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);
    const y = parsedDate.getFullYear();
    const m = pad(parsedDate.getMonth() + 1);
    const d = pad(parsedDate.getDate());

    return {
      allDay: false,
      startLocal: `${y}-${m}-${d}T${pad(startH || 0)}:${pad(startM || 0)}:00`,
      endLocal: `${y}-${m}-${d}T${pad(endH || 0)}:${pad(endM || 0)}:00`,
      timeZone: 'Asia/Singapore'
    };
  }

  // All-day fallback (Calendar API's end date is exclusive, so add 1 day)
  const nextDay = new Date(parsedDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  return {
    allDay: true,
    startDate: fmt(parsedDate),
    endDate: fmt(nextDay)
  };
}

/**
 * Format date to "Tue, Date 16 December 2025" format
 * @param {Date} dateObj - JavaScript Date object
 * @returns {string} Formatted date string
 */
function formatEventDate(dateObj) {
  const day = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNum = dateObj.getDate();
  const month = dateObj.toLocaleDateString('en-US', { month: 'long' });
  const year = dateObj.getFullYear();
  return `${day}, Date ${dayNum} ${month} ${year}`;
}

module.exports = {
  buildSurveyMessage,
  formatEventDate,
  buildGoogleCalendarLink,
  getEventDateTimeRange,
  getEventUtcRange,
  buildLocationLink,
  escapeHtml
};
