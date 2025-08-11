const { MongoClient, ObjectId } = require('mongodb');

class DatabaseConnectivity {
  constructor() {
    this.uri = 'mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/StrawHeadedBulbul?retryWrites=true&w=majority&appName=StrawHeadedBulbul&maxPoolSize=30&connectTimeoutMS=2000&serverSelectionTimeoutMS=2000&compressors=zlib&readPreference=primaryPreferred';
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

  // Ultra-fast client configuration for maximum performance
  getClient() {
    if (!this.client) {
      this.client = new MongoClient(this.uri, {
        maxPoolSize: 30,
        minPoolSize: 10,
        maxIdleTimeMS: 60000,
        serverSelectionTimeoutMS: 2000,
        socketTimeoutMS: 5000,
        connectTimeoutMS: 2000,
        retryWrites: true,
        retryReads: true,
        maxConnecting: 10,
        family: 4,
        useUnifiedTopology: true,
        directConnection: false,
        compressors: ['zlib'],
        readPreference: 'primaryPreferred',
        readConcern: { level: 'local' },
        writeConcern: { w: 1, j: false }
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
            
            // Ultra-fast connection with minimal timeout
            await Promise.race([
                client.connect(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Connection timeout')), 3000)
                )
            ]);
            
            // Skip ping for faster connection
            this.connected = true;
            this.connectionReady = true;
            this.lastUsed = Date.now();
            console.log("Successfully connected to MongoDB Atlas!");
            return "Connected to MongoDB Atlas!";
            
        } catch (error) {
            console.error("Error connecting to MongoDB Atlas:", error);
            this.connected = false;
            this.connectionReady = false;
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

  // Ultra-fast operation wrapper with minimal overhead
  async executeOperation(operation, retries = 1) {
    const operationId = Date.now().toString(36);
    
    try {
      this.activeOperations.add(operationId);
      
      // Ensure connection without blocking
      if (!this.connectionReady) {
        await this.initialize();
      }
      
      this.lastUsed = Date.now();
      
      // Execute with shorter timeout for speed
      const result = await Promise.race([
        operation(this.getClient()),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), 8000)
        )
      ]);
      
      return result;
      
    } catch (error) {
      // Fast retry only for connection errors
      if (this.isConnectionError(error) && retries > 0) {
        this.connectionReady = false;
        await this.close();
        return this.executeOperation(operation, retries - 1);
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

  // Ultra-fast document retrieval
  async getAllDocuments(databaseName, collectionName, projection = {}) {
    return this.executeOperation(async (client) => {
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
  }

  // Ultra-fast insert
  async insertDocument(databaseName, collectionName, document) {
    return this.executeOperation(async (client) => {
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

  // Ultra-fast connection cleanup
  startConnectionCleanup() {
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(() => {
      const IDLE_THRESHOLD = 300000; // 5 minutes
      const hasActiveOperations = this.activeOperations.size > 0;
      const isIdle = (Date.now() - this.lastUsed) > IDLE_THRESHOLD;
      
      if (this.connected && !hasActiveOperations && isIdle) {
        this.close();
      }
    }, 120000); // Check every 2 minutes
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
