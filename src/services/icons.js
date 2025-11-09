const StorageService = require('./storage');
const firestoreService = require('./firestore');
const crypto = require('crypto');

/**
 * Icon Management Service
 * Handles icon storage, metadata management, and retrieval
 */
class IconService {
  constructor() {
    this.storageService = new StorageService();
    this.collectionName = 'user_icons';
  }

  /**
   * Store generated icon and save metadata
   * @param {string} userId - User ID
   * @param {string} base64ImageData - Base64 encoded image data
   * @param {string} mimeType - Image MIME type
   * @param {Object} metadata - Icon generation metadata
   * @returns {Promise<Object>} Stored icon information
   */
  async storeIcon(userId, base64ImageData, mimeType, metadata = {}) {
    try {
      console.log(`Storing icon for user: ${userId}`);
      
      if (!userId || !base64ImageData) {
        throw new Error('User ID and image data are required');
      }

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(base64ImageData, 'base64');
      
      // Generate unique filename for the icon
      const timestamp = Date.now();
      const randomId = crypto.randomBytes(8).toString('hex');
      const fileExtension = this.getFileExtension(mimeType);
      const filename = `icons/${userId}/${timestamp}-${randomId}${fileExtension}`;
      
      // Upload to Cloud Storage
      const uploadResult = await this.storageService.uploadFile(
        imageBuffer, 
        filename, 
        { 
          contentType: mimeType,
          userId: userId,
          iconType: metadata.iconType || 'generated',
          generatedAt: new Date().toISOString()
        }
      );
      
      // Handle audio storage if provided
      let audioInfo = null;
      if (metadata.audio && metadata.audio.audioData) {
        try {
          audioInfo = await this.storeAudio(userId, metadata.audio.audioData, metadata.audio.mimeType || 'audio/mpeg', {
            label: metadata.label,
            language: metadata.audio.language,
            dialect: metadata.audio.dialect,
            iconId: randomId
          });
          console.log(`✓ Audio stored successfully for icon`);
        } catch (audioError) {
          console.warn(`Failed to store audio for icon:`, audioError.message);
          // Continue without audio if storage fails
        }
      }
      
      // Prepare icon metadata for Firestore
      const iconMetadata = {
        userId: userId,
        filename: uploadResult.filename,
        publicUrl: uploadResult.publicUrl,
        mimeType: mimeType,
        size: uploadResult.size,
        createdAt: new Date().toISOString(),
        iconType: metadata.iconType || 'generated',
        generationMethod: metadata.generationMethod || 'unknown',
        prompt: metadata.prompt || null,
        originalText: metadata.originalText || null,
        originalImageInfo: metadata.originalImageInfo || null,
        analysisData: metadata.analysisData || null,
        culturalContext: metadata.culturalContext || null,
        tags: metadata.tags || [],
        label: metadata.label || null,
        category: metadata.category || null,
        accent: metadata.accent || null,
        color: metadata.color || null,
        audio: audioInfo,
        isActive: true
      };
      
      // Save metadata to Firestore
      const iconDoc = await firestoreService.create(
        this.collectionName,
        iconMetadata
      );
      
      console.log(`✓ Icon stored successfully: ${iconDoc.id}`);
      
      return {
        id: iconDoc.id,
        publicUrl: uploadResult.publicUrl,
        filename: uploadResult.filename,
        mimeType: mimeType,
        size: uploadResult.size,
        createdAt: iconMetadata.createdAt,
        audio: audioInfo,
        metadata: iconMetadata
      };
      
    } catch (error) {
      console.error(`Failed to store icon for user ${userId}:`, error.message);
      throw new Error(`Icon storage failed: ${error.message}`);
    }
  }

  /**
   * Store audio file for icon label
   * @param {string} userId - User ID
   * @param {string} base64AudioData - Base64 encoded audio data
   * @param {string} mimeType - Audio MIME type
   * @param {Object} metadata - Audio metadata
   * @returns {Promise<Object>} Stored audio information
   */
  async storeAudio(userId, base64AudioData, mimeType, metadata = {}) {
    try {
      console.log(`Storing audio for user: ${userId}`);
      
      if (!userId || !base64AudioData) {
        throw new Error('User ID and audio data are required');
      }

      // Convert base64 to buffer
      const audioBuffer = Buffer.from(base64AudioData, 'base64');
      
      // Generate unique filename for the audio
      const timestamp = Date.now();
      const randomId = crypto.randomBytes(8).toString('hex');
      const fileExtension = this.getAudioFileExtension(mimeType);
      const filename = `audio/${userId}/${timestamp}-${randomId}${fileExtension}`;
      
      // Upload to Cloud Storage
      const uploadResult = await this.storageService.uploadFile(
        audioBuffer, 
        filename, 
        { 
          contentType: mimeType,
          userId: userId,
          audioType: 'label-audio',
          label: metadata.label,
          language: metadata.language,
          dialect: metadata.dialect,
          iconId: metadata.iconId,
          generatedAt: new Date().toISOString()
        }
      );
      
      console.log(`✓ Audio stored successfully: ${uploadResult.filename}`);
      
      return {
        filename: uploadResult.filename,
        publicUrl: uploadResult.publicUrl,
        mimeType: mimeType,
        size: uploadResult.size,
        language: metadata.language,
        dialect: metadata.dialect,
        uploadedAt: uploadResult.uploadedAt
      };
      
    } catch (error) {
      console.error(`Failed to store audio for user ${userId}:`, error.message);
      throw new Error(`Audio storage failed: ${error.message}`);
    }
  }

