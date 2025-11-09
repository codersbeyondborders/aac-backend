# Smart AAC API Specifications v2.1

## Overview

The Smart AAC API is a comprehensive RESTful service for Augmentative and Alternative Communication (AAC) applications. It provides culturally-aware AI icon generation, audio synthesis, user profile management, communication board creation, and content management capabilities.

**Base URL**: `http://localhost:8080` (Development)  
**API Version**: v1  
**Authentication**: Firebase JWT Bearer Token  
**Content Type**: `application/json` (unless specified otherwise)

## Key Features

- **AI Icon Generation**: Text-to-icon and image-to-icon with cultural adaptation
- **Audio Synthesis**: Text-to-speech in 50+ languages with dialect support
- **Audio Recording**: Upload and store recorded audio files
- **Automatic Processing**: Background removal, text sanitization, transparency
- **Cultural Personalization**: Language, region, and demographic-aware generation
- **Board Management**: Create and manage AAC communication boards
- **User Profiles**: Comprehensive cultural context and preferences

## Authentication

All authenticated endpoints require a Firebase JWT token in the Authorization header:

```
Authorization: Bearer <firebase-jwt-token>
```

## API Endpoints Summary

### Health & Monitoring (2 endpoints)
- `GET /health` - Basic health check
- `GET /api/v1/health` - Detailed service health

### User Profile Management (9 endpoints)
- `GET /api/v1/profile/status` - Profile completion status
- `GET /api/v1/profile` - Get user profile
- `POST /api/v1/profile` - Create profile
- `PUT /api/v1/profile` - Update complete profile
- `PUT /api/v1/profile/step/{step}` - Update onboarding step
- `PATCH /api/v1/profile/section/{section}` - Update profile section
- `GET /api/v1/profile/cultural-context` - Get cultural context
- `POST /api/v1/profile/validate` - Validate profile data
- `DELETE /api/v1/profile` - Delete profile

### Board Management (6 endpoints)
- `POST /api/v1/boards` - Create board
- `GET /api/v1/boards` - List user boards
- `GET /api/v1/boards/public` - Browse public boards
- `GET /api/v1/boards/{id}` - Get specific board
- `PUT /api/v1/boards/{id}` - Update board
- `DELETE /api/v1/boards/{id}` - Delete board

### AI Icon & Audio Generation (8 endpoints)
- `POST /api/v1/icons/generate-from-text` - Generate icon from text with optional audio
- `POST /api/v1/icons/generate-from-image` - Generate/process icon from uploaded image
- `POST /api/v1/icons/generate-audio-from-recording` - Upload and store recorded audio
- `GET /api/v1/icons` - List user icons
- `GET /api/v1/icons/search` - Search icons
- `GET /api/v1/icons/stats` - Get usage statistics
- `GET /api/v1/icons/{id}` - Get icon details
- `DELETE /api/v1/icons/{id}` - Delete icon

**Total**: 25 endpoints

---

## Detailed Endpoint Documentation

### Health & Monitoring

#### Basic Health Check
- **Endpoint**: `GET /health`
- **Authentication**: None required
- **Description**: Returns basic server health status
- **Response**: 
  ```json
  {
    "status": "healthy",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "uptime": 3600,
    "environment": "development"
  }
  ```

#### Detailed Health Check
- **Endpoint**: `GET /api/v1/health`
- **Authentication**: None required
- **Description**: Returns comprehensive health status including all service dependencies
- **Response**:
  ```json
  {
    "status": "healthy",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "uptime": 3600,
    "environment": "development",
    "services": {
      "firebase_auth": {
        "status": "healthy",
        "message": "Firebase Auth connection successful"
      },
      "firestore": {
        "status": "healthy", 
        "message": "Firestore connection successful"
      },
      "vertex_ai": {
        "status": "healthy",
        "message": "Vertex AI services initialized and ready",
        "details": {
          "projectId": "your-project-id",
          "location": "us-central1"
        }
      }
    }
  }
  ```

---

### User Profile Management

(Profile endpoints remain the same as in the original document)

---

### Board Management

(Board endpoints remain the same as in the original document)

---

### AI Icon & Audio Generation

#### Generate Icon from Text (with Optional Audio)
- **Endpoint**: `POST /api/v1/icons/generate-from-text`
- **Authentication**: Required
- **Description**: Generates a culturally-appropriate icon from a text description using AI. Optionally generates audio for the label in the user's primary language and dialect.

