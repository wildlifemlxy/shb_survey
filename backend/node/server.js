const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cron = require('node-cron');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
// Keep your original port preference
const PORT = process.env.PORT || '3001';
// Add support for the required deployment port
const DEPLOYMENT_PORT = 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Store survey data
let surveyData = {
  wwfLed: [],
  volunteerLed: []
};

// Store telegram configuration
let telegramConfig = {
  token: '7968511707:AAF3ZRpt1q4kNik8cEpcskQjbnJy5kVm6N4',
  groups: [
    { id: '2136702422', name: 'WWF volunteer Telegram'},
    { id: '611754613', name: 'Moses Personal Chat'}
  ]
};

// Load initial data if available
const dataPath = path.join(__dirname, 'data');
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

// Load telegram config if it exists
const telegramConfigPath = path.join(dataPath, 'telegram-config.json');
if (fs.existsSync(telegramConfigPath)) {
  try {
    const configData = fs.readFileSync(telegramConfigPath, 'utf8');
    telegramConfig = JSON.parse(configData);
  } catch (err) {
    console.error('Error loading telegram config:', err);
  }
}

// Function to save telegram config
const saveTelegramConfig = () => {
  try {
    fs.writeFileSync(telegramConfigPath, JSON.stringify(telegramConfig, null, 2));
  } catch (err) {
    console.error('Error saving telegram config:', err);
  }
};

// Process survey data from spreadsheet
const processSurveyData = (rawData) => {
  // Object to store surveys organized by type
  const surveysByType = {
    "WWF-led": [],
    "Volunteer-led": []
  };
  
  let currentType = null;
  
  // Process each row in the data
  for (let rowIndex = 0; rowIndex < rawData.length; rowIndex++) {
    // Check if we have a valid row
    const row = rawData[rowIndex];
    if (!row || !row.length) continue;
    
    // Check column A for survey type indicators
    const cellA = row[0];
    if (cellA && typeof cellA === 'string') {
      const cellText = cellA.trim().toLowerCase();
      
      // Update current type if we find an indicator
      if (cellText.includes('wwf')) {
        currentType = "WWF-led";
        console.log(`Found ${currentType} section at row ${rowIndex}`);
      } else if (cellText.includes('volunteer')) {
        currentType = "Volunteer-led";
        console.log(`Found ${currentType} section at row ${rowIndex}`);
      }
    }
    
    // Skip if we don't have a type yet
    if (!currentType) continue;
    
    // Look for date rows which indicate the start of a survey
    for (let colIndex = 1; colIndex < (row.length || 20); colIndex++) {
      const cell = row[colIndex];
      
      if (cell && typeof cell === 'string' && cell.includes('Date:')) {
        console.log(`Found survey at row ${rowIndex}, column ${colIndex}`);
        
        // This column has a survey - extract info
        const surveyData = {
          date: '',
          location: '',
          time: '',
          participants: []
        };
        
        // Split the cell by newlines
        const lines = cell.split('\n');
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          
          if (trimmedLine.startsWith('Date:')) {
            surveyData.date = trimmedLine.replace('Date:', '').trim();
          } else if (trimmedLine.startsWith('Location:')) {
            surveyData.location = trimmedLine.replace('Location:', '').trim();
          } else if (trimmedLine.startsWith('Time:')) {
            surveyData.time = trimmedLine.replace('Time:', '').trim();
          }
        }
        
        // Extract participants from rows below until we hit an empty row or a new header
        let participantRow = rowIndex; // Start after date/location/time
        let emptyRowCount = 0;
        
        while (participantRow < rawData.length && emptyRowCount < 2) {
          const numCell = rawData[participantRow][colIndex];
          const nameCell = rawData[participantRow][colIndex + 1];
          
          // If this row has a number and name, it's a participant
          if (numCell && !isNaN(Number(numCell)) && nameCell) {
            surveyData.participants.push({
              number: numCell,
              name: nameCell
            });
            emptyRowCount = 0; // Reset empty row counter
          } else {
            // Count consecutive empty rows to detect end of participant list
            emptyRowCount++;
          }
          
          participantRow++;
        }     
        // Only add surveys with valid data
        if (surveyData.date || surveyData.location || surveyData.time || surveyData.participants.length > 0) {
          surveysByType[currentType].push(surveyData);
          console.log(`Added survey with ${surveyData.participants.length} participants`);
        }
      }
    }
  }
  
  return surveysByType;
};

