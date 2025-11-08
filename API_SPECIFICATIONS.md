# Smart AAC API Specifications v2.0

## Overview

The Smart AAC API is a comprehensive RESTful service for Augmentative and Alternative Communication (AAC) applications. It provides culturally-aware AI icon generation, user profile management, communication board creation, and content management capabilities.

**Base URL**: `http://localhost:8080` (Development)  
**API Version**: v1  
**Authentication**: Firebase JWT Bearer Token  
**Content Type**: `application/json` (unless specified otherwise)

## Authentication

All authenticated endpoints require a Firebase JWT token in the Authorization header:

```
Authorization: Bearer <firebase-jwt-token>
```

## API Endpoints

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
      },
      "environment": {
        "status": "healthy",
        "message": "All required environment variables are set"
      },
      "logging": {
        "status": "healthy",
        "message": "Logging system operational"
      }
    }
  }
  ```

### User Profile Management

#### Get Profile Status
- **Endpoint**: `GET /api/v1/profile/status`
- **Authentication**: Required
- **Description**: Returns profile existence, completion status, and onboarding information
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "profileExists": true,
      "isComplete": false,
      "currentStep": "languages",
      "completionPercentage": 66.7,
      "missingFields": ["languages", "demographics"],
      "nextStep": "languages"
    }
  }
  ```

#### Get User Profile
- **Endpoint**: `GET /api/v1/profile`
- **Authentication**: Required
- **Description**: Retrieves the current user's complete profile information
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "userId": "firebase-user-id-123",
      "location": {
        "country": "United States",
        "region": "California"
      },
      "languages": {
        "primary": {
          "language": "English",
          "dialect": "American English"
        },
        "secondary": {
          "language": "Spanish",
          "dialect": "Mexican Spanish"
        }
      },
      "demographics": {
        "age": 25,
        "gender": "Female",
        "religion": "Christianity",
        "ethnicity": "Hispanic/Latino"
      },
      "profileComplete": true,
      "onboardingStep": "completed",
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    }
  }
  ```

#### Create Complete Profile
- **Endpoint**: `POST /api/v1/profile`
- **Authentication**: Required
- **Description**: Creates a complete user profile with all required information
- **Request Body**:
  ```json
  {
    "location": {
      "country": "United States",
      "region": "California"
    },
    "languages": {
      "primary": {
        "language": "English",
        "dialect": "American English"
      },
      "secondary": {
        "language": "Spanish",
        "dialect": "Mexican Spanish"
      }
    },
    "demographics": {
      "age": 25,
      "gender": "Female",
      "religion": "Christianity",
      "ethnicity": "Hispanic/Latino"
    }
  }
  ```

#### Update Complete Profile
- **Endpoint**: `PUT /api/v1/profile`
- **Authentication**: Required
- **Description**: Updates an existing user profile with new information
- **Request Body**: Same as create profile

#### Update Profile Step (Onboarding)
- **Endpoint**: `PUT /api/v1/profile/step/{step}`
- **Authentication**: Required
- **Parameters**: 
  - `step`: `location` | `languages` | `demographics`
- **Description**: Updates a specific step of the user profile during onboarding
- **Request Body Examples**:
  ```json
  // For step "location"
  {
    "country": "United States",
    "region": "California"
  }
  
  // For step "languages"
  {
    "primary": {
      "language": "English",
      "dialect": "American English"
    },
    "secondary": {
      "language": "Spanish",
      "dialect": "Mexican Spanish"
    }
  }
  
  // For step "demographics"
  {
    "age": 25,
    "gender": "Female",
    "religion": "Christianity",
    "ethnicity": "Hispanic/Latino"
  }
  ```

#### Update Profile Section
- **Endpoint**: `PATCH /api/v1/profile/section/{section}`
- **Authentication**: Required
- **Parameters**: 
  - `section`: `location` | `languages` | `demographics`
- **Description**: Updates a specific section of the user profile (for post-signup editing)
- **Request Body**: Same format as profile step updates

#### Get Cultural Context
- **Endpoint**: `GET /api/v1/profile/cultural-context`
- **Authentication**: Required
- **Description**: Retrieves cultural context derived from user profile for AI personalization
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "language": "en",
      "dialect": "American English",
      "region": "California",
      "country": "United States",
      "symbolStyle": "simple",
      "culturalAdaptation": true,
      "demographics": {
        "age": 25,
        "gender": "Female",
        "religion": "Christianity",
        "ethnicity": "Hispanic/Latino"
      }
    }
  }
  ```

