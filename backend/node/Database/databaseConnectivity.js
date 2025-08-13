const { MongoClient, ObjectId } = require('mongodb');

class DatabaseConnectivity {
  constructor() {
    // Primary connection string - simplified for maximum compatibility
    this.uri = 'mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/StrawHeadedBulbul?retryWrites=true&w=0&appName=StrawHeadedBulbul&maxPoolSize=100';
    
    // Fallback URIs for DNS resolution issues - simplified
    this.fallbackUris = [
      // Alternative with different parameters
      'mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/StrawHeadedBulbul?retryWrites=true&w=0&maxPoolSize=50',
      // Backup connection
      'mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/StrawHeadedBulbul'
    ];
    
    this.client = null;
    this.connected = false;
    this.connectionPromise = null;
    this.lastUsed = Date.now();
    this.activeOperations = new Set();
    this.connectionReady = false;
    this.currentUriIndex = 0;
    this.silentMode = true; // Suppress non-critical errors
  }

  // Singleton pattern to ensure only one connection instance
  static getInstance() {
    if (!DatabaseConnectivity.instance) {
      DatabaseConnectivity.instance = new DatabaseConnectivity();
      DatabaseConnectivity.instance.startConnectionCleanup();
    }
    return DatabaseConnectivity.instance;
  }

  // Maximum performance client configuration - no timeouts
  getClient() {
    if (!this.client) {
      this.client = new MongoClient(this.uri, {
        maxPoolSize: 100,             // Maximum connections for optimal performance
        minPoolSize: 10,              // Keep more connections warm
        maxIdleTimeMS: 0,             // Never close idle connections
        serverSelectionTimeoutMS: 0,  // No timeout for server selection
        socketTimeoutMS: 0,           // No socket timeout
        connectTimeoutMS: 0,          // No connection timeout
        retryWrites: true,
        retryReads: true,
        maxConnecting: 20,            // Allow many concurrent connections
        family: 4,
        directConnection: false,
        compressors: ['zlib'],
        readPreference: 'primaryPreferred',
        readConcern: { level: 'local' },
        writeConcern: { w: 0, j: false }, // Fastest write concern
        heartbeatFrequencyMS: 10000,  // More frequent heartbeats for responsiveness
        waitQueueTimeoutMS: 0         // No wait timeout
      });
    }
    return this.client;
  }

