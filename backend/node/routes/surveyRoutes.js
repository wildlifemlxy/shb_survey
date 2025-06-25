var express = require('express');
var router = express.Router();
var SurveyController = require('../Controller/Survey/surveyController'); 

router.post('/', async function(req, res, next) 
{
    if(req.body.purpose === "retrieve")
    {
        try {
            var controller = new SurveyController();
            var result = await controller.getAllSurveys();
            return res.json({"result": result}); 
        } catch (error) {
            console.error('Error retrieving surveys:', error);
            return res.status(500).json({ error: 'Failed to retrieve surveys.' });
        }
    } else {
        return res.status(400).json({ error: 'Invalid purpose.' });
    }
});

module.exports = router;
