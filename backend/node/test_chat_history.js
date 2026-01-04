const DatabaseConnectivity = require('./Database/databaseConnectivity');

async function test() {
  try {
    const db = DatabaseConnectivity.getInstance();
    await db.initialize();
    
    // Check what's in Chat History collection
    const history = await db.getAllDocuments('Straw-Headed-Bulbul', 'Chat History', {}, {});
    console.log('Total messages:', history?.length || 0);
    
    if (history && history.length > 0) {
      history.forEach((msg, i) => {
        console.log(`\nMessage ${i+1}:`);
        console.log('  _id:', msg._id);
        console.log('  token:', msg.token?.substring(0, 20) + '...');
        console.log('  senderType:', msg.senderType);
        console.log('  chatId:', msg.chatId);
        console.log('  sentAt:', msg.sentAt);
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

test();
