var express = require('express');
var router = express.Router();
var TelegramController = require('../Controller/Telegram/telegramController'); 
const axios = require('axios');
const tokenEncryption = require('../middleware/tokenEncryption');

// POST /telegram - create a new Telegram bot
router.post('/', async function(req, res, next) {
    const io = req.app.get('io'); // Get the Socket.IO instance
    const { purpose, token, name, description } = req.body;

    if (purpose === 'createBot') {
        try {
            // Handle encrypted request data for createBot purpose
            if (req.body.data && req.body.data.encryptedData && req.body.data.requiresServerEncryption) {
                try {
                    const decryptResult = tokenEncryption.decryptRequestData(req.body.data);
                    console.log('🔓 Decrypting createBot request data...', decryptResult);
                    if (decryptResult.success) {
                        const requestData = decryptResult.data;
                        //console.log('🔓 Decrypted createBot request data:', requestData);
                        
                        const { token, name, description } = requestData;
                        if (!token || !name || !description) {
                            return res.status(400).json({ error: 'Bot token, name, and description are required.' });
                        }
                        
                        // Get client public key from decrypted request data
                        const clientPublicKey = requestData.clientPublicKey || requestData.publicKey;
                        console.log('🔑 Using client public key for createBot response encryption');
                        
                        // Apply token encryption for authenticated access with client's public key
                        return await tokenEncryption.encryptResponseDataMiddleware(req, res, async () => {
                            const telegramController = new TelegramController();
                            const bot = await telegramController.createBot(
                                token,
                                name,
                                description
                            );
                            console.log('Bot created for encrypted response:', bot);
                            return {
                                success: true,
                                message: 'Bot created',
                                bot: bot
                            };
                        }, clientPublicKey);
                    } else {
                        console.error('🔓 CreateBot request decryption failed:', decryptResult.error);
                        return res.status(400).json({ error: 'Failed to decrypt request data' });
                    }
                } catch (decryptError) {
                    console.error('🔓 CreateBot request decryption error:', decryptError);
                    return res.status(400).json({ error: 'Invalid encrypted request' });
                }
            } else {
                // Fallback for non-encrypted requests (backwards compatibility)
                console.log('Creating bot with token:', token, 'name:', name, 'description:', description);
                // Validate required fields
                if (!token) {
                    return res.status(400).json({ error: 'Bot token and name are required.' });
                }
                
                const telegramController = new TelegramController();
                const bot = await telegramController.createBot(
                    token,
                    name,
                    description
                );
                return res.status(201).json({ message: 'Bot created', bot });
            }
        } catch (err) {
            console.error('Error in createBot:', err);
            return res.status(500).json({ error: err.message || 'Failed to create bot.' });
        }
    }
    else if (purpose === 'getBotInfo') {
        try {
            // Handle encrypted request data for getBotInfo purpose
            if (req.body.data && req.body.data.encryptedData && req.body.data.requiresServerEncryption) {
                try {
                    const decryptResult = tokenEncryption.decryptRequestData(req.body.data);
                    if (decryptResult.success) {
                        const requestData = decryptResult.data;
                        console.log('🔓 Decrypted getBotInfo request data:', requestData);
                        
                        const token = requestData.token;
                        if (!token) {
                            return res.status(400).json({ error: 'Bot token is required.' });
                        }
                        
                        // Get client public key from decrypted request data
                        const clientPublicKey = requestData.clientPublicKey || requestData.publicKey;
                        
                        // Apply token encryption for authenticated access with client's public key
                        return await tokenEncryption.encryptResponseDataMiddleware(req, res, async () => {
                            const telegramRes = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
                            const telegramData = telegramRes.data;
                            console.log('Telegram getMe response:', telegramData);
                            
                            if (!telegramData.ok) {
                                throw new Error('Invalid Telegram bot token.');
                            }
                            
                            return {
                                success: true,
                                ok: true,
                                result: telegramData.result
                            };
                        }, clientPublicKey);
                    } else {
                        console.error('🔓 getBotInfo request decryption failed:', decryptResult.error);
                        return res.status(400).json({ error: 'Failed to decrypt request data' });
                    }
                } catch (decryptError) {
                    console.error('🔓 getBotInfo request decryption error:', decryptError);
                    return res.status(400).json({ error: 'Invalid encrypted request' });
                }
            } else {
                // Fallback for non-encrypted requests (backwards compatibility)
                if (!token) {
                    return res.status(400).json({ error: 'Bot token is required.' });
                }
                
                const telegramRes = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
                const telegramData = telegramRes.data;
                console.log('Telegram getMe response:', telegramData);
                
                if (!telegramData.ok) {
                    return res.status(400).json({ error: 'Invalid Telegram bot token.' });
                }
                
                return res.status(200).json({
                    ok: true,
                    result: telegramData.result
                });
            }
        } catch (err) {
            console.error('Error in getBotInfo:', err);
            return res.status(500).json({ error: err.message || 'Failed to get bot info.' });
        }
    } 
    else if (purpose === 'retrieve') {
        try {
            console.log('Retrieving all bots for user...');
            // Handle encrypted request data for retrieve purpose
            if (req.body.encryptedData && req.body.requiresServerEncryption) {
                try {
                    const decryptResult = tokenEncryption.decryptRequestData(req.body);
                    if (decryptResult.success) {
                        const requestData = decryptResult.data;
                        console.log('🔓 Decrypted retrieve request data:', requestData);
                        
                        // Get client public key from decrypted request data
                        const clientPublicKey = requestData.clientPublicKey || requestData.publicKey;
                        console.log('🔑 Using client public key for retrieve response encryption');
                        
                        // Apply token encryption for authenticated access with client's public key
                        return await tokenEncryption.encryptResponseDataMiddleware(req, res, async () => {
                            const telegramController = new TelegramController();
                            const result = await telegramController.getAllBots();
                           // console.log('Retrieved bots for encrypted response:', result);
                            
                            if (result.success) {
                                return {
                                    success: true,
                                    message: result.message,
                                    data: result.data
                                };
                            } else {
                                throw new Error(result.error || 'Failed to retrieve bots.');
                            }
                        }, clientPublicKey);
                    } else {
                        console.error('🔓 Retrieve request decryption failed:', decryptResult.error);
                        return res.status(400).json({ error: 'Failed to decrypt request data' });
                    }
                } catch (decryptError) {
                    console.error('🔓 Retrieve request decryption error:', decryptError);
                    return res.status(400).json({ error: 'Invalid encrypted request' });
                }
            } else {
                // Fallback for non-encrypted requests (backwards compatibility)
                const telegramController = new TelegramController();
                const result = await telegramController.getAllBots();
                //console.log('Retrieved bots:', result);
                if (result.success) {
                    return res.status(200).json({ message: result.message, data: result.data, success: result.success });
                } else {
                    return res.status(500).json({ error: result.error || 'Failed to retrieve bots.' });
                }
            }
        } catch (err) {
            return res.status(500).json({ error: err.message || 'Failed to retrieve bots.' });
        }
    }
    else if (purpose === 'getBotGroups') {
        try {
            // Handle encrypted request data for getBotGroups purpose
            if (req.body.data && req.body.data.encryptedData && req.body.data.requiresServerEncryption) {
                try {
                    const decryptResult = tokenEncryption.decryptRequestData(req.body.data);
                    if (decryptResult.success) {
                        const requestData = decryptResult.data;
                        console.log('🔓 Decrypted getBotGroups request data:', requestData);
                        
                        const token = requestData.token;
                        if (!token) {
                            return res.status(400).json({ error: 'Bot token is required.' });
                        }
                        
                        // Get client public key from decrypted request data
                        const clientPublicKey = requestData.clientPublicKey || requestData.publicKey;
                        
                        // Apply token encryption for authenticated access with client's public key
                        return await tokenEncryption.encryptResponseDataMiddleware(req, res, async () => {
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
                            
                            return {
                                success: true,
                                groups: groups
                            };
                        }, clientPublicKey);
                    } else {
                        console.error('🔓 getBotGroups request decryption failed:', decryptResult.error);
                        return res.status(400).json({ error: 'Failed to decrypt request data' });
                    }
                } catch (decryptError) {
                    console.error('🔓 getBotGroups request decryption error:', decryptError);
                    return res.status(400).json({ error: 'Invalid encrypted request' });
                }
            } else {
                // Fallback for non-encrypted requests (backwards compatibility)
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
            }
        } catch (err) {
            console.error('Error in getBotGroups:', err);
            return res.status(500).json({ error: err.message || 'Failed to retrieve group info.' });
        }
    }
    else if (purpose === 'getChatHistory') {
        try {
            // Handle encrypted request data for getChatHistory purpose
            if (req.body.encryptedData && req.body.requiresServerEncryption) {
                try {
                    const decryptResult = tokenEncryption.decryptRequestData(req.body);
                    if (decryptResult.success) {
                        const requestData = decryptResult.data;
                        console.log('🔓 Decrypted getChatHistory request data:', requestData);
                        
                        const { token, chatId } = requestData;
                        if (!token || !chatId) {
                            return res.status(400).json({ error: 'Bot token and chatId are required.' });
                        }
                        
                        // Get client public key from decrypted request data
                        const clientPublicKey = requestData.clientPublicKey || requestData.publicKey;
                        console.log('🔑 Using client public key for getChatHistory response encryption');
                        
                        // Apply token encryption for authenticated access with client's public key
                        return await tokenEncryption.encryptResponseDataMiddleware(req, res, async () => {
                            const telegramController = new TelegramController();
                            const result = await telegramController.getChatHistory(token, chatId);
                            console.log('Chat history result for encrypted response:', result);
                            
                            if (result.success) {
                                return {
                                    success: true,
                                    data: result.data
                                };
                            } else {
                                throw new Error(result.error || 'Failed to retrieve chat history.');
                            }
                        }, clientPublicKey);
                    } else {
                        console.error('🔓 getChatHistory request decryption failed:', decryptResult.error);
                        return res.status(400).json({ error: 'Failed to decrypt request data' });
                    }
                } catch (decryptError) {
                    console.error('🔓 getChatHistory request decryption error:', decryptError);
                    return res.status(400).json({ error: 'Invalid encrypted request' });
                }
            } else {
                // Fallback for non-encrypted requests (backwards compatibility)
                const { token, chatId } = req.body;
                if (!token || !chatId) {
                    return res.status(400).json({ error: 'Bot token and chatId are required.' });
                }
                
                const telegramController = new TelegramController();
                const result = await telegramController.getChatHistory(token, chatId);
                console.log('Chat history result:', result);
                
                if (result.success) {
                    return res.status(200).json({ data: result.data, success: true });
                } else {
                    return res.status(500).json({ error: result.error || 'Failed to retrieve chat history.' });
                }
            }
        } catch (err) {
            console.error('Error in getChatHistory:', err);
            return res.status(500).json({ error: err.message || 'Failed to retrieve chat history.' });
        }
    }
    return res.status(400).json({ error: 'Invalid purpose.' });
});



module.exports = router;