#### Validate Profile Data
- **Endpoint**: `POST /api/v1/profile/validate`
- **Authentication**: Required
- **Description**: Validates profile data without saving (useful for real-time validation)
- **Request Body**: Profile data to validate
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "valid": true,
      "errors": []
    }
  }
  ```

#### Delete Profile
- **Endpoint**: `DELETE /api/v1/profile`
- **Authentication**: Required
- **Description**: Deletes the current user's profile
- **Response**:
  ```json
  {
    "success": true,
    "message": "Profile deleted successfully"
  }
  ```

### Board Management

#### Create Board
- **Endpoint**: `POST /api/v1/boards`
- **Authentication**: Required
- **Description**: Creates a new AAC communication board
- **Request Body**:
  ```json
  {
    "name": "My Communication Board",
    "description": "A board for daily communication needs",
    "isPublic": false,
    "icons": []
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "board_abc123",
      "name": "My Communication Board",
      "description": "A board for daily communication needs",
      "isPublic": false,
      "icons": [],
      "userId": "firebase-user-id-123",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    },
    "message": "Board created successfully"
  }
  ```

#### Get User Boards
- **Endpoint**: `GET /api/v1/boards`
- **Authentication**: Required
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20, max: 100)
  - `orderBy`: Sort field (`createdAt` | `updatedAt` | `name`, default: `updatedAt`)
  - `orderDirection`: Sort direction (`asc` | `desc`, default: `desc`)
  - `startAfter`: Pagination cursor (JSON encoded)
- **Description**: Retrieves all boards owned by the authenticated user with pagination
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "board_abc123",
        "name": "My Communication Board",
        "description": "A board for daily communication needs",
        "isPublic": false,
        "icons": [],
        "userId": "firebase-user-id-123",
        "createdAt": "2024-01-01T12:00:00.000Z",
        "updatedAt": "2024-01-01T12:00:00.000Z"
      }
    ],
    "pagination": {
      "count": 1,
      "hasMore": false,
      "page": 1,
      "limit": 20,
      "nextCursor": null
    }
  }
  ```

#### Get Public Boards
- **Endpoint**: `GET /api/v1/boards/public`
- **Authentication**: None required
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20, max: 100)
  - `orderBy`: Sort field (`createdAt` | `updatedAt` | `name`, default: `updatedAt`)
  - `orderDirection`: Sort direction (`asc` | `desc`, default: `desc`)
  - `search`: Search term for board names and descriptions (1-100 characters)
  - `startAfter`: Pagination cursor (JSON encoded)
- **Description**: Retrieves publicly available AAC boards with optional search
- **Response**: Same format as user boards

#### Get Specific Board
- **Endpoint**: `GET /api/v1/boards/{id}`
- **Authentication**: Required
- **Parameters**:
  - `id`: Board ID
- **Description**: Retrieves a specific board by ID (user must own the board or it must be public)
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "board_abc123",
      "name": "My Communication Board",
      "description": "A board for daily communication needs",
      "isPublic": false,
      "icons": [],
      "userId": "firebase-user-id-123",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    }
  }
  ```

#### Update Board
- **Endpoint**: `PUT /api/v1/boards/{id}`
- **Authentication**: Required
- **Parameters**:
  - `id`: Board ID
- **Description**: Updates an existing board (user must own the board)
- **Request Body**:
  ```json
  {
    "name": "Updated Board Name",
    "description": "Updated description",
    "isPublic": true,
    "icons": [
      {
        "id": "icon1",
        "text": "Hello",
        "position": { "x": 0, "y": 0 },
        "category": "greetings"
      }
    ]
  }
  ```

#### Delete Board
- **Endpoint**: `DELETE /api/v1/boards/{id}`
- **Authentication**: Required
- **Parameters**:
  - `id`: Board ID
- **Description**: Deletes a board (user must own the board)
- **Response**:
  ```json
  {
    "success": true,
    "message": "Board deleted successfully"
  }
  ```

### AI Icon Generation & Management

#### Generate Icon from Text
- **Endpoint**: `POST /api/v1/icons/generate-from-text`
- **Authentication**: Required
- **Description**: Generates a culturally-appropriate icon from text description using AI
- **Request Body**:
  ```json
  {
    "text": "happy cat"
  }
  ```
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
      "createdAt": "2024-01-01T12:00:00.000Z",
      "cultureProfile": {
        "language": "en",
        "region": "US",
        "symbolStyle": "simple"
      }
    },
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
  ```

#### Generate Icon from Image
- **Endpoint**: `POST /api/v1/icons/generate-from-image`
- **Authentication**: Required
- **Content Type**: `multipart/form-data`
- **Description**: Analyzes an uploaded image and generates a simplified icon
- **Request Body**:
  ```
  Form field: image (file upload)
  Supported formats: image/jpeg, image/png, image/gif, image/webp
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "icon_def456ghi789",
      "publicUrl": "https://storage.googleapis.com/your-bucket/icons/user123/1234567891-def456.png",
      "mimeType": "image/png",
      "size": 18750,
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
        "confidence": "high"
      },
      "cultureProfile": {
        "language": "en",
        "region": "US",
        "symbolStyle": "simple"
      }
    }
  }
  ```

