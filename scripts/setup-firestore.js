#!/usr/bin/env node

/**
 * Firestore Database Setup Script
 * 
 * This script sets up the initial Firestore database structure,
 * creates sample data, and verifies the setup.
 */

const admin = require('firebase-admin');
require('dotenv').config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

class FirestoreSetup {
  constructor() {
    this.db = null;
  }

  async initialize() {
    try {
      log('🔥 Initializing Firebase Admin SDK...', colors.blue);
      
      if (!admin.apps.length) {
        admin.initializeApp({
          projectId: process.env.GOOGLE_CLOUD_PROJECT,
        });
      }
      
      this.db = admin.firestore();
      
      // Test connection
      await this.db.collection('_health_check').limit(1).get();
      
      log('✅ Firebase Admin SDK initialized successfully', colors.green);
      return true;
    } catch (error) {
      log(`❌ Failed to initialize Firebase: ${error.message}`, colors.red);
      return false;
    }
  }

  async createHealthCheckCollection() {
    try {
      log('📊 Creating health check collection...', colors.blue);
      
      const healthData = {
        status: 'healthy',
        lastCheck: admin.firestore.FieldValue.serverTimestamp(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
          firestore: 'connected',
          auth: 'enabled',
          storage: 'configured'
        }
      };
      
      await this.db.collection('_health_check').doc('status').set(healthData);
      
      log('✅ Health check collection created', colors.green);
      return true;
    } catch (error) {
      log(`❌ Failed to create health check collection: ${error.message}`, colors.red);
      return false;
    }
  }

