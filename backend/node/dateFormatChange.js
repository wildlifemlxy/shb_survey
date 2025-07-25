const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/?retryWrites=true&w=majority&appName=StrawHeadedBulbul';
const databaseName = "Straw-Headed-Bulbul"; // Replace with your actual DB name
const collectionName = 'Wildlife Survey';  // Your collection with the `date` field

const months = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04",
  May: "05", Jun: "06", Jul: "07", Aug: "08",
  Sep: "09", Oct: "10", Nov: "11", Dec: "12"
};

//ok
async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(databaseName);
    const collection = db.collection(collectionName);

        const docs = await collection.find({ Date: { $type: "string" } }).toArray();
        console.log(`Found ${docs}  with string date format.`);

        for (const doc of docs) {
            // Use doc.Date, not doc.date
            if (typeof doc.Date === "string") {
                const parts = doc.Date.split("-");
                let formattedDate = null;
                if (parts.length === 3) {
                    // Format: DD-MMM-YY
                    const day = parts[0].padStart(2, "0");
                    const month = months[parts[1]];
                    const year = "20" + parts[2];
                    if (month) {
                        formattedDate = `${year}-${month}-${day}`;
                    } else {
                        console.warn(`Unknown month "${parts[1]}" in _id=${doc._id}`);
                    }
                } else if (parts.length === 2) {
                    // Format: DD-MMM (missing year)
                    const day = parts[0].padStart(2, "0");
                    const month = months[parts[1]];
                    const year = new Date().getFullYear();
                    if (month) {
                        formattedDate = `${year}-${month}-${day}`;
                        console.log(`Date missing year in _id=${doc._id}: ${doc.Date}, using current year ${year}`);
                    } else {
                        console.warn(`Unknown month "${parts[1]}" in _id=${doc._id}`);
                    }
                } else {
                    console.warn(`Invalid date format in _id=${doc._id}: ${doc.Date}`);
                }
                if (formattedDate) {
                    await collection.updateOne(
                        { _id: doc._id },
                        { $set: { Date: formattedDate } }
                    );
                    console.log(`Updated date for document _id=${doc._id} to ${formattedDate}`);
                }
            } else {
                console.warn(`Date field missing or not a string in _id=${doc._id}`);
            }
    }
  } catch (err) {
    console.error('Error during date format conversion:', err);
  } finally {
    await client.close();
  }
}

run();
