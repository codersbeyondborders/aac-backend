#!/usr/bin/env node

/**
 * Test script for storage and database services
 * Checks if Cloud Storage and Firestore are working properly
 */

require('dotenv').config();
const StorageService = require('../src/services/storage');
const firestoreService = require('../src/services/firestore');

async function testStorageServices() {
  console.log('🧪 Testing Storage and Database Services');
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Firestore Service
    console.log('\n1. Testing Firestore Service...');
    
    try {
      await firestoreService.initialize();
      console.log('   ✅ Firestore service initialized successfully');
      
      // Test basic operations
      const testDoc = {
        testField: 'test value',
        timestamp: new Date().toISOString()
      };
      
      const created = await firestoreService.create('_test_collection', testDoc);
      console.log(`   ✅ Test document created: ${created.id}`);
      
      const retrieved = await firestoreService.read('_test_collection', created.id);
      console.log(`   ✅ Test document retrieved: ${retrieved.testField}`);
      
      await firestoreService.delete('_test_collection', created.id);
      console.log('   ✅ Test document deleted');
      
    } catch (firestoreError) {
      console.log(`   ❌ Firestore test failed: ${firestoreError.message}`);
    }
    
    // Test 2: Cloud Storage Service
    console.log('\n2. Testing Cloud Storage Service...');
    
    try {
      const storageService = new StorageService();
      
      // Test connection
      const connectionTest = await storageService.testConnection();
      if (connectionTest) {
        console.log('   ✅ Cloud Storage connection successful');
      } else {
        console.log('   ❌ Cloud Storage connection failed');
      }
      
      // Test file upload with a small test file
      const testBuffer = Buffer.from('Test file content for storage test');
      const uploadResult = await storageService.uploadFile(
        testBuffer, 
        'test-file.txt',
        { contentType: 'text/plain', testUpload: true }
      );
      
      console.log(`   ✅ Test file uploaded: ${uploadResult.filename}`);
      console.log(`   📄 Public URL: ${uploadResult.publicUrl}`);
      console.log(`   📏 File size: ${uploadResult.size} bytes`);
      
      // Clean up test file
      await storageService.deleteFile(uploadResult.filename);
      console.log('   ✅ Test file deleted');
      
    } catch (storageError) {
      console.log(`   ❌ Cloud Storage test failed: ${storageError.message}`);
    }
    
    // Test 3: Icon Service Integration
    console.log('\n3. Testing Icon Service Integration...');
    
    try {
      const iconService = require('../src/services/icons');
      
      // Test storing a simple icon
      const testImageData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
        0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x57, 0x63, 0xF8, 0x0F, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x5C, 0xC2, 0x8A, 0x8E, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]).toString('base64');
      
      const testUserId = 'test-user-' + Date.now();
      
      const storedIcon = await iconService.storeIcon(
        testUserId,
        testImageData,
        'image/png',
        {
          iconType: 'test',
          generationMethod: 'test-script',
          originalText: 'test icon',
          tags: ['test']
        }
      );
      
      console.log(`   ✅ Icon stored successfully: ${storedIcon.id}`);
      console.log(`   📄 Public URL: ${storedIcon.publicUrl}`);
      
      // Retrieve the icon
      const retrievedIcon = await iconService.getIcon(storedIcon.id, testUserId);
      console.log(`   ✅ Icon retrieved successfully: ${retrievedIcon.originalText}`);
      
      // Clean up test icon
      await iconService.deleteIcon(storedIcon.id, testUserId);
      console.log('   ✅ Test icon deleted');
      
    } catch (iconError) {
      console.log(`   ❌ Icon service test failed: ${iconError.message}`);
    }
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 Storage Services Test Summary:');
    console.log('   • Firestore: Database operations');
    console.log('   • Cloud Storage: File upload/download');
    console.log('   • Icon Service: End-to-end icon storage');
    console.log('✅ Storage services test completed!');
    
  } catch (error) {
    console.error('\n❌ Storage services test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testStorageServices().catch(console.error);
}

module.exports = { testStorageServices };