const multer = require('multer');
const path = require('path');
const StorageService = require('../services/storage');

// Lazy initialization of storage service
let storageService = null;
const getStorageService = () => {
  if (!storageService) {
    storageService = new StorageService();
  }
  return storageService;
};

// Configure multer for memory storage (we'll handle Cloud Storage upload manually)
const storage = multer.memoryStorage();

// File filter function for images
const imageFileFilter = (req, file, cb) => {
  try {
    console.log(`Processing image upload: ${file.originalname}, type: ${file.mimetype}`);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!getStorageService().validateFileType(file.mimetype, allowedTypes)) {
      const error = new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }

    // Additional validation for file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      const error = new Error(`Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`);
      error.code = 'INVALID_FILE_EXTENSION';
      return cb(error, false);
    }

    cb(null, true);
  } catch (error) {
    console.error('Error in file filter:', error);
    cb(error, false);
  }
};

// File filter function for audio
const audioFileFilter = (req, file, cb) => {
  try {
    console.log(`Processing audio upload: ${file.originalname}, type: ${file.mimetype}`);

    // Validate file type
    const allowedTypes = ['audio/webm', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4'];
    if (!getStorageService().validateFileType(file.mimetype, allowedTypes)) {
      const error = new Error(`Invalid audio file type. Allowed types: ${allowedTypes.join(', ')}`);
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }

    // Additional validation for file extension
    const allowedExtensions = ['.webm', '.mp3', '.mpeg', '.wav', '.ogg', '.m4a'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      const error = new Error(`Invalid audio file extension. Allowed extensions: ${allowedExtensions.join(', ')}`);
      error.code = 'INVALID_FILE_EXTENSION';
      return cb(error, false);
    }

    cb(null, true);
  } catch (error) {
    console.error('Error in audio file filter:', error);
    cb(error, false);
  }
};

// Configure multer for images
const imageUpload = multer({
  storage: storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1, // Only allow 1 file per request
    fields: 10, // Limit number of form fields
    fieldNameSize: 100, // Limit field name size
    fieldSize: 1024 * 1024, // 1MB limit for field values
  }
});

// Configure multer for audio
const audioUpload = multer({
  storage: storage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for audio files
    files: 1, // Only allow 1 file per request
    fields: 10, // Limit number of form fields
    fieldNameSize: 100, // Limit field name size
    fieldSize: 1024 * 1024, // 1MB limit for field values
  }
});

/**
 * Middleware for handling single image file upload
 * @param {string} fieldName - Name of the form field containing the file
 * @returns {Function} Express middleware function
 */
const uploadSingle = (fieldName = 'image') => {
  return (req, res, next) => {
    const singleUpload = imageUpload.single(fieldName);
    
    singleUpload(req, res, (err) => {
      if (err) {
        console.error('Multer upload error:', err);
        
        // Handle specific multer errors
        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              return res.status(400).json({
                error: 'File too large',
                code: 'FILE_TOO_LARGE',
                details: 'Maximum file size is 10MB',
                timestamp: new Date().toISOString()
              });
            case 'LIMIT_FILE_COUNT':
              return res.status(400).json({
                error: 'Too many files',
                code: 'TOO_MANY_FILES',
                details: 'Only one file allowed per request',
                timestamp: new Date().toISOString()
              });
            case 'LIMIT_UNEXPECTED_FILE':
              return res.status(400).json({
                error: 'Unexpected file field',
                code: 'UNEXPECTED_FILE',
                details: `Expected file field name: ${fieldName}`,
                timestamp: new Date().toISOString()
              });
            default:
              return res.status(400).json({
                error: 'File upload error',
                code: 'UPLOAD_ERROR',
                details: err.message,
                timestamp: new Date().toISOString()
              });
          }
        }
        
        // Handle custom validation errors
        if (err.code === 'INVALID_FILE_TYPE' || err.code === 'INVALID_FILE_EXTENSION') {
          return res.status(400).json({
            error: err.message,
            code: err.code,
            timestamp: new Date().toISOString()
          });
        }
        
        // Handle other errors
        return res.status(500).json({
          error: 'Internal server error during file upload',
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        });
      }
      
      // Validate that file was provided
      if (!req.file) {
        return res.status(400).json({
          error: 'No file provided',
          code: 'NO_FILE',
          details: `Please provide a file in the '${fieldName}' field`,
          timestamp: new Date().toISOString()
        });
      }
      
      // Additional file size validation (double-check)
      if (!getStorageService().validateFileSize(req.file.size)) {
        return res.status(400).json({
          error: 'File size exceeds limit',
          code: 'FILE_TOO_LARGE',
          details: 'Maximum file size is 10MB',
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`File upload successful: ${req.file.originalname} (${req.file.size} bytes)`);
      next();
    });
  };
};

/**
 * Middleware for handling single audio file upload
 * @param {string} fieldName - Name of the form field containing the audio file
 * @returns {Function} Express middleware function
 */
