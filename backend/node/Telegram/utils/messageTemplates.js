/**
 * Message Templates
 * Templates for Telegram bot messages
 */

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
  let meetingPointHtml = meetingPoint || '';
  if (meetingPoint) {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meetingPoint)}`;
    meetingPointHtml = `<a href="${mapsUrl}">${meetingPoint}</a>`;
  }

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
  formatEventDate
};
