const { MongoClient, ObjectId } = require('mongodb');

// ─── Shared MongoClient singleton ────────────────────────────────────────────
// Every controller creates its own DatabaseConnectivity instance (via
// getInstance()/createIndependentInstance()/new). Previously each instance owned
// a separate MongoClient and connection pool, and per-instance close() calls
// could tear down a pool while another instance was mid-handshake — producing
// transient connection resets and Atlas pool exhaustion under concurrent load.
// All instances now share ONE MongoClient/pool for the process lifetime; it is
// only closed on shutdown via closeShared().
const WWFSG_URI = 'mongodb+srv://wildlifemlxy_db_user:JFAP3r1XRswoSCws@wwfsg.zx3o6wr.mongodb.net/WWFSG?retryWrites=true&w=1&appName=WWFSG&maxPoolSize=100&minPoolSize=5&maxIdleTimeMS=600000&serverSelectionTimeoutMS=30000&socketTimeoutMS=360000&connectTimeoutMS=30000&waitQueueTimeoutMS=30000';
// Same cluster/credentials as WWFSG_URI, just pointed at the StrawHeadedBulbul database.
const STRAWHEADEDBULBUL_URI = 'mongodb+srv://wildlifemlxy_db_user:JFAP3r1XRswoSCws@wwfsg.zx3o6wr.mongodb.net/StrawHeadedBulbul?retryWrites=true&w=1&appName=StrawHeadedBulbul&maxPoolSize=100&minPoolSize=5&maxIdleTimeMS=600000&serverSelectionTimeoutMS=30000&socketTimeoutMS=360000&connectTimeoutMS=30000&waitQueueTimeoutMS=30000';

const CLIENT_URIS = {
  wwfsg: WWFSG_URI,
  strawHeadedBulbul: STRAWHEADEDBULBUL_URI
};
const DB_NAMES = {
  wwfsg: 'WWFSG',
  strawHeadedBulbul: 'StrawHeadedBulbul'
};

const CLIENT_OPTIONS = {
  maxPoolSize: 100,               // Large shared pool to avoid pool-exhaustion timeouts
  minPoolSize: 5,                 // Warm connections ready to serve
  maxIdleTimeMS: 600000,          // 10 minutes idle timeout
  serverSelectionTimeoutMS: 30000, // 30 second server selection timeout
  socketTimeoutMS: 360000,        // 6 minute socket timeout
  connectTimeoutMS: 30000,        // 30 second connection timeout
  retryWrites: true,
  retryReads: true,
  maxConnecting: 10,              // Higher concurrent connection limit
  family: 4,
  directConnection: false,
  compressors: ['zlib'],
  readPreference: 'primaryPreferred',
  readConcern: { level: 'local' },
  writeConcern: { w: 1, j: false },
  heartbeatFrequencyMS: 10000,    // 10 second heartbeats
  waitQueueTimeoutMS: 30000       // 30 second wait timeout before pool-exhaustion error
};

// Per-connection shared state, keyed by client key ('wwfsg' | 'strawHeadedBulbul')
const sharedState = new Map();

function getState(key) {
  if (!sharedState.has(key)) {
    sharedState.set(key, {
      client: null,
      connected: false,
      connectionReady: false,
      connectionPromise: null,
      reconnectAttempts: 0
    });
  }
  return sharedState.get(key);
}

function getSharedClient(key) {
  const state = getState(key);
  if (!state.client) {
    state.client = new MongoClient(CLIENT_URIS[key], CLIENT_OPTIONS);
  }
  return state.client;
}

// ─── Collection → database routing ───────────────────────────────────────────
// Instead of hardcoding which collection names belong to which database, we
// discover it by asking Atlas which database currently holds each collection,
// and cache the result. Unknown/not-yet-created collections default to wwfsg.
const ROUTE_CACHE_TTL_MS = 60000;
let routeCache = new Map();
let routeCacheLoadedAt = 0;
let routeCacheRefreshPromise = null;

async function refreshRouteCache() {
  if (routeCacheRefreshPromise) {
    return routeCacheRefreshPromise;
  }

  routeCacheRefreshPromise = (async () => {
    const client = getSharedClient('wwfsg');
    await client.connect();

    const newCache = new Map();
    for (const key of Object.keys(DB_NAMES)) {
      const colls = await client.db(DB_NAMES[key]).listCollections().toArray();
      for (const c of colls) {
        newCache.set(c.name, key);
      }
    }

    routeCache = newCache;
    routeCacheLoadedAt = Date.now();
  })();

  try {
    await routeCacheRefreshPromise;
  } finally {
    routeCacheRefreshPromise = null;
  }
}