**Processing Pipeline:**
1. Generate icon from text using Imagen
2. Apply automatic sanitization (transparent background, text removal)
3. Optionally translate label to user's primary language
4. Optionally generate audio using Text-to-Speech
5. Store icon with embedded audio metadata

- **Request Body**:
  ```json
  {
    "text": "happy cat",
    "label": "Happy Cat",
    "category": "animals",
    "accent": "Puck",
    "color": "#FF5733",
    "generateAudio": true,
    "culturalContext": {
      "language": "en",
      "dialect": "American English",
      "region": "California"
    }
  }
  ```

**Request Fields:**
- `text` (required): Text description for icon generation (1-200 characters)
- `label` (optional): Human-readable label for the icon
- `category` (optional): Category classification
- `accent` (optional): Voice accent for audio generation
- `color` (optional): Color preference
- `generateAudio` (optional): Whether to generate audio for label (default: false)
- `culturalContext` (optional): Override user profile cultural context

- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "icon_abc123def456",
      "publicUrl": "https://storage.googleapis.com/your-bucket/icons/user123/1234567890-abc123.png",
      "mimeType": "image/png",
      "size": 15420,
      "prompt": "Create a simple, accessible 2D icon representing \"happy cat\"...",
      "text": "happy cat",
      "label": "Happy Cat",
      "category": "animals",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "cultureProfile": {
        "language": "en",
        "region": "US",
        "symbolStyle": "simple"
      },
      "audio": {
        "filename": "audio/user123/1234567890-audio123.mp3",
        "publicUrl": "https://storage.googleapis.com/your-bucket/audio/user123/1234567890-audio123.mp3",
        "mimeType": "audio/mpeg",
        "size": 8420,
        "language": "en",
        "dialect": "American English",
        "uploadedAt": "2024-01-01T12:00:00.000Z"
      },
      "translation": {
        "originalText": "Happy Cat",
        "translatedText": "Happy Cat",
        "targetLanguage": "en",
        "targetDialect": "American English"
      }
    },
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
  ```

**Error Responses:**
- `400`: Invalid request data (validation errors)
- `401`: Authentication required
- `500`: Icon generation service unavailable

---

#### Upload/Generate Icon from Image (with AI Processing)
- **Endpoint**: `POST /api/v1/icons/generate-from-image`
- **Authentication**: Required
- **Content Type**: `multipart/form-data`
- **Description**: Upload an icon image with automatic AI processing to create clean, transparent icons.

**All uploaded images are processed through AI to:**
- Remove backgrounds and create transparent PNG
- Remove any text labels or watermarks
- Optimize for AAC communication (simple, high-contrast)
- Ensure consistent icon style

**Two Processing Modes:**
1. **Upload + Full AI Generation** (`generateIcon=true`): Analyze image and regenerate as new icon
2. **Upload + Processing** (`generateIcon=false`): Clean up uploaded image while preserving original style

- **Request Body**:
  ```
  Form fields:
  - image (file upload, required): Icon image file
  - generateIcon (boolean, optional): Whether to generate new icon using AI (default: true)
  - label (string, optional): Label for the icon
  - category (string, optional): Category
  - accent (string, optional): Voice accent for audio
  - color (string, optional): Color preference
  - generateAudio (boolean, optional): Generate audio for label (requires label field)
  
  Supported formats: image/jpeg, image/png, image/gif, image/webp
  Max file size: 10MB
  ```

- **Response (Full AI Generation - generateIcon=true)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "icon_def456ghi789",
      "publicUrl": "https://storage.googleapis.com/your-bucket/icons/user123/1234567891-def456.png",
      "mimeType": "image/png",
      "size": 18750,
      "iconType": "generated",
      "generatedByAI": true,
      "prompt": "Create a simple, accessible 2D icon representing \"a golden retriever dog\"...",
      "createdAt": "2024-01-01T12:01:00.000Z",
      "originalImage": {
        "filename": "my-dog-photo.jpg",
        "size": 2048576,
        "mimetype": "image/jpeg"
      },
      "analysis": {
        "description": "a golden retriever dog sitting in a park",
        "analysisType": "icon_elements",
        "confidence": "high",
        "processed": true
      },
      "cultureProfile": {
        "language": "en",
        "region": "US",
        "symbolStyle": "simple"
      },
      "audio": {
        "filename": "audio/user123/1234567891-audio456.mp3",
        "publicUrl": "https://storage.googleapis.com/your-bucket/audio/user123/1234567891-audio456.mp3",
        "mimeType": "audio/mpeg",
        "size": 7200,
        "language": "en",
        "uploadedAt": "2024-01-01T12:01:00.000Z"
      }
    },
    "timestamp": "2024-01-01T12:01:00.000Z"
  }
  ```

