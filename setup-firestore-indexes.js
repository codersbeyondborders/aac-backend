const admin = require('firebase-admin');
require('dotenv').config();

async function setupFirestoreIndexes() {
  try {
    console.log('🔧 Setting up Firestore indexes...');
    
    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
      });
    }
    
    const db = admin.firestore();
    
    console.log('📋 Required Firestore Indexes for Smart AAC API:');
    console.log('');
    console.log('Collection: aac_boards');
    console.log('');
    console.log('1. Index for getUserBoards (userId + updatedAt):');
    console.log('   - Field: userId (Ascending)');
    console.log('   - Field: updatedAt (Descending)');
    console.log('');
    console.log('2. Index for getUserBoards with createdAt ordering:');
    console.log('   - Field: userId (Ascending)');
    console.log('   - Field: createdAt (Descending)');
    console.log('');
    console.log('3. Index for getUserBoards with name ordering:');
    console.log('   - Field: userId (Ascending)');
    console.log('   - Field: name (Ascending)');
    console.log('');
    console.log('4. Index for getPublicBoards (isPublic + updatedAt):');
    console.log('   - Field: isPublic (Ascending)');
    console.log('   - Field: updatedAt (Descending)');
    console.log('');
    console.log('5. Index for getPublicBoards with createdAt ordering:');
    console.log('   - Field: isPublic (Ascending)');
    console.log('   - Field: createdAt (Descending)');
    console.log('');
    console.log('6. Index for getPublicBoards with name ordering:');
    console.log('   - Field: isPublic (Ascending)');
    console.log('   - Field: name (Ascending)');
    console.log('');
    
    console.log('🌐 You can create these indexes using one of these methods:');
    console.log('');
    console.log('METHOD 1: Firebase Console (Recommended)');
    console.log('1. Go to: https://console.firebase.google.com/project/' + process.env.GOOGLE_CLOUD_PROJECT + '/firestore/indexes');
    console.log('2. Click "Create Index"');
    console.log('3. Collection ID: aac_boards');
    console.log('4. Add the fields as listed above for each index');
    console.log('');
    
    console.log('METHOD 2: Use the direct link from the error message');
    console.log('The error message contains a direct link to create the specific index needed.');
    console.log('');
    
    console.log('METHOD 3: Firebase CLI');
    console.log('Create a firestore.indexes.json file with the index definitions and deploy with:');
    console.log('firebase deploy --only firestore:indexes');
    console.log('');
    
    // Create the firestore.indexes.json file
    const indexesConfig = {
      indexes: [
        // AAC Boards indexes
        {
          collectionGroup: "aac_boards",
          queryScope: "COLLECTION",
          fields: [
            { fieldPath: "userId", order: "ASCENDING" },
            { fieldPath: "updatedAt", order: "DESCENDING" }
          ]
        },
        {
          collectionGroup: "aac_boards",
          queryScope: "COLLECTION",
          fields: [
            { fieldPath: "userId", order: "ASCENDING" },
            { fieldPath: "createdAt", order: "DESCENDING" }
          ]
        },
        {
          collectionGroup: "aac_boards",
          queryScope: "COLLECTION",
          fields: [
            { fieldPath: "userId", order: "ASCENDING" },
            { fieldPath: "name", order: "ASCENDING" }
          ]
        },
        {
          collectionGroup: "aac_boards",
          queryScope: "COLLECTION",
          fields: [
            { fieldPath: "isPublic", order: "ASCENDING" },
            { fieldPath: "updatedAt", order: "DESCENDING" }
          ]
        },
        {
          collectionGroup: "aac_boards",
          queryScope: "COLLECTION",
          fields: [
            { fieldPath: "isPublic", order: "ASCENDING" },
            { fieldPath: "createdAt", order: "DESCENDING" }
          ]
        },
        {
          collectionGroup: "aac_boards",
          queryScope: "COLLECTION",
          fields: [
            { fieldPath: "isPublic", order: "ASCENDING" },
            { fieldPath: "name", order: "ASCENDING" }
          ]
        },
        // User Profiles indexes (using document ID as userId, so no additional indexes needed for basic queries)
        // Note: user_profiles collection uses userId as document ID, so no composite indexes needed for single-user queries
      ]
    };
    
    // Write the indexes configuration file
    const fs = require('fs');
    fs.writeFileSync('firestore.indexes.json', JSON.stringify(indexesConfig, null, 2));
    
    console.log('✅ Created firestore.indexes.json file');
    console.log('');
    console.log('To deploy the indexes using Firebase CLI:');
    console.log('1. Install Firebase CLI: npm install -g firebase-tools');
    console.log('2. Login: firebase login');
    console.log('3. Set project: firebase use ' + process.env.GOOGLE_CLOUD_PROJECT);
    console.log('4. Deploy indexes: firebase deploy --only firestore:indexes');
    console.log('');
    
    console.log('⚠️  IMPORTANT: Index creation can take several minutes to complete.');
    console.log('    The API will return 500 errors until the indexes are built.');
    console.log('');
    
    console.log('🔗 Quick fix: Use the direct link from the error message to create the first index:');
    console.log('https://console.firebase.google.com/v1/r/project/' + process.env.GOOGLE_CLOUD_PROJECT + '/firestore/indexes?create_composite=...');
    
  } catch (error) {
    console.error('❌ Error setting up indexes:', error.message);
  }
}

setupFirestoreIndexes().then(() => {
  console.log('Setup completed');
}).catch(console.error);