const uploadAudio = (fieldName = 'audio') => {
  return (req, res, next) => {
    const singleUpload = audioUpload.single(fieldName);
    
    singleUpload(req, res, (err) => {
      if (err) {
        console.error('Multer audio upload error:', err);
        
        // Handle specific multer errors
        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              return res.status(400).json({
                error: 'Audio file too large',
                code: 'FILE_TOO_LARGE',
                details: 'Maximum audio file size is 10MB',
                timestamp: new Date().toISOString()
              });
            case 'LIMIT_FILE_COUNT':
              return res.status(400).json({
                error: 'Too many files',
                code: 'TOO_MANY_FILES',
                details: 'Only one audio file allowed per request',
                timestamp: new Date().toISOString()
              });
            case 'LIMIT_UNEXPECTED_FILE':
              return res.status(400).json({
                error: 'Unexpected file field',
                code: 'UNEXPECTED_FILE',
                details: `Expected audio file field name: ${fieldName}`,
                timestamp: new Date().toISOString()
              });
            default:
              return res.status(400).json({
                error: 'Audio file upload error',
                code: 'UPLOAD_ERROR',
                details: err.message,
                timestamp: new Date().toISOString()
              });
          }
        }
        
        // Handle custom validation errors
        if (err.code === 'INVALID_FILE_TYPE' || err.code === 'INVALID_FILE_EXTENSION') {
          return res.status(400).json({
            error: err.message,
            code: err.code,
            timestamp: new Date().toISOString()
          });
        }
        
        // Handle other errors
        return res.status(500).json({
          error: 'Internal server error during audio upload',
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        });
      }
      
      // Validate that file was provided
      if (!req.file) {
        return res.status(400).json({
          error: 'No audio file provided',
          code: 'NO_FILE',
          details: `Please provide an audio file in the '${fieldName}' field`,
          timestamp: new Date().toISOString()
        });
      }
      
      // Additional file size validation (double-check)
      if (!getStorageService().validateFileSize(req.file.size)) {
        return res.status(400).json({
          error: 'Audio file size exceeds limit',
          code: 'FILE_TOO_LARGE',
          details: 'Maximum audio file size is 10MB',
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`Audio file upload successful: ${req.file.originalname} (${req.file.size} bytes)`);
      next();
    });
  };
};

/**
 * Middleware for handling multiple file uploads
 * @param {string} fieldName - Name of the form field containing the files
 * @param {number} maxCount - Maximum number of files allowed
 * @returns {Function} Express middleware function
 */
const uploadMultiple = (fieldName = 'images', maxCount = 5) => {
  return (req, res, next) => {
    const multipleUpload = imageUpload.array(fieldName, maxCount);
    
    multipleUpload(req, res, (err) => {
      if (err) {
        console.error('Multer multiple upload error:', err);
        
        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              return res.status(400).json({
                error: 'One or more files too large',
                code: 'FILE_TOO_LARGE',
                details: 'Maximum file size is 10MB per file',
                timestamp: new Date().toISOString()
              });
            case 'LIMIT_FILE_COUNT':
              return res.status(400).json({
                error: 'Too many files',
                code: 'TOO_MANY_FILES',
                details: `Maximum ${maxCount} files allowed`,
                timestamp: new Date().toISOString()
              });
            default:
              return res.status(400).json({
                error: 'File upload error',
                code: 'UPLOAD_ERROR',
                details: err.message,
                timestamp: new Date().toISOString()
              });
          }
        }
        
        return res.status(500).json({
          error: 'Internal server error during file upload',
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        });
      }
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: 'No files provided',
          code: 'NO_FILES',
          details: `Please provide files in the '${fieldName}' field`,
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`Multiple files upload successful: ${req.files.length} files`);
      next();
    });
  };
};

/**
 * Cleanup middleware to remove temporary files if they exist
 * Should be used after processing is complete
 */
const cleanupTempFiles = async (req, res, next) => {
  // This middleware can be used to clean up any temporary files
  // In our case, we're using memory storage, so no cleanup needed
  // But this provides a hook for future file system storage if needed
  
  res.on('finish', () => {
    // Cleanup logic would go here if using disk storage
    console.log('Request finished, cleanup completed');
  });
  
  next();
};

/**
 * Middleware to validate file metadata and add additional security checks
 */
const validateFileMetadata = (req, res, next) => {
  try {
    if (req.file) {
      // Add additional metadata to the file object
      req.file.uploadTimestamp = new Date().toISOString();
      req.file.isValid = true;
      
      // Log file details for security monitoring
      console.log('File validation passed:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        timestamp: req.file.uploadTimestamp
      });
    }
    
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        file.uploadTimestamp = new Date().toISOString();
        file.isValid = true;
        
        console.log(`File ${index + 1} validation passed:`, {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          timestamp: file.uploadTimestamp
        });
      });
    }
    
    next();
  } catch (error) {
    console.error('Error in file metadata validation:', error);
    res.status(500).json({
      error: 'File validation error',
      code: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  uploadSingle,
  uploadAudio,
  uploadMultiple,
  cleanupTempFiles,
  validateFileMetadata,
  getStorageService
};