- **Response (Processing Only - generateIcon=false)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "icon_xyz789abc123",
      "publicUrl": "https://storage.googleapis.com/your-bucket/icons/user123/1234567892-xyz789.png",
      "mimeType": "image/png",
      "size": 12340,
      "iconType": "uploaded-processed",
      "generatedByAI": false,
      "createdAt": "2024-01-01T12:02:00.000Z",
      "originalImage": {
        "filename": "my-icon.png",
        "size": 12340,
        "mimetype": "image/png"
      },
      "analysis": {
        "description": "uploaded image content",
        "processed": true
      },
      "label": "My Custom Icon"
    },
    "timestamp": "2024-01-01T12:02:00.000Z"
  }
  ```

**Error Responses:**
- `400`: Invalid image file or request
- `401`: Authentication required
- `413`: File too large
- `500`: Upload or processing failed

---

#### Upload and Store Recorded Audio
- **Endpoint**: `POST /api/v1/icons/generate-audio-from-recording`
- **Authentication**: Required
- **Content Type**: `multipart/form-data`
- **Description**: Uploads and stores recorded audio file for an icon. The original audio is stored as-is without any processing or transcription. Optionally link the audio to an existing icon by providing the iconId.

- **Request Body**:
  ```
  Form fields:
  - audio (file upload, required): Audio file to upload
  - iconId (string, optional): Icon ID to associate audio with
  - label (string, optional): Label/description for the audio
  
  Supported formats: audio/webm, audio/mpeg, audio/mp3, audio/wav, audio/ogg, audio/m4a
  Max file size: 10MB
  ```

- **Response**:
  ```json
  {
    "success": true,
    "audio": {
      "filename": "audio/user123/1234567893-audio789.webm",
      "publicUrl": "https://storage.googleapis.com/your-bucket/audio/user123/1234567893-audio789.webm",
      "mimeType": "audio/webm",
      "size": 15680,
      "uploadedAt": "2024-01-01T12:03:00.000Z"
    },
    "iconId": "icon_abc123def456",
    "originalFile": {
      "filename": "recording.webm",
      "size": 15680,
      "mimetype": "audio/webm"
    },
    "timestamp": "2024-01-01T12:03:00.000Z"
  }
  ```

**Error Responses:**
- `400`: Invalid audio file or request
- `401`: Authentication required
- `413`: File too large
- `500`: Audio storage failed

---

#### Get User Icons
- **Endpoint**: `GET /api/v1/icons`
- **Authentication**: Required
- **Query Parameters**:
  - `limit`: Number of icons per page (1-100, default: 20)
  - `offset`: Number of icons to skip (default: 0)
  - `iconType`: Filter by type (`generated` | `uploaded` | `uploaded-processed` | `custom`)
  - `sortBy`: Sort field (`createdAt` | `size` | `iconType`, default: `createdAt`)
  - `sortOrder`: Sort direction (`asc` | `desc`, default: `desc`)
- **Description**: Retrieves a paginated list of icons generated by the user
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "icons": [
        {
          "id": "icon_abc123def456",
          "publicUrl": "https://storage.googleapis.com/your-bucket/icons/user123/1234567890-abc123.png",
          "filename": "icons/user123/1234567890-abc123.png",
          "mimeType": "image/png",
          "size": 15420,
          "createdAt": "2024-01-01T12:00:00.000Z",
          "iconType": "generated",
          "generationMethod": "text-to-icon-sanitized",
          "originalText": "happy cat",
          "label": "Happy Cat",
          "tags": ["happy_cat"],
          "audio": {
            "publicUrl": "https://storage.googleapis.com/your-bucket/audio/user123/1234567890-audio123.mp3",
            "mimeType": "audio/mpeg",
            "language": "en"
          }
        }
      ],
      "pagination": {
        "total": 25,
        "limit": 20,
        "offset": 0,
        "hasMore": true
      }
    },
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
  ```

---

#### Search User Icons
- **Endpoint**: `GET /api/v1/icons/search`
- **Authentication**: Required
- **Query Parameters**:
  - `q`: Search query (required, min 1 character)
  - `limit`: Number of results (1-100, default: 20)
  - `offset`: Number of results to skip (default: 0)