// Resolves a collection name to { key, dbName }, refreshing the cache when stale/missing.
async function resolveCollectionRoute(collectionName) {
  const isStale = Date.now() - routeCacheLoadedAt > ROUTE_CACHE_TTL_MS;
  if (!routeCache.has(collectionName) || isStale) {
    await refreshRouteCache();
  }

  // Unknown collection (not yet created anywhere) defaults to wwfsg/WWFSG.
  const key = routeCache.get(collectionName) || 'wwfsg';
  return { key, dbName: DB_NAMES[key] };
}

class DatabaseConnectivity {
  constructor() {
    this.instanceId = 'default'; // Unique identifier for tracking (metadata only)
    this.silentMode = true; // Silent mode for 24/7 operation
    this.lastUsed = Date.now();
    this.activeOperations = new Set();
  }

  // Singleton pattern - all callers share the same connection pool
  static getInstance() {
    if (!DatabaseConnectivity.instance) {
      DatabaseConnectivity.instance = new DatabaseConnectivity();
    }
    return DatabaseConnectivity.instance;
  }

  // Kept for API compatibility with existing callers. Previously created a fully
  // isolated MongoClient/pool per call; now returns a lightweight instance that
  // shares the single MongoClient/pool like every other instance.
  static createIndependentInstance() {
    const instance = new DatabaseConnectivity();
    instance.instanceId = Date.now().toString(36) + Math.random().toString(36);
    return instance;
  }

  getClient(key = 'wwfsg') {
    return getSharedClient(key);
  }

  // Connect using the shared client for this key; concurrent callers await the same promise
  async initialize(key = 'wwfsg') {
    const state = getState(key);

    if (state.connectionReady) {
      this.lastUsed = Date.now();
      return true;
    }

    if (state.connectionPromise) {
      return state.connectionPromise;
    }

    state.connectionPromise = this.tryConnect(key).finally(() => {
      state.connectionPromise = null;
    });

    return state.connectionPromise;
  }

  // Shared connection attempt for the given client key
  async tryConnect(key = 'wwfsg') {
    const state = getState(key);
    try {
      const client = getSharedClient(key);
      await client.connect();

      // Test the connection
      await client.db('admin').command({ ping: 1 });

      state.connected = true;
      state.connectionReady = true;
      state.reconnectAttempts = 0;
      this.lastUsed = Date.now();

      if (!this.silentMode) {
        console.log(`Database (${key}) connected successfully`);
      }

      // Setup connection event handlers once for this shared client
      this.setupConnectionEventHandlers(key);

      return true;

    } catch (error) {
      if (!this.silentMode) {
        console.error(`Connection attempt failed (${key}):`, error.message);
      }

      // Clean up failed client so the next attempt starts fresh
      if (state.client) {
        try {
          await state.client.close();
        } catch (closeError) {
          // Ignore close errors
        }
        state.client = null;
      }

      state.connected = false;
      state.connectionReady = false;
      state.reconnectAttempts++;

      throw error;
    }
  }

  // Setup connection event handlers on the shared client
  setupConnectionEventHandlers(key = 'wwfsg') {
    const state = getState(key);
    const client = getSharedClient(key);

    // Remove existing listeners to prevent duplicates
    client.removeAllListeners();

    client.on('error', (error) => {
      if (!this.silentMode) {
        console.error(`MongoDB client error (${key}):`, error);
      }
      state.connected = false;
      state.connectionReady = false;
    });

    client.on('close', () => {
      if (!this.silentMode) {
        console.log(`MongoDB connection closed (${key})`);
      }
      state.connected = false;
      state.connectionReady = false;
    });

    client.on('reconnect', () => {
      if (!this.silentMode) {
        console.log(`MongoDB reconnected (${key})`);
      }
      state.connected = true;
      state.connectionReady = true;
      state.reconnectAttempts = 0;
    });
  }

