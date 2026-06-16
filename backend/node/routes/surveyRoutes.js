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
    
    // DEBUG: Log all incoming requests
    console.log('\n📨 INCOMING POST REQUEST');
    console.log('Purpose:', requestData.purpose);
    console.log('Full requestData:', JSON.stringify(requestData, null, 2));
    console.log('---');
    
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
            console.log('\n╔════════════════════════════════════════════╗');
            console.log('║  UPDATE REQUEST RECEIVED                   ║');
            console.log('╚════════════════════════════════════════════╝');
            console.log("📥 Received request to update survey");
            console.log("Request body:", JSON.stringify(req.body, null, 2));
            
            var controller = new SurveyController();
            
            // Extract record ID and updated data
            const recordId = req.body.recordId || req.body._id;
            console.log("\n🔍 Extracted recordId:", recordId);
            console.log("recordId type:", typeof recordId);
            
            if (!recordId) {
                console.error('❌ NO RECORD ID PROVIDED');
                return res.status(400).json({
                    success: false,
                    error: 'Record ID is required for update'
                });
            }
            
            const updatedData = { ...req.body };
            delete updatedData.purpose;
            delete updatedData.recordId;
            console.log("\n📦 Sanitized data to update:", JSON.stringify(updatedData, null, 2));
            
            console.log("\n🔄 Calling controller.updateSurvey()...");
            var result = await controller.updateSurvey(recordId, updatedData);
            console.log("\n📋 Controller result:", JSON.stringify(result, null, 2));
            
            if (result.success) {
                console.log('✅ Update SUCCESSFUL');
                // Emit real-time update for survey update
                if (io) {
                    io.emit('surveyUpdated', {
                        action: 'update',
                        data: updatedData,
                        recordId: recordId,
                        timestamp: new Date().toISOString()
                    });
                    console.log('Socket.IO: Survey update event emitted for ID:', recordId);
                } else {
                    console.log('⚠️ WARNING: io is null or undefined');
                }
                
                return res.json({
                    success: true,
                    message: 'Survey updated successfully',
                    modifiedCount: result.modifiedCount
                });
            } else {
                console.log('❌ Update failed:', result.message);
                return res.status(400).json({
                    success: false,
                    error: result.message || 'Failed to update survey',
                    details: result.error || 'No additional details available'
                });
            }
        } catch (error) {
            console.error('❌ EXCEPTION in update handler:', error);
            console.error('Error stack:', error.stack);
            return res.status(500).json({ 
                error: error.message || 'Failed to update survey',
                details: 'An unexpected error occurred while updating the survey'
            });
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
