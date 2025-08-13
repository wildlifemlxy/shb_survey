const { MongoClient, ObjectId } = require('mongodb');

class DatabaseConnectivity {
  constructor() {
    // HARDCODED MongoDB URI for 24/7 reliability - NO process.env dependencies
    this.uri = 'mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/StrawHeadedBulbul?retryWrites=true&w=1&appName=StrawHeadedBulbul&maxPoolSize=50&minPoolSize=5&maxIdleTimeMS=300000&serverSelectionTimeoutMS=5000&socketTimeoutMS=300000&connectTimeoutMS=10000';
    
    // Multiple fallback URIs for maximum 24/7 reliability
    this.fallbackUris = [
      'mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/StrawHeadedBulbul?retryWrites=true&w=0&maxPoolSize=40&serverSelectionTimeoutMS=5000&socketTimeoutMS=300000',
      'mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/StrawHeadedBulbul?retryWrites=true&maxPoolSize=30&serverSelectionTimeoutMS=5000',
      'mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/StrawHeadedBulbul?retryWrites=true&maxPoolSize=20'
    ];
    
    this.client = null;
    this.connected = false;
    this.connectionPromise = null;
    this.lastUsed = Date.now();
    this.activeOperations = new Set();
    this.connectionReady = false;
    this.currentUriIndex = 0;
    this.silentMode = true; // Silent mode for 24/7 operation
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.instanceId = 'default'; // Unique identifier for tracking
    this.connectionLock = false; // Prevent race conditions in parallel requests
  }

  // Global connection isolation - NO shared resources
  static connectionRegistry = new Map(); // Track all active connections

  // DISABLED: Connection pool causing login blocking - use individual connections only
  static async getPooledConnection() {
    // Always return null to force individual connections for each request
    // This prevents connection sharing issues that block subsequent logins
    return null;
  }

  // Enhanced singleton pattern for parallel connection isolation
  static getInstance() {
    if (!DatabaseConnectivity.instance) {
      DatabaseConnectivity.instance = new DatabaseConnectivity();
      // NO health checks - just connection cleanup for 24/7 operation
      DatabaseConnectivity.instance.startConnectionCleanup();
    }
    return DatabaseConnectivity.instance;
  }

  // COMPLETELY ISOLATED - Create independent connection for unlimited parallel users
  static createIndependentInstance() {
    const instance = new DatabaseConnectivity();
    // Use unique connection tracking for complete isolation
    instance.instanceId = Date.now().toString(36) + Math.random().toString(36) + Math.random().toString(36);
    instance.silentMode = true; // Keep silent for clean logs
    
    // Create COMPLETELY unique URI with instance-specific app name for zero interference
    const uniqueAppName = `SHB_${instance.instanceId}`;
    instance.uri = `mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/StrawHeadedBulbul?retryWrites=true&w=1&appName=${uniqueAppName}&maxPoolSize=10&minPoolSize=2&maxIdleTimeMS=300000&serverSelectionTimeoutMS=5000&socketTimeoutMS=300000&connectTimeoutMS=10000`;
    
    // Update fallback URIs with completely unique app names for zero interference
    instance.fallbackUris = [
      `mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/StrawHeadedBulbul?retryWrites=true&w=0&appName=${uniqueAppName}_A&maxPoolSize=8&serverSelectionTimeoutMS=5000&socketTimeoutMS=300000`,
      `mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/StrawHeadedBulbul?retryWrites=true&appName=${uniqueAppName}_B&maxPoolSize=6&serverSelectionTimeoutMS=5000`,
      `mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/StrawHeadedBulbul?retryWrites=true&appName=${uniqueAppName}_C&maxPoolSize=4`
    ];
    
    // Register this instance for tracking (no interference, just monitoring)
    DatabaseConnectivity.connectionRegistry.set(instance.instanceId, {
      created: Date.now(),
      instance: instance
    });
    
    return instance;
  }

