const { MongoClient, ObjectId } = require('mongodb');

class DatabaseConnectivity {
  constructor() {
    this.uri = 'mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/?retryWrites=true&w=majority&appName=StrawHeadedBulbul';
    this.client = new MongoClient(this.uri, { tlsAllowInvalidCertificates: false });
    this.connected = false;
  }

    // Connect to the database
    async initialize()
    {
        try 
        {
            if (!this.connected) 
            {
                await this.client.connect();
                this.connected = true;
                return "Connected to MongoDB Atlas!";
            }   
        } catch (error) {
            console.error("Error connecting to MongoDB Atlas:", error);
            throw error;
        }
    }

  async getAllDocuments(databaseName, collectionName) {
    const db = this.client.db(databaseName);
    const collection = db.collection(collectionName);
    return await collection.find({}).toArray();
  }

  async close() {
    if (this.connected) {
      await this.client.close();
      this.connected = false;
    }
  }
}

module.exports = DatabaseConnectivity;
