// cron/parseCustomDate.js
// Helper to parse dates like '26-Jun-25' or 'dd/mm/yyyy' to a JS Date object

function parseCustomDate(dateStr) {
  if (!dateStr) return null;
  
  // Handle dd/mm/yyyy format (e.g., 26/06/2025)
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/').map(Number);
    if (day && month && year) {
      // month is 1-based in dd/mm/yyyy format, so subtract 1 for JS Date
      return new Date(year, month - 1, day);
    }
    return null;
  }
  
  // Handle DD-MMM-YY format (e.g., 26-Jun-25)
  if (dateStr.includes('-')) {
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
  
  return null;
}

module.exports = parseCustomDate;