  // COMPLETELY ISOLATED client configuration - zero interference between connections
  getClient() {
    if (!this.client) {
      this.client = new MongoClient(this.uri, {
        maxPoolSize: 10,              // Moderate pool per instance for isolation
        minPoolSize: 2,               // Minimal warm connections
        maxIdleTimeMS: 300000,        // 5 minutes idle timeout
        serverSelectionTimeoutMS: 5000,  // 5 second server selection timeout
        socketTimeoutMS: 300000,      // 5 minute socket timeout
        connectTimeoutMS: 10000,      // 10 second connection timeout
        retryWrites: true,
        retryReads: true,
        maxConnecting: 3,             // Limited concurrent connections per instance for isolation
        family: 4,
        directConnection: false,
        compressors: ['zlib'],
        readPreference: 'primaryPreferred',
        readConcern: { level: 'local' },
        writeConcern: { w: 1, j: false },
        heartbeatFrequencyMS: 10000,  // 10 second heartbeats
        waitQueueTimeoutMS: 5000      // 5 second wait timeout
      });
    }
    return this.client;
  }

  // Connect with complete error isolation - errors in one connection don't affect others
  async initialize() {
    if (this.connectionLock) {
      // Wait for existing connection attempt to complete
      while (this.connectionLock) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.connected;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionLock = true;
    
    this.connectionPromise = this.tryConnect().finally(() => {
      this.connectionLock = false;
    });

    return this.connectionPromise;
  }

  // Isolated connection attempt with fallback support
  async tryConnect() {
    let currentUri = this.uri;
    let uriIndex = this.currentUriIndex;
    
    for (let attempt = 0; attempt <= this.fallbackUris.length; attempt++) {
      try {
        if (attempt > 0) {
          // Use fallback URI
          uriIndex = (this.currentUriIndex + attempt - 1) % this.fallbackUris.length;
          currentUri = this.fallbackUris[uriIndex];
          if (!this.silentMode) {
            console.log(`[${this.instanceId}] Trying fallback URI ${attempt}...`);
          }
        }

        // Update URI for this attempt
        this.uri = currentUri;
        
        const client = this.getClient();
        await client.connect();
        
        // Test the connection
        await client.db('admin').command({ ping: 1 });
        
        this.connected = true;
        this.connectionReady = true;
        this.reconnectAttempts = 0;
        this.currentUriIndex = uriIndex; // Remember successful URI
        this.lastUsed = Date.now();
        
        if (!this.silentMode) {
          console.log(`[${this.instanceId}] Database connected successfully`);
        }
        
        // Setup connection event handlers for this instance only
        this.setupConnectionEventHandlers();
        
        return true;
        
      } catch (error) {
        if (!this.silentMode) {
          console.error(`[${this.instanceId}] Connection attempt ${attempt + 1} failed:`, error.message);
        }
        
        // Clean up failed client
        if (this.client) {
          try {
            await this.client.close();
          } catch (closeError) {
            // Ignore close errors
          }
          this.client = null;
        }
        
        // Wait before next attempt
        if (attempt < this.fallbackUris.length) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }
    
    // All attempts failed
    this.connected = false;
    this.connectionReady = false;
    this.reconnectAttempts++;
    
    throw new Error(`Failed to connect after trying all URIs. Instance: ${this.instanceId}`);
  }

  // Setup connection event handlers for error isolation
  setupConnectionEventHandlers() {
    const client = this.getClient();
    
    // Remove existing listeners to prevent duplicates
    client.removeAllListeners();
    
    client.on('error', (error) => {
      if (!this.silentMode) {
        console.error(`[${this.instanceId}] MongoDB client error:`, error);
      }
      this.connected = false;
      this.connectionReady = false;
    });
    
    client.on('close', () => {
      if (!this.silentMode) {
        console.log(`[${this.instanceId}] MongoDB connection closed`);
      }
      this.connected = false;
      this.connectionReady = false;
    });
    
    client.on('reconnect', () => {
      if (!this.silentMode) {
        console.log(`[${this.instanceId}] MongoDB reconnected`);
      }
      this.connected = true;
      this.connectionReady = true;
      this.reconnectAttempts = 0;
    });
  }

  // Auto-reconnect with complete error isolation
  async ensureConnection() {
    if (!this.connected || !this.connectionReady) {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        try {
          await this.initialize();
        } catch (error) {
          if (!this.silentMode) {
            console.error(`[${this.instanceId}] Reconnection failed:`, error.message);
          }
          throw error;
        }
      } else {
        throw new Error(`Max reconnection attempts reached for instance ${this.instanceId}`);
      }
    }
    
    this.lastUsed = Date.now();
  }

  // Execute database operations with complete error isolation
  async executeOperation(operation, operationName = 'unknown') {
    const operationId = Date.now().toString(36) + Math.random().toString(36);
    
    try {
      this.activeOperations.add(operationId);
      await this.ensureConnection();
      
      const result = await operation();
      this.lastUsed = Date.now();
      
      return result;
      
    } catch (error) {
      if (!this.silentMode) {
        console.error(`[${this.instanceId}] Operation '${operationName}' failed:`, error.message);
      }
      
      // Mark connection as potentially broken
      this.connected = false;
      this.connectionReady = false;
      
      throw error;
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  // Find operations with complete isolation
  async find(collection, query = {}, options = {}) {
    return this.executeOperation(async () => {
      const client = this.getClient();
      const db = client.db('Straw-Headed-Bulbul');
      const coll = db.collection(collection);
      
      const cursor = coll.find(query, options);
      return await cursor.toArray();
    }, `find ${collection}`);
  }

  // Insert operations with complete isolation
  async insert(collection, data) {
    return this.executeOperation(async () => {
      const client = this.getClient();
      const db = client.db('Straw-Headed-Bulbul');
      const coll = db.collection(collection);
      
      if (Array.isArray(data)) {
        return await coll.insertMany(data);
      } else {
        return await coll.insertOne(data);
      }
    }, `insert ${collection}`);
  }

  // Update operations with complete isolation
  async update(collection, query, updateData, options = {}) {
    return this.executeOperation(async () => {
      const client = this.getClient();
      const db = client.db('Straw-Headed-Bulbul');
      const coll = db.collection(collection);
      
      if (options.multi || options.updateMany) {
        return await coll.updateMany(query, updateData, options);
      } else {
        return await coll.updateOne(query, updateData, options);
      }
    }, `update ${collection}`);
  }

  // Delete operations with complete isolation
  async delete(collection, query, options = {}) {
    return this.executeOperation(async () => {
      const client = this.getClient();
      const db = client.db('Straw-Headed-Bulbul');
      const coll = db.collection(collection);
      
      if (options.multi || options.deleteMany) {
        return await coll.deleteMany(query, options);
      } else {
        return await coll.deleteOne(query, options);
      }
    }, `delete ${collection}`);
  }

  // Aggregate operations with complete isolation
  async aggregate(collection, pipeline, options = {}) {
    return this.executeOperation(async () => {
      const client = this.getClient();
      const db = client.db('Straw-Headed-Bulbul');
      const coll = db.collection(collection);
      
      const cursor = coll.aggregate(pipeline, options);
      return await cursor.toArray();
    }, `aggregate ${collection}`);
  }

  // Count operations with complete isolation
  async count(collection, query = {}) {
    return this.executeOperation(async () => {
      const client = this.getClient();
      const db = client.db('Straw-Headed-Bulbul');
      const coll = db.collection(collection);
      
      return await coll.countDocuments(query);
    }, `count ${collection}`);
  }

  // Connection cleanup for this instance only
  startConnectionCleanup() {
    // Clean up inactive connections every 10 minutes
    setInterval(() => {
      const now = Date.now();
      const maxIdleTime = 600000; // 10 minutes
      
      if (this.connected && (now - this.lastUsed) > maxIdleTime && this.activeOperations.size === 0) {
        if (!this.silentMode) {
          console.log(`[${this.instanceId}] Cleaning up idle connection`);
        }
        this.disconnect();
      }
    }, 600000); // Check every 10 minutes
  }

  // Safe disconnect for this instance
  async disconnect() {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
      }
      
      this.connected = false;
      this.connectionReady = false;
      this.connectionPromise = null;
      
      // Remove from registry
      DatabaseConnectivity.connectionRegistry.delete(this.instanceId);
      
      if (!this.silentMode) {
        console.log(`[${this.instanceId}] Disconnected successfully`);
      }
    } catch (error) {
      if (!this.silentMode) {
        console.error(`[${this.instanceId}] Error during disconnect:`, error.message);
      }
    }
  }

  // Get connection status for this instance only
  getStatus() {
    return {
      instanceId: this.instanceId,
      connected: this.connected,
      connectionReady: this.connectionReady,
      lastUsed: this.lastUsed,
      activeOperations: this.activeOperations.size,
      reconnectAttempts: this.reconnectAttempts,
      currentUri: this.uri
    };
  }

  // Legacy methods for backwards compatibility - now using isolated operations
  async getAllDocuments(databaseName, collectionName) {
    const documents = await this.find(collectionName, {});
    
    // Convert ObjectId to string for all documents for backwards compatibility
    return documents.map(doc => ({
      ...doc,
      _id: doc._id.toString()
    }));
  }

  async insertDocument(databaseName, collectionName, document) {
    const result = await this.insert(collectionName, document);
    
    // Return the inserted document with string ID for backwards compatibility
    if (result.insertedId) {
      return {
        ...result,
        insertedId: result.insertedId.toString()
      };
    }
    return result;
  }

  async insertDocuments(databaseName, collectionName, documents) {
    const result = await this.insert(collectionName, documents);
    
    // Convert inserted IDs to strings for backwards compatibility
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

  async updateDocument(databaseName, collectionName, filter, updateData) {
    // Convert string _id to ObjectId if present
    if (filter._id && typeof filter._id === 'string') {
      filter._id = new ObjectId(filter._id);
    }
    return await this.update(collectionName, filter, updateData);
  }

  async deleteDocument(databaseName, collectionName, filter) {
    // Convert string _id to ObjectId if present
    if (filter._id && typeof filter._id === 'string') {
      filter._id = new ObjectId(filter._id);
    }
    return await this.delete(collectionName, filter);
  }

  async getDocument(databaseName, collectionName, email, password) {
    try {
      console.log("Retrieving document with email:", email, "and password:", password, "from collection:", collectionName);
      
      // Create query object with email and password
      const query = { email, password };
      
      const documents = await this.find(collectionName, query);
      const document = documents.length > 0 ? documents[0] : null;
      
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
      
      const documents = await this.find(collectionName, query);
      const document = documents.length > 0 ? documents[0] : null;
      
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
    await this.disconnect();
  }

  // Static method to get all connection statuses (for monitoring only)
  static getAllConnectionStatuses() {
    const statuses = [];
    for (const [instanceId, data] of DatabaseConnectivity.connectionRegistry.entries()) {
      try {
        statuses.push(data.instance.getStatus());
      } catch (error) {
        statuses.push({
          instanceId: instanceId,
          error: error.message,
          created: data.created
        });
      }
    }
    return statuses;
  }

  // Static method to cleanup all stale connections
  static async cleanupStaleConnections() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    
    for (const [instanceId, data] of DatabaseConnectivity.connectionRegistry.entries()) {
      if ((now - data.created) > maxAge) {
        try {
          await data.instance.disconnect();
        } catch (error) {
          console.error(`Error cleaning up stale connection ${instanceId}:`, error.message);
        }
      }
    }
  }
}

module.exports = DatabaseConnectivity;