- **Description**: Search through user's icons by text content, labels, or tags
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "icons": [
        {
          "id": "icon_abc123def456",
          "publicUrl": "https://storage.googleapis.com/your-bucket/icons/user123/1234567890-abc123.png",
          "mimeType": "image/png",
          "size": 15420,
          "createdAt": "2024-01-01T12:00:00.000Z",
          "iconType": "generated",
          "originalText": "happy cat",
          "label": "Happy Cat",
          "tags": ["happy_cat"]
        }
      ],
      "searchQuery": "cat",
      "pagination": {
        "total": 3,
        "limit": 20,
        "offset": 0,
        "hasMore": false
      }
    },
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
  ```

---

#### Get Icon Statistics
- **Endpoint**: `GET /api/v1/icons/stats`
- **Authentication**: Required
- **Description**: Retrieves statistics about user's generated icons
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "totalIcons": 25,
      "iconsByType": {
        "generated": 18,
        "uploaded-processed": 7
      },
      "iconsByMethod": {
        "text-to-icon-sanitized": 18,
        "image-to-icon-processed": 7
      },
      "totalStorageUsed": 387500,
      "oldestIcon": "2024-01-01T10:00:00.000Z",
      "newestIcon": "2024-01-01T12:00:00.000Z"
    },
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
  ```

---

#### Get Icon Details
- **Endpoint**: `GET /api/v1/icons/{iconId}`
- **Authentication**: Required
- **Parameters**:
  - `iconId`: Icon ID
