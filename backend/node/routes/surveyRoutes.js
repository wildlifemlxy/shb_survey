var express = require('express');
var router = express.Router();
var SurveyController = require('../Controller/Survey/surveyController'); 

router.post('/', async function(req, res, next) 
{
    const io = req.app.get('io'); // Get the Socket.IO instance
    
    if(req.body.purpose === "retrieve")
    {
        try {
            var controller = new SurveyController();
            var result = await controller.getAllSurveys();
            console.log('Surveys retrieved successfully:', result);
            return res.json({"result": result}); 
            
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
                console.log('Surveys inserted successfully:', results);
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
    else {
        return res.status(400).json({ error: 'Invalid purpose.' });
    }
});

module.exports = router;
