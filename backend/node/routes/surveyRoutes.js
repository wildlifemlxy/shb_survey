var express = require('express');
var router = express.Router();
var SurveyController = require('../Controller/Survey/surveyController'); 
var UsersController = require('../Controller/Users/usersController'); 
const { sendOneSignalNotification } = require('../services/notificationService');
const startEventTypeUpdater = require('../cron/eventTypeUpdater');

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
    
    if(req.body.purpose === "retrieve")
    {
        try {

            var surveyController = new SurveyController();
            var usersController = new UsersController();
            
            // Get all surveys for calculating statistics
            var surveyResult = await surveyController.getAllSurveys();
            var userResult = await usersController.getAllUsers();
            console.log('Surveys retrieved successfully:', surveyResult.success, userResult.success ? userResult.users.length : 0);
            return res.json({"result": surveyResult, "userCount": userResult.success ? userResult.users.length : 0}); 

        } catch (error) {
            console.error('Error retrieving surveys:', error);
            return res.status(500).json({ error: 'Failed to retrieve surveys.' });
        }
    } 
    else if(req.body.purpose === "insert")
    {
        try {
            var controller = new SurveyController();
            let results = [];
            if (Array.isArray(req.body.data)) {
                for (const survey of req.body.data) {
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
                return res.json({"result": { success: true, message: "All surveys inserted.", details: results }});
            } else {
                // Single object fallback
                const result = await controller.insertSurvey(req.body.data);
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
                return res.json({"result": result});
            }
        } catch (error) {
            console.error('Error inserting survey(s):', error);
            return res.status(500).json({ error: 'Failed to insert survey(s).' });
        }
    } 
    else if(req.body.purpose === "update")
    {
        console.log('Update request for survey:', req.body);
        try {
            var controller = new SurveyController();
            
            const { recordId, updatedRowData } = req.body;
            
            // Call the update method in the controller
            var result = await controller.updateSurvey(recordId, updatedRowData);

            console.log('Survey updated successfully:', result);
            
            // Emit socket event for real-time updates
            if (io) {
                io.emit('survey-updated', {
                    message: 'Survey record updated successfully',
                });
            }
            
            return res.json({
                    success: true,
                    message: "Survey updated successfully"
            }); 
            
        } catch (error) {
            console.error('Error updating survey:', error);
            return res.status(500).json({ 
                error: 'Failed to update survey.',
                details: error.message 
            });
        }
    }
    else if(req.body.purpose === "delete")
    {
        console.log('Delete request for survey:', req.body);
        try {
            var controller = new SurveyController();
            
            const { recordId } = req.body;
            
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
            
            return res.json({
                    success: true,
                    message: "Survey deleted successfully",
                    recordId: recordId
            }); 
            
        } catch (error) {
            console.error('Error deleting survey:', error);
            return res.status(500).json({ 
                error: 'Failed to delete survey.',
                details: error.message 
            });
        }
    }
    else if(req.body.purpose === "retrievePublic")
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
                        console.log('Processing date string:', dateStr);
                        
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
                                console.log('Parsed dd-Mmm-yy date:', surveyDate);
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
                                console.log('Parsed dd/mm/yyyy date:', surveyDate);
                            }
                        }
                        // Fallback: try direct parsing
                        else {
                            surveyDate = new Date(dateStr);
                            console.log('Direct parsed date:', surveyDate);
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
                        console.log('Valid date found:', surveyDate);
                        if (!earliestDate || surveyDate < earliestDate) {
                            earliestDate = surveyDate;
                        }
                    }
                });
                
                // Calculate years from earliest date to now
                if (earliestDate) {
                    console.log('Earliest date found:', earliestDate);
                    const currentDate = new Date();
                    const timeDifference = currentDate - earliestDate;
                    const daysDifference = timeDifference / (1000 * 60 * 60 * 24);
                    
                    // Calculate years more precisely
                    const yearsDifference = daysDifference / 365.25; // Using 365.25 to account for leap years
                    
                    console.log('Years calculation:', {
                        earliestDate: earliestDate,
                        currentDate: currentDate,
                        daysDifference: daysDifference,
                        yearsDifference: yearsDifference,
                        calculatedYears: Math.max(1, Math.ceil(yearsDifference))
                    });
                    
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
            
            console.log('Public statistics calculated:', statistics);
            return res.json({
                "result": { 
                    success: true, 
                    statistics: statistics 
                }
            }); 
            
        } catch (error) {
            console.error('Error retrieving public statistics:', error);
            return res.status(500).json({ error: 'Failed to retrieve statistics.' });
        }
    } 
    else {
        return res.status(400).json({ error: 'Invalid purpose.' });
    }
});

module.exports = router;
