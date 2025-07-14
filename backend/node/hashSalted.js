const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const uri = 'mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/?retryWrites=true&w=majority&appName=StrawHeadedBulbul';
const databaseName = "Straw-Headed-Bulbul"; // Replace with your actual DB name
const collectionName = 'Accounts';

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(databaseName);
    const collection = db.collection(collectionName);

    const users = await collection.find({}).toArray();

    for (const user of users) {
      const currentPassword = user.password;
      // Generate a random salt
      const salt = crypto.randomBytes(16).toString('hex');
      // Hash the password with PBKDF2
      const hash = crypto.pbkdf2Sync(currentPassword, salt, 100000, 64, 'sha512').toString('hex');
      // Store as salt:hash
      const customHash = `${salt}:${hash}`;

      await collection.updateOne(
        { _id: user._id },
        { $set: { hashPassword: customHash, salt: salt } }
      );

      console.log(`Updated hashPassword and salt for user ${user.email || user._id}`);
    }
  } catch (err) {
    console.error('Error during password hashing:', err);
  } finally {
    await client.close();
  }
}

run();