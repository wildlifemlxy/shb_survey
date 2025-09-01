var express = require('express');
var router = express.Router();
var EventsController = require('../Controller/Events/eventsController');

router.post('/', async function(req, res, next) {
    const io = req.app.get('io'); // Get the Socket.IO instance
    console.log('Events route request received:', req.body);
    
    // Initialize requestData
    let requestData = req.body;
    
    if(requestData.purpose === "retrieve") {
        try {
            var controller = new EventsController();
            var result = await controller.getAllEvents();
            console.log('Events retrieved successfully:', result);
            return res.json({"result": { success: true, events: result }}); 
        } catch (error) {
            console.error('Error retrieving events:', error);
            return res.status(500).json({ error: 'Failed to retrieve events.' });
        }
    }
    else if(req.body.purpose === "updateParticipants") {
        try {
            console.log('📝 Processing updateParticipants request...');
            const { eventId, participants } = req.body;
            console.log('🔍 About to update participants for event:', eventId, 'with participants:', participants);
            
            var controller = new EventsController();
            var result = await controller.updateEventParticipants(eventId, participants);
            
            if (io) {
                // Emit specific event for participant update
                io.emit('eventParticipantsUpdated', {
                    message: 'Event participants updated successfully',
                    event: result,
                    eventId: eventId,
                    participants: participants,
                    timestamp: new Date().toISOString()
                });
                // Keep legacy event for backwards compatibility
                io.emit('survey-updated', {
                    message: 'Event participants updated successfully',
                    event: result
                });
            }
            
            return res.json({ success: true, event: result }); // return updated event as 'event'
        } catch (error) {
            console.error('Error updating participants:', error);
            return res.status(500).json({ 
                error: 'Failed to update participants.',
                details: error.message 
            });
        }
    }
    else if(req.body.purpose === "updateEventFields") {
        try {
            console.log('📝 Processing updateEventFields request...');
            const { eventId, ...eventFields } = req.body;
            console.log('🔍 About to update event fields for event:', eventId, eventFields);
            
            var controller = new EventsController();
            var result = await controller.updateEventFields(eventId, eventFields);
            
            if (io) {
                // Emit specific event for event update
                io.emit('eventUpdated', {
                    message: 'Event fields updated successfully',
                    event: result,
                    eventId: eventId,
                    timestamp: new Date().toISOString()
                });
                // Keep legacy event for backwards compatibility
                io.emit('survey-updated', {
                    message: 'Event fields updated successfully',
                    event: result
                });
            }
            
            return res.json({ success: true, event: result }); // return updated event as 'event'
        } catch (error) {
            console.error('Error updating event fields:', error);
            return res.status(500).json({ 
                error: 'Failed to update event fields.',
                details: error.message 
            });
        }
    }
    else if(req.body.purpose === "addEvent") {
        try {
            console.log('📝 Processing addEvent request...');
            const { events } = req.body;
            console.log('🔍 About to add events:', events);
            
            var controller = new EventsController();
            var result = await controller.addEvents(events);
            console.log('Events added successfully:', result);
            
            if (io) {
                // Emit specific event for event addition
                io.emit('eventsAdded', {
                    message: 'Events added successfully',
                    events: result,
                    timestamp: new Date().toISOString()
                });
                // Keep legacy event for backwards compatibility
                io.emit('survey-updated', {
                    message: 'Events added successfully',
                    events: result
                });
            }
            
            return res.json({ success: true, events: result });
        } catch (error) {
            console.error('Error adding events:', error);
            return res.status(500).json({ 
                error: 'Failed to add events.',
                details: error.message 
            });
        }
    }
    else if(req.body.purpose === "deleteEvent") {
        try {
            console.log('📝 Processing deleteEvent request...');
            const { eventId, eventIds } = req.body;
            
            // Handle both single eventId and multiple eventIds
            const idsToDelete = eventIds || [eventId];
            console.log('🔍 About to delete events:', idsToDelete);
            
            // Normalize eventIds to always be an array
            const eventIdsArray = Array.isArray(idsToDelete) ? idsToDelete : [idsToDelete];
            console.log('🔍 Normalized eventIds array:', eventIdsArray);
            
            // Validate eventIds
            if (!eventIdsArray || eventIdsArray.length === 0 || eventIdsArray.some(id => !id || typeof id !== 'string' || id.length !== 24)) {
                console.error('❌ Invalid eventIds:', eventIdsArray);
                return res.status(400).json({ error: 'Invalid eventIds format. All IDs must be 24-character hex strings.' });
            }
            
            var controller = new EventsController();
            let deletedCount = 0;
            
            // Handle array of eventIds
            for (const eventId of eventIdsArray) {
                console.log('Deleting event:', eventId);
                await controller.deleteEvent(eventId);
                deletedCount++;
            }
            
            if (io) {
                // Emit specific event for event deletion
                io.emit('eventsDeleted', {
                    message: 'Events deleted successfully',
                    deletedEventIds: eventIdsArray,
                    deletedCount: deletedCount,
                    timestamp: new Date().toISOString()
                });
                // Keep legacy event for backwards compatibility
                io.emit('survey-updated', {
                    message: 'Events deleted successfully',
                    deletedEventIds: eventIdsArray,
                    deletedCount: deletedCount
                });
            }
            
            return res.json({ 
                success: true, 
                message: 'Events deleted successfully', 
                deletedEventIds: eventIdsArray,
                deletedCount: deletedCount 
            });
        } catch (error) {
            console.error('Error deleting event:', error);
            return res.status(500).json({ 
                error: 'Failed to delete event.',
                details: error.message || error.toString(),
                eventIds: eventIdsArray
            });
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
