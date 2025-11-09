const { Storage } = require('@google-cloud/storage');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

class StorageService {
  constructor() {
    this.storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    });
    this.bucketName = process.env.STORAGE_BUCKET_NAME;
    this.bucket = this.storage.bucket(this.bucketName);
    
    console.log(`Storage service initialized with bucket: ${this.bucketName}`);
  }

  /**
   * Upload a file to Cloud Storage
   * @param {Buffer} buffer - File buffer
   * @param {string} originalName - Original filename
   * @param {Object} metadata - File metadata
   * @returns {Promise<Object>} Upload result with public URL
   */
  async uploadFile(buffer, originalName, metadata = {}) {
    try {
      // Validate file buffer
      if (!buffer || !Buffer.isBuffer(buffer)) {
        throw new Error('Invalid file buffer provided');
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (buffer.length > maxSize) {
        throw new Error(`File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB`);
      }

      // Generate unique filename
      const fileExtension = path.extname(originalName);
      const timestamp = Date.now();
      const randomId = crypto.randomBytes(8).toString('hex');
      const filename = `uploads/${timestamp}-${randomId}${fileExtension}`;

      // Create file reference
      const file = this.bucket.file(filename);

      // Prepare upload options
      const uploadOptions = {
        metadata: {
          contentType: metadata.contentType || 'application/octet-stream',
          metadata: {
            originalName: originalName,
            uploadedAt: new Date().toISOString(),
            ...metadata
          }
        },
        resumable: false, // Use simple upload for smaller files
      };

      // Upload file
      await file.save(buffer, uploadOptions);

      // Make file publicly readable
      await file.makePublic();

      // Get public URL
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${filename}`;

      console.log(`File uploaded successfully: ${filename}`);

      return {
        filename,
        publicUrl,
        size: buffer.length,
        contentType: metadata.contentType,
        uploadedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error uploading file to Cloud Storage:', error);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Delete a file from Cloud Storage
   * @param {string} filename - Filename to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(filename) {
    try {
      if (!filename) {
        throw new Error('Filename is required for deletion');
      }

      const file = this.bucket.file(filename);

      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        console.warn(`File not found for deletion: ${filename}`);
        return false;
      }

      // Delete the file
      await file.delete();

      console.log(`File deleted successfully: ${filename}`);
      return true;

    } catch (error) {
      console.error('Error deleting file from Cloud Storage:', error);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * Get file metadata
   * @param {string} filename - Filename to get metadata for
   * @returns {Promise<Object>} File metadata
   */
  async getFileMetadata(filename) {
    try {
      if (!filename) {
        throw new Error('Filename is required');
      }

      const file = this.bucket.file(filename);
      const [metadata] = await file.getMetadata();

      return {
        name: metadata.name,
        size: parseInt(metadata.size),
        contentType: metadata.contentType,
        created: metadata.timeCreated,
        updated: metadata.updated,
        publicUrl: `https://storage.googleapis.com/${this.bucketName}/${filename}`
      };

    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  /**
   * Validate file type against allowed types
   * @param {string} contentType - MIME type to validate
   * @param {string[]} allowedTypes - Array of allowed MIME types
   * @returns {boolean} Validation result
   */
  validateFileType(contentType, allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm']) {
    if (!contentType) {
      return false;
    }
    return allowedTypes.includes(contentType.toLowerCase());
  }

  /**
   * Validate file size
   * @param {number} size - File size in bytes
   * @param {number} maxSize - Maximum allowed size in bytes (default 10MB)
   * @returns {boolean} Validation result
   */
  validateFileSize(size, maxSize = 10 * 1024 * 1024) {
    return size <= maxSize;
  }

  /**
   * Clean up temporary files (for use with multer)
   * @param {string} tempPath - Path to temporary file
   * @returns {Promise<void>}
   */
  async cleanupTempFile(tempPath) {
    try {
      const fs = require('fs').promises;
      await fs.unlink(tempPath);
      console.log(`Temporary file cleaned up: ${tempPath}`);
    } catch (error) {
      console.warn(`Failed to cleanup temporary file: ${tempPath}`, error.message);
    }
  }

  /**
   * Test storage connection
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      // Try to access bucket metadata
      await this.bucket.getMetadata();
      console.log('Cloud Storage connection test successful');
      return true;
    } catch (error) {
      console.error('Cloud Storage connection test failed:', error);
      return false;
    }
  }
}

module.exports = StorageService;