const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/?retryWrites=true&w=majority&appName=StrawHeadedBulbul';
const databaseName = "Straw-Headed-Bulbul"; // Replace with your actual DB name
const collectionName = 'Wildlife Survey';  // Your collection with the `date` field

const months = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04",
  May: "05", Jun: "06", Jul: "07", Aug: "08",
  Sep: "09", Oct: "10", Nov: "11", Dec: "12"
};

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(databaseName);
    const collection = db.collection(collectionName);

        const docs = await collection.find({ Time: { $type: "string" } }).toArray();
        console.log(`Found ${docs.length} documents with string time format.`);

        for (const doc of docs) {
            if (typeof doc.Time === "string") {
                // Match time format: hh:mm:ss AM/PM
                const timeRegex = /^(\d{1,2}):(\d{2}):(\d{2})\s*([AP]M)$/i;
                const match = doc.Time.match(timeRegex);
                if (match) {
                    let hour = parseInt(match[1], 10);
                    const minute = match[2];
                    const ampm = match[4].toUpperCase();

                    if (ampm === "PM" && hour !== 12) {
                        hour += 12;
                    } else if (ampm === "AM" && hour === 12) {
                        hour = 0;
                    }
                    const hourStr = hour.toString().padStart(2, "0");
                    const formattedTime = `${hourStr}:${minute}`;

                    await collection.updateOne(
                        { _id: doc._id },
                        { $set: { Time: formattedTime } }
                    );
                    console.log(`Updated time for document _id=${doc._id} to ${formattedTime}`);
                } else {
                    console.warn(`Invalid time format in _id=${doc._id}: ${doc.Time}`);
                }
            } else {
                console.warn(`Time field missing or not a string in _id=${doc._id}`);
            }
        }
  } catch (err) {
    console.error('Error during date format conversion:', err);
  } finally {
    await client.close();
  }
}

run();