// Function to fetch survey data from Google Sheets
const fetchSurveyDataFromSheet = async (url) => {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer'
    });
    
    const data = new Uint8Array(response.data);
    const workbook = XLSX.read(data, { type: 'array' });
    
    // Get the correct sheet - using "Survey" or first sheet if not found
    const sheetNames = workbook.SheetNames;
    console.log("Available sheets:", sheetNames);
    
    let sheetName = sheetNames.find(name => name.includes("Survey")) ||
                    (sheetNames.includes("Upcoming Surveys") ? "Upcoming Surveys" : sheetNames[0]);
    
    const sheet = workbook.Sheets[sheetName];
    
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found in workbook`);
    }
    
    // Get the raw data as a 2D array
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    
    // Process the survey data by columns
    const surveysByType = processSurveyData(rawData);
    
    // Helper function to check if a survey has already passed
    const isSurveyPassed = (surveyDate, surveyTime) => {
      if (!surveyDate || !surveyTime) return false;
      
      // Parse the date (format: "12 April 2025")
      const dateParts = surveyDate.trim().split(" ");
      if (dateParts.length !== 3) return false;
      
      const day = parseInt(dateParts[0], 10);
      const monthStr = dateParts[1];
      const year = parseInt(dateParts[2], 10);
      
      // Map month string to month number (0-based)
      const months = {
        'january': 0, 'february': 1, 'march': 2, 'april': 3,
        'may': 4, 'june': 5, 'july': 6, 'august': 7,
        'september': 8, 'october': 9, 'november': 10, 'december': 11
      };
      
      const month = months[monthStr.toLowerCase()];
      if (month === undefined) return false;
      
      // Parse the time (format: "0730hrs - 0930hrs")
      const timeMatch = surveyTime.match(/(\d{4})hrs/);
      if (!timeMatch) return false;
      
      const timeStr = timeMatch[1];
      const hours = parseInt(timeStr.substring(0, 2), 10);
      const minutes = parseInt(timeStr.substring(2, 4), 10);
      
      // Create survey date object
      const surveyDateTime = new Date(year, month, day, hours, minutes);
      
      // Compare with current date and time
      const currentDateTime = new Date();
      
      return surveyDateTime < currentDateTime;
    };
    
    // Transform data to match expected structure
    // Initialize with empty structure
    const updatedData = {
      wwfLed: [],
      volunteerLed: []
    };
    
    // Filter and update WWF-led data if available
    const wwfSurveys = surveysByType["WWF-led"];
    if (wwfSurveys && wwfSurveys.length > 0) {
      // Filter out past surveys
      const futureWwfSurveys = wwfSurveys.filter(survey => 
        !isSurveyPassed(survey.date, survey.time)
      );
      
      if (futureWwfSurveys.length > 0) {
        updatedData.wwfLed = futureWwfSurveys.map(survey => ({
          date: survey.date || "",
          location: survey.location || "",
          meetingPoint: "", // Empty initially
          meetingPointDesc: "",
          time: survey.time || "",
          participants: survey.participants?.map(p => p.name) || [],
          reminderSent: false // Track if reminder has been sent
        }));
      }
    }
        
    // Filter and update volunteer-led data if available
    const volunteerSurveys = surveysByType["Volunteer-led"];
    if (volunteerSurveys && volunteerSurveys.length > 0) {
      // Filter out past surveys
      const futureVolunteerSurveys = volunteerSurveys.filter(survey => 
        !isSurveyPassed(survey.date, survey.time)
      );
      
      updatedData.volunteerLed = futureVolunteerSurveys.map(survey => ({
        date: survey.date || "",
        location: survey.location || "",
        meetingPoint: "", // Empty initially
        meetingPointDesc: "",
        time: survey.time || "",
        participants: survey.participants?.map(p => p.name) || [],
        reminderSent: false // Track if reminder has been sent
      }));
    }
    
    // Add one empty volunteer survey if none exist
    if (updatedData.volunteerLed.length === 0) {
      updatedData.volunteerLed = [{
        date: "",
        location: "",
        meetingPoint: "",
        meetingPointDesc: "",
        time: "",
        participants: [],
        reminderSent: false
      }];
    }
    
    surveyData = updatedData;
    saveSurveyData();
    
    return updatedData;
  } catch (error) {
    console.error('Error fetching or parsing survey data:', error);
    throw error;
  }
};

// Function to save survey data
const saveSurveyData = () => {
  try {
    fs.writeFileSync(path.join(dataPath, 'survey-data.json'), JSON.stringify(surveyData, null, 2));
  } catch (err) {
    console.error('Error saving survey data:', err);
  }
};

// Load survey data if it exists
const surveyDataPath = path.join(dataPath, 'survey-data.json');
if (fs.existsSync(surveyDataPath)) {
  try {
    const data = fs.readFileSync(surveyDataPath, 'utf8');
    surveyData = JSON.parse(data);
  } catch (err) {
    console.error('Error loading survey data:', err);
  }
}

// Helper function to format survey message
const formatStandardSurveyMessage = (survey) => {
  // Helper function to escape HTML special characters
  const escapeHtml = (text) => {
    if (!text) return '';
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };
  
  // Helper function to ensure URLs are properly formatted
  const formatUrl = (url) => {
    if (!url) return '';
    // Make sure URL starts with http:// or https://
    return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
  };
  
  let messageText = `Hi everyone! Please find the details for tomorrow's (${escapeHtml(survey.date)}) survey below:\n\n`;
  messageText += `<b>Survey Details</b>\n`;
  messageText += `Location: ${escapeHtml(survey.location)}\n`;
  
  let meetingPointUrl = survey.meetingPoint;
  if (!meetingPointUrl && survey.location && survey.location !== "TBC") {
    // Generate Google Maps URL for the location
    meetingPointUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(survey.location)}`;
  }
  
  if (meetingPointUrl) {
    const formattedUrl = formatUrl(meetingPointUrl);
    // Using HTML <a> tag for hyperlink
    messageText += `Meeting Point: <a href="${formattedUrl}">${escapeHtml(survey.location || 'Click here')}</a>`;
    if (survey.meetingPointDesc) {
      messageText += ` (${escapeHtml(survey.meetingPointDesc)})`;
    }
    messageText += '\n';
  }
  
  messageText += `Time: ${escapeHtml(survey.time)}\n\n`;
  messageText += `<b>Participant List</b> - please vote if you're attending\n`;
  
  // Create keyboard buttons
  const keyboardButtons = [];
  
  // Add participant list to message text
  if (survey.participants && survey.participants.length > 0) {
    survey.participants.forEach((participant, index) => {
      messageText += `${index + 1}. ${escapeHtml(participant)}\n`;
    });
  }
  
  // Add the training materials link
  const trainingUrl = formatUrl("https://drive.google.com/drive/folders/1aztfMfCVlNGqro492FS-3gvdaRA6kCGk?usp=drive_link");
  messageText += `\n<a href="${trainingUrl}">Training Materials</a>`;
  
  // Return an object containing both the message text and the poll-like inline keyboard markup
  return {
    text: messageText,
    markup: {
      inline_keyboard: keyboardButtons
    }
  };
};