    // Fast connection retry logic
    async initialize(retries = 5) {
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
        const connectionAttempts = [this.uri, ...this.fallbackUris];
        let lastError;
        
        for (let attempt = 0; attempt <= retries; attempt++) {
            // Try each URI in sequence for each retry attempt
            for (let uriIndex = 0; uriIndex < connectionAttempts.length; uriIndex++) {
                try {
                    this.currentUriIndex = uriIndex;
                    return await this._connect(connectionAttempts[uriIndex]);
                } catch (error) {
                    lastError = error;
                    
                    // Silently handle DNS timeout errors
                    if (this.isDnsError(error)) {
                        if (!this.silentMode && uriIndex === 0) {
                            console.warn(`DNS timeout with primary URI, trying fallback...`);
                        }
                        continue; // Try next URI
                    }
                    
                    // For other errors, try next URI
                    if (!this.silentMode) {
                        console.warn(`Connection attempt ${attempt + 1}.${uriIndex + 1} failed: ${error.message.substring(0, 100)}`);
                    }
                }
            }
            
            // Reset connection promise on failure
            this.connectionPromise = null;
            
            // Don't retry on the last attempt
            if (attempt === retries) {
                break;
            }
            
            // Progressive retry delay
            const retryDelay = Math.min(100 * Math.pow(2, attempt), 2000);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
        
        if (!this.silentMode) {
            console.error("All connection attempts failed:", lastError.message);
        }
        throw lastError;
    }

    async _connect(customUri = null) {
        try {
            const connectionUri = customUri || this.uri;
            
            // Create new client with simplified, compatible options
            const client = new MongoClient(connectionUri, {
                maxPoolSize: 100,
                minPoolSize: 10,
                retryWrites: true,
                retryReads: true,
                maxConnecting: 20,
                compressors: ['zlib'],
                readPreference: 'primaryPreferred',
                readConcern: { level: 'local' },
                writeConcern: { w: 0, j: false }
            });
            
            // Close existing client if any
            if (this.client) {
                try {
                    await this.client.close();
                } catch (closeError) {
                    // Silent close errors
                }
            }
            
            this.client = client;
            
            // Direct connection without timeouts for maximum performance
            await client.connect();
            
            // Quick ping test - no timeout
            await client.db("admin").command({ ping: 1 });
            
            this.connected = true;
            this.connectionReady = true;
            this.lastUsed = Date.now();
            return "Connected to MongoDB Atlas!";
            
        } catch (error) {
            // Only log critical errors in silent mode
            if (!this.silentMode || this.isCriticalError(error)) {
                console.error("Connection failed:", error.message);
            }
            
            this.connected = false;
            this.connectionReady = false;
            this.connectionPromise = null;
            
            // Force close and recreate client on any connection error
            if (this.client) {
                try {
                    await this.client.close();
                } catch (closeError) {
                    // Silent close errors
                }
                this.client = null;
            }
            throw error;
        }
    }

  // Maximum performance operation wrapper - no timeouts
  async executeOperation(operation, retries = 3) {
    const operationId = Date.now().toString(36);
    
    try {
      this.activeOperations.add(operationId);
      
      // Always ensure fresh connection for reliability
      if (!this.connectionReady || !this.connected) {
        await this.initialize(5); // More retries for maximum reliability
      }
      
      this.lastUsed = Date.now();
      
      // Execute operation without timeout for maximum performance
      const result = await operation(this.getClient());
      
      return result;
      
    } catch (error) {
      // Suppress non-critical errors in silent mode
      if (!this.silentMode || this.isCriticalError(error)) {
        console.error(`Operation failed: ${error.message.substring(0, 100)}`);
      }
      
      // Aggressive retries for maximum reliability
      if (retries > 0 && this.isConnectionError(error)) {
        this.connectionReady = false;
        await this.close();
        await new Promise(resolve => setTimeout(resolve, 50)); // Ultra-fast retry
        return this.executeOperation(operation, retries - 1);
      }
      
      // For non-connection errors, throw immediately
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
      'MongoNetworkError', 'MongoServerSelectionError', 'Connection timeout',
      'queryTxt ETIMEOUT', 'getaddrinfo ENOTFOUND', 'ECONNRESET', 'EPIPE',
      'socket hang up', 'DNS resolution', 'Server selection timed out'
    ];
    
    return connectionErrorKeywords.some(keyword => 
      error.message.includes(keyword) || error.name.includes(keyword)
    );
  }

  // Check if error is DNS-related (can be ignored)
  isDnsError(error) {
    const dnsErrorKeywords = [
      'queryTxt ETIMEOUT', 'getaddrinfo ENOTFOUND', 'EAI_AGAIN',
      'DNS resolution', 'ENOTFOUND'
    ];
    
    return dnsErrorKeywords.some(keyword => 
      error.message.includes(keyword) || error.code === keyword
    );
  }

  // Check if error is critical (should always be logged)
  isCriticalError(error) {
    const criticalErrorKeywords = [
      'Authentication failed', 'MongoParseError', 'MongoError',
      'Invalid connection string', 'Database does not exist'
    ];
    
    return criticalErrorKeywords.some(keyword => 
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

  // Maximum performance batch operations
  async executeBatchOperations(operations, maxConcurrency = 25) {
    const results = [];
    const executing = [];
    
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      
      // Create promise for this operation
      const operationPromise = this.executeOperation(operation.fn, operation.retries || 3)
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
    
    return results;
  }

  // Ultra-fast document retrieval with better error handling
  async getAllDocuments(databaseName, collectionName, projection = {}) {
    try {
      return await this.executeOperation(async (client) => {
        const db = client.db(databaseName);
        const collection = db.collection(collectionName);
        
        const findOptions = {
          readPreference: 'primaryPreferred',
          readConcern: { level: 'local' },
          maxTimeMS: 0 // No timeout
        };
        
        if (Object.keys(projection).length > 0) {
          findOptions.projection = projection;
        }
        
        const documents = await collection.find({}, findOptions).toArray();
        
        // Fast ObjectId conversion
        return documents.map(doc => {
          if (doc._id) doc._id = doc._id.toString();
          return doc;
        });
      });
    } catch (error) {
      // Silent error handling for seamless operation
      if (!this.silentMode || this.isCriticalError(error)) {
        console.error(`getAllDocuments failed for ${collectionName}:`, error.message);
      }
      throw new Error(`Failed to retrieve documents from ${collectionName}: ${error.message}`);
    }
  }

  // Ultra-fast insert with maximum performance
  async insertDocument(databaseName, collectionName, document) {
    try {
      return await this.executeOperation(async (client) => {
        const db = client.db(databaseName);
        const collection = db.collection(collectionName);
        const result = await collection.insertOne(document, { 
          writeConcern: { w: 0, j: false }, // Fastest write concern - fire and forget
          maxTimeMS: 0 // No timeout
        });
        
        if (result.insertedId) {
          result.insertedId = result.insertedId.toString();
        }
        return result;
      });
    } catch (error) {
      // Silent error handling for seamless operation
      if (!this.silentMode || this.isCriticalError(error)) {
        console.error(`insertDocument failed for ${collectionName}:`, error.message);
      }
      throw new Error(`Failed to insert document into ${collectionName}: ${error.message}`);
    }
  }

  async insertDocuments(databaseName, collectionName, documents) {
    return this.executeOperation(async (client) => {
      const db = client.db(databaseName);
      const collection = db.collection(collectionName);
      const result = await collection.insertMany(documents, {
        writeConcern: { w: 0, j: false }, // Fastest write concern
        ordered: false, // Allow parallel processing
        maxTimeMS: 0 // No timeout
      });
      
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
      return await collection.updateOne(filter, update, {
        writeConcern: { w: 0, j: false }, // Fastest write concern
        maxTimeMS: 0 // No timeout
      });
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
      return await collection.deleteOne(filter, {
        writeConcern: { w: 0, j: false }, // Fastest write concern
        maxTimeMS: 0 // No timeout
      });
    });
  }

  async getDocument(databaseName, collectionName, email, password) {
    return this.executeOperation(async (client) => {
      const db = client.db(databaseName);
      const collection = db.collection(collectionName);
      
      // Create query object with email and password
      const query = { email, password };
      
      const document = await collection.findOne(query, {
        readPreference: 'primaryPreferred',
        maxTimeMS: 0 // No timeout
      });
      
      // Convert ObjectId to string if document exists
      if (document && document._id) {
        document._id = document._id.toString();
      }
      
      return document;
    });
  }

  async findDocument(databaseName, collectionName, query) {
    return this.executeOperation(async (client) => {
      const db = client.db(databaseName);
      const collection = db.collection(collectionName);
      
      const document = await collection.findOne(query, {
        readPreference: 'primaryPreferred',
        maxTimeMS: 0 // No timeout
      });
      
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
        await this.client.close();
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

  // Minimal connection cleanup for maximum performance
  startConnectionCleanup() {
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(() => {
      const IDLE_THRESHOLD = 600000; // 10 minutes (longer for maximum performance)
      const hasActiveOperations = this.activeOperations.size > 0;
      const isIdle = (Date.now() - this.lastUsed) > IDLE_THRESHOLD;
      
      if (this.connected && !hasActiveOperations && isIdle) {
        this.close();
      }
    }, 300000); // Check every 5 minutes
  }

  stopConnectionCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Graceful shutdown for concurrent processes
  async gracefulShutdown(maxWaitTime = 30000) {
    // Stop accepting new operations
    this.stopConnectionCleanup();
    
    // Wait for active operations to complete
    if (this.activeOperations.size > 0) {
      const startTime = Date.now();
      while (this.activeOperations.size > 0 && (Date.now() - startTime) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (this.activeOperations.size > 0) {
        console.warn(`Force closing with ${this.activeOperations.size} operations still active`);
      }
    }
    
    await this.close();
  }
}

// Export singleton instance
module.exports = DatabaseConnectivity;
