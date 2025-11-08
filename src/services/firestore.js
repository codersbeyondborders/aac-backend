const { Firestore } = require('@google-cloud/firestore');
require('dotenv').config();

/**
 * Firestore Database Service Class
 * Provides connection management, base CRUD operations, and error handling
 */
class FirestoreService {
  constructor() {
    this.db = null;
    this.isConnected = false;
  }

  /**
   * Initialize Firestore connection
   * @returns {Promise<Firestore>} Firestore instance
   */
  async initialize() {
    try {
      console.log('Initializing Firestore service...');
      
      this.db = new Firestore({
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
      });
      
      // Test connection by attempting to read from a health check collection
      await this.db.collection('_health_check').limit(1).get();
      
      this.isConnected = true;
      console.log('✓ Firestore service initialized successfully');
      
      return this.db;
    } catch (error) {
      console.error('✗ Failed to initialize Firestore service:', error.message);
      this.isConnected = false;
      throw new Error(`Firestore initialization failed: ${error.message}`);
    }
  }

  /**
   * Get Firestore database instance
   * @returns {Firestore} Firestore database instance
   */
  getDatabase() {
    if (!this.db || !this.isConnected) {
      throw new Error('Firestore service not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Check if Firestore service is connected
   * @returns {boolean} Connection status
   */
  isHealthy() {
    return this.isConnected && this.db !== null;
  }

  /**
   * Create a new document in a collection
   * @param {string} collection - Collection name
   * @param {Object} data - Document data
   * @param {string} [docId] - Optional document ID
   * @returns {Promise<Object>} Created document with ID
   */
  async create(collection, data, docId = null) {
    try {
      console.log(`Creating document in collection: ${collection}`);
      
      const db = this.getDatabase();
      const timestamp = new Date();
      
      // Add metadata
      const documentData = {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      let docRef;
      if (docId) {
        docRef = db.collection(collection).doc(docId);
        await docRef.set(documentData);
      } else {
        docRef = await db.collection(collection).add(documentData);
      }

      const result = {
        id: docRef.id,
        ...documentData
      };

      console.log(`✓ Document created successfully in ${collection} with ID: ${docRef.id}`);
      return result;
      
    } catch (error) {
      console.error(`✗ Failed to create document in ${collection}:`, error.message);
      throw new Error(`Create operation failed: ${error.message}`);
    }
  }

  /**
   * Read a document by ID
   * @param {string} collection - Collection name
   * @param {string} docId - Document ID
   * @returns {Promise<Object|null>} Document data or null if not found
   */
  async read(collection, docId) {
    try {
      console.log(`Reading document from collection: ${collection}, ID: ${docId}`);
      
      const db = this.getDatabase();
      const docRef = db.collection(collection).doc(docId);
      const doc = await docRef.get();

      if (!doc.exists) {
        console.log(`Document not found in ${collection} with ID: ${docId}`);
        return null;
      }

      const result = {
        id: doc.id,
        ...doc.data()
      };

      console.log(`✓ Document retrieved successfully from ${collection}`);
      return result;
      
    } catch (error) {
      console.error(`✗ Failed to read document from ${collection}:`, error.message);
      throw new Error(`Read operation failed: ${error.message}`);
    }
  }

  /**
   * Update a document by ID
   * @param {string} collection - Collection name
   * @param {string} docId - Document ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated document
   */
  async update(collection, docId, data) {
    try {
      console.log(`Updating document in collection: ${collection}, ID: ${docId}`);
      
      const db = this.getDatabase();
      const docRef = db.collection(collection).doc(docId);
      
      // Check if document exists
      const doc = await docRef.get();
      if (!doc.exists) {
        throw new Error(`Document not found with ID: ${docId}`);
      }

      // Add update timestamp
      const updateData = {
        ...data,
        updatedAt: new Date()
      };

      await docRef.update(updateData);

      // Return updated document
      const updatedDoc = await docRef.get();
      const result = {
        id: updatedDoc.id,
        ...updatedDoc.data()
      };

      console.log(`✓ Document updated successfully in ${collection}`);
      return result;
      
    } catch (error) {
      console.error(`✗ Failed to update document in ${collection}:`, error.message);
      throw new Error(`Update operation failed: ${error.message}`);
    }
  }

  /**
   * Delete a document by ID
   * @param {string} collection - Collection name
   * @param {string} docId - Document ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(collection, docId) {
    try {
      console.log(`Deleting document from collection: ${collection}, ID: ${docId}`);
      
      const db = this.getDatabase();
      const docRef = db.collection(collection).doc(docId);
      
      // Check if document exists
      const doc = await docRef.get();
      if (!doc.exists) {
        throw new Error(`Document not found with ID: ${docId}`);
      }

      await docRef.delete();
      
      console.log(`✓ Document deleted successfully from ${collection}`);
      return true;
      
    } catch (error) {
      console.error(`✗ Failed to delete document from ${collection}:`, error.message);
      throw new Error(`Delete operation failed: ${error.message}`);
    }
  }

  /**
   * Query documents with filters and pagination
   * @param {string} collection - Collection name
   * @param {Object} options - Query options
   * @param {Array} [options.where] - Where clauses [field, operator, value]
   * @param {string} [options.orderBy] - Field to order by
   * @param {string} [options.orderDirection] - 'asc' or 'desc'
   * @param {number} [options.limit] - Maximum number of documents
   * @param {Object} [options.startAfter] - Document to start after for pagination
   * @returns {Promise<Object>} Query results with documents and pagination info
   */
  async query(collection, options = {}) {
    try {
      console.log(`Querying collection: ${collection} with options:`, options);
      
      const db = this.getDatabase();
      let query = db.collection(collection);

      // Apply where clauses
      if (options.where && Array.isArray(options.where)) {
        for (const whereClause of options.where) {
          if (Array.isArray(whereClause) && whereClause.length === 3) {
            query = query.where(whereClause[0], whereClause[1], whereClause[2]);
          }
        }
      }

      // Apply ordering
      if (options.orderBy) {
        const direction = options.orderDirection === 'desc' ? 'desc' : 'asc';
        query = query.orderBy(options.orderBy, direction);
      }

      // Apply pagination
      if (options.startAfter) {
        query = query.startAfter(options.startAfter);
      }

      // Apply limit
      if (options.limit && typeof options.limit === 'number') {
        query = query.limit(options.limit);
      }

      const snapshot = await query.get();
      
      const documents = [];
      snapshot.forEach(doc => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });

      const result = {
        documents,
        count: documents.length,
        hasMore: snapshot.size === options.limit,
        lastDocument: snapshot.size > 0 ? snapshot.docs[snapshot.size - 1] : null
      };

      console.log(`✓ Query completed successfully. Found ${documents.length} documents`);
      return result;
      
    } catch (error) {
      console.error(`✗ Failed to query collection ${collection}:`, error.message);
      
      // Check if this is a missing index error
      if (error.message.includes('FAILED_PRECONDITION') && error.message.includes('requires an index')) {
        throw new Error(`Database index required: This query needs a Firestore composite index. Please create the required indexes using the setup script or Firebase Console. Run 'node setup-firestore-indexes.js' for instructions.`);
      }
      
      throw new Error(`Query operation failed: ${error.message}`);
    }
  }

  /**
   * Batch operations for multiple documents
   * @param {Array} operations - Array of operation objects
   * @returns {Promise<boolean>} Success status
   */
  async batch(operations) {
    try {
      console.log(`Executing batch operation with ${operations.length} operations`);
      
      const db = this.getDatabase();
      const batch = db.batch();

      for (const operation of operations) {
        const { type, collection, docId, data } = operation;
        const docRef = db.collection(collection).doc(docId);

        switch (type) {
          case 'create':
          case 'set':
            batch.set(docRef, { ...data, createdAt: new Date(), updatedAt: new Date() });
            break;
          case 'update':
            batch.update(docRef, { ...data, updatedAt: new Date() });
            break;
          case 'delete':
            batch.delete(docRef);
            break;
          default:
            throw new Error(`Unsupported batch operation type: ${type}`);
        }
      }

      await batch.commit();
      
      console.log(`✓ Batch operation completed successfully`);
      return true;
      
    } catch (error) {
      console.error(`✗ Batch operation failed:`, error.message);
      throw new Error(`Batch operation failed: ${error.message}`);
    }
  }
}

// Create and export singleton instance
const firestoreService = new FirestoreService();

module.exports = firestoreService;