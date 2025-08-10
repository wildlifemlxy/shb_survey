const { MongoClient, ObjectId } = require('mongodb');

class DatabaseConnectivity {
  constructor() {
    this.uri = 'mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/?retryWrites=true&w=majority&appName=StrawHeadedBulbul&connectTimeoutMS=60000&socketTimeoutMS=60000&serverSelectionTimeoutMS=60000&maxPoolSize=10&minPoolSize=2';
    this.client = new MongoClient(this.uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 60000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 60000,
      retryWrites: true,
      retryReads: true
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
                console.log("Attempting to connect to MongoDB Atlas...");
                await this.client.connect();
                
                // Test the connection
                await this.client.db("admin").command({ ping: 1 });
                
                this.connected = true;
                console.log("Successfully connected to MongoDB Atlas!");
                return "Connected to MongoDB Atlas!";
            } else {
                console.log("Already connected to MongoDB Atlas");
                return "Already connected to MongoDB Atlas!";
            }  
        } catch (error) {
            console.error("Error connecting to MongoDB Atlas:", error);
            this.connected = false;
            throw error;
        }
    }

    // Ensure connection before operations
    async ensureConnection() {
        if (!this.connected) {
            await this.initialize();
        }
        return this.connected;
    }

  async getAllDocuments(databaseName, collectionName) {
    try {
      await this.ensureConnection();
      const db = this.client.db(databaseName);
      const collection = db.collection(collectionName);
      const documents = await collection.find({}).toArray();
      
      // Convert ObjectId to string for all documents
      return documents.map(doc => ({
        ...doc,
        _id: doc._id.toString()
      }));
    } catch (error) {
      console.error("Error getting all documents:", error);
      this.connected = false; // Reset connection flag on error
      throw error;
    }
    // Note: Removed finally block to keep connection alive
  }

  async insertDocument(databaseName, collectionName, document) {
    try {
      await this.ensureConnection();
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
    } catch (error) {
      console.error("Error inserting document:", error);
      this.connected = false; // Reset connection flag on error
      throw error;
    }
    // Note: Removed finally block to keep connection alive
  }

  async insertDocuments(databaseName, collectionName, documents) {
    try {
      await this.ensureConnection();
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
    } catch (error) {
      console.error("Error inserting documents:", error);
      this.connected = false; // Reset connection flag on error
      throw error;
    }
    // Note: Removed finally block to keep connection alive
  }

  async updateDocument(databaseName, collectionName, filter, update) {
    try {
      await this.ensureConnection();
      const db = this.client.db(databaseName);
      const collection = db.collection(collectionName);
      // Convert string _id to ObjectId if present
      if (filter._id && typeof filter._id === 'string') {
        filter._id = new ObjectId(filter._id);
      }
      return await collection.updateOne(filter, update);
    } catch (error) {
      console.error("Error updating document:", error);
      this.connected = false; // Reset connection flag on error
      throw error;
    }
    // Note: Removed finally block to keep connection alive
  }

  async deleteDocument(databaseName, collectionName, filter) {
    try {
      await this.ensureConnection();
      const db = this.client.db(databaseName);
      const collection = db.collection(collectionName);
      // Convert string _id to ObjectId if present
      if (filter._id && typeof filter._id === 'string') {
        filter._id = new ObjectId(filter._id);
      }
      return await collection.deleteOne(filter);
    } catch (error) {
      console.error("Error deleting document:", error);
      this.connected = false; // Reset connection flag on error
      throw error;
    }
    // Note: Removed finally block to keep connection alive
  }

  async getDocument(databaseName, collectionName, email, password) {
    try {
      await this.ensureConnection();
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
      this.connected = false; // Reset connection flag on error
      throw error;
    }
    // Note: Removed finally block to keep connection alive
  }

  async findDocument(databaseName, collectionName, query) {
    try {
      await this.ensureConnection();
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
      this.connected = false; // Reset connection flag on error
      throw error;
    }
    // Note: Removed finally block to keep connection alive
  }

  async close() {
    try {
      if (this.connected && this.client) {
        console.log("Closing MongoDB connection...");
        await this.client.close();
        this.connected = false;
        console.log("MongoDB connection closed successfully");
      }
    } catch (error) {
      console.error("Error closing MongoDB connection:", error);
      this.connected = false; // Reset flag even if close fails
    }
  }

  // Graceful shutdown method
  async gracefulShutdown() {
    console.log("Initiating graceful shutdown of MongoDB connection...");
    await this.close();
  }
}

module.exports = DatabaseConnectivity;