#### Get User Icons
- **Endpoint**: `GET /api/v1/icons`
- **Authentication**: Required
- **Query Parameters**:
  - `limit`: Number of icons per page (1-100, default: 20)
  - `offset`: Number of icons to skip (default: 0)
  - `iconType`: Filter by type (`generated` | `uploaded` | `custom`)
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
          "generationMethod": "text-to-icon",
          "originalText": "happy cat",
          "tags": ["happy_cat"]
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

#### Search User Icons
- **Endpoint**: `GET /api/v1/icons/search`
- **Authentication**: Required
- **Query Parameters**:
  - `q`: Search query (required, min 1 character)
  - `limit`: Number of results (1-100, default: 20)
  - `offset`: Number of results to skip (default: 0)
- **Description**: Search through user's icons by text content or tags
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
          "generationMethod": "text-to-icon",
          "originalText": "happy cat",
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
        "generated": 25
      },
      "iconsByMethod": {
        "text-to-icon": 18,
        "image-to-icon": 7
      },
      "totalStorageUsed": 387500,
      "oldestIcon": "2024-01-01T10:00:00.000Z",
      "newestIcon": "2024-01-01T12:00:00.000Z"
    },
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
  ```

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
      "generationMethod": "text-to-icon",
      "prompt": "Create a simple, accessible 2D icon representing \"happy cat\"...",
      "originalText": "happy cat",
      "originalImageInfo": null,
      "analysisData": null,
      "culturalContext": {
        "language": "en",
        "region": "US",
        "symbolStyle": "simple",
        "culturalAdaptation": true
      },
      "tags": ["happy_cat"]
    },
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
  ```

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

## Data Models

### User Profile Models

#### LocationData
```json
{
  "country": "string (required, max 100 chars)",
  "region": "string (required, max 100 chars)"
}
```

#### LanguageInfo
```json
{
  "language": "string (required)",
  "dialect": "string (required)"
}
```

#### LanguageData
```json
{
  "primary": "LanguageInfo (required)",
  "secondary": "LanguageInfo (optional)"
}
```

#### DemographicsData
```json
{
  "age": "integer (optional, 1-120)",
  "gender": "string (optional, max 50 chars)",
  "religion": "string (optional, max 100 chars)",
  "ethnicity": "string (optional, max 100 chars)"
}
```

#### UserProfile
```json
{
  "userId": "string",
  "location": "LocationData",
  "languages": "LanguageData", 
  "demographics": "DemographicsData",
  "profileComplete": "boolean",
  "onboardingStep": "string (location|languages|demographics|completed)",
  "metadata": {
    "version": "integer",
    "lastUpdated": "string (ISO date)"
  },
  "createdAt": "string (ISO date)",
  "updatedAt": "string (ISO date)"
}
```

#### CulturalContext
```json
{
  "language": "string",
  "dialect": "string",
  "region": "string",
  "country": "string",
  "symbolStyle": "string (simple|cartoon|modern)",
  "culturalAdaptation": "boolean",
  "demographics": "DemographicsData"
}
```

### Board Models

