const { MongoClient, ObjectId } = require('mongodb');

class DatabaseConnectivity {
  constructor() {
    this.uri = 'mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/StrawHeadedBulbul?retryWrites=true&w=majority&appName=StrawHeadedBulbul&maxPoolSize=20&connectTimeoutMS=3000&serverSelectionTimeoutMS=3000&compressors=zlib';
    this.client = null;
    this.connected = false;
    this.connectionPromise = null;
    this.lastUsed = Date.now();
    this.activeOperations = new Set();
    this.operationQueue = [];
    this.processingQueue = false;
  }

  // Singleton pattern to ensure only one connection instance
  static getInstance() {
    if (!DatabaseConnectivity.instance) {
      DatabaseConnectivity.instance = new DatabaseConnectivity();
      DatabaseConnectivity.instance.startConnectionCleanup();
    }
    return DatabaseConnectivity.instance;
  }

  // Get or create client with optimal connection options for concurrent processes
  getClient() {
    if (!this.client) {
      this.client = new MongoClient(this.uri, {
        maxPoolSize: 20,
        minPoolSize: 5,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 3000,
        socketTimeoutMS: 10000,
        connectTimeoutMS: 3000,
        retryWrites: true,
        retryReads: true,
        maxConnecting: ,
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

  // Optimized operation wrapper for concurrent processes
  async executeOperation(operation, retries = 2, priority = 'normal') {
    const operationId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    try {
      this.activeOperations.add(operationId);
      console.log(`[${operationId}] Starting operation (${this.activeOperations.size} concurrent)`);
      
      // Ensure we have a connection but don't close it for concurrent operations
      if (!this.connected) {
        await this.initialize();
      }
      
      // Update last used time
      this.lastUsed = Date.now();
      
      const result = await Promise.race([
        operation(this.getClient()),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), 15000)
        )
      ]);
      
      console.log(`[${operationId}] Operation completed successfully`);
      return result;
      
    } catch (error) {
      console.error(`[${operationId}] Operation failed:`, error.message);
      
      // Only retry if it's a connection-related error
      if (this.isConnectionError(error) && retries > 0) {
        console.log(`[${operationId}] Retrying due to connection error (${retries} retries left)`);
        
        // Force reconnection for connection errors
        await this.close();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return this.executeOperation(operation, retries - 1, priority);
      }
      
      throw error;
      
    } finally {
      this.activeOperations.delete(operationId);
      this.lastUsed = Date.now();
    }
  }

  // Check if error is connection-related
  isConnectionError(error) {
    const connectionErrorKeywords = [
      'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN',
      'MongoNetworkError', 'MongoServerSelectionError', 'Connection timeout'
    ];
    
    return connectionErrorKeywords.some(keyword => 
      error.message.includes(keyword) || error.name.includes(keyword)
    );
  }

  // Get connection statistics
  getConnectionStats() {
    return {
      connected: this.connected,
      activeOperations: this.activeOperations.size,
      lastUsed: new Date(this.lastUsed).toISOString(),
      idleTime: Date.now() - this.lastUsed
    };
  }

  // Batch operations for concurrent processing
  async executeBatchOperations(operations, maxConcurrency = 5) {
    console.log(`Executing ${operations.length} operations with max concurrency: ${maxConcurrency}`);
    
    const results = [];
    const executing = [];
    
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      
      // Create promise for this operation
      const operationPromise = this.executeOperation(operation.fn, operation.retries || 2, operation.priority || 'normal')
        .then(result => ({ index: i, success: true, result }))
        .catch(error => ({ index: i, success: false, error: error.message }));
      
      executing.push(operationPromise);
      
      // If we've reached max concurrency or this is the last operation
      if (executing.length >= maxConcurrency || i === operations.length - 1) {
        const batchResults = await Promise.all(executing);
        results.push(...batchResults);
        executing.length = 0; // Clear the array
      }
    }
    
    // Sort results by original index
    results.sort((a, b) => a.index - b.index);
    
    console.log(`Batch completed: ${results.filter(r => r.success).length} success, ${results.filter(r => !r.success).length} failed`);
    return results;
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

  // Smart auto-cleanup for concurrent processes
  startConnectionCleanup() {
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(() => {
      const IDLE_THRESHOLD = 120000; // 2 minutes for concurrent processes
      const hasActiveOperations = this.activeOperations.size > 0;
      const isIdle = (Date.now() - this.lastUsed) > IDLE_THRESHOLD;
      
      if (this.connected && !hasActiveOperations && isIdle) {
        console.log(`Closing idle connection (idle for ${Math.round((Date.now() - this.lastUsed) / 1000)}s)`);
        this.close();
      } else if (this.connected) {
        console.log(`Connection active: ${this.activeOperations.size} operations, idle: ${Math.round((Date.now() - this.lastUsed) / 1000)}s`);
      }
    }, 60000); // Check every minute for concurrent processes
  }

  stopConnectionCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Graceful shutdown for concurrent processes
  async gracefulShutdown(maxWaitTime = 30000) {
    console.log("Initiating graceful shutdown of MongoDB connection...");
    
    // Stop accepting new operations
    this.stopConnectionCleanup();
    
    // Wait for active operations to complete
    if (this.activeOperations.size > 0) {
      console.log(`Waiting for ${this.activeOperations.size} active operations to complete...`);
      
      const startTime = Date.now();
      while (this.activeOperations.size > 0 && (Date.now() - startTime) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (this.activeOperations.size > 0) {
        console.warn(`Force closing with ${this.activeOperations.size} operations still active`);
      }
    }
    
    await this.close();
    console.log("Graceful shutdown completed");
  }
}

// Export singleton instance
module.exports = DatabaseConnectivity;
