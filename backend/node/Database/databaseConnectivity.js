const { MongoClient, ObjectId } = require('mongodb');

class DatabaseConnectivity {
  constructor() {
    this.uri = 'mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/StrawHeadedBulbul?retryWrites=true&w=majority&appName=StrawHeadedBulbul&maxPoolSize=5&connectTimeoutMS=5000&serverSelectionTimeoutMS=5000';
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
        maxPoolSize: 5,
        minPoolSize: 0,
        maxIdleTimeMS: 10000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 20000,
        connectTimeoutMS: 5000,
        retryWrites: true,
        retryReads: true,
        maxConnecting: 1,
        family: 4, // Force IPv4
        bufferMaxEntries: 0,
        useUnifiedTopology: true,
        directConnection: false
      });
    }
    return this.client;
  }

    // Connect to the database with retry logic for DNS issues
    async initialize(retries = 3) {
        // If already connecting, wait for existing connection
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        // If already connected, return immediately
        if (this.connected) {
            return "Already connected to MongoDB Atlas!";
        }

        // Create connection promise with retry logic
        this.connectionPromise = this._connectWithRetry(retries);
        return this.connectionPromise;
    }

    async _connectWithRetry(retries) {
        let lastError;
        
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                console.log(`Connection attempt ${attempt + 1}/${retries + 1}`);
                return await this._connect();
            } catch (error) {
                lastError = error;
                console.error(`Connection attempt ${attempt + 1} failed:`, error.message);
                
                // Reset connection promise on failure
                this.connectionPromise = null;
                
                // Don't retry on the last attempt
                if (attempt === retries) {
                    break;
                }
                
                // Wait before retry with exponential backoff
                const delay = Math.min(1000 * Math.pow(2, attempt), 3000);
                console.log(`Retrying connection in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        console.error("All connection attempts failed");
        throw lastError;
    }

    async _connect() {
        try {
            console.log("Attempting to connect to MongoDB Atlas...");
            const client = this.getClient();
            
            // Connect with timeout
            await Promise.race([
                client.connect(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Connection timeout')), 8000)
                )
            ]);
            
            // Test the connection with shorter timeout
            await Promise.race([
                client.db("admin").command({ ping: 1 }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Ping timeout')), 3000)
                )
            ]);
            
            this.connected = true;
            console.log("Successfully connected to MongoDB Atlas!");
            return "Connected to MongoDB Atlas!";
            
        } catch (error) {
            console.error("Error connecting to MongoDB Atlas:", error);
            this.connected = false;
            this.connectionPromise = null;
            
            // Force close and recreate client on any connection error
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

  // Generic operation wrapper with connection management and retry logic
  async executeOperation(operation, retries = 2) {
    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Always start fresh for each operation
        await this.close();
        
        console.log(`Database operation attempt ${attempt + 1}/${retries + 1}`);
        
        // Create new connection for this operation
        await this.initialize();
        
        const result = await Promise.race([
          operation(this.getClient()),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), 15000)
          )
        ]);
        
        console.log("Database operation completed successfully");
        return result;
        
      } catch (error) {
        lastError = error;
        console.error(`Database operation attempt ${attempt + 1} failed:`, error.message);
        
        // Don't retry on the last attempt
        if (attempt === retries) {
          break;
        }
        
        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } finally {
        // Always close connection after each attempt
        await this.close();
      }
    }
    
    console.error("All database operation attempts failed");
    throw lastError;
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
        await Promise.race([
          this.client.close(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Close timeout')), 3000)
          )
        ]);
        console.log("MongoDB connection closed successfully");
      }
    } catch (error) {
      console.error("Error closing MongoDB connection:", error);
    } finally {
      // Always reset state regardless of close success/failure
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
