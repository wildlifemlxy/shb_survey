const { MongoClient, ObjectId } = require('mongodb');

class DatabaseConnectivity {
  constructor() {
    this.uri = 'mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/StrawHeadedBulbul?retryWrites=true&w=majority&appName=StrawHeadedBulbul&maxPoolSize=10&connectTimeoutMS=3000&serverSelectionTimeoutMS=3000&compressors=zlib';
    this.client = null;
    this.connected = false;
    this.connectionPromise = null;
    this.lastUsed = Date.now();
  }

  // Singleton pattern to ensure only one connection instance
  static getInstance() {
    if (!DatabaseConnectivity.instance) {
      DatabaseConnectivity.instance = new DatabaseConnectivity();
      DatabaseConnectivity.instance.startConnectionCleanup();
    }
    return DatabaseConnectivity.instance;
  }

  // Get or create client with optimal connection options
  getClient() {
    if (!this.client) {
      this.client = new MongoClient(this.uri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 3000,
        socketTimeoutMS: 10000,
        connectTimeoutMS: 3000,
        retryWrites: true,
        retryReads: true,
        maxConnecting: 2,
        family: 4, // Force IPv4
        useUnifiedTopology: true,
        directConnection: false,
        compressors: ['zlib'],
        readPreference: 'primaryPreferred'
      });
    }
    return this.client;
  }

    // Connect to the database with optimized retry logic
    async initialize(retries = 2) {
        // If already connecting, wait for existing connection
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        // If already connected, return immediately
        if (this.connected) {
            return "Already connected to MongoDB Atlas!";
        }

        // Create connection promise with optimized retry logic
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
                
                // Faster retry with shorter delays
                const delay = Math.min(200 * Math.pow(2, attempt), 1000);
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
            
            // Connect with shorter timeout for faster failure detection
            await Promise.race([
                client.connect(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Connection timeout')), 5000)
                )
            ]);
            
            // Quick ping test
            await Promise.race([
                client.db("admin").command({ ping: 1 }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Ping timeout')), 2000)
                )
            ]);
            
            this.connected = true;
            this.lastUsed = Date.now();
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

  // Optimized operation wrapper with connection reuse
  async executeOperation(operation, retries = 2) {
    let lastError;
    const CONNECTION_REUSE_THRESHOLD = 30000; // 30 seconds
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`Database operation attempt ${attempt + 1}/${retries + 1}`);
        
        // Check if we can reuse existing connection (within 30 seconds)
        const canReuseConnection = this.connected && 
          (Date.now() - this.lastUsed) < CONNECTION_REUSE_THRESHOLD;
        
        if (!canReuseConnection) {
          console.log("Creating fresh connection for operation");
          await this.close();
          await this.initialize();
        } else {
          console.log("Reusing existing connection");
          this.lastUsed = Date.now();
        }
        
        const result = await Promise.race([
          operation(this.getClient()),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), 12000)
          )
        ]);
        
        console.log("Database operation completed successfully");
        this.lastUsed = Date.now();
        return result;
        
      } catch (error) {
        lastError = error;
        console.error(`Database operation attempt ${attempt + 1} failed:`, error.message);
        
        // Force close on error to ensure clean state
        await this.close();
        
        // Don't retry on the last attempt
        if (attempt === retries) {
          break;
        }
        
        // Shorter delay for faster retries
        const delay = Math.min(500 * Math.pow(2, attempt), 2000);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.error("All database operation attempts failed");
    throw lastError;
  }

  // Optimized document retrieval with projections
  async getAllDocuments(databaseName, collectionName, projection = {}) {
    return this.executeOperation(async (client) => {
      const db = client.db(databaseName);
      const collection = db.collection(collectionName);
      
      // Use projection to limit data transfer if specified
      const findOptions = Object.keys(projection).length > 0 ? { projection } : {};
      const documents = await collection.find({}, findOptions).toArray();
      
      // Convert ObjectId to string for all documents
      return documents.map(doc => ({
        ...doc,
        _id: doc._id.toString()
      }));
    });
  }

  // Optimized insert with write concern
  async insertDocument(databaseName, collectionName, document) {
    return this.executeOperation(async (client) => {
      const db = client.db(databaseName);
      const collection = db.collection(collectionName);
      const result = await collection.insertOne(document, { 
        writeConcern: { w: 'majority', j: true } 
      });
      
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
            setTimeout(() => reject(new Error('Close timeout')), 2000)
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

  // Auto-cleanup idle connections
  startConnectionCleanup() {
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(() => {
      const IDLE_THRESHOLD = 60000; // 1 minute
      if (this.connected && (Date.now() - this.lastUsed) > IDLE_THRESHOLD) {
        console.log("Closing idle connection");
        this.close();
      }
    }, 30000); // Check every 30 seconds
  }

  stopConnectionCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
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