  // Auto-reconnect with exponential backoff, per connection key
  async ensureConnection(key = 'wwfsg') {
    const state = getState(key);
    if (!state.connected || !state.connectionReady) {
      if (state.reconnectAttempts > 0) {
        // Exponential backoff (capped at 30s) so retries don't hit Atlas connection-rate limits
        const backoffMs = Math.min(30000, 1000 * Math.pow(2, state.reconnectAttempts));
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
      try {
        await this.initialize(key);
      } catch (error) {
        if (!this.silentMode) {
          console.error(`Reconnection failed (${key}):`, error.message);
        }
        throw error;
      }
    }

    this.lastUsed = Date.now();
  }

  // Execute database operations against the connection for the given key
  async executeOperation(operation, operationName = 'unknown', key = 'wwfsg') {
    const operationId = Date.now().toString(36) + Math.random().toString(36);
    const state = getState(key);

    try {
      this.activeOperations.add(operationId);
      await this.ensureConnection(key);

      const result = await operation();
      this.lastUsed = Date.now();

      return result;

    } catch (error) {
      if (!this.silentMode) {
        console.error(`Operation '${operationName}' failed:`, error.message);
      }

      // Mark connection as potentially broken so the next call reconnects
      state.connected = false;
      state.connectionReady = false;

      throw error;
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  // Find operations with complete isolation
  async find(collection, query = {}, options = {}) {
    const { key, dbName } = await resolveCollectionRoute(collection);
    return this.executeOperation(async () => {
      const client = this.getClient(key);
      const db = client.db(dbName);
      const coll = db.collection(collection);
      
      const cursor = coll.find(query, options);
      return await cursor.toArray();
    }, `find ${collection}`, key);
  }

  // Insert operations with complete isolation
  async insert(collection, data) {
    const { key, dbName } = await resolveCollectionRoute(collection);
    return this.executeOperation(async () => {
      const client = this.getClient(key);
      const db = client.db(dbName);
      const coll = db.collection(collection);
      
      if (Array.isArray(data)) {
        return await coll.insertMany(data);
      } else {
        return await coll.insertOne(data);
      }
    }, `insert ${collection}`, key);
  }

  // Update operations with complete isolation
  async update(collection, query, updateData, options = {}) {
    const { key, dbName } = await resolveCollectionRoute(collection);
    return this.executeOperation(async () => {
      const client = this.getClient(key);
      const db = client.db(dbName);
      const coll = db.collection(collection);
      
      console.log(`[DB] Updating collection: ${collection}`);
      console.log(`[DB] Query:`, JSON.stringify(query, null, 2));
      console.log(`[DB] UpdateData:`, JSON.stringify(updateData, null, 2));
      
      let result;
      if (options.multi || options.updateMany) {
        console.log(`[DB] Using updateMany...`);
        result = await coll.updateMany(query, updateData, options);
      } else {
        console.log(`[DB] Using updateOne...`);
        result = await coll.updateOne(query, updateData, options);
      }
      
      console.log(`[DB] Update result:`, {
        acknowledged: result.acknowledged,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount,
        upsertedId: result.upsertedId
      });
      
      return result;
    }, `update ${collection}`, key);
  }

  // Delete operations with complete isolation
  async delete(collection, query, options = {}) {
    const { key, dbName } = await resolveCollectionRoute(collection);
    return this.executeOperation(async () => {
      const client = this.getClient(key);
      const db = client.db(dbName);
      const coll = db.collection(collection);
      
      if (options.multi || options.deleteMany) {
        return await coll.deleteMany(query, options);
      } else {
        return await coll.deleteOne(query, options);
      }
    }, `delete ${collection}`, key);
  }

  // Aggregate operations with complete isolation
  async aggregate(collection, pipeline, options = {}) {
    const { key, dbName } = await resolveCollectionRoute(collection);
    return this.executeOperation(async () => {
      const client = this.getClient(key);
      const db = client.db(dbName);
      const coll = db.collection(collection);
      
      const cursor = coll.aggregate(pipeline, options);
      return await cursor.toArray();
    }, `aggregate ${collection}`, key);
  }

  // Count operations with complete isolation
  async count(collection, query = {}) {
    const { key, dbName } = await resolveCollectionRoute(collection);
    return this.executeOperation(async () => {
      const client = this.getClient(key);
      const db = client.db(dbName);
      const coll = db.collection(collection);
      
      return await coll.countDocuments(query);
    }, `count ${collection}`, key);
  }

  // Per-instance disconnect is a NO-OP by design; see closeShared() for real
  // shutdown teardown. All instances share one pool for the process lifetime,
  // so closing it here would break every other concurrent instance/request.
  async disconnect() {
    // no-op by design
  }

  // Get connection status (shared across all instances)
  getStatus() {
    const status = { instanceId: this.instanceId, lastUsed: this.lastUsed, activeOperations: this.activeOperations.size };
    for (const key of Object.keys(CLIENT_URIS)) {
      const state = getState(key);
      status[key] = {
        connected: state.connected,
        connectionReady: state.connectionReady,
        reconnectAttempts: state.reconnectAttempts,
        uri: CLIENT_URIS[key]
      };
    }
    return status;
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

  // Actually close the shared connections/pools. Call this ONLY on application
  // shutdown (e.g. SIGINT/SIGTERM), not after individual requests/instances.
  static async closeShared() {
    for (const state of sharedState.values()) {
      if (state.client && state.connected) {
        try {
          await state.client.close();
        } finally {
          state.client = null;
          state.connected = false;
          state.connectionReady = false;
          state.connectionPromise = null;
        }
      }
    }
  }
}

module.exports = DatabaseConnectivity;