  /**
   * Get audio file extension from MIME type
   * @param {string} mimeType - MIME type
   * @returns {string} File extension
   */
  getAudioFileExtension(mimeType) {
    const mimeToExt = {
      'audio/mpeg': '.mp3',
      'audio/mp3': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
      'audio/webm': '.webm'
    };
    
    return mimeToExt[mimeType] || '.mp3';
  }

  /**
   * Retrieve user's icons with pagination
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} User's icons with pagination info
   */
  async getUserIcons(userId, options = {}) {
    try {
      console.log(`Retrieving icons for user: ${userId}`);
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      const {
        limit = 20,
        offset = 0,
        iconType = null,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // Build query filters
      const filters = [
        { field: 'userId', operator: '==', value: userId },
        { field: 'isActive', operator: '==', value: true }
      ];

      if (iconType) {
        filters.push({ field: 'iconType', operator: '==', value: iconType });
      }

      // Query icons from Firestore
      const queryResult = await firestoreService.query(
        this.collectionName,
        filters,
        { 
          orderBy: { field: sortBy, direction: sortOrder },
          limit: limit,
          offset: offset
        }
      );

      const icons = queryResult.documents.map(doc => ({
        id: doc.id,
        publicUrl: doc.publicUrl,
        filename: doc.filename,
        mimeType: doc.mimeType,
        size: doc.size,
        createdAt: doc.createdAt,
        iconType: doc.iconType,
        generationMethod: doc.generationMethod,
        prompt: doc.prompt,
        originalText: doc.originalText,
        tags: doc.tags || [],
        label: doc.label || null,
        audio: doc.audio || null
      }));

      console.log(`✓ Retrieved ${icons.length} icons for user: ${userId}`);

      return {
        icons: icons,
        pagination: {
          total: queryResult.total || icons.length,
          limit: limit,
          offset: offset,
          hasMore: icons.length === limit
        }
      };
      
    } catch (error) {
      console.error(`Failed to retrieve icons for user ${userId}:`, error.message);
      throw new Error(`Icon retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get specific icon by ID
   * @param {string} iconId - Icon document ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<Object>} Icon details
   */
  async getIcon(iconId, userId) {
    try {
      console.log(`Retrieving icon: ${iconId} for user: ${userId}`);
      
      if (!iconId || !userId) {
        throw new Error('Icon ID and User ID are required');
      }

      const iconDoc = await firestoreService.read(this.collectionName, iconId);
      
      if (!iconDoc) {
        throw new Error('Icon not found');
      }

      // Verify user ownership
      if (iconDoc.userId !== userId) {
        throw new Error('Access denied - icon belongs to different user');
      }

      if (!iconDoc.isActive) {
        throw new Error('Icon is no longer available');
      }

      console.log(`✓ Retrieved icon: ${iconId}`);

      return {
        id: iconId,
        publicUrl: iconDoc.publicUrl,
        filename: iconDoc.filename,
        mimeType: iconDoc.mimeType,
        size: iconDoc.size,
        createdAt: iconDoc.createdAt,
        iconType: iconDoc.iconType,
        generationMethod: iconDoc.generationMethod,
        prompt: iconDoc.prompt,
        originalText: iconDoc.originalText,
        originalImageInfo: iconDoc.originalImageInfo,
        analysisData: iconDoc.analysisData,
        culturalContext: iconDoc.culturalContext,
        tags: iconDoc.tags || [],
        label: iconDoc.label || null,
        category: iconDoc.category || null,
        accent: iconDoc.accent || null,
        color: iconDoc.color || null,
        audio: iconDoc.audio || null
      };
      
    } catch (error) {
      console.error(`Failed to retrieve icon ${iconId}:`, error.message);
      throw new Error(`Icon retrieval failed: ${error.message}`);
    }
  }

  /**
   * Delete icon and its storage file
   * @param {string} iconId - Icon document ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<boolean>} Success status
   */
  async deleteIcon(iconId, userId) {
    try {
      console.log(`Deleting icon: ${iconId} for user: ${userId}`);
      
      if (!iconId || !userId) {
        throw new Error('Icon ID and User ID are required');
      }

      // Get icon details first
      const iconDoc = await firestoreService.read(this.collectionName, iconId);
      
      if (!iconDoc) {
        throw new Error('Icon not found');
      }

      // Verify user ownership
      if (iconDoc.userId !== userId) {
        throw new Error('Access denied - icon belongs to different user');
      }

      // Delete from Cloud Storage
      try {
        await this.storageService.deleteFile(iconDoc.filename);
        console.log(`✓ Deleted icon file from storage: ${iconDoc.filename}`);
      } catch (storageError) {
        console.warn(`Failed to delete storage file: ${iconDoc.filename}`, storageError.message);
        // Continue with metadata deletion even if storage deletion fails
      }

      // Mark as inactive in Firestore (soft delete)
      await firestoreService.update(this.collectionName, iconId, {
        isActive: false,
        deletedAt: new Date().toISOString()
      });

      console.log(`✓ Icon deleted successfully: ${iconId}`);
      return true;
      
    } catch (error) {
      console.error(`Failed to delete icon ${iconId}:`, error.message);
      throw new Error(`Icon deletion failed: ${error.message}`);
    }
  }

  /**
   * Search user's icons by text or tags
   * @param {string} userId - User ID
   * @param {string} searchQuery - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchUserIcons(userId, searchQuery, options = {}) {
    try {
      console.log(`Searching icons for user: ${userId}, query: "${searchQuery}"`);
      
      if (!userId || !searchQuery) {
        throw new Error('User ID and search query are required');
      }

      const { limit = 20, offset = 0 } = options;

      // Build search filters
      const filters = [
        { field: 'userId', operator: '==', value: userId },
        { field: 'isActive', operator: '==', value: true }
      ];

      // Query all user icons first (Firestore doesn't support full-text search)
      const queryResult = await firestoreService.query(
        this.collectionName,
        filters,
        { 
          orderBy: { field: 'createdAt', direction: 'desc' }
        }
      );

      // Filter results based on search query
      const searchLower = searchQuery.toLowerCase();
      const matchingIcons = queryResult.documents.filter(doc => {
        const textMatches = (doc.originalText && doc.originalText.toLowerCase().includes(searchLower)) ||
                           (doc.prompt && doc.prompt.toLowerCase().includes(searchLower));
        
        const tagMatches = doc.tags && doc.tags.some(tag => 
          tag.toLowerCase().includes(searchLower)
        );

        return textMatches || tagMatches;
      });

      // Apply pagination
      const paginatedResults = matchingIcons.slice(offset, offset + limit);

      const icons = paginatedResults.map(doc => ({
        id: doc.id,
        publicUrl: doc.publicUrl,
        filename: doc.filename,
        mimeType: doc.mimeType,
        size: doc.size,
        createdAt: doc.createdAt,
        iconType: doc.iconType,
        generationMethod: doc.generationMethod,
        prompt: doc.prompt,
        originalText: doc.originalText,
        tags: doc.tags || [],
        label: doc.label || null,
        audio: doc.audio || null
      }));

      console.log(`✓ Found ${icons.length} matching icons for query: "${searchQuery}"`);

      return {
        icons: icons,
        searchQuery: searchQuery,
        pagination: {
          total: matchingIcons.length,
          limit: limit,
          offset: offset,
          hasMore: (offset + limit) < matchingIcons.length
        }
      };
      
    } catch (error) {
      console.error(`Failed to search icons for user ${userId}:`, error.message);
      throw new Error(`Icon search failed: ${error.message}`);
    }
  }

  /**
   * Get file extension from MIME type
   * @param {string} mimeType - MIME type
   * @returns {string} File extension
   */
  getFileExtension(mimeType) {
    const mimeToExt = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/gif': '.gif',
      'image/webp': '.webp'
    };
    
    return mimeToExt[mimeType] || '.png';
  }

  /**
   * Get user icon statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Icon statistics
   */
  async getUserIconStats(userId) {
    try {
      console.log(`Getting icon statistics for user: ${userId}`);
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      const filters = [
        { field: 'userId', operator: '==', value: userId },
        { field: 'isActive', operator: '==', value: true }
      ];

      const queryResult = await firestoreService.query(this.collectionName, filters);
      const icons = queryResult.documents;

      const stats = {
        totalIcons: icons.length,
        iconsByType: {},
        iconsByMethod: {},
        totalStorageUsed: 0,
        oldestIcon: null,
        newestIcon: null
      };

      icons.forEach(icon => {
        // Count by type
        const type = icon.iconType || 'unknown';
        stats.iconsByType[type] = (stats.iconsByType[type] || 0) + 1;

        // Count by generation method
        const method = icon.generationMethod || 'unknown';
        stats.iconsByMethod[method] = (stats.iconsByMethod[method] || 0) + 1;

        // Sum storage usage
        stats.totalStorageUsed += icon.size || 0;

        // Track oldest and newest
        const createdAt = new Date(icon.createdAt);
        if (!stats.oldestIcon || createdAt < new Date(stats.oldestIcon)) {
          stats.oldestIcon = icon.createdAt;
        }
        if (!stats.newestIcon || createdAt > new Date(stats.newestIcon)) {
          stats.newestIcon = icon.createdAt;
        }
      });

      console.log(`✓ Retrieved statistics for user: ${userId}`);
      return stats;
      
    } catch (error) {
      console.error(`Failed to get icon statistics for user ${userId}:`, error.message);
      throw new Error(`Icon statistics retrieval failed: ${error.message}`);
    }
  }
}

// Create and export singleton instance
const iconService = new IconService();

module.exports = iconService;