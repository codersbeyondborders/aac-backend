const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart AAC API',
      version: '1.0.0',
      description: `
        Smart AAC Board API - A serverless API for managing AAC boards and generating culturally-appropriate icons.
        
        ## Features
        - 🔐 Firebase Authentication
        - 📋 AAC Board Management
        - 🎨 AI-Powered Icon Generation
        - 🌍 Cultural Context Support
        - 📱 Mobile-Optimized Responses
        
        ## Authentication
        Most endpoints require Firebase JWT authentication. Include the token in the Authorization header:
        \`Authorization: Bearer <your-firebase-jwt-token>\`
        
        ## Rate Limits
        - Icon generation: 100 requests per hour per user
        - Board operations: 1000 requests per hour per user
        
        ## Error Handling
        All errors follow a consistent format with appropriate HTTP status codes and detailed error messages.
      `,
      contact: {
        name: 'Smart AAC API Support',
        email: 'support@smartaac.app'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Development server'
      },
      {
        url: 'https://your-api-domain.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Firebase JWT token'
        }
      },
      schemas: {
        // Error Response Schema
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            code: {
              type: 'string',
              description: 'Error code'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp'
            },
            details: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Additional error details'
            }
          },
          required: ['error', 'code', 'timestamp']
        },
        
        // Success Response Schema
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              description: 'Response data'
            },
            message: {
              type: 'string',
              description: 'Success message'
            }
          },
          required: ['success']
        },
        
        // Health Status Schema
        HealthStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'],
              description: 'Overall system health status'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            uptime: {
              type: 'number',
              description: 'Server uptime in seconds'
            },
            environment: {
              type: 'string',
              enum: ['development', 'staging', 'production']
            },
            services: {
              type: 'object',
              properties: {
                firebase_auth: {
                  $ref: '#/components/schemas/ServiceHealth'
                },
                firestore: {
                  $ref: '#/components/schemas/ServiceHealth'
                },
                vertex_ai: {
                  $ref: '#/components/schemas/ServiceHealth'
                }
              }
            }
          }
        },
        
        // Service Health Schema
        ServiceHealth: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy']
            },
            message: {
              type: 'string'
            },
            details: {
              type: 'object'
            }
          }
        },
        
        // AAC Board Schema
        AACBoard: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique board identifier'
            },
            userId: {
              type: 'string',
              description: 'Owner user ID'
            },
            name: {
              type: 'string',
              maxLength: 100,
              description: 'Board name'
            },
            description: {
              type: 'string',
              maxLength: 500,
              description: 'Board description'
            },
            isPublic: {
              type: 'boolean',
              description: 'Whether the board is publicly accessible'
            },
            icons: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/BoardIcon'
              },
              description: 'Array of icons on the board'
            },
            metadata: {
              $ref: '#/components/schemas/BoardMetadata'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['id', 'userId', 'name', 'description', 'isPublic']
        },
        
        // Board Icon Schema
        BoardIcon: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique icon identifier'
            },
            text: {
              type: 'string',
              description: 'Icon text/label'
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
              description: 'URL to icon image'
            },
            position: {
              type: 'object',
              properties: {
                x: {
                  type: 'number',
                  description: 'X coordinate on board'
                },
                y: {
                  type: 'number',
                  description: 'Y coordinate on board'
                }
              },
              required: ['x', 'y']
            },
            category: {
              type: 'string',
              description: 'Icon category'
            },
            color: {
              type: 'string',
              description: 'Icon color (hex code)'
            }
          },
          required: ['id', 'text', 'position']
        },
        
        // Board Metadata Schema
        BoardMetadata: {
          type: 'object',
          properties: {
            version: {
              type: 'number',
              description: 'Board version number'
            },
            iconCount: {
              type: 'number',
              description: 'Total number of icons'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Board tags for search'
            },
            lastModified: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        
        // Board Creation Request Schema
        CreateBoardRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              maxLength: 100,
              description: 'Board name'
            },
            description: {
              type: 'string',
              maxLength: 500,
              description: 'Board description'
            },
            isPublic: {
              type: 'boolean',
              default: false,
              description: 'Whether the board should be publicly accessible'
            },
            icons: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/BoardIcon'
              },
              description: 'Initial icons for the board'
            }
          },
          required: ['name', 'description']
        },
        
        // Board Update Request Schema
        UpdateBoardRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              maxLength: 100,
              description: 'Board name'
            },
            description: {
              type: 'string',
              maxLength: 500,
              description: 'Board description'
            },
            isPublic: {
              type: 'boolean',
              description: 'Whether the board should be publicly accessible'
            },
            icons: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/BoardIcon'
              },
              description: 'Updated icons for the board'
            }
          }
        },
        
        // Icon Generation Request Schema
        GenerateIconRequest: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              description: 'Text description for icon generation'
            }
          },
          required: ['text']
        },
        
        // Generated Icon Response Schema
        GeneratedIconResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                imageData: {
                  type: 'string',
                  description: 'Base64 encoded image data'
                },
                mimeType: {
                  type: 'string',
                  description: 'Image MIME type'
                },
                prompt: {
                  type: 'string',
                  description: 'AI prompt used for generation'
                },
                text: {
                  type: 'string',
                  description: 'Original text input'
                },
                cultureProfile: {
                  $ref: '#/components/schemas/CultureProfile'
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        
        // Culture Profile Schema
        CultureProfile: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              description: 'ISO language code'
            },
            region: {
              type: 'string',
              description: 'ISO region code'
            },
            symbolStyle: {
              type: 'string',
              enum: ['simple', 'realistic', 'abstract', 'cartoon'],
              description: 'Preferred symbol style'
            }
          }
        },
        
        // Pagination Response Schema
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'array',
              items: {},
              description: 'Array of results'
            },
            pagination: {
              type: 'object',
              properties: {
                count: {
                  type: 'number',
                  description: 'Number of items in current page'
                },
                hasMore: {
                  type: 'boolean',
                  description: 'Whether there are more pages'
                },
                page: {
                  type: 'number',
                  description: 'Current page number'
                },
                limit: {
                  type: 'number',
                  description: 'Items per page'
                },
                nextCursor: {
                  type: 'object',
                  nullable: true,
                  description: 'Cursor for next page'
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Health',
        description: 'System health and monitoring endpoints'
      },
      {
        name: 'Boards',
        description: 'AAC board management operations'
      },
      {
        name: 'Icons',
        description: 'AI-powered icon generation'
      },
      {
        name: 'Public',
        description: 'Public endpoints (no authentication required)'
      }
    ]
  },
  apis: [
    './src/routes/*.js', // Path to the API routes
    './src/server.js'    // Include server file for additional docs
  ],
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi,
  swaggerOptions: {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: 'none'
    }
  }
};