- **Description**: Retrieves detailed information about a specific icon
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "icon_abc123def456",
      "publicUrl": "https://storage.googleapis.com/your-bucket/icons/user123/1234567890-abc123.png",
      "filename": "icons/user123/1234567890-abc123.png",
      "mimeType": "image/png",
      "size": 15420,
      "createdAt": "2024-01-01T12:00:00.000Z",
      "iconType": "generated",
      "generationMethod": "text-to-icon-sanitized",
      "prompt": "Create a simple, accessible 2D icon representing \"happy cat\"...",
      "originalText": "happy cat",
      "label": "Happy Cat",
      "category": "animals",
      "culturalContext": {
        "language": "en",
        "region": "US",
        "symbolStyle": "simple",
        "culturalAdaptation": true
      },
      "tags": ["happy_cat"],
      "audio": {
        "filename": "audio/user123/1234567890-audio123.mp3",
        "publicUrl": "https://storage.googleapis.com/your-bucket/audio/user123/1234567890-audio123.mp3",
        "mimeType": "audio/mpeg",
        "size": 8420,
        "language": "en",
        "dialect": "American English"
      },
      "sanitized": true
    },
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
  ```

---

#### Delete Icon
- **Endpoint**: `DELETE /api/v1/icons/{iconId}`
- **Authentication**: Required
- **Parameters**:
  - `iconId`: Icon ID
- **Description**: Deletes an icon and removes it from storage
- **Response**:
  ```json
  {
    "success": true,
    "message": "Icon deleted successfully",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
  ```

---

## Data Models

### Icon Models

#### GeneratedIconResponse
```json
{
  "id": "string",
  "publicUrl": "string (Cloud Storage URL)",
  "mimeType": "string",
  "size": "integer (bytes)",
  "prompt": "string (AI generation prompt)",
  "text": "string (original text input)",
  "label": "string (optional)",
  "category": "string (optional)",
  "createdAt": "string (ISO date)",
  "cultureProfile": {
    "language": "string",
    "region": "string", 
    "symbolStyle": "string"
  },
  "audio": {
    "publicUrl": "string",
    "mimeType": "string",
    "language": "string",
    "dialect": "string"
  },
  "translation": {
    "originalText": "string",
    "translatedText": "string",
    "targetLanguage": "string"
  }
}
```

#### IconMetadata
```json
{
  "id": "string",
  "publicUrl": "string",
  "filename": "string",
  "mimeType": "string",
  "size": "integer",
  "createdAt": "string (ISO date)",
  "iconType": "string (generated|uploaded|uploaded-processed|custom)",
  "generationMethod": "string (text-to-icon|text-to-icon-sanitized|image-to-icon-processed|manual-upload)",
  "originalText": "string",
  "label": "string",
  "tags": "array of strings",
  "audio": "AudioInfo object",
  "sanitized": "boolean"
}
```

#### AudioInfo
```json
{
  "filename": "string",
  "publicUrl": "string",
  "mimeType": "string",
  "size": "integer",
  "language": "string",
  "dialect": "string",
  "uploadedAt": "string (ISO date)"
}
```

---

## Error Codes

### Authentication Errors
- `AUTHENTICATION_REQUIRED`: Missing or invalid JWT token
- `ACCESS_DENIED`: User lacks permission for resource

### Validation Errors
- `VALIDATION_ERROR`: Request data validation failed
- `MISSING_REQUIRED_FIELD`: Required field not provided
- `INVALID_DATA_TYPE`: Field has incorrect data type
- `FIELD_TOO_LONG`: Field exceeds maximum length

### Icon Errors
- `ICON_NOT_FOUND`: Icon does not exist
- `ICON_ACCESS_DENIED`: User cannot access icon
- `MISSING_ICON_ID`: Icon ID not provided
- `NO_IMAGE_FILE`: Image file not provided for upload
- `NO_AUDIO_FILE`: Audio file not provided for upload
- `AI_SERVICE_ERROR`: AI generation service unavailable
- `IMAGE_ANALYSIS_ERROR`: Image analysis failed
- `ICON_GENERATION_ERROR`: Icon generation failed
- `ICON_PROCESSING_ERROR`: Icon processing failed
- `AUDIO_STORAGE_ERROR`: Audio storage failed
- `ICON_RETRIEVAL_ERROR`: Failed to retrieve icons
- `ICON_SEARCH_ERROR`: Icon search failed
- `ICON_DELETION_ERROR`: Failed to delete icon

### System Errors
- `INTERNAL_ERROR`: Unexpected server error
- `DATABASE_INDEX_BUILDING`: Database indexes being created
- `STORAGE_ERROR`: Cloud Storage operation failed

---

## HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `413 Payload Too Large`: File upload too large
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

---

## File Upload Specifications

### Supported Image Formats
- JPEG (`image/jpeg`)
- PNG (`image/png`) 
- GIF (`image/gif`)
- WebP (`image/webp`)

### Supported Audio Formats
- MP3 (`audio/mpeg`, `audio/mp3`)
- WAV (`audio/wav`)
- OGG (`audio/ogg`)
- WebM (`audio/webm`)
- M4A (`audio/m4a`)

### File Size Limits
- Maximum file size: 10MB for both images and audio
- Recommended: Keep files under 5MB for optimal performance

---

## Audio Generation Features

### Text-to-Speech
- **Service**: Google Cloud Text-to-Speech
- **Languages**: 50+ languages with regional dialects
- **Output Format**: MP3 (audio/mpeg)
- **Sample Rate**: 44.1 kHz
- **Quality**: High-quality voice synthesis

### Supported Languages (Examples)
- English (US, UK, AU, IN)
- Spanish (ES, MX, Latin America)
- French (FR, CA)
- German (DE)
- Italian (IT)
- Japanese (JP)
- Korean (KR)
- Chinese (Mandarin - CN, TW)
- Portuguese (BR, PT)
- Russian (RU)
- Arabic (EG, World)
- Hindi (IN)
- And 40+ more...

### Translation Support
- Automatic translation to user's primary language
- Dialect-aware translation
- Uses Gemini 2.5 Pro for high-quality translations

---

## Cultural Context Integration

The API integrates cultural context from user profiles into AI generation:

1. **Language Preferences**: Primary and secondary languages with dialects
2. **Geographic Context**: Country and region information
3. **Cultural Adaptation**: Symbols and voices appropriate to user's background
4. **Demographic Considerations**: Age-appropriate and culturally sensitive content
5. **Audio Localization**: Language-appropriate voice synthesis

---

## Interactive Documentation

Access comprehensive interactive API documentation at:
- **Development**: `http://localhost:8080/api-docs`
- **Alternative**: `http://localhost:8080/docs`

The interactive documentation includes:
- Live endpoint testing
- Request/response examples
- Schema validation
- Authentication testing
- Complete data model documentation

---

## Version History

### v2.1 (Current)
- Audio generation and recording features
- Text-to-Speech integration (50+ languages)
- Automatic icon sanitization (transparent backgrounds, text removal)
- Translation support for audio generation
- Enhanced cultural context integration
- Improved image processing pipeline

### v2.0
- Complete icon generation and management system
- Cultural context integration
- Google Cloud Storage integration
- Icon search and analytics
- Comprehensive error handling
- Interactive API documentation

### v1.0
- Basic user profile management
- Board CRUD operations
- Health monitoring
- Firebase authentication

---

*This specification reflects the current implementation as of November 2024. For the most up-to-date interactive documentation, visit the Swagger UI at `/api-docs`.*