// Function to send message to Telegram
const sendToTelegramGroups = async (formattedMessage) => {
  const { token, groups } = telegramConfig;
  const telegramApiUrl = `https://api.telegram.org/bot${token}/sendMessage`;
  
  const sendPromises = groups.map(group => {
    return axios.post(telegramApiUrl, {
      chat_id: group.id,
      text: formattedMessage.text,
      parse_mode: "HTML",
      reply_markup: formattedMessage.markup
    })
    .then(response => {
      console.log(`Message sent to group ${group.name} (${group.id})`);
      return { success: true, group };
    })
    .catch(error => {
      console.error(`Error sending message to group ${group.name} (${group.id}):`, error.response?.data || error.message);
      return { success: false, group, error: error.response?.data || error.message };
    });
  });
  
  return Promise.all(sendPromises);
};

// Function to check and send reminders for upcoming surveys
const checkAndSendReminders = async () => {
  console.log('Checking for upcoming surveys to send reminders...');
  
  // Parse current date
  const today = new Date();
  
  // Function to parse survey date
  const parseSurveyDate = (dateString) => {
    if (!dateString) return null;
    
    const dateParts = dateString.trim().split(" ");
    if (dateParts.length !== 3) return null;
    
    const day = parseInt(dateParts[0], 10);
    const monthStr = dateParts[1].toLowerCase();
    const year = parseInt(dateParts[2], 10);
    
    const months = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3,
      'may': 4, 'june': 5, 'july': 6, 'august': 7,
      'september': 8, 'october': 9, 'november': 10, 'december': 11
    };
    
    const month = months[monthStr];
    if (month === undefined) return null;
    
    return new Date(year, month, day);
  };
  
  // Function to check if a date is 2 days from now
  const isTwoDaysBeforeSurvey = (surveyDateStr) => {
    const surveyDate = parseSurveyDate(surveyDateStr);
    if (!surveyDate) return false;
    
    // Calculate two days from now
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(today.getDate() + 1/*2*/);
    
    // Check if the survey date is the same as two days from now
    return surveyDate.getDate() === twoDaysFromNow.getDate() &&
           surveyDate.getMonth() === twoDaysFromNow.getMonth() &&
           surveyDate.getFullYear() === twoDaysFromNow.getFullYear();
  };
  
  // Check WWF-led surveys
  for (let i = 0; i < surveyData.wwfLed.length; i++) {
    const survey = surveyData.wwfLed[i];
    if (!survey.reminderSent && isTwoDaysBeforeSurvey(survey.date)) {
      console.log(`Sending reminder for WWF-led survey on ${survey.date}`);
      
      const message = formatStandardSurveyMessage(survey);
      
      try {
        await sendToTelegramGroups(message);
        surveyData.wwfLed[i].reminderSent = true;
        saveSurveyData();
        console.log(`Reminder sent for WWF-led survey on ${survey.date}`);
      } catch (error) {
        console.error(`Error sending reminder for WWF-led survey:`, error);
      }
    }
  }
  
  // Check volunteer-led surveys
  for (let i = 0; i < surveyData.volunteerLed.length; i++) {
    const survey = surveyData.volunteerLed[i];
    if (!survey.reminderSent && isTwoDaysBeforeSurvey(survey.date)) {
      console.log(`Sending reminder for volunteer-led survey on ${survey.date}`);
      
      const message = formatStandardSurveyMessage(survey);
      
      try {
        await sendToTelegramGroups(message);
        surveyData.volunteerLed[i].reminderSent = true;
        saveSurveyData();
        console.log(`Reminder sent for volunteer-led survey on ${survey.date}`);
      } catch (error) {
        console.error(`Error sending reminder for volunteer-led survey:`, error);
      }
    }
  }
};

