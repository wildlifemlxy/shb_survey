var express = require('express');
var router = express.Router();
var EventsController = require('../Controller/Events/eventsController'); 

router.post('/', async function(req, res, next) 
{
    const io = req.app.get('io'); // Get the Socket.IO instance
    
    if(req.body.purpose === "retrieve")
    {
        try {
            var controller = new EventsController();
            var result = await controller.getAllEvents();
            console.log('Surveys retrieved successfully:', result);
            return res.json({"result": result}); 
            
        } catch (error) {
            console.error('Error retrieving surveys:', error);
            return res.status(500).json({ error: 'Failed to retrieve surveys.' });
        }
    }
    else if(req.body.purpose === "updateParticipants") {
        try {
            const { eventId, participants } = req.body;
            console.log('Updating participants for event:', eventId, 'with participants:', participants);
            var controller = new EventsController();
            var result = await controller.updateEventParticipants(eventId, participants);
            if (io) {
                io.emit('survey-updated', {
                    message: 'Event updated successfully',
                });
            }
            return res.json({ success: true, result });
        } catch (error) {
            console.error('Error updating participants:', error);
            return res.status(500).json({ error: 'Failed to update participants.' });
        }
    }
    else if(req.body.purpose === "updateEvent") {
        try {
            const { eventId, ...eventFields } = req.body;
            console.log('Updating event fields for event:', eventId, eventFields);
            var controller = new EventsController();
            var result = await controller.updateEventFields(eventId, eventFields);
            if (io) {
                io.emit('survey-updated', {
                    message: 'Event fields updated successfully',
                    event: result // send updated event data to clients
                });
            }
            return res.json({ success: true, event: result }); // return updated event as 'event'
        } catch (error) {
            console.error('Error updating event fields:', error);
            return res.status(500).json({ error: 'Failed to update event fields.' });
        }
    }
    else if(req.body.purpose === "addEvent") {
        try {
            const { events } = req.body;
            var controller = new EventsController();
            var result = await controller.addEvents(events); // You need to implement addEvents in your controller
            if (io) {
                io.emit('survey-updated', {
                    message: 'Events added successfully',
                    events: result
                });
            }
            return res.json({ success: true, events: result });
        } catch (error) {
            console.error('Error adding events:', error);
            return res.status(500).json({ error: 'Failed to add events.' });
        }
    }
    else if(req.body.purpose === "get247LiveUpdates") {
        try {
            var controller = new EventsController();
            var allEvents = await controller.getAllEvents();
            var filteredEvents = allEvents.filter(event => event.type === "24/7 lives update");
            return res.json({ result: filteredEvents });
        } catch (error) {
            console.error('Error retrieving 24/7 live update events:', error);
            return res.status(500).json({ error: 'Failed to retrieve 24/7 live update events.' });
        }
    }
    else {
        return res.status(400).json({ error: 'Invalid purpose.' });
    }
});

module.exports = router;
