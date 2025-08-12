var express = require('express');
var router = express.Router();
var EventsController = require('../Controller/Events/eventsController'); 
const tokenEncryption = require('../middleware/tokenEncryption'); 

router.post('/', async function(req, res, next) 
{
    const io = req.app.get('io'); // Get the Socket.IO instance
    console.log('Events route request received:', req.body);
    
    // Initialize requestData
    let requestData = req.body;
    
    if(requestData.purpose === "retrieve")
    {
        try {
            // Handle encrypted request data for retrieve purpose
            if (req.body.encryptedData && req.body.requiresServerEncryption) {
                try {
                    const decryptResult = tokenEncryption.decryptRequestData(req.body);
                    if (decryptResult.success) {
                        requestData = decryptResult.data;
                        console.log('🔓 Decrypted request data1:', requestData);
                        
                        // Get client public key from decrypted request data
                        const clientPublicKey = requestData.clientPublicKey || requestData.publicKey;
                        
                        // Apply token encryption for authenticated access with client's public key
                        return await tokenEncryption.encryptResponseDataMiddleware(req, res, async () => {
                            var eventsController = new EventsController();
                            
                            // Get all events for calculating statistics
                            var eventsResult = await eventsController.getAllEvents();

                            console.log('Events retrieved successfully:', eventsResult);
                            
                            return { success: true, events: eventsResult };
                        }, clientPublicKey);
                    } else {
                        console.error('🔓 Request decryption failed:', decryptResult.error);
                        return res.status(400).json({ error: 'Failed to decrypt request data' });
                    }
                } catch (decryptError) {
                    console.error('🔓 Request decryption error:', decryptError);
                    return res.status(400).json({ error: 'Invalid encrypted request' });
                }
            } else {
                // Fallback for non-encrypted requests (backwards compatibility)
                var controller = new EventsController();
                var result = await controller.getAllEvents();
                console.log('Events retrieved successfully:', result);
                return res.json({"result": { success: true, events: result }}); 
            }

        } catch (error) {
            console.error('Error retrieving events:', error);
            return res.status(500).json({ error: 'Failed to retrieve events.' });
        }
    }
    else if(req.body.purpose === "updateParticipants") {
        try {
            // Handle encrypted request data for updateParticipants purpose
            if (req.body.encryptedData && req.body.requiresServerEncryption) {
                console.log('🔓 Decrypting incoming updateParticipants request data...');
                try {
                    const decryptResult = tokenEncryption.decryptRequestData(req.body);
                    console.log('🔓 UpdateParticipants request decryption result:', decryptResult);
                    if (decryptResult.success) {
                        requestData = decryptResult.data;
                        console.log('🔓 UpdateParticipants request decryption successful:', requestData);
                        
                        // Get eventId and participants from decrypted request data
                        const { eventId, participants } = requestData;
                        console.log('🔍 About to update participants for event:', eventId, 'with participants:', participants);
                        
                        var controller = new EventsController();
                        var result = await controller.updateEventParticipants(eventId, participants);
                        
                        if (io) {
                            io.emit('survey-updated', {
                                message: 'Event participants updated successfully',
                                event: result // send updated event data to clients
                            });
                        }
                        
                        return res.json({ success: true, event: result }); // return updated event as 'event'
                    } else {
                        console.error('🔓 UpdateParticipants request decryption failed:', decryptResult.error);
                        return res.status(400).json({ error: 'Failed to decrypt updateParticipants request data' });
                    }
                } catch (decryptError) {
                    console.error('🔓 UpdateParticipants request decryption error:', decryptError);
                    return res.status(400).json({ error: 'Invalid encrypted updateParticipants request' });
                }
            } else {
                // Fallback for non-encrypted requests (backwards compatibility)
                console.log('📝 Processing non-encrypted updateParticipants request...');
                const { eventId, participants } = req.body;
                console.log('🔍 About to update participants for event (non-encrypted):', eventId, 'with participants:', participants);
                
                var controller = new EventsController();
                var result = await controller.updateEventParticipants(eventId, participants);
                
                if (io) {
                    io.emit('survey-updated', {
                        message: 'Event participants updated successfully',
                        event: result // send updated event data to clients
                    });
                }
                
                return res.json({ success: true, event: result }); // return updated event as 'event'
            }
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
            // Handle encrypted request data for updateEventFields purpose
            if (req.body.encryptedData && req.body.requiresServerEncryption) {
                console.log('🔓 Decrypting incoming updateEventFields request data...');
                try {
                    const decryptResult = tokenEncryption.decryptRequestData(req.body);
                    console.log('🔓 UpdateEventFields request decryption result:', decryptResult);
                    if (decryptResult.success) {
                        requestData = decryptResult.data;
                        console.log('🔓 UpdateEventFields request decryption successful:', requestData);
                        
                        // Get eventId and eventFields from decrypted request data
                        const { eventId, ...eventFields } = requestData;
                        console.log('🔍 About to update event fields for event:', eventId, eventFields);
                        
                        var controller = new EventsController();
                        var result = await controller.updateEventFields(eventId, eventFields);
                        
                        if (io) {
                            io.emit('survey-updated', {
                                message: 'Event fields updated successfully',
                                event: result // send updated event data to clients
                            });
                        }
                        
                        return res.json({ success: true, event: result }); // return updated event as 'event'
                    } else {
                        console.error('🔓 UpdateEventFields request decryption failed:', decryptResult.error);
                        return res.status(400).json({ error: 'Failed to decrypt updateEventFields request data' });
                    }
                } catch (decryptError) {
                    console.error('🔓 UpdateEventFields request decryption error:', decryptError);
                    return res.status(400).json({ error: 'Invalid encrypted updateEventFields request' });
                }
            } else {
                // Fallback for non-encrypted requests (backwards compatibility)
                console.log('📝 Processing non-encrypted updateEventFields request...');
                const { eventId, ...eventFields } = req.body;
                console.log('🔍 About to update event fields for event (non-encrypted):', eventId, eventFields);
                
                var controller = new EventsController();
                var result = await controller.updateEventFields(eventId, eventFields);
                
                if (io) {
                    io.emit('survey-updated', {
                        message: 'Event fields updated successfully',
                        event: result // send updated event data to clients
                    });
                }
                
                return res.json({ success: true, event: result }); // return updated event as 'event'
            }
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
            // Handle encrypted request data for addEvent purpose
            if (req.body.encryptedData && req.body.requiresServerEncryption) {
                console.log('🔓 Decrypting incoming addEvent request data...');
                try {
                    const decryptResult = tokenEncryption.decryptRequestData(req.body);
                    console.log('🔓 AddEvent request decryption result:', decryptResult);
                    if (decryptResult.success) {
                        requestData = decryptResult.data;
                        console.log('🔓 AddEvent request decryption successful:', requestData);
                        
                        // Get client public key from decrypted request data
                        const clientPublicKey = requestData.clientPublicKey || requestData.publicKey;
                        console.log('🔐 Using client public key for addEvent response encryption:', clientPublicKey ? 'Found' : 'Not found');
                        
                        // Apply token encryption for authenticated access with client's public key
                        const { events } = requestData;
                        console.log('🔍 About to add events:', events);
                        
                        var controller = new EventsController();
                        var result = await controller.addEvents(events);
                        console.log('Events added successfully:', result);
                        
                        if (io) {
                            io.emit('survey-updated', {
                                message: 'Events added successfully',
                                events: result
                            });
                        }
                        
                        return res.json({ success: true, events: result });
                    } else {
                        console.error('🔓 AddEvent request decryption failed:', decryptResult.error);
                        return res.status(400).json({ error: 'Failed to decrypt addEvent request data' });
                    }
                } catch (decryptError) {
                    console.error('🔓 AddEvent request decryption error:', decryptError);
                    return res.status(400).json({ error: 'Invalid encrypted addEvent request' });
                }
            } else {
                // Fallback for non-encrypted requests (backwards compatibility)
                console.log('📝 Processing non-encrypted addEvent request...');
                const { events } = req.body;
                console.log('🔍 About to add events (non-encrypted):', events);
                
                var controller = new EventsController();
                var result = await controller.addEvents(events);
                console.log('Events added successfully:', result);
                
                if (io) {
                    io.emit('survey-updated', {
                        message: 'Events added successfully',
                        events: result
                    });
                }
                
                return res.json({ success: true, events: result });
            }
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
            // Handle encrypted request data for deleteEvent purpose
            if (req.body.encryptedData && req.body.requiresServerEncryption) {
                console.log('🔓 Decrypting incoming deleteEvent request data...');
                try {
                    const decryptResult = tokenEncryption.decryptRequestData(req.body);
                    console.log('🔓 DeleteEvent request decryption result:', decryptResult);
                    if (decryptResult.success) {
                        requestData = decryptResult.data;
                        console.log('🔓 DeleteEvent request decryption successful:', requestData);
                        
                        // Get eventIds from decrypted request data - can be array or string
                        const { eventIds } = requestData;
                        console.log('🔍 About to delete events:', eventIds);
                        
                        // Normalize eventIds to always be an array
                        const eventIdsArray = Array.isArray(eventIds) ? eventIds : [eventIds];
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
                    } else {
                        console.error('🔓 DeleteEvent request decryption failed:', decryptResult.error);
                        return res.status(400).json({ error: 'Failed to decrypt deleteEvent request data' });
                    }
                } catch (decryptError) {
                    console.error('🔓 DeleteEvent request decryption error:', decryptError);
                    return res.status(400).json({ error: 'Invalid encrypted deleteEvent request' });
                }
            } else {
                // Fallback for non-encrypted requests (backwards compatibility)
                console.log('📝 Processing non-encrypted deleteEvent request...');
                const { eventId } = req.body;
                console.log('🔍 About to delete event:', eventId);
                
                // Validate eventId
                if (!eventId || typeof eventId !== 'string' || eventId.length !== 24) {
                    console.error('❌ Invalid eventId format:', eventId);
                    return res.status(400).json({ error: 'Invalid eventId format. Must be a 24-character hex string.' });
                }
                
                var controller = new EventsController();
                var result = await controller.deleteEvent(eventId);
                if (io) {
                    io.emit('survey-updated', {
                        message: 'Event deleted successfully',
                        deletedEventId: eventId
                    });
                }
                return res.json({ success: true, message: 'Event deleted successfully', deletedEventId: eventId });
            }
        } catch (error) {
            console.error('Error deleting event:', error);
            return res.status(500).json({ error: 'Failed to delete event.' });
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
