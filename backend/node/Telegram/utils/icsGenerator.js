/**
 * ICS (iCalendar) Generator
 * Builds a calendar-agnostic .ics file for a survey event. This is the
 * universal fallback for users who don't use Google Calendar - .ics files
 * can be opened/imported by Apple Calendar, Outlook, and virtually any other
 * calendar app.
 */

const { getEventUtcRange } = require('./messageTemplates');

function pad(n) {
  return n.toString().padStart(2, '0');
}

function toUtcStamp(d) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function toDateStamp(d) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/**
 * Escape special characters per RFC 5545 TEXT value rules.
 * Must escape backslashes/semicolons/commas first, then convert real
 * newlines to the literal "\n" escape sequence.
 */
function escapeIcsText(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Build the full .ics file contents for a survey event.
 * @param {Object} event - Raw event object with Date, Time, Location, Participants, _id
 * @returns {string|null} iCalendar text (CRLF line endings), or null if the event date can't be parsed
 */
function buildIcsContent(event) {
  const range = getEventUtcRange(event);
  if (!range) return null;

  const summary = escapeIcsText(`SHB Survey - ${event.Location || 'Survey'}`);
  const location = escapeIcsText(event.Location || '');

  let participantsText = 'No participants yet.';
  if (Array.isArray(event.Participants) && event.Participants.length > 0) {
    participantsText = event.Participants.map((name, idx) => `${idx + 1}. ${name}`).join('\n');
  }
  const description = escapeIcsText(`Straw-headed Bulbul survey event.\n\nParticipants:\n${participantsText}`);

  const uid = `shb-survey-${event._id || Date.now()}@shb-survey`;
  const dtStamp = toUtcStamp(new Date());

  let dtStart, dtEnd;
  if (range.allDay) {
    dtStart = `DTSTART;VALUE=DATE:${toDateStamp(range.startDate)}`;
    dtEnd = `DTEND;VALUE=DATE:${toDateStamp(range.endDate)}`;
  } else {
    dtStart = `DTSTART:${toUtcStamp(range.startUTC)}`;
    dtEnd = `DTEND:${toUtcStamp(range.endUTC)}`;
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SHB Survey//Registration Bot//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    dtStart,
    dtEnd,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  // RFC 5545 requires CRLF line endings
  return lines.join('\r\n');
}

module.exports = { buildIcsContent };