#### AACBoard
```json
{
  "id": "string",
  "name": "string (required, max 100 chars)",
  "description": "string (optional, max 500 chars)",
  "isPublic": "boolean",
  "icons": "array (max 50 items)",
  "userId": "string",
  "createdAt": "string (ISO date)",
  "updatedAt": "string (ISO date)"
}
```

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
  "createdAt": "string (ISO date)",
  "cultureProfile": {
    "language": "string",
    "region": "string", 
    "symbolStyle": "string"
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
  "iconType": "string (generated|uploaded|custom)",
  "generationMethod": "string (text-to-icon|image-to-icon)",
  "originalText": "string",
  "tags": "array of strings"
}
```

#### IconDetails
```json
{
  "id": "string",
  "publicUrl": "string",
  "filename": "string", 
  "mimeType": "string",
  "size": "integer",
  "createdAt": "string (ISO date)",
  "iconType": "string",
  "generationMethod": "string",
  "prompt": "string",
  "originalText": "string",
  "originalImageInfo": "object (for image-to-icon)",
  "analysisData": "object (for image-to-icon)",
  "culturalContext": "CulturalContext",
  "tags": "array of strings"
}
```

### Response Models

#### SuccessResponse
```json
{
  "success": true,
  "data": "object (varies by endpoint)",
  "message": "string (optional)"
}
```

#### ErrorResponse
```json
{
  "error": "string (error message)",
  "code": "string (error code)",
  "details": "string or array (optional)",
  "timestamp": "string (ISO date)"
}
```

#### PaginatedResponse
```json
{
  "success": true,
  "data": "array",
  "pagination": {
    "count": "integer",
    "hasMore": "boolean",
    "page": "integer",
    "limit": "integer",
    "nextCursor": "object or null"
  }
}
```

## Error Codes

### Authentication Errors
- `AUTHENTICATION_REQUIRED`: Missing or invalid JWT token
- `ACCESS_DENIED`: User lacks permission for resource

### Validation Errors
- `VALIDATION_ERROR`: Request data validation failed
- `MISSING_REQUIRED_FIELD`: Required field not provided
- `INVALID_DATA_TYPE`: Field has incorrect data type
- `FIELD_TOO_LONG`: Field exceeds maximum length

### Profile Errors
- `PROFILE_NOT_FOUND`: User profile does not exist
- `PROFILE_ALREADY_EXISTS`: Attempting to create existing profile
- `PROFILE_VALIDATION_ERROR`: Profile data validation failed
- `PROFILE_STEP_VALIDATION_ERROR`: Profile step data validation failed
- `PROFILE_SECTION_VALIDATION_ERROR`: Profile section data validation failed
- `INVALID_PROFILE_STEP`: Invalid step name provided
- `INVALID_PROFILE_SECTION`: Invalid section name provided

### Board Errors
- `BOARD_NOT_FOUND`: Board does not exist
- `BOARD_ACCESS_DENIED`: User cannot access board
- `BOARD_VALIDATION_ERROR`: Board data validation failed
- `BOARD_CREATION_ERROR`: Failed to create board
- `BOARD_UPDATE_ERROR`: Failed to update board
- `BOARD_DELETION_ERROR`: Failed to delete board
- `MISSING_BOARD_ID`: Board ID not provided

### Icon Errors
- `ICON_NOT_FOUND`: Icon does not exist
- `ICON_ACCESS_DENIED`: User cannot access icon
- `MISSING_ICON_ID`: Icon ID not provided
- `NO_IMAGE_FILE`: Image file not provided for upload
- `AI_SERVICE_ERROR`: AI generation service unavailable
- `IMAGE_ANALYSIS_ERROR`: Image analysis failed
- `ICON_GENERATION_ERROR`: Icon generation failed
- `ICON_RETRIEVAL_ERROR`: Failed to retrieve icons
- `ICON_SEARCH_ERROR`: Icon search failed
- `ICON_DELETION_ERROR`: Failed to delete icon
- `MISSING_SEARCH_QUERY`: Search query not provided
- `INVALID_SEARCH_TERM`: Search term invalid or too long

### System Errors
- `INTERNAL_ERROR`: Unexpected server error
- `DATABASE_INDEX_BUILDING`: Database indexes being created
- `PAGINATION_ERROR`: Invalid pagination parameters
- `PAGINATION_CURSOR_ERROR`: Invalid pagination cursor

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

## Rate Limiting

Currently no rate limiting is implemented, but consider implementing:
- Per-user rate limits for AI generation endpoints
- Global rate limits for public endpoints
- File upload size limits (currently handled by middleware)

## File Upload Specifications

### Supported Image Formats
- JPEG (`image/jpeg`)
- PNG (`image/png`) 
- GIF (`image/gif`)
- WebP (`image/webp`)

### File Size Limits
- Maximum file size: Configured in upload middleware
- Recommended: 10MB for image uploads

## Cultural Context Integration

The API integrates cultural context from user profiles into AI generation:

1. **Language Preferences**: Primary and secondary languages with dialects
2. **Geographic Context**: Country and region information
3. **Cultural Adaptation**: Symbols and styles appropriate to user's background
4. **Demographic Considerations**: Age-appropriate and culturally sensitive content

## Storage Integration

### Google Cloud Storage
- Icons are automatically stored in Google Cloud Storage
- Public URLs are generated for persistent access
- Storage paths follow pattern: `icons/{userId}/{timestamp}-{id}.{ext}`
- Automatic cleanup when icons are deleted

### Fallback Behavior
- If storage fails, icons are returned as base64 data
- Storage warnings included in response
- Graceful degradation ensures service availability

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

## Testing Resources

### Automated Testing
- `scripts/test-api.js`: Complete API test suite
- `scripts/test-user-profile.js`: User profile endpoint tests
- `scripts/test-profile-direct.js`: Service layer tests

### Authentication Testing
- `scripts/generate-test-token.js`: Generate Firebase test tokens
- `scripts/get-id-token.js`: Get Firebase ID tokens

### Postman Collection
- `Smart_AAC_API_Postman_Collection.json`: Complete endpoint collection
- `POSTMAN_TESTING_GUIDE.md`: Testing workflows and examples

## Version History

### v2.0 (Current)
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

*This specification reflects the current implementation as of the route files analysis. For the most up-to-date interactive documentation, visit the Swagger UI at `/api-docs`.*