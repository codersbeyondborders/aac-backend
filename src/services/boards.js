const firestoreService = require('./firestore');

/**
 * AAC Board Data Operations Service
 * Handles board CRUD operations, user ownership validation, and public board functionality
 */
class BoardsService {
  constructor() {
    this.collectionName = 'aac_boards';
  }

  /**
   * Validate board data structure
   * @param {Object} boardData - Board data to validate
   * @param {boolean} [isUpdate] - Whether this is an update operation
   */
  validateBoardData(boardData, isUpdate = false) {
    if (!boardData || typeof boardData !== 'object') {
      throw new Error('Board data must be an object');
    }

    // Required fields for creation
    if (!isUpdate) {
      if (!boardData.name || typeof boardData.name !== 'string' || boardData.name.trim().length === 0) {
        throw new Error('Board name is required and must be a non-empty string');
      }
      
      if (!boardData.description || typeof boardData.description !== 'string') {
        throw new Error('Board description is required and must be a string');
      }
    }

    // Optional validation for updates
    if (boardData.name !== undefined) {
      if (typeof boardData.name !== 'string' || boardData.name.trim().length === 0) {
        throw new Error('Board name must be a non-empty string');
      }
    }

    if (boardData.description !== undefined) {
      if (typeof boardData.description !== 'string') {
        throw new Error('Board description must be a string');
      }
    }

    if (boardData.isPublic !== undefined) {
      if (typeof boardData.isPublic !== 'boolean') {
        throw new Error('isPublic must be a boolean');
      }
    }

    if (boardData.icons !== undefined) {
      if (!Array.isArray(boardData.icons)) {
        throw new Error('Icons must be an array');
      }
      
      // Validate each icon
      boardData.icons.forEach((icon, index) => {
        this.validateIconData(icon, index);
      });
    }
  }

  /**
   * Validate icon data structure
   * @param {Object} iconData - Icon data to validate
   * @param {number} index - Icon index for error messages
   */
  validateIconData(iconData, index) {
    if (!iconData || typeof iconData !== 'object') {
      throw new Error(`Icon at index ${index} must be an object`);
    }

    if (!iconData.id || typeof iconData.id !== 'string') {
      throw new Error(`Icon at index ${index} must have a valid id`);
    }

    if (!iconData.text || typeof iconData.text !== 'string') {
      throw new Error(`Icon at index ${index} must have valid text`);
    }

    if (iconData.imageUrl && typeof iconData.imageUrl !== 'string') {
      throw new Error(`Icon at index ${index} imageUrl must be a string`);
    }

    if (iconData.position) {
      if (typeof iconData.position !== 'object' || 
          typeof iconData.position.x !== 'number' || 
          typeof iconData.position.y !== 'number') {
        throw new Error(`Icon at index ${index} position must have numeric x and y coordinates`);
      }
    }

    if (iconData.category && typeof iconData.category !== 'string') {
      throw new Error(`Icon at index ${index} category must be a string`);
    }
  }

  /**
   * Create a new AAC board
   * @param {string} userId - User ID (board owner)
   * @param {Object} boardData - Board data
   * @returns {Promise<Object>} Created board
   */
  async createBoard(userId, boardData) {
    try {
      console.log(`Creating board for user: ${userId}`);
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Validate board data
      this.validateBoardData(boardData);

      // Prepare board document
      const boardToCreate = {
        userId,
        name: boardData.name.trim(),
        description: boardData.description.trim(),
        isPublic: boardData.isPublic || false,
        icons: boardData.icons || [],
        metadata: {
          version: 1,
          iconCount: (boardData.icons || []).length
        }
      };

      const createdBoard = await firestoreService.create(this.collectionName, boardToCreate);

      console.log(`✓ Board created successfully with ID: ${createdBoard.id}`);
      return createdBoard;
      
    } catch (error) {
      console.error(`✗ Failed to create board for user ${userId}:`, error.message);
      throw new Error(`Board creation failed: ${error.message}`);
    }
  }

