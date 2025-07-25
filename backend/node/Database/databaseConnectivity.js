const { MongoClient, ObjectId } = require('mongodb');

class DatabaseConnectivity {
  constructor() {
    this.uri = 'mongodb://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/?retryWrites=true&w=majority&appName=StrawHeadedBulbul';
    this.client = new MongoClient(this.uri, { tlsAllowInvalidCertificates: false,
       serverSelectionTimeoutMS: 60000 // 60 seconds
    });
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
    const documents = await collection.find({}).toArray();
    
    // Convert ObjectId to string for all documents
    return documents.map(doc => ({
      ...doc,
      _id: doc._id.toString()
    }));
  }

  async insertDocument(databaseName, collectionName, document) {
    const db = this.client.db(databaseName);
    const collection = db.collection(collectionName);
    const result = await collection.insertOne(document);
    
    // Return the inserted document with string ID
    if (result.insertedId) {
      return {
        ...result,
        insertedId: result.insertedId.toString()
      };
    }
    return result;
  }

  async insertDocuments(databaseName, collectionName, documents) {
    const db = this.client.db(databaseName);
    const collection = db.collection(collectionName);
    const result = await collection.insertMany(documents);
    
    // Convert inserted IDs to strings
    if (result.insertedIds) {
      const insertedIds = {};
      Object.keys(result.insertedIds).forEach(key => {
        insertedIds[key] = result.insertedIds[key].toString();
      });
      return {
        ...result,
        insertedIds
      };
    }
    return result;
  }

  async updateDocument(databaseName, collectionName, filter, update) {
    const db = this.client.db(databaseName);
    const collection = db.collection(collectionName);
    // Convert string _id to ObjectId if present
    if (filter._id && typeof filter._id === 'string') {
      filter._id = new ObjectId(filter._id);
    }
    return await collection.updateOne(filter, update);
  }

  async deleteDocument(databaseName, collectionName, filter) {
    const db = this.client.db(databaseName);
    const collection = db.collection(collectionName);
    // Convert string _id to ObjectId if present
    if (filter._id && typeof filter._id === 'string') {
      filter._id = new ObjectId(filter._id);
    }
    return await collection.deleteOne(filter);
  }

  async getDocument(databaseName, collectionName, email, password) {
    try {
      console.log("Retrieving document with email:", email, "and password:", password, "from collection:", collectionName);
      const db = this.client.db(databaseName);
      const collection = db.collection(collectionName);
      
      // Create query object with email and password
      const query = { email, password };
      
      const document = await collection.findOne(query);
      console.log("Retrieved document:", document);
      
      // Convert ObjectId to string if document exists
      if (document && document._id) {
        document._id = document._id.toString();
      }
      
      return document;
    } catch (error) {
      console.error("Error retrieving document:", error);
      throw error;
    }
  }

  async findDocument(databaseName, collectionName, query) {
    try {
      console.log("Finding document with query:", query, "from collection:", collectionName);
      const db = this.client.db(databaseName);
      const collection = db.collection(collectionName);
      
      const document = await collection.findOne(query);
      console.log("Found document:", document ? "Found" : "Not found", document);
      
      // Convert ObjectId to string if document exists
      if (document && document._id) {
        document._id = document._id.toString();
      }
      
      return document;
    } catch (error) {
      console.error("Error finding document:", error);
      throw error;
    }
  }

  async close() {
    if (this.connected) {
      await this.client.close();
      this.connected = false;
    }
  }
}

module.exports = DatabaseConnectivity;