// API Endpoints

// Get survey data
app.get('/api/surveys', (req, res) => {
  res.json(surveyData);
});

// Refresh survey data from Google Sheets
app.post('/api/surveys/refresh', async (req, res) => {
  try {
    const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSuWNqWojoUhanoFvrFkPu4ObOXs1btQSF06gcVer_co9LwK2GROTupV1MfthXf1_zQPnxjBVmvA3Bg/pub?output=xlsx';
    const data = await fetchSurveyDataFromSheet(url);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update WWF-led survey
app.put('/api/surveys/wwf-led/:index', (req, res) => {
  const { index } = req.params;
  const updatedSurvey = req.body;
  
  if (index >= 0 && index < surveyData.wwfLed.length) {
    surveyData.wwfLed[index] = updatedSurvey;
    saveSurveyData();
    res.json({ success: true, data: surveyData });
  } else {
    res.status(404).json({ success: false, error: 'Survey not found' });
  }
});

// Update volunteer-led survey
app.put('/api/surveys/volunteer-led/:index', (req, res) => {
  const { index } = req.params;
  const updatedSurvey = req.body;
  
  if (index >= 0 && index < surveyData.volunteerLed.length) {
    surveyData.volunteerLed[index] = updatedSurvey;
    saveSurveyData();
    res.json({ success: true, data: surveyData });
  } else {
    res.status(404).json({ success: false, error: 'Survey not found' });
  }
});

// Get Telegram config
app.get('/api/telegram/config', (req, res) => {
  res.json(telegramConfig);
});

// Update Telegram config
app.put('/api/telegram/config', (req, res) => {
  const updatedConfig = req.body;
  telegramConfig = updatedConfig;
  saveTelegramConfig();
  res.json({ success: true, data: telegramConfig });
});

// Add Telegram group
app.post('/api/telegram/groups', (req, res) => {
  const { id, name } = req.body;
  
  if (!id || !name) {
    return res.status(400).json({ success: false, error: 'Group ID and name are required' });
  }
  
  telegramConfig.groups.push({ id, name });
  saveTelegramConfig();
  res.json({ success: true, data: telegramConfig.groups });
});

// Remove Telegram group
app.delete('/api/telegram/groups/:index', (req, res) => {
  const { index } = req.params;
  
  if (index >= 0 && index < telegramConfig.groups.length) {
    telegramConfig.groups.splice(index, 1);
    saveTelegramConfig();
    res.json({ success: true, data: telegramConfig.groups });
  } else {
    res.status(404).json({ success: false, error: 'Group not found' });
  }
});

// Send message to Telegram groups
app.post('/api/telegram/send', async (req, res) => {
  try {
    const { surveyType, index, customMessage } = req.body;
    
    let survey;
    let message;
    
    if (customMessage) {
      // Send custom text message
      message = {
        text: customMessage,
        markup: {}
      };
    } else {
      // Send formatted survey message
      if (surveyType === 'wwf-led') {
        survey = surveyData.wwfLed[index || 0];
      } else if (surveyType === 'volunteer-led') {
        survey = surveyData.volunteerLed[index];
      } else if (surveyType === 'custom') {
        survey = req.body.survey;
      }
      
      if (!survey) {
        return res.status(404).json({ success: false, error: 'Survey not found' });
      }
      
      message = formatStandardSurveyMessage(survey);
    }
    
    const results = await sendToTelegramGroups(message);
    res.json({ success: true, results });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Determine if running in a production environment
const isProduction = process.env.NODE_ENV === 'production';

// For 9:50 AM SST (09:50):
// - Local SST time: '50 9 * * *'
// - UTC equivalent: '50 1 * * *' (because SST is UTC+8)
const cronTime = isProduction ? '05 3 * * *' : '05 11* * *';

// Schedule cron job to check for upcoming surveys
console.log(`Setting up cron job to run at ${isProduction ? '03:05 UTC' : '11:05 SST'}`);
cron.schedule(cronTime, async () => {
  try {
    console.log(`Reminder check running at ${new Date().toLocaleString()}`);
    await checkAndSendReminders();
    console.log('Reminder check completed');
  } catch (error) {
    console.error('Error in scheduled reminder check:', error);
  }
}, {
  // Setting timezone works in both environments but is a backup
  timezone: isProduction ? 'UTC' : 'Asia/Singapore'
});

// Initial data fetch on server start
(async () => {
  try {
    console.log('Fetching initial survey data...');
    await fetchSurveyDataFromSheet('https://docs.google.com/spreadsheets/d/e/2PACX-1vSuWNqWojoUhanoFvrFkPu4ObOXs1btQSF06gcVer_co9LwK2GROTupV1MfthXf1_zQPnxjBVmvA3Bg/pub?output=xlsx');
    console.log('Initial data fetch complete.');
  } catch (error) {
    console.error('Error fetching initial data:', error);
  }
})();

// Start the server on the desired port (3001 for local development)
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// If we're in production, also listen on port 8080 for the deployment environment
if (PORT !== '8080' && PORT !== 8080) {
  const deploymentServer = app.listen(DEPLOYMENT_PORT, () => {
    console.log(`Server also running on deployment port ${DEPLOYMENT_PORT}`);
  });
  
  // Handle errors for the deployment server
  deploymentServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${DEPLOYMENT_PORT} is already in use. Continuing with only port ${PORT}.`);
    } else {
      console.error(`Error starting server on port ${DEPLOYMENT_PORT}:`, err);
    }
  });
}