  /**
   * Get a specific board by ID
   * @param {string} boardId - Board ID
   * @param {string} [userId] - User ID for ownership validation
   * @returns {Promise<Object|null>} Board data or null if not found
   */
  async getBoard(boardId, userId = null) {
    try {
      console.log(`Retrieving board: ${boardId}`);
      
      if (!boardId) {
        throw new Error('Board ID is required');
      }

      const board = await firestoreService.read(this.collectionName, boardId);
      
      if (!board) {
        return null;
      }

      // Check access permissions
      if (!board.isPublic) {
        throw new Error('Access denied: Board is private and you are not the owner');
      }

      console.log(`✓ Board retrieved successfully: ${boardId}`);
      return board;
      
    } catch (error) {
      console.error(`✗ Failed to retrieve board ${boardId}:`, error.message);
      throw new Error(`Board retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get user's boards with pagination
   * @param {string} userId - User ID
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Maximum number of boards to return
   * @param {Object} [options.startAfter] - Document to start after for pagination
   * @param {string} [options.orderBy] - Field to order by (default: 'updatedAt')
   * @param {string} [options.orderDirection] - Order direction (default: 'desc')
   * @returns {Promise<Object>} User boards with pagination info
   */
  async getUserBoards(userId, options = {}) {
    try {
      console.log(`Retrieving boards for user: ${userId}`);
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      const queryOptions = {
        where: [['userId', '==', userId]],
        orderBy: options.orderBy || 'updatedAt',
        orderDirection: options.orderDirection || 'desc',
        limit: options.limit || 20,
        startAfter: options.startAfter
      };

      const result = await firestoreService.query(this.collectionName, queryOptions);

      console.log(`✓ Retrieved ${result.documents.length} boards for user: ${userId}`);
      return result;
      
    } catch (error) {
      console.error(`✗ Failed to retrieve boards for user ${userId}:`, error.message);
      throw new Error(`User boards retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get public boards with pagination
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Maximum number of boards to return
   * @param {Object} [options.startAfter] - Document to start after for pagination
   * @param {string} [options.orderBy] - Field to order by (default: 'updatedAt')
   * @param {string} [options.orderDirection] - Order direction (default: 'desc')
   * @returns {Promise<Object>} Public boards with pagination info
   */
  async getPublicBoards(options = {}) {
    try {
      console.log('Retrieving public boards');
      
      const queryOptions = {
        where: [['isPublic', '==', true]],
        orderBy: options.orderBy || 'updatedAt',
        orderDirection: options.orderDirection || 'desc',
        limit: options.limit || 20,
        startAfter: options.startAfter
      };

      const result = await firestoreService.query(this.collectionName, queryOptions);

      console.log(`✓ Retrieved ${result.documents.length} public boards`);
      return result;
      
    } catch (error) {
      console.error(`✗ Failed to retrieve public boards:`, error.message);
      throw new Error(`Public boards retrieval failed: ${error.message}`);
    }
  }

  /**
   * Update a board
   * @param {string} boardId - Board ID
   * @param {string} userId - User ID (for ownership validation)
   * @param {Object} updates - Board updates
   * @returns {Promise<Object>} Updated board
   */
  async updateBoard(boardId, userId, updates) {
    try {
      console.log(`Updating board: ${boardId} for user: ${userId}`);
      
      if (!boardId) {
        throw new Error('Board ID is required');
      }
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Validate update data
      this.validateBoardData(updates, true);

      // Check ownership
      const existingBoard = await this.getBoard(boardId, userId);
      if (!existingBoard) {
        throw new Error('Board not found');
      }

      if (existingBoard.userId !== userId) {
        throw new Error('Access denied: You can only update your own boards');
      }

      // Prepare updates
      const updateData = {};
      
      if (updates.name !== undefined) {
        updateData.name = updates.name.trim();
      }
      
      if (updates.description !== undefined) {
        updateData.description = updates.description.trim();
      }
      
      if (updates.isPublic !== undefined) {
        updateData.isPublic = updates.isPublic;
      }
      
      if (updates.icons !== undefined) {
        updateData.icons = updates.icons;
        updateData['metadata.iconCount'] = updates.icons.length;
        updateData['metadata.version'] = (existingBoard.metadata?.version || 1) + 1;
      }

      const updatedBoard = await firestoreService.update(this.collectionName, boardId, updateData);

      console.log(`✓ Board updated successfully: ${boardId}`);
      return updatedBoard;
      
    } catch (error) {
      console.error(`✗ Failed to update board ${boardId}:`, error.message);
      throw new Error(`Board update failed: ${error.message}`);
    }
  }

  /**
   * Delete a board
   * @param {string} boardId - Board ID
   * @param {string} userId - User ID (for ownership validation)
   * @returns {Promise<boolean>} Success status
   */
  async deleteBoard(boardId, userId) {
    try {
      console.log(`Deleting board: ${boardId} for user: ${userId}`);
      
      if (!boardId) {
        throw new Error('Board ID is required');
      }
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Check ownership
      const existingBoard = await this.getBoard(boardId, userId);
      if (!existingBoard) {
        throw new Error('Board not found');
      }

      if (existingBoard.userId !== userId) {
        throw new Error('Access denied: You can only delete your own boards');
      }

      const success = await firestoreService.delete(this.collectionName, boardId);

      if (success) {
        console.log(`✓ Board deleted successfully: ${boardId}`);
      }
      
      return success;
      
    } catch (error) {
      console.error(`✗ Failed to delete board ${boardId}:`, error.message);
      throw new Error(`Board deletion failed: ${error.message}`);
    }
  }

  /**
   * Add icon to board
   * @param {string} boardId - Board ID
   * @param {string} userId - User ID (for ownership validation)
   * @param {Object} iconData - Icon data to add
   * @returns {Promise<Object>} Updated board
   */
  async addIconToBoard(boardId, userId, iconData) {
    try {
      console.log(`Adding icon to board: ${boardId}`);
      
      // Validate icon data
      this.validateIconData(iconData, 0);

      // Get current board
      const board = await this.getBoard(boardId, userId);
      if (!board) {
        throw new Error('Board not found');
      }

      if (board.userId !== userId) {
        throw new Error('Access denied: You can only modify your own boards');
      }

      // Add icon to board
      const updatedIcons = [...(board.icons || []), iconData];
      
      return await this.updateBoard(boardId, userId, { icons: updatedIcons });
      
    } catch (error) {
      console.error(`✗ Failed to add icon to board ${boardId}:`, error.message);
      throw new Error(`Add icon failed: ${error.message}`);
    }
  }

  /**
   * Remove icon from board
   * @param {string} boardId - Board ID
   * @param {string} userId - User ID (for ownership validation)
   * @param {string} iconId - Icon ID to remove
   * @returns {Promise<Object>} Updated board
   */
  async removeIconFromBoard(boardId, userId, iconId) {
    try {
      console.log(`Removing icon ${iconId} from board: ${boardId}`);
      
      // Get current board
      const board = await this.getBoard(boardId, userId);
      if (!board) {
        throw new Error('Board not found');
      }

      if (board.userId !== userId) {
        throw new Error('Access denied: You can only modify your own boards');
      }

      // Remove icon from board
      const updatedIcons = (board.icons || []).filter(icon => icon.id !== iconId);
      
      return await this.updateBoard(boardId, userId, { icons: updatedIcons });
      
    } catch (error) {
      console.error(`✗ Failed to remove icon from board ${boardId}:`, error.message);
      throw new Error(`Remove icon failed: ${error.message}`);
    }
  }

  /**
   * Search boards by name or description
   * @param {string} searchTerm - Search term
   * @param {string} [userId] - User ID (optional, for user-specific search)
   * @param {boolean} [includePublic] - Whether to include public boards
   * @param {Object} [options] - Query options
   * @returns {Promise<Object>} Search results
   */
  async searchBoards(searchTerm, userId = null, includePublic = true, options = {}) {
    try {
      console.log(`Searching boards with term: "${searchTerm}"`);
      
      if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length === 0) {
        throw new Error('Search term is required');
      }

      const searchTermLower = searchTerm.toLowerCase().trim();
      
      // Note: Firestore doesn't support full-text search natively
      // This is a basic implementation that would need to be enhanced
      // with a proper search service like Algolia or Elasticsearch for production
      
      let queryOptions = {
        orderBy: options.orderBy || 'updatedAt',
        orderDirection: options.orderDirection || 'desc',
        limit: options.limit || 50
      };

      // Build where clauses based on search criteria
      const whereConditions = [];
      
      if (userId && !includePublic) {
        // Search only user's boards
        whereConditions.push(['userId', '==', userId]);
      } else if (includePublic && !userId) {
        // Search only public boards
        whereConditions.push(['isPublic', '==', true]);
      }
      // If both userId and includePublic are true, we need multiple queries

      if (whereConditions.length > 0) {
        queryOptions.where = whereConditions;
      }

      const result = await firestoreService.query(this.collectionName, queryOptions);
      
      // Filter results by search term (client-side filtering)
      const filteredBoards = result.documents.filter(board => {
        const nameMatch = board.name.toLowerCase().includes(searchTermLower);
        const descriptionMatch = board.description.toLowerCase().includes(searchTermLower);
        return nameMatch || descriptionMatch;
      });

      const searchResult = {
        documents: filteredBoards,
        count: filteredBoards.length,
        searchTerm: searchTerm,
        hasMore: false // Since we're doing client-side filtering
      };

      console.log(`✓ Search completed. Found ${filteredBoards.length} matching boards`);
      return searchResult;
      
    } catch (error) {
      console.error(`✗ Board search failed:`, error.message);
      throw new Error(`Board search failed: ${error.message}`);
    }
  }

  /**
   * Get board statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Board statistics
   */
  async getBoardStats(userId) {
    try {
      console.log(`Getting board statistics for user: ${userId}`);
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Get all user boards
      const userBoards = await this.getUserBoards(userId, { limit: 1000 });
      
      const stats = {
        totalBoards: userBoards.count,
        publicBoards: 0,
        privateBoards: 0,
        totalIcons: 0,
        averageIconsPerBoard: 0,
        lastUpdated: null
      };

      userBoards.documents.forEach(board => {
        if (board.isPublic) {
          stats.publicBoards++;
        } else {
          stats.privateBoards++;
        }
        
        stats.totalIcons += (board.icons || []).length;
        
        if (!stats.lastUpdated || board.updatedAt > stats.lastUpdated) {
          stats.lastUpdated = board.updatedAt;
        }
      });

      if (stats.totalBoards > 0) {
        stats.averageIconsPerBoard = Math.round(stats.totalIcons / stats.totalBoards * 100) / 100;
      }

      console.log(`✓ Board statistics calculated for user: ${userId}`);
      return stats;
      
    } catch (error) {
      console.error(`✗ Failed to get board statistics for user ${userId}:`, error.message);
      throw new Error(`Board statistics failed: ${error.message}`);
    }
  }
}

// Create and export singleton instance
const boardsService = new BoardsService();

module.exports = boardsService;