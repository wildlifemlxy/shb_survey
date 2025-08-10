const { MongoClient, ObjectId } = require('mongodb');

class DatabaseConnectivity {
  constructor() {
    this.uri = 'mongodb+srv://wildlifemlxy:Mlxy6695@strawheadedbulbul.w7an1sp.mongodb.net/?retryWrites=true&w=majority&appName=StrawHeadedBulbul';
    this.client = new MongoClient(this.uri);
    this.connected = false;
  }

    // Connect to the database
    async initialize()
    {
        try 
        {
            if (!this.connected) 
            {
                await this.client.connect();
                this.connected = true;
                return "Connected to MongoDB Atlas!";
            }   
        } catch (error) {
            console.error("Error connecting to MongoDB Atlas:", error);
            throw error;
        }
    }

  async getAllDocuments(databaseName, collectionName) {
    try {
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
      throw error;
    } finally {
      await this.close();
    }
  }

  async insertDocument(databaseName, collectionName, document) {
    try {
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
      throw error;
    } finally {
      await this.close();
    }
  }

  async insertDocuments(databaseName, collectionName, documents) {
    try {
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
      throw error;
    } finally {
      await this.close();
    }
  }

  async updateDocument(databaseName, collectionName, filter, update) {
    try {
      const db = this.client.db(databaseName);
      const collection = db.collection(collectionName);
      // Convert string _id to ObjectId if present
      if (filter._id && typeof filter._id === 'string') {
        filter._id = new ObjectId(filter._id);
      }
      return await collection.updateOne(filter, update);
    } catch (error) {
      console.error("Error updating document:", error);
      throw error;
    } finally {
      await this.close();
    }
  }

  async deleteDocument(databaseName, collectionName, filter) {
    try {
      const db = this.client.db(databaseName);
      const collection = db.collection(collectionName);
      // Convert string _id to ObjectId if present
      if (filter._id && typeof filter._id === 'string') {
        filter._id = new ObjectId(filter._id);
      }
      return await collection.deleteOne(filter);
    } catch (error) {
      console.error("Error deleting document:", error);
      throw error;
    } finally {
      await this.close();
    }
  }

  async getDocument(databaseName, collectionName, email, password) {
    try {
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
      throw error;
    } finally {
      await this.close();
    }
  }

  async findDocument(databaseName, collectionName, query) {
    try {
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
      throw error;
    } finally {
      await this.close();
    }
  }

  async close() {
    if (this.connected) {
      await this.client.close();
      this.connected = false;
    }
  }
}

module.exports = DatabaseConnectivity;
