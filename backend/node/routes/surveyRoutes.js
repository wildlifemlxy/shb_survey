var express = require('express');
var router = express.Router();
var SurveyController = require('../Controller/Survey/surveyController'); 
var UsersController = require('../Controller/Users/usersController'); 
const { sendOneSignalNotification } = require('../services/notificationService');
const startEventTypeUpdater = require('../cron/eventTypeUpdater');
const tokenEncryption = require('../middleware/tokenEncryption');

// Start cron jobs ONCE at module load, not inside the route handler

// Get current date and time in dd/mm/yyyy and 24-hour format (Singapore time)
const now = new Date();
const sgOptions = { timeZone: 'Asia/Singapore', hour12: false };
const [dateStr, timeStrFull] = now.toLocaleString('en-GB', sgOptions).split(',').map(s => s.trim());
const timeStr = timeStrFull.slice(0,5); // HH:mm only

router.post('/', async function(req, res, next) 
{
    const io = req.app.get('io'); // Get the Socket.IO instance
    startEventTypeUpdater(io);
    // Do NOT call startEventReminders() here again!
    console.log('Survey route request received:', req.body);
    
    // Initialize requestData
    let requestData = req.body;
    
    if(requestData.purpose === "retrieve")
    {
        try {
            // Handle encrypted request data for retrieve purpose
            if (req.body.encryptedData && req.body.requiresServerEncryption) {
                console.log('🔓 Decrypting incoming request data...');
                try {
                    const decryptResult = tokenEncryption.decryptRequestData(req.body);
                    if (decryptResult.success) {
                        requestData = decryptResult.data;
                        console.log('🔓 Request decryption successful, purpose:', requestData);
                        
                        // Get client public key from decrypted request data
                        const clientPublicKey = requestData.clientPublicKey || requestData.publicKey;
                        console.log('🔐 Using client public key for encryption:', clientPublicKey ? 'Found' : 'Not found');
                        console.log('🔐 Client public key source:', requestData.clientPublicKey ? 'clientPublicKey' : requestData.publicKey ? 'publicKey' : 'none');
                        
                        // Apply token encryption for authenticated access with client's public key
                        return await tokenEncryption.encryptResponseDataMiddleware(req, res, async () => {
                            var surveyController = new SurveyController();
                            var usersController = new UsersController();
                            
                            // Get all surveys for calculating statistics
                            var surveyResult = await surveyController.getAllSurveys();
                            var userResult = await usersController.getAllUsers();
                            console.log('Surveys retrieved successfully:', surveyResult.success, userResult.success ? userResult.users.length : 0);
                            
                            return {"result": surveyResult, "userCount": userResult.success ? userResult.users.length : 0};
                        }, clientPublicKey);
                    } else {
                        console.error('🔓 Request decryption failed:', decryptResult.error);
                        return res.status(400).json({ error: 'Failed to decrypt request data' });
                    }
                } catch (decryptError) {
                    console.error('🔓 Request decryption error:', decryptError);
                    return res.status(400).json({ error: 'Invalid encrypted request' });
                }
            }

        } catch (error) {
            console.error('Error retrieving surveys:', error);
            return res.status(500).json({ error: 'Failed to retrieve surveys.' });
        }
    } 
    else if(requestData.purpose === "insert")
    {
        try {
            // Apply token encryption for authenticated acces
                var controller = new SurveyController();
                let results = [];
                if (Array.isArray(requestData.data)) {
                    for (const survey of requestData.data) {
                        const result = await controller.insertSurvey(survey);
                        results.push(result);
                    }
                     await sendOneSignalNotification({
                        title: 'New Survey Update',
                        message: `New survey has been updated in the database on ${dateStr} at ${timeStr}`,
                        web_url: "https://gentle-dune-0405ec500.1.azurestaticapps.net/"
                    });
                    console.log('New survey notification sent successfully');
                    if (io) {
                        io.emit('survey-updated', {
                            message: 'Survey updated successfully',
                        });
                    }
                    return {"result": { success: true, message: "All surveys inserted.", details: results }};
                } else {
                    // Single object fallback
                    const result = await controller.insertSurvey(requestData.data);
                    console.log('Survey inserted successfully:', result);
                    

                    await sendOneSignalNotification({
                        title: 'New Survey Update',
                        message: `New survey has been updated in the database on ${dateStr} at ${timeStr}`,
                        web_url: "https://gentle-dune-0405ec500.1.azurestaticapps.net/"
                    });
                    console.log('New survey notification sent successfully');
                    if (io) {
                        io.emit('survey-updated', {
                            message: 'Survey updated successfully',
                        });
                    }
                    return {"result": result};
                }
        } catch (error) {
            console.error('Error inserting survey(s):', error);
            return res.status(500).json({ error: 'Failed to insert survey(s).' });
        }
    } 
    else if(requestData.purpose === "update")
    {
        console.log('Update request for survey:', requestData);
        try {
            // Apply token encryption for authenticated access
                var controller = new SurveyController();
                
                const { recordId, updatedRowData } = requestData;
                
                // Call the update method in the controller
                var result = await controller.updateSurvey(recordId, updatedRowData);

                console.log('Survey updated successfully:', result);
                
                // Emit socket event for real-time updates
                if (io) {
                    io.emit('survey-updated', {
                        message: 'Survey record updated successfully',
                    });
                }
                
                return {
                        success: true,
                        message: "Survey updated successfully"
                };

        } catch (error) {
            console.error('Error updating survey:', error);
            return res.status(500).json({ 
                error: 'Failed to update survey.',
                details: error.message 
            });
        }
    }
    else if(requestData.purpose === "delete")
    {
        console.log('Delete request for survey:', requestData);
        try {
            // Apply token encryption for authenticated access
                var controller = new SurveyController();
                
                const { recordId } = requestData;
                
                // Call the delete method in the controller
                var result = await controller.deleteSurvey(recordId);

                console.log('Survey deleted successfully:', result);
                
                // Emit socket event for real-time updates
                if (io) {
                    io.emit('survey-updated', {
                        message: 'Survey record deleted successfully',
                        recordId: recordId
                    });
                }
                
                return {
                        success: true,
                        message: "Survey deleted successfully",
                        recordId: recordId
                };
        } catch (error) {
            console.error('Error deleting survey:', error);
            return res.status(500).json({ 
                error: 'Failed to delete survey.',
                details: error.message 
            });
        }
    }
    else if(requestData.purpose === "retrievePublic")
    {
        try {
            var surveyController = new SurveyController();
            var usersController = new UsersController();
            
            // Get all surveys for calculating statistics
            var surveyResult = await surveyController.getAllSurveys();
            var userResult = await usersController.getAllUsers();
            
            const surveys = surveyResult.success ? surveyResult.surveys : [];
            console.log('Retrieved surveys:', surveys);
            const users = userResult.success ? userResult.users : [];
            
            // Calculate statistics
            const numberOfObservations = surveys.length;
            
            // Get unique locations (assuming surveys have location data)
            const uniqueLocations = new Set();
            surveys.forEach(survey => {
                if (survey.Location) {
                    // Handle different location formats
                    if (typeof survey.Location === 'string') {
                        uniqueLocations.add(survey.Location);
                    }
                } else if (survey.location) {
                    // Fallback to lowercase location field
                    if (typeof survey.location === 'string') {
                        uniqueLocations.add(survey.location);
                    }
                }
            });
            const numberOfLocations = uniqueLocations.size;
            
            // Get number of volunteers (users)
            const numberOfVolunteers = users.length;
            
            // Calculate years active (from first survey date to current date)
            let yearsActive = 0;
            if (surveys.length > 0) {
                // Find the earliest survey date
                let earliestDate = null;
                surveys.forEach(survey => {
                    let surveyDate = null;
                    
                    // Try different date field names and formats
                    if (survey.Date) {
                        // Handle your specific date formats: '21-Jun-25' or '21/06/2025'
                        const dateStr = survey.Date.toString();
                        
                        // Parse date format like '21-Jun-25' (dd-Mmm-yy)
                        if (dateStr.includes('-')) {
                            // Split by dash and handle dd-MMM-yy format
                            const parts = dateStr.split('-');
                            if (parts.length === 3) {
                                const day = parts[0];
                                const month = parts[1];
                                let year = parts[2];
                                
                                // Convert 2-digit year to 4-digit year
                                // Assuming years 00-50 are 2000-2050, 51-99 are 1951-1999
                                if (year.length === 2) {
                                    const yearNum = parseInt(year);
                                    if (yearNum <= 50) {
                                        year = '20' + year;
                                    } else {
                                        year = '19' + year;
                                    }
                                }
                                
                                // Create a date string that JavaScript can parse
                                const jsDateStr = `${day}-${month}-${year}`;
                                surveyDate = new Date(jsDateStr);
                            }
                        }
                        // Parse date format like '21/06/2025' (dd/mm/yyyy)
                        else if (dateStr.includes('/')) {
                            // Split by slash and handle dd/mm/yyyy format
                            const parts = dateStr.split('/');
                            if (parts.length === 3) {
                                const day = parts[0];
                                const month = parts[1];
                                const year = parts[2];
                                
                                // Create a date using year, month-1 (0-indexed), day
                                surveyDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                            }
                        }
                        // Fallback: try direct parsing
                        else {
                            surveyDate = new Date(dateStr);
                        }
                    } else if (survey.createdAt) {
                        surveyDate = new Date(survey.createdAt);
                    } else if (survey.date) {
                        surveyDate = new Date(survey.date);
                    } else if (survey.timestamp) {
                        surveyDate = new Date(survey.timestamp);
                    }
                    
                    // Check if date is valid and update earliest
                    if (surveyDate && !isNaN(surveyDate.getTime())) {
                        if (!earliestDate || surveyDate < earliestDate) {
                            earliestDate = surveyDate;
                        }
                    }
                });
                
                // Calculate years from earliest date to now
                if (earliestDate) {
                    const currentDate = new Date();
                    const timeDifference = currentDate - earliestDate;
                    const daysDifference = timeDifference / (1000 * 60 * 60 * 24);
                    
                    // Calculate years more precisely
                    const yearsDifference = daysDifference / 365.25; // Using 365.25 to account for leap years
            
                    
                    // If the time span is less than 1 year but more than 6 months, show as 1 year
                    // If more than 1 year, show the actual calculated years
                    if (yearsDifference >= 1) {
                        yearsActive = Math.ceil(yearsDifference);
                    } else if (daysDifference >= 180) { // More than 6 months
                        yearsActive = 1;
                    } else {
                        yearsActive = 1; // Default minimum
                    }
                } else {
                    console.log('No valid dates found in surveys');
                    yearsActive = 1; // Default if no valid dates
                }
            }
            
            const statistics = {
                observations: numberOfObservations,
                locations: numberOfLocations,
                volunteers: numberOfVolunteers,
                yearsActive: yearsActive
            };
            
            return res.json({
                "result": { 
                    success: true, 
                    statistics: statistics 
                }
            }); 
            
        } catch (error) {
            return res.status(500).json({ error: 'Failed to retrieve statistics.' });
        }
    } 
    else {
        return res.status(400).json({ error: 'Invalid purpose.' });
    }
});

module.exports = router;
