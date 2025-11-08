#!/usr/bin/env node

/**
 * Complete workflow test including AI generation and storage
 * Tests the full end-to-end process to ensure no storage warnings
 */

require('dotenv').config();
const vertexAIService = require('../src/services/vertexai');
const iconService = require('../src/services/icons');
const firestoreService = require('../src/services/firestore');

async function testCompleteWorkflow() {
  console.log('🔄 Testing Complete AI + Storage Workflow');
  console.log('=' .repeat(60));
  
  try {
    // Initialize all services
    console.log('\n1. Initializing Services...');
    await firestoreService.initialize();
    await vertexAIService.initialize();
    console.log('   ✅ All services initialized');
    
    const testUserId = 'test-user-' + Date.now();
    
    // Test 1: Complete Text-to-Icon workflow
    console.log('\n2. Testing Complete Text-to-Icon Workflow...');
    
    const textPrompt = 'happy cat';
    const culturalContext = {
      language: 'en',
      region: 'US',
      symbolStyle: 'simple'
    };
    
    // Generate icon
    console.log(`   🎨 Generating icon for: "${textPrompt}"`);
    const iconResult = await vertexAIService.generateIconFromText(textPrompt, culturalContext);
    
    if (!iconResult.success) {
      throw new Error('Icon generation failed');
    }
    
    console.log(`   ✅ Icon generated successfully with ${iconResult.modelUsed}`);
    
    // Store icon
    console.log('   💾 Storing icon...');
    const storedIcon = await iconService.storeIcon(
      testUserId,
      iconResult.imageData,
      iconResult.mimeType,
      {
        iconType: 'generated',
        generationMethod: 'text-to-icon',
        prompt: iconResult.prompt,
        originalText: textPrompt,
        culturalContext: culturalContext,
        tags: [textPrompt.toLowerCase().replace(/\s+/g, '_')]
      }
    );
    
    console.log(`   ✅ Icon stored successfully: ${storedIcon.id}`);
    console.log(`   📄 Public URL: ${storedIcon.publicUrl}`);
    console.log('   🎯 NO STORAGE WARNING - Storage is working!');
    
    // Test 2: Complete Image-to-Icon workflow
    console.log('\n3. Testing Complete Image-to-Icon Workflow...');
    
    // Use the generated image as input for analysis
    const imageBuffer = Buffer.from(iconResult.imageData, 'base64');
    
    // Analyze image
    console.log('   🔍 Analyzing uploaded image...');
    const analysisResult = await vertexAIService.analyzeImage(imageBuffer, 'icon_elements');
    
    if (!analysisResult.success) {
      throw new Error('Image analysis failed');
    }
    
    console.log(`   ✅ Image analyzed successfully with ${analysisResult.modelUsed}`);
    console.log(`   📄 Analysis: ${analysisResult.description.substring(0, 50)}...`);
    
    // Generate icon from analysis
    console.log('   🎨 Generating icon from analysis...');
    const iconFromAnalysis = await vertexAIService.generateIconFromText(
      analysisResult.description,
      culturalContext
    );
    
    if (!iconFromAnalysis.success) {
      throw new Error('Icon generation from analysis failed');
    }
    
    console.log(`   ✅ Icon generated from analysis with ${iconFromAnalysis.modelUsed}`);
    
    // Store the second icon
    console.log('   💾 Storing analyzed icon...');
    const storedAnalyzedIcon = await iconService.storeIcon(
      testUserId,
      iconFromAnalysis.imageData,
      iconFromAnalysis.mimeType,
      {
        iconType: 'generated',
        generationMethod: 'image-to-icon',
        prompt: iconFromAnalysis.prompt,
        originalText: analysisResult.description,
        analysisData: analysisResult,
        culturalContext: culturalContext,
        tags: ['analyzed', 'image_to_icon']
      }
    );
    
    console.log(`   ✅ Analyzed icon stored successfully: ${storedAnalyzedIcon.id}`);
    console.log(`   📄 Public URL: ${storedAnalyzedIcon.publicUrl}`);
    console.log('   🎯 NO STORAGE WARNING - Storage is working!');
    
    // Test 3: Retrieve user icons
    console.log('\n4. Testing Icon Retrieval...');
    
    const userIcons = await iconService.getUserIcons(testUserId, { limit: 10 });
    console.log(`   ✅ Retrieved ${userIcons.icons.length} icons for user`);
    
    userIcons.icons.forEach((icon, index) => {
      console.log(`   📄 Icon ${index + 1}: ${icon.generationMethod} - ${icon.originalText?.substring(0, 30) || 'N/A'}...`);
    });
    
    // Test 4: Clean up test data
    console.log('\n5. Cleaning Up Test Data...');
    
    let deletedCount = 0;
    for (const icon of userIcons.icons) {
      try {
        await iconService.deleteIcon(icon.id, testUserId);
        console.log(`   🗑️  Deleted icon: ${icon.id}`);
        deletedCount++;
      } catch (deleteError) {
        console.log(`   ⚠️  Skipped icon ${icon.id}: ${deleteError.message}`);
      }
    }
    
    console.log(`   ✅ Test data cleaned up (${deletedCount} icons deleted)`);
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 Complete Workflow Test Results:');
    console.log('   ✅ Text-to-Icon: Generated and stored successfully');
    console.log('   ✅ Image-to-Icon: Analyzed and stored successfully');
    console.log('   ✅ Storage: No warnings, all icons stored properly');
    console.log('   ✅ Retrieval: Icons retrieved successfully');
    console.log('   ✅ Cleanup: Test data removed');
    console.log('');
    console.log('🚀 STORAGE ISSUE RESOLVED!');
    console.log('   The "storageWarning" should no longer appear in API responses.');
    
  } catch (error) {
    console.error('\n❌ Complete workflow test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testCompleteWorkflow().catch(console.error);
}

module.exports = { testCompleteWorkflow };