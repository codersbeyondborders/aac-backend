#!/usr/bin/env node

/**
 * Setup script for Cloud Storage bucket
 * Creates the required storage bucket for icon storage
 */

require('dotenv').config();
const { Storage } = require('@google-cloud/storage');

async function setupStorageBucket() {
  console.log('🪣 Setting up Cloud Storage Bucket');
  console.log('=' .repeat(60));
  
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const bucketName = process.env.STORAGE_BUCKET_NAME;
    const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    
    console.log(`Project ID: ${projectId}`);
    console.log(`Bucket Name: ${bucketName}`);
    console.log(`Location: ${location}`);
    
    if (!projectId || !bucketName) {
      throw new Error('GOOGLE_CLOUD_PROJECT and STORAGE_BUCKET_NAME environment variables are required');
    }
    
    // Initialize Cloud Storage
    const storage = new Storage({
      projectId: projectId,
    });
    
    // Check if bucket already exists
    console.log('\n1. Checking if bucket exists...');
    const bucket = storage.bucket(bucketName);
    
    try {
      const [exists] = await bucket.exists();
      
      if (exists) {
        console.log('   ✅ Bucket already exists');
        
        // Test bucket access
        const [metadata] = await bucket.getMetadata();
        console.log(`   📍 Location: ${metadata.location}`);
        console.log(`   📅 Created: ${metadata.timeCreated}`);
        console.log(`   🔒 Storage Class: ${metadata.storageClass}`);
        
        return true;
      }
    } catch (error) {
      console.log('   ❌ Bucket does not exist or access denied');
    }
    
    // Create the bucket
    console.log('\n2. Creating storage bucket...');
    
    const bucketOptions = {
      location: location,
      storageClass: 'STANDARD',
      uniformBucketLevelAccess: true,
      publicAccessPrevention: 'inherited',
      versioning: {
        enabled: false
      },
      lifecycle: {
        rule: [
          {
            action: { type: 'Delete' },
            condition: { age: 365 } // Delete files older than 1 year
          }
        ]
      }
    };
    
    const [createdBucket] = await storage.createBucket(bucketName, bucketOptions);
    console.log(`   ✅ Bucket created successfully: ${createdBucket.name}`);
    
    // Set up CORS for web access
    console.log('\n3. Configuring CORS policy...');
    
    const corsConfiguration = [
      {
        origin: ['*'], // In production, replace with your domain
        method: ['GET', 'HEAD'],
        responseHeader: ['Content-Type', 'Access-Control-Allow-Origin'],
        maxAgeSeconds: 3600
      }
    ];
    
    await createdBucket.setCorsConfiguration(corsConfiguration);
    console.log('   ✅ CORS policy configured');
    
    // Test bucket functionality
    console.log('\n4. Testing bucket functionality...');
    
    // Upload a test file
    const testContent = Buffer.from('Test file for bucket verification');
    const testFile = createdBucket.file('_test/verification.txt');
    
    await testFile.save(testContent, {
      metadata: {
        contentType: 'text/plain',
        metadata: {
          purpose: 'bucket-verification',
          createdBy: 'setup-script'
        }
      }
    });
    
    console.log('   ✅ Test file uploaded');
    
    // Make test file public
    await testFile.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucketName}/_test/verification.txt`;
    console.log(`   📄 Test file public URL: ${publicUrl}`);
    
    // Clean up test file
    await testFile.delete();
    console.log('   ✅ Test file cleaned up');
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 Storage Bucket Setup Complete!');
    console.log(`   • Bucket Name: ${bucketName}`);
    console.log(`   • Location: ${location}`);
    console.log(`   • Storage Class: STANDARD`);
    console.log(`   • CORS: Configured for web access`);
    console.log(`   • Lifecycle: Auto-delete after 1 year`);
    console.log('   • Ready for icon storage! 🚀');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Storage bucket setup failed:', error.message);
    
    if (error.code === 409) {
      console.log('\n💡 The bucket name might already be taken globally.');
      console.log('   Try using a different STORAGE_BUCKET_NAME in your .env file.');
    } else if (error.code === 403) {
      console.log('\n💡 Permission denied. Make sure your service account has the following roles:');
      console.log('   • Storage Admin');
      console.log('   • Storage Object Admin');
    }
    
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  setupStorageBucket().catch(console.error);
}

module.exports = { setupStorageBucket };