  async createSamplePublicBoard() {
    try {
      log('📋 Creating sample public board...', colors.blue);
      
      const sampleBoard = {
        userId: 'system',
        name: 'Basic Communication Board',
        description: 'A sample board with common communication icons for AAC users',
        isPublic: true,
        icons: [
          {
            id: 'hello',
            text: 'Hello',
            imageUrl: null,
            position: { x: 0, y: 0 },
            category: 'greetings',
            color: '#4CAF50'
          },
          {
            id: 'thank-you',
            text: 'Thank You',
            imageUrl: null,
            position: { x: 1, y: 0 },
            category: 'greetings',
            color: '#2196F3'
          },
          {
            id: 'help',
            text: 'Help',
            imageUrl: null,
            position: { x: 0, y: 1 },
            category: 'needs',
            color: '#FF9800'
          },
          {
            id: 'yes',
            text: 'Yes',
            imageUrl: null,
            position: { x: 1, y: 1 },
            category: 'responses',
            color: '#4CAF50'
          },
          {
            id: 'no',
            text: 'No',
            imageUrl: null,
            position: { x: 2, y: 1 },
            category: 'responses',
            color: '#F44336'
          },
          {
            id: 'more',
            text: 'More',
            imageUrl: null,
            position: { x: 0, y: 2 },
            category: 'requests',
            color: '#9C27B0'
          }
        ],
        metadata: {
          version: 1,
          iconCount: 6,
          tags: ['basic', 'communication', 'sample', 'public'],
          lastModified: admin.firestore.FieldValue.serverTimestamp()
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await this.db.collection('aac_boards').add(sampleBoard);
      
      log(`✅ Sample public board created with ID: ${docRef.id}`, colors.green);
      return docRef.id;
    } catch (error) {
      log(`❌ Failed to create sample board: ${error.message}`, colors.red);
      return null;
    }
  }

  async createDefaultCultureProfile() {
    try {
      log('🌍 Creating default culture profile template...', colors.blue);
      
      const defaultProfile = {
        userId: 'default-template',
        culturalPreferences: {
          language: 'en',
          region: 'US',
          colorPreferences: ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0'],
          avoidColors: ['#F44336'],
          symbolStyle: 'simple',
          culturalContext: 'Western',
          accessibilityNeeds: {
            highContrast: false,
            largeText: false,
            simplifiedIcons: true,
            colorBlindFriendly: true
          }
        },
        isDefault: true,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await this.db.collection('culture_profiles').doc('default-template').set(defaultProfile);
      
      log('✅ Default culture profile template created', colors.green);
      return true;
    } catch (error) {
      log(`❌ Failed to create default culture profile: ${error.message}`, colors.red);
      return false;
    }
  }

  async createSampleIconLibrary() {
    try {
      log('🎨 Creating sample icon library entries...', colors.blue);
      
      const sampleIcons = [
        {
          text: 'happy face',
          imageUrl: null, // Would be populated after AI generation
          thumbnailUrl: null,
          mimeType: 'image/png',
          generatedBy: 'system',
          generationMethod: 'text',
          prompt: 'simple happy face icon, 2D, minimal, accessible design',
          model: 'imagen-005',
          cultureProfile: {
            language: 'en',
            region: 'US',
            symbolStyle: 'simple'
          },
          isPublic: true,
          usageCount: 0,
          tags: ['emotion', 'happy', 'face', 'basic'],
          category: 'emotions',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
          text: 'water glass',
          imageUrl: null,
          thumbnailUrl: null,
          mimeType: 'image/png',
          generatedBy: 'system',
          generationMethod: 'text',
          prompt: 'simple water glass icon, 2D, minimal, accessible design',
          model: 'imagen-005',
          cultureProfile: {
            language: 'en',
            region: 'US',
            symbolStyle: 'simple'
          },
          isPublic: true,
          usageCount: 0,
          tags: ['drink', 'water', 'glass', 'basic'],
          category: 'food-drink',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      ];
      
      let createdCount = 0;
      for (const icon of sampleIcons) {
        const docRef = await this.db.collection('icon_library').add(icon);
        log(`  ✓ Created icon: ${icon.text} (ID: ${docRef.id})`, colors.cyan);
        createdCount++;
      }
      
      log(`✅ Created ${createdCount} sample icon library entries`, colors.green);
      return createdCount;
    } catch (error) {
      log(`❌ Failed to create sample icon library: ${error.message}`, colors.red);
      return 0;
    }
  }

  async createSystemUser() {
    try {
      log('👤 Creating system user profile...', colors.blue);
      
      const systemUser = {
        uid: 'system',
        email: 'system@smartaac.app',
        displayName: 'Smart AAC System',
        photoURL: null,
        preferences: {
          theme: 'light',
          language: 'en',
          notifications: false,
          defaultBoardLayout: 'grid'
        },
        stats: {
          totalBoards: 1,
          publicBoards: 1,
          totalIcons: 0,
          lastActive: admin.firestore.FieldValue.serverTimestamp()
        },
        isActive: true,
        isPremium: false,
        subscriptionExpiry: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await this.db.collection('users').doc('system').set(systemUser);
      
      log('✅ System user profile created', colors.green);
      return true;
    } catch (error) {
      log(`❌ Failed to create system user: ${error.message}`, colors.red);
      return false;
    }
  }

  async verifySetup() {
    try {
      log('🔍 Verifying database setup...', colors.blue);
      
      const collections = [
        '_health_check',
        'aac_boards',
        'culture_profiles',
        'icon_library',
        'users'
      ];
      
      let verificationResults = {};
      
      for (const collection of collections) {
        try {
          const snapshot = await this.db.collection(collection).limit(1).get();
          verificationResults[collection] = {
            exists: true,
            documentCount: snapshot.size,
            status: 'ok'
          };
          log(`  ✓ ${collection}: ${snapshot.size} documents`, colors.cyan);
        } catch (error) {
          verificationResults[collection] = {
            exists: false,
            error: error.message,
            status: 'error'
          };
          log(`  ❌ ${collection}: ${error.message}`, colors.red);
        }
      }
      
      // Test query performance
      log('📊 Testing query performance...', colors.blue);
      
      const startTime = Date.now();
      await this.db.collection('aac_boards').where('isPublic', '==', true).limit(5).get();
      const queryTime = Date.now() - startTime;
      
      log(`  ✓ Public boards query: ${queryTime}ms`, colors.cyan);
      
      log('✅ Database verification completed', colors.green);
      return verificationResults;
    } catch (error) {
      log(`❌ Verification failed: ${error.message}`, colors.red);
      return null;
    }
  }

  async runFullSetup() {
    log('🚀 Starting Firestore Database Setup', colors.bright + colors.cyan);
    log('=====================================', colors.cyan);
    log(`Project ID: ${process.env.GOOGLE_CLOUD_PROJECT}`, colors.blue);
    log('');

    const results = {
      initialization: false,
      healthCheck: false,
      sampleBoard: null,
      cultureProfile: false,
      iconLibrary: 0,
      systemUser: false,
      verification: null
    };

    // Initialize Firebase
    results.initialization = await this.initialize();
    if (!results.initialization) {
      log('❌ Setup failed at initialization step', colors.red);
      return results;
    }

    // Create collections and data
    results.healthCheck = await this.createHealthCheckCollection();
    results.sampleBoard = await this.createSamplePublicBoard();
    results.cultureProfile = await this.createDefaultCultureProfile();
    results.iconLibrary = await this.createSampleIconLibrary();
    results.systemUser = await this.createSystemUser();

    // Verify setup
    results.verification = await this.verifySetup();

    // Summary
    log('');
    log('📋 Setup Summary', colors.bright + colors.magenta);
    log('================', colors.magenta);
    log(`✅ Initialization: ${results.initialization ? 'Success' : 'Failed'}`, 
        results.initialization ? colors.green : colors.red);
    log(`✅ Health Check: ${results.healthCheck ? 'Success' : 'Failed'}`, 
        results.healthCheck ? colors.green : colors.red);
    log(`✅ Sample Board: ${results.sampleBoard ? 'Created' : 'Failed'}`, 
        results.sampleBoard ? colors.green : colors.red);
    log(`✅ Culture Profile: ${results.cultureProfile ? 'Success' : 'Failed'}`, 
        results.cultureProfile ? colors.green : colors.red);
    log(`✅ Icon Library: ${results.iconLibrary} entries created`, 
        results.iconLibrary > 0 ? colors.green : colors.red);
    log(`✅ System User: ${results.systemUser ? 'Success' : 'Failed'}`, 
        results.systemUser ? colors.green : colors.red);

    const allSuccess = results.initialization && results.healthCheck && 
                      results.sampleBoard && results.cultureProfile && 
                      results.iconLibrary > 0 && results.systemUser;

    if (allSuccess) {
      log('');
      log('🎉 Firestore setup completed successfully!', colors.bright + colors.green);
      log('');
      log('Next steps:', colors.bright);
      log('1. Update your security rules in Firebase Console', colors.yellow);
      log('2. Create composite indexes for queries', colors.yellow);
      log('3. Test your API endpoints', colors.yellow);
      log('4. Run: npm run test:api', colors.yellow);
    } else {
      log('');
      log('⚠️  Setup completed with some issues. Please check the errors above.', colors.bright + colors.yellow);
    }

    return results;
  }
}

async function main() {
  // Check environment variables
  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    log('❌ GOOGLE_CLOUD_PROJECT environment variable not set', colors.red);
    log('Please set up your .env file first', colors.yellow);
    process.exit(1);
  }

  const setup = new FirestoreSetup();
  
  try {
    const results = await setup.runFullSetup();
    
    // Exit with appropriate code
    const success = results.initialization && results.healthCheck && 
                   results.sampleBoard && results.cultureProfile;
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    log(`💥 Setup failed with error: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  log('Firestore Database Setup Script', colors.bright);
  log('');
  log('Usage: node scripts/setup-firestore.js', colors.cyan);
  log('');
  log('This script will:', colors.bright);
  log('• Initialize Firebase Admin SDK', colors.green);
  log('• Create health check collection', colors.green);
  log('• Create sample public board', colors.green);
  log('• Create default culture profile template', colors.green);
  log('• Create sample icon library entries', colors.green);
  log('• Create system user profile', colors.green);
  log('• Verify the database setup', colors.green);
  log('');
  log('Make sure to set up your .env file and Firebase project first.', colors.yellow);
  process.exit(0);
}

// Run the main function
if (require.main === module) {
  main();
}