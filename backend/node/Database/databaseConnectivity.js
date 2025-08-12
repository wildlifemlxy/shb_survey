const { MongoClient, ObjectId } = require('mongodb');

class DatabaseConnectivity {
  constructor() {
    // Use environment variable or fallback to hardcoded URI
    this.uri = 'mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/StrawHeadedBulbul?retryWrites=true&w=1&appName=StrawHeadedBulbul&maxPoolSize=100&connectTimeoutMS=10000&serverSelectionTimeoutMS=10000&compressors=zlib&readPreference=primaryPreferred';
    this.client = null;
    this.connected = false;
    this.connectionPromise = null;
    this.lastUsed = Date.now();
    this.activeOperations = new Set();
    this.connectionReady = false;
  }

  // Singleton pattern to ensure only one connection instance
  static getInstance() {
    if (!DatabaseConnectivity.instance) {
      DatabaseConnectivity.instance = new DatabaseConnectivity();
      DatabaseConnectivity.instance.startConnectionCleanup();
    }
    return DatabaseConnectivity.instance;
  }

  // Azure-optimized client configuration for MongoDB Atlas connectivity
  getClient() {
    if (!this.client) {
      this.client = new MongoClient(this.uri, {
        maxPoolSize: 100,
        minPoolSize: 10,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        retryWrites: true,
        retryReads: false,
        maxConnecting: 15,
        family: 4,
        directConnection: false,
        compressors: ['zlib'],
        readPreference: 'primary',
        readConcern: { level: 'local' },
        writeConcern: { w: 1, j: false }
      });
    }
    return this.client;
  }

    // Fast connection retry logic
    async initialize(retries = 1) {
        // If already connecting, wait for existing connection
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        // If already connected, return immediately
        if (this.connected && this.connectionReady) {
            return "Already connected to MongoDB Atlas!";
        }

        // Create connection promise with fast retry
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
                
                // Very fast retry
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        console.error("All connection attempts failed:", lastError.message);
        throw lastError;
    }

    async _connect() {
        try {
            console.log("Attempting to connect to MongoDB Atlas...");
            const client = this.getClient();
            
            // Longer timeouts for Azure-to-MongoDB Atlas connectivity
            await Promise.race([
                client.connect(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Connection timeout after 15s')), 15000)
                )
            ]);
            
            // Test connection with ping (longer timeout for Azure)
            await Promise.race([
                client.db("admin").command({ ping: 1 }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Ping timeout after 10s')), 10000)
                )
            ]);
            
            this.connected = true;
            this.connectionReady = true;
            this.lastUsed = Date.now();
            console.log("Successfully connected to MongoDB Atlas!");
            return "Connected to MongoDB Atlas!";
            
        } catch (error) {
            console.error("Connection failed:", error.message);
            this.connected = false;
            this.connectionReady = false;
            this.connectionPromise = null;
            
            // Force close and recreate client on any connection error
            if (this.client) {
                try {
                    await this.client.close();
                } catch (closeError) {
                    console.error("Error closing client:", closeError.message);
                }
                this.client = null;
            }
            throw error;
        }
    }

  // Azure-optimized operation wrapper with reasonable timeouts
  async executeOperation(operation, retries = 1) {
    const operationId = Date.now().toString(36);
    
    try {
      this.activeOperations.add(operationId);
      console.log(`[${operationId}] Starting operation (${this.activeOperations.size} active)`);
      
      // Always ensure fresh connection for reliability
      if (!this.connectionReady || !this.connected) {
        console.log(`[${operationId}] Initializing connection`);
        await this.initialize();
      }
      
      this.lastUsed = Date.now();
      
      // Execute with reasonable timeout for Azure free tier
      const result = await Promise.race([
        operation(this.getClient()),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout after 10s')), 10000)
        )
      ]);
      
      console.log(`[${operationId}] Operation completed successfully`);
      return result;
      
    } catch (error) {
      console.error(`[${operationId}] Operation failed:`, error.message);
      
      // Reduced retries for Azure free tier to conserve resources
      if (retries > 0) {
        console.log(`[${operationId}] Retrying (${retries} retries left)`);
        this.connectionReady = false;
        await this.close();
        await new Promise(resolve => setTimeout(resolve, 200));
        return this.executeOperation(operation, retries - 1);
      }
      
      // Throw with more context
      throw new Error(`Database operation failed: ${error.message}`);
      
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

  // Ultra-fast document retrieval with better error handling
  async getAllDocuments(databaseName, collectionName, projection = {}) {
    try {
      return await this.executeOperation(async (client) => {
        const db = client.db(databaseName);
        const collection = db.collection(collectionName);
        
        const findOptions = {};
        if (Object.keys(projection).length > 0) {
          findOptions.projection = projection;
        }
        
        const documents = await collection.find({}, findOptions).toArray();
        
        // Fast ObjectId conversion
        return documents.map(doc => {
          doc._id = doc._id.toString();
          return doc;
        });
      });
    } catch (error) {
      console.error(`getAllDocuments failed for ${collectionName}:`, error.message);
      throw new Error(`Failed to retrieve documents from ${collectionName}: ${error.message}`);
    }
  }

  // Ultra-fast insert with better error handling
  async insertDocument(databaseName, collectionName, document) {
    try {
      return await this.executeOperation(async (client) => {
        const db = client.db(databaseName);
        const collection = db.collection(collectionName);
        const result = await collection.insertOne(document, { 
          writeConcern: { w: 1, j: false } 
        });
        
        if (result.insertedId) {
          result.insertedId = result.insertedId.toString();
        }
        return result;
      });
    } catch (error) {
      console.error(`insertDocument failed for ${collectionName}:`, error.message);
      throw new Error(`Failed to insert document into ${collectionName}: ${error.message}`);
    }
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
        await Promise.race([
          this.client.close(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Close timeout')), 1000)
          )
        ]);
      }
    } catch (error) {
      // Silent close errors for speed
    } finally {
      this.client = null;
      this.connected = false;
      this.connectionReady = false;
      this.connectionPromise = null;
    }
  }

  // Resource-efficient connection cleanup for Azure free tier
  startConnectionCleanup() {
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(() => {
      const IDLE_THRESHOLD = 120000; // 2 minutes (shorter for free tier)
      const hasActiveOperations = this.activeOperations.size > 0;
      const isIdle = (Date.now() - this.lastUsed) > IDLE_THRESHOLD;
      
      if (this.connected && !hasActiveOperations && isIdle) {
        console.log("Closing idle connection to conserve resources");
        this.close();
      }
    }, 60000); // Check every minute for faster cleanup
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
