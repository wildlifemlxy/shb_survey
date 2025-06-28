var express = require('express');
var router = express.Router();
var TelegramController = require('../Controller/Telegram/telegramController'); 
const axios = require('axios');

// POST /telegram - create a new Telegram bot
router.post('/', async function(req, res, next) {
    const io = req.app.get('io'); // Get the Socket.IO instance
    const { purpose, token, name, description } = req.body;

    if (purpose === 'createBot') {
        console.log('Creating bot with token:', token, 'name:', name, 'description:', description);
        // Validate required fields
        if (!token) {
            return res.status(400).json({ error: 'Bot token and name are required.' });
        }
        try {
            const telegramController = new TelegramController();
            const bot = await telegramController.createBot(
                token,
                name,
                description
            );
            return res.status(201).json({ message: 'Bot created', bot });
        } catch (err) {
            return res.status(500).json({ error: err.message || 'Failed to create bot.' });
        }
    }
    if (purpose === 'getBotInfo') {
        if (!token) {
            return res.status(400).json({ error: 'Bot token is required.' });
        }
        try {
            const telegramRes = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
            const telegramData = telegramRes.data;
            console.log('Telegram getMe response:', telegramData);s
            if (!telegramData.ok) {
                return res.status(400).json({ error: 'Invalid Telegram bot token.' });
            }
            return res.status(200).json({
                ok: true,
                result: telegramData.result
            });
        } catch (err) {
            return res.status(500).json({ error: err.message || 'Failed to get bot info.' });
        }
    }
    if (purpose === 'retrieve') {
        try {
            const telegramController = new TelegramController();
            const result = await telegramController.getAllBots();
            console.log('Retrieved bots:', result);
            if (result.success) {
                return res.status(200).json({ message: result.message, data: result.data, success: result.success });
            } else {
                return res.status(500).json({ error: result.error || 'Failed to retrieve bots.' });
            }
        } catch (err) {
            return res.status(500).json({ error: err.message || 'Failed to retrieve bots.' });
        }
    }
    if (purpose === 'getBotGroups') {
        try {
            // Use Telegram API getUpdates to fetch recent chats/groups
            const { token } = req.body;
            if (!token) {
                return res.status(400).json({ error: 'Bot token is required.' });
            }
            const telegramRes = await axios.get(`https://api.telegram.org/bot${token}/getUpdates`);
            const updates = telegramRes.data.result;
            // Include every chat the bot has seen in its updates
            const chats = {};
            for (const update of updates) {
                console.log('Processing update:', update);
                const msg = update.message || update.channel_post;
                if (msg && msg.chat && msg.chat.id) {
                    const chat = msg.chat;
                    chats[chat.id] = chat.title || chat.username || String(chat.id);
                }
            }
            console.log('Telegram getUpdates response:', chats);
            const groups = Object.values(chats);
            return res.status(200).json({ groups });
        } catch (err) {
            return res.status(500).json({ error: err.message || 'Failed to retrieve group info.' });
        }
    }
    if (purpose === 'getChatHistory') {
        const { token, chatId } = req.body;
        try {
            const telegramController = new TelegramController();
            const result = await telegramController.getChatHistory(token, chatId);
            console.log('Chat history result:', result); // Log the result for debugging
            if (result.success) {
                return res.status(200).json({ data: result.data, success: true });
            } else {
                return res.status(500).json({ error: result.error || 'Failed to retrieve chat history.' });
            }
        } catch (err) {
            return res.status(500).json({ error: err.message || 'Failed to retrieve chat history.' });
        }
    }
    return res.status(400).json({ error: 'Invalid purpose.' });
});



module.exports = router;
