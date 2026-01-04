var express = require('express');
var router = express.Router();
var EventsController = require('../Controller/Events/eventsController');
var TelegramController = require('../Controller/Telegram/telegramController');
var { updateTelegramEventMessage, setSocketIO } = require('../Telegram/utils/updateEventMessage');
var { deleteTelegramEventMessages } = require('../Telegram/utils/deleteEventMessage');
var { updateAllPinnedUpcomingMessages } = require('../Telegram/utils/updatePinnedUpcoming');
var parseCustomDate = require('../cron/parseCustomDate');
var botConfig = require('../Telegram/config/botConfig');

router.post('/', async function(req, res, next) {
    const io = req.app.get('io'); // Get the Socket.IO instance
    
    // Set Socket.IO for updateEventMessage to enable live updates
    if (io) {
      setSocketIO(io);
    }
    
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
            
            // Update Telegram message with new participant list
            try {
                const eventResult = await controller.getEventById(eventId);
                if (eventResult.event) {
                    await updateTelegramEventMessage(eventId, eventResult.event, participants);
                }
            } catch (telegramError) {
                console.error('Error updating Telegram message:', telegramError.message);
                // Don't fail the request if Telegram update fails
            }
            
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
            
            // Update Telegram message with new event fields (Location, Time, etc.)
            try {
                const eventResult = await controller.getEventById(eventId);
                if (eventResult.event) {
                    const participants = eventResult.event.Participants || [];
                    await updateTelegramEventMessage(eventId, eventResult.event, participants);
                    console.log('✅ Telegram message updated for event field changes');
                }
            } catch (telegramError) {
                console.error('Error updating Telegram message:', telegramError.message);
                // Don't fail the request if Telegram update fails
            }
            
            // Update all pinned upcoming events messages (for Time, Location, etc. changes)
            try {
                await updateAllPinnedUpcomingMessages(io);
                console.log('✅ Updated pinned upcoming events messages');
            } catch (pinnedError) {
                console.error('Error updating pinned messages:', pinnedError.message);
            }
            
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
            
            // Update all pinned upcoming events messages
            try {
                await updateAllPinnedUpcomingMessages(io);
                console.log('✅ Updated pinned upcoming events messages');
            } catch (pinnedError) {
                console.error('Error updating pinned messages:', pinnedError.message);
            }
            
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
            var telegramController = new TelegramController();
            // Set Socket.IO so chatMessageDeleted event can be emitted
            if (io) {
                telegramController.setSocketIO(io);
            }
            let deletedCount = 0;
            
            // Handle array of eventIds
            for (const eventId of eventIdsArray) {
                console.log('Deleting event:', eventId);
                
                // Get event details BEFORE deleting
                let eventDateStr = null;
                try {
                    const eventResult = await controller.getEventById(eventId);
                    console.log('🔍 Event result:', eventResult.event?.Date);
                    if (eventResult.event) {
                        // Delete Telegram messages
                        await deleteTelegramEventMessages(eventResult.event);
                        console.log('✅ Telegram messages deleted for event:', eventId);
                        
                        // Get the formatted event date for chat history deletion
                        const parsedDate = parseCustomDate(eventResult.event.Date);
                        console.log('🔍 Parsed date:', parsedDate);
                        if (parsedDate) {
                            const eventDay = parsedDate.toLocaleDateString('en-US', { weekday: 'short' });
                            const eventDayNum = parsedDate.getDate();
                            const eventMonth = parsedDate.toLocaleDateString('en-US', { month: 'long' });
                            const eventYear = parsedDate.getFullYear();
                            eventDateStr = `${eventDay}, Date ${eventDayNum} ${eventMonth} ${eventYear}`;
                            console.log('🔍 Generated eventDateStr for deletion:', eventDateStr);
                        }
                    }
                } catch (telegramError) {
                    console.error('Error deleting Telegram messages:', telegramError.message);
                    // Don't fail the request if Telegram deletion fails
                }
                
                await controller.deleteEvent(eventId);
                deletedCount++;
                
                // Delete chat history for this event
                if (eventDateStr) {
                    try {
                        await telegramController.deleteChatHistoryForEventDate(botConfig.BOT_TOKEN, eventDateStr);
                        console.log('✅ Chat history deleted for event date:', eventDateStr);
                    } catch (chatError) {
                        console.error('Error deleting chat history:', chatError.message);
                    }
                }
            }
            
            // Update all pinned upcoming events messages after deletion
            try {
                await updateAllPinnedUpcomingMessages(io);
                console.log('✅ Updated pinned upcoming events messages after deletion');
            } catch (pinnedError) {
                console.error('Error updating pinned messages:', pinnedError.message);
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
