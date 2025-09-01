var express = require('express');
var router = express.Router();
var SurveyController = require('../Controller/Survey/surveyController'); 
var UsersController = require('../Controller/Users/usersController'); 
const { sendOneSignalNotification } = require('../services/notificationService');
const startEventTypeUpdater = require('../cron/eventTypeUpdater');

// Start cron jobs ONCE at module load, not inside the route handler
let cronJobsStarted = false;

router.post('/', async function(req, res, next) {
    var requestData = req.body;
    const io = req.app.get('io'); // Get the Socket.IO instance
    
    // Start cron job once when needed
    if (!cronJobsStarted) {
        try {
            startEventTypeUpdater(io);
            cronJobsStarted = true;
        } catch (error) {
            console.error('Error starting cron jobs:', error);
        }
    }
    
    if(requestData.purpose === "retrieve")
    {
        console.log("Received request to retrieve surveys");
        try {
            var surveyController = new SurveyController();
            //var usersController = new UsersController();
            
            // Get all surveys for calculating statistics
            var surveyResult = await surveyController.getAllSurveys();
   
            return res.json({
                surveyResult
            });
        } catch (error) {
            console.error('Error retrieving surveys:', error);
            return res.status(500).json({ error: 'Failed to retrieve surveys.' });
        }
    } 

    else if(requestData.purpose === "getPublicStatistics")
    {
        try {
            var surveyController = new SurveyController();
            var usersController = new UsersController();
            
            // Get all surveys for calculating statistics
            var surveyResult = await surveyController.getAllSurveys();
            var userResult = await usersController.getAllUsers();

            // Calculate statistics
            let totalObservations = 0;
            let uniqueLocations = new Set();
            let uniqueYears = 0;
            let earliestDate = null;
            
            if (surveyResult.surveys && surveyResult.surveys.length > 0) {
                totalObservations = surveyResult.surveys.length;
                console.log("Total observations:", totalObservations);
                
                surveyResult.surveys.forEach(survey => {
                    // Add unique locations
                    if (survey.Location) {
                        uniqueLocations.add(survey.Location);
                    }
                    
                    // Find the earliest date
                    if (survey.Date) {
                        const surveyDate = new Date(survey.Date);
                        if (!isNaN(surveyDate)) {
                            if (!earliestDate || surveyDate < earliestDate) {
                                earliestDate = surveyDate;
                            }
                        }
                    }
                });
                
                // Calculate years from earliest date to current date (precise calculation)
                if (earliestDate) {
                    const currentDate = new Date(); // Define currentDate
                    
                    // Calculate years more precisely considering days, months, and years
                    let years = currentDate.getFullYear() - earliestDate.getFullYear();
                    let months = currentDate.getMonth() - earliestDate.getMonth();
                    let days = currentDate.getDate() - earliestDate.getDate();       
                    
                    // Adjust for negative days
                    if (days < 0) {
                        months--;
                        const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
                        days += lastMonth.getDate();
                    }
                    
                    // Adjust for negative months
                    if (months < 0) {
                        years--;
                        months += 12;
                    }
                    
                    
                    // If we have less than 1 full year but some time passed, show as "1+"
                    if (years === 0 && (months > 0 || days > 0)) {
                        uniqueYears = "1+";
                    }
                    // If there are extra months or days beyond complete years, show as "X+" 
                    else if (months > 0 || days > 0) {
                        uniqueYears = `${years}+`;
                    } 
                    // If exactly X years with no extra time
                    else {
                        uniqueYears = years.toString();
                    }
                }
            }
            
            return res.json({
                success: true,
                statistics: {
                    totalObservations: totalObservations,
                    uniqueLocations: uniqueLocations.size,
                    numberOfYears: uniqueYears
                },
                userCount: userResult.success ? userResult.users.length : 0
            });
            
        } catch (error) {
            console.error('Error retrieving surveys:', error);
            return res.status(500).json({ error: 'Failed to retrieve surveys.' });
        }
    } 

    else if(req.body.purpose === "insert")
    {
        try {
            var controller = new SurveyController();
            
            // Remove the purpose key from the data before inserting
            const surveyData = { ...requestData };
            delete surveyData.purpose;
            
            var result = await controller.insertSurvey(surveyData);
            
            if (result.success) {
                // Emit real-time update for survey insertion
                if (io) {
                    io.emit('surveyInserted', {
                        action: 'insert',
                        data: surveyData,
                        insertedId: result.insertedId,
                        timestamp: new Date().toISOString()
                    });
                    console.log('Socket.IO: Survey insertion event emitted');
                }
                
                return res.json({
                    success: true,
                    message: 'Survey created successfully',
                    insertedId: result.insertedId
                });
            } else {
                return res.status(400).json({
                    success: false,
                    error: result.message || 'Failed to create survey'
                });
            }
        } catch (error) {
            console.error('Error creating survey:', error);
            return res.status(500).json({ error: 'Failed to create survey.' });
        }
    }
    else if(req.body.purpose === "update")
    {
        try {
            console.log("Received request to update survey with ID:", requestData.recordId || requestData._id);
            var controller = new SurveyController();
            
            // Extract record ID and updated data
            const recordId = requestData.recordId || requestData._id;
            const updatedData = { ...requestData };
            delete updatedData.purpose;
            delete updatedData.recordId;
            
            var result = await controller.updateSurvey(recordId, updatedData);
            
            if (result.success) {
                // Emit real-time update for survey update
                if (io) {
                    io.emit('surveyUpdated', {
                        action: 'update',
                        data: updatedData,
                        recordId: recordId,
                        timestamp: new Date().toISOString()
                    });
                    console.log('Socket.IO: Survey update event emitted for ID:', recordId);
                }
                
                return res.json({
                    success: true,
                    message: 'Survey updated successfully',
                    modifiedCount: result.modifiedCount
                });
            } else {
                return res.status(400).json({
                    success: false,
                    error: result.message || 'Failed to update survey'
                });
            }
        } catch (error) {
            console.error('Error updating survey:', error);
            return res.status(500).json({ error: 'Failed to update survey.' });
        }
    }
    else if(req.body.purpose === "delete")
    {
        try {
            console.log("Received request to delete survey with ID:", requestData.surveyId);
            var controller = new SurveyController();
            var result = await controller.deleteSurvey(requestData.surveyId);
            
            if (result.success) {
                // Emit real-time update for survey deletion
                if (io) {
                    io.emit('surveyDeleted', {
                        action: 'delete',
                        surveyId: requestData.surveyId,
                        timestamp: new Date().toISOString()
                    });
                    console.log('Socket.IO: Survey deletion event emitted for ID:', requestData.surveyId);
                }
                
                return res.json({
                    success: true,
                    message: 'Survey deleted successfully'
                });
            } else {
                return res.status(400).json({
                    success: false,
                    error: result.message || 'Failed to delete survey'
                });
            }
        } catch (error) {
            console.error('Error deleting survey:', error);
            return res.status(500).json({ error: 'Failed to delete survey.' });
        }
    }
    else {
        return res.status(400).json({ error: 'Invalid purpose. Supported: retrieve, insert, update, delete' });
    }
});

module.exports = router;
