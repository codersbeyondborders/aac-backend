const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const boardsService = require('../services/boards');
const { validateRequestBody, validateBoardData, validatePaginationParams } = require('../utils/validation');

const router = express.Router();

/**
 * @swagger
 * /api/v1/boards:
 *   post:
 *     tags: [Boards]
 *     summary: Create a new AAC board
 *     description: Creates a new communication board for the authenticated user
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBoardRequest'
 *           example:
 *             name: "My Communication Board"
 *             description: "A board for daily communication needs"
 *             isPublic: false
 *             icons: []
 *     responses:
 *       201:
 *         description: Board created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AACBoard'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', isAuthenticated, validateRequestBody(validateBoardData), async (req, res) => {
  try {
    console.log(`Creating board for user: ${req.user.uid}`);
    
    const boardData = req.validatedBody || req.body;
    const createdBoard = await boardsService.createBoard(req.user.uid, boardData);
    
    res.status(201).json({
      success: true,
      data: createdBoard,
      message: 'Board created successfully'
    });
    
  } catch (error) {
    console.error('Board creation error:', error.message);
    
    if (error.message.includes('validation') || error.message.includes('required')) {
      return res.status(400).json({
        error: error.message,
        code: 'BOARD_VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      error: 'Failed to create board',
      code: 'BOARD_CREATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/boards:
 *   get:
 *     tags: [Boards]
 *     summary: List user's boards
 *     description: Retrieves all boards owned by the authenticated user with pagination support
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of boards per page
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, name]
 *           default: updatedAt
 *         description: Field to sort by
 *       - in: query
 *         name: orderDirection
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort direction
 *       - in: query
 *         name: startAfter
 *         schema:
 *           type: string
 *         description: Cursor for pagination (JSON encoded)
 *     responses:
 *       200:
 *         description: User boards retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AACBoard'
 *       400:
 *         description: Invalid pagination parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', isAuthenticated, async (req, res) => {
  try {
    console.log(`Retrieving boards for user: ${req.user.uid}`);
    
    // Validate pagination parameters
    const paginationValidation = validatePaginationParams(req.query);
    if (!paginationValidation.isValid) {
      return res.status(400).json({
        error: 'Invalid pagination parameters',
        code: 'PAGINATION_ERROR',
        details: paginationValidation.errors,
        timestamp: new Date().toISOString()
      });
    }
    
    const { page, limit } = paginationValidation.sanitizedParams;
    
    // Build query options
    const options = {
      limit,
      orderBy: req.query.orderBy || 'updatedAt',
      orderDirection: req.query.orderDirection || 'desc'
    };
    
    // Handle pagination cursor if provided
    if (req.query.startAfter) {
      try {
        options.startAfter = JSON.parse(req.query.startAfter);
      } catch (parseError) {
        return res.status(400).json({
          error: 'Invalid startAfter parameter',
          code: 'PAGINATION_CURSOR_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    const result = await boardsService.getUserBoards(req.user.uid, options);
    
    res.json({
      success: true,
      data: result.documents,
      pagination: {
        count: result.count,
        hasMore: result.hasMore,
        page,
        limit,
        nextCursor: result.lastDocument || null
      }
    });
    
  } catch (error) {
    console.error('Board retrieval error:', error.message);
    
    // Check if this is a database index error
    if (error.message.includes('Database index required') || error.message.includes('requires an index')) {
      return res.status(503).json({
        error: 'Database indexes are being created. Please try again in a few minutes.',
        code: 'DATABASE_INDEX_BUILDING',
        details: 'Firestore composite indexes are required for this query. They are being created and will be available shortly.',
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      error: 'Failed to retrieve boards',
      code: 'BOARD_RETRIEVAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/boards/public:
 *   get:
 *     tags: [Public, Boards]
 *     summary: Get public boards
 *     description: |
 *       Retrieves publicly available AAC boards. No authentication required.
 *       Supports pagination and search functionality.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of boards per page
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, name]
 *           default: updatedAt
 *         description: Field to sort by
 *       - in: query
 *         name: orderDirection
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort direction
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description: Search term for board names and descriptions
 *       - in: query
 *         name: startAfter
 *         schema:
 *           type: string
 *         description: Cursor for pagination (JSON encoded)
 *     responses:
 *       200:
 *         description: Public boards retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AACBoard'
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/public', async (req, res) => {
  try {
    console.log('Retrieving public boards');
    
    // Validate pagination parameters
    const paginationValidation = validatePaginationParams(req.query);
    if (!paginationValidation.isValid) {
      return res.status(400).json({
        error: 'Invalid pagination parameters',
        code: 'PAGINATION_ERROR',
        details: paginationValidation.errors,
        timestamp: new Date().toISOString()
      });
    }
    
    const { page, limit } = paginationValidation.sanitizedParams;
    
    // Build query options for public boards
    const options = {
      limit,
      orderBy: req.query.orderBy || 'updatedAt',
      orderDirection: req.query.orderDirection || 'desc'
    };
    
    // Handle pagination cursor if provided
    if (req.query.startAfter) {
      try {
        options.startAfter = JSON.parse(req.query.startAfter);
      } catch (parseError) {
        return res.status(400).json({
          error: 'Invalid startAfter parameter',
          code: 'PAGINATION_CURSOR_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Optional search functionality
    if (req.query.search && typeof req.query.search === 'string') {
      const searchTerm = req.query.search.trim();
      if (searchTerm.length > 0 && searchTerm.length <= 100) {
        const searchResult = await boardsService.searchBoards(searchTerm, null, true, options);
        
        return res.json({
          success: true,
          data: searchResult.documents,
          pagination: {
            count: searchResult.count,
            hasMore: searchResult.hasMore,
            page,
            limit,
            searchTerm: searchTerm
          }
        });
      } else {
        return res.status(400).json({
          error: 'Search term must be 1-100 characters',
          code: 'INVALID_SEARCH_TERM',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    const result = await boardsService.getPublicBoards(options);
    
    res.json({
      success: true,
      data: result.documents,
      pagination: {
        count: result.count,
        hasMore: result.hasMore,
        page,
        limit,
        nextCursor: result.lastDocument || null
      }
    });
    
  } catch (error) {
    console.error('Public boards retrieval error:', error.message);
    
    // Check if this is a database index error
    if (error.message.includes('Database index required') || error.message.includes('requires an index')) {
      return res.status(503).json({
        error: 'Database indexes are being created. Please try again in a few minutes.',
        code: 'DATABASE_INDEX_BUILDING',
        details: 'Firestore composite indexes are required for this query. They are being created and will be available shortly.',
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      error: 'Failed to retrieve public boards',
      code: 'PUBLIC_BOARDS_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/boards/{id}:
 *   get:
 *     tags: [Boards]
 *     summary: Get specific board
 *     description: Retrieves a specific board by ID. User must own the board or it must be public.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *         example: "abc123def456"
 *     responses:
 *       200:
 *         description: Board retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AACBoard'
 *       400:
 *         description: Invalid board ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Access denied - board is private
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Board not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', async (req, res) => {
  try {
    const boardId = req.params.id;
    
    if (!boardId || typeof boardId !== 'string') {
      return res.status(400).json({
        error: 'Board ID is required',
        code: 'MISSING_BOARD_ID',
        timestamp: new Date().toISOString()
      });
    }
        
    const board = await boardsService.getBoard(boardId);
    
    if (!board) {
      return res.status(404).json({
        error: 'Board not found',
        code: 'BOARD_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: board
    });
    
  } catch (error) {
    console.error('Board retrieval error:', error.message);
    
    if (error.message.includes('Access denied')) {
      return res.status(403).json({
        error: error.message,
        code: 'BOARD_ACCESS_DENIED',
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      error: 'Failed to retrieve board',
      code: 'BOARD_RETRIEVAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;/**

 * PUT /api/v1/boards/:id - Update board
 * Requirements: 3.4, 7.1, 7.5
 */
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const boardId = req.params.id;
    
    if (!boardId || typeof boardId !== 'string') {
      return res.status(400).json({
        error: 'Board ID is required',
        code: 'MISSING_BOARD_ID',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`Updating board: ${boardId} for user: ${req.user.uid}`);
    
    // Validate update data (partial validation for updates)
    const updateData = req.body;
    if (!updateData || typeof updateData !== 'object') {
      return res.status(400).json({
        error: 'Update data must be an object',
        code: 'INVALID_UPDATE_DATA',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validate individual fields if they are provided
    const errors = [];
    
    if (updateData.name !== undefined) {
      if (typeof updateData.name !== 'string' || updateData.name.trim().length === 0 || updateData.name.length > 100) {
        errors.push('Board name must be a non-empty string (max 100 characters)');
      }
    }
    
    if (updateData.description !== undefined) {
      if (typeof updateData.description !== 'string' || updateData.description.length > 500) {
        errors.push('Board description must be a string (max 500 characters)');
      }
    }
    
    if (updateData.isPublic !== undefined) {
      if (typeof updateData.isPublic !== 'boolean') {
        errors.push('isPublic must be a boolean');
      }
    }
    
    if (updateData.icons !== undefined) {
      if (!Array.isArray(updateData.icons)) {
        errors.push('Icons must be an array');
      } else if (updateData.icons.length > 50) {
        errors.push('Maximum 50 icons allowed per board');
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'UPDATE_VALIDATION_ERROR',
        details: errors,
        timestamp: new Date().toISOString()
      });
    }
    
    const updatedBoard = await boardsService.updateBoard(boardId, req.user.uid, updateData);
    
    res.json({
      success: true,
      data: updatedBoard,
      message: 'Board updated successfully'
    });
    
  } catch (error) {
    console.error('Board update error:', error.message);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Board not found',
        code: 'BOARD_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }
    
    if (error.message.includes('Access denied')) {
      return res.status(403).json({
        error: error.message,
        code: 'BOARD_ACCESS_DENIED',
        timestamp: new Date().toISOString()
      });
    }
    
    if (error.message.includes('validation') || error.message.includes('required')) {
      return res.status(400).json({
        error: error.message,
        code: 'BOARD_VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      error: 'Failed to update board',
      code: 'BOARD_UPDATE_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/boards/:id - Delete board
 * Requirements: 3.5, 7.1, 7.5
 */
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const boardId = req.params.id;
    
    if (!boardId || typeof boardId !== 'string') {
      return res.status(400).json({
        error: 'Board ID is required',
        code: 'MISSING_BOARD_ID',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`Deleting board: ${boardId} for user: ${req.user.uid}`);
    
    const success = await boardsService.deleteBoard(boardId, req.user.uid);
    
    if (success) {
      res.json({
        success: true,
        message: 'Board deleted successfully'
      });
    } else {
      res.status(500).json({
        error: 'Failed to delete board',
        code: 'BOARD_DELETION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('Board deletion error:', error.message);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Board not found',
        code: 'BOARD_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }
    
    if (error.message.includes('Access denied')) {
      return res.status(403).json({
        error: error.message,
        code: 'BOARD_ACCESS_DENIED',
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      error: 'Failed to delete board',
      code: 'BOARD_DELETION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

