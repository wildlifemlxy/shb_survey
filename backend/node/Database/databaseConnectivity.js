const { MongoClient, ObjectId } = require('mongodb');

class DatabaseConnectivity {
  constructor() {
    this.uri = 'mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/StrawHeadedBulbul?retryWrites=true&w=majority&appName=StrawHeadedBulbul';
    this.client = null;
    this.connected = false;
    this.connectionPromise = null;
  }

  // Singleton pattern to ensure only one connection instance
  static getInstance() {
    if (!DatabaseConnectivity.instance) {
      DatabaseConnectivity.instance = new DatabaseConnectivity();
    }
    return DatabaseConnectivity.instance;
  }

  // Get or create client with proper connection options
  getClient() {
    if (!this.client) {
      this.client = new MongoClient(this.uri, {
        maxPoolSize: 10,
        minPoolSize: 1,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        retryWrites: true,
        retryReads: true,
        maxConnecting: 2
      });
    }
    return this.client;
  }

    // Connect to the database with connection reuse
    async initialize() {
        // If already connecting, wait for existing connection
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        // If already connected, return immediately
        if (this.connected) {
            return "Already connected to MongoDB Atlas!";
        }

        // Create connection promise to prevent multiple simultaneous connections
        this.connectionPromise = this._connect();
        return this.connectionPromise;
    }

    async _connect() {
        try {
            console.log("Attempting to connect to MongoDB Atlas...");
            const client = this.getClient();
            
            await client.connect();
            
            // Test the connection with shorter timeout
            await Promise.race([
                client.db("admin").command({ ping: 1 }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Ping timeout')), 5000)
                )
            ]);
            
            this.connected = true;
            console.log("Successfully connected to MongoDB Atlas!");
            return "Connected to MongoDB Atlas!";
            
        } catch (error) {
            console.error("Error connecting to MongoDB Atlas:", error);
            this.connected = false;
            this.connectionPromise = null;
            
            // Close client on connection error
            if (this.client) {
                try {
                    await this.client.close();
                } catch (closeError) {
                    console.error("Error closing client after connection failure:", closeError);
                }
                this.client = null;
            }
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

  // Generic operation wrapper with connection management
  async executeOperation(operation) {
    let connectionCreated = false;
    try {
      if (!this.connected) {
        await this.initialize();
        connectionCreated = true;
      }
      
      const result = await operation(this.getClient());
      return result;
      
    } catch (error) {
      console.error("Database operation failed:", error);
      this.connected = false;
      this.connectionPromise = null;
      throw error;
    } finally {
      // Close connection after operation for better resource management
      if (connectionCreated || error) {
        await this.close();
      }
    }
  }

  async getAllDocuments(databaseName, collectionName) {
    return this.executeOperation(async (client) => {
      const db = client.db(databaseName);
      const collection = db.collection(collectionName);
      const documents = await collection.find({}).toArray();
      
      // Convert ObjectId to string for all documents
      return documents.map(doc => ({
        ...doc,
        _id: doc._id.toString()
      }));
    });
  }

  async insertDocument(databaseName, collectionName, document) {
    return this.executeOperation(async (client) => {
      const db = client.db(databaseName);
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
    });
  }

  async insertDocuments(databaseName, collectionName, documents) {
    return this.executeOperation(async (client) => {
      const db = client.db(databaseName);
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
    });
  }

  async updateDocument(databaseName, collectionName, filter, update) {
    return this.executeOperation(async (client) => {
      const db = client.db(databaseName);
      const collection = db.collection(collectionName);
      // Convert string _id to ObjectId if present
      if (filter._id && typeof filter._id === 'string') {
        filter._id = new ObjectId(filter._id);
      }
      return await collection.updateOne(filter, update);
    });
  }

  async deleteDocument(databaseName, collectionName, filter) {
    return this.executeOperation(async (client) => {
      const db = client.db(databaseName);
      const collection = db.collection(collectionName);
      // Convert string _id to ObjectId if present
      if (filter._id && typeof filter._id === 'string') {
        filter._id = new ObjectId(filter._id);
      }
      return await collection.deleteOne(filter);
    });
  }

  async getDocument(databaseName, collectionName, email, password) {
    return this.executeOperation(async (client) => {
      console.log("Retrieving document with email:", email, "and password:", password, "from collection:", collectionName);
      const db = client.db(databaseName);
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
    });
  }

  async findDocument(databaseName, collectionName, query) {
    return this.executeOperation(async (client) => {
      console.log("Finding document with query:", query, "from collection:", collectionName);
      const db = client.db(databaseName);
      const collection = db.collection(collectionName);
      
      const document = await collection.findOne(query);
      console.log("Found document:", document ? "Found" : "Not found", document);
      
      // Convert ObjectId to string if document exists
      if (document && document._id) {
        document._id = document._id.toString();
      }
      
      return document;
    });
  }

  async close() {
    try {
      if (this.client) {
        console.log("Closing MongoDB connection...");
        await this.client.close();
        this.client = null;
        this.connected = false;
        this.connectionPromise = null;
        console.log("MongoDB connection closed successfully");
      }
    } catch (error) {
      console.error("Error closing MongoDB connection:", error);
      this.client = null;
      this.connected = false;
      this.connectionPromise = null;
    }
  }

  // Graceful shutdown method
  async gracefulShutdown() {
    console.log("Initiating graceful shutdown of MongoDB connection...");
    await this.close();
  }
}

// Export singleton instance
module.exports = DatabaseConnectivity;
