// cron/parseCustomDate.js
// Helper to parse dates like '26-Jun-25' to a JS Date object

function parseCustomDate(dateStr) {
  // Expects format: DD-MMM-YY (e.g., 26-Jun-25)
  if (!dateStr) return null;
  const [day, monthStr, yearStr] = dateStr.split('-');
  const months = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };
  const year = 2000 + parseInt(yearStr, 10); // Assumes 21st century
  const month = months[monthStr];
  if (month === undefined) return null;
  return new Date(year, month, parseInt(day, 10));
}

module.exports = parseCustomDate;
