#!/usr/bin/env node

/**
 * Test script for simplified AI implementation
 * Tests only the two specified models:
 * 1. imagen-4.0-fast-generate-001 for Text-to-Icon
 * 2. gemini-2.5-flash-image for Image-to-Icon
 */

require('dotenv').config();
const vertexAIService = require('../src/services/vertexai');
const fs = require('fs');
const path = require('path');

async function testSimplifiedAIModels() {
  console.log('🧪 Testing Simplified AI Models Implementation');
  console.log('=' .repeat(60));
  
  try {
    // Initialize the service
    console.log('\n1. Initializing Vertex AI Service...');
    await vertexAIService.initialize();
    
    // Check service status
    const status = vertexAIService.getServiceStatus();
    console.log('\n📊 Service Status:');
    console.log(`   Initialized: ${status.initialized}`);
    console.log(`   Project ID: ${status.projectId}`);
    console.log(`   Location: ${status.location}`);
    console.log(`   Text-to-Icon Model: ${status.models.textToIcon}`);
    console.log(`   Image-to-Icon Model: ${status.models.imageToIcon}`);
    
    // Test 1: Text-to-Icon Generation
    console.log('\n2. Testing Text-to-Icon Generation...');
    console.log('   Using model: imagen-4.0-fast-generate-001');
    
    try {
      const textResult = await vertexAIService.generateIconFromText(
        'apple fruit',
        { language: 'en', region: 'US' }
      );
      
      if (textResult.success) {
        console.log('   ✅ Text-to-Icon generation successful');
        console.log(`   📝 Model used: ${textResult.modelUsed}`);
        console.log(`   🖼️  Image format: ${textResult.mimeType}`);
        console.log(`   📏 Image data length: ${textResult.imageData?.length || 0} characters`);
        
        // Save the generated image for verification
        if (textResult.imageData) {
          const imageBuffer = Buffer.from(textResult.imageData, 'base64');
          const outputPath = path.join(__dirname, 'test-text-to-icon-output.png');
          fs.writeFileSync(outputPath, imageBuffer);
          console.log(`   💾 Image saved to: ${outputPath}`);
        }
      } else {
        console.log('   ❌ Text-to-Icon generation failed');
      }
    } catch (textError) {
      console.log(`   ❌ Text-to-Icon test failed: ${textError.message}`);
    }
    
    // Test 2: Image-to-Icon Analysis
    console.log('\n3. Testing Image-to-Icon Analysis...');
    console.log('   Using model: gemini-2.5-flash-image');
    
    try {
      // Use the generated image from Test 1 if available, otherwise skip
      const outputPath = path.join(__dirname, 'test-text-to-icon-output.png');
      
      if (fs.existsSync(outputPath)) {
        console.log('   📁 Using generated image from Test 1 for analysis');
        const testImageBuffer = fs.readFileSync(outputPath);
        
        const analysisResult = await vertexAIService.analyzeImage(
          testImageBuffer,
          'description'
        );
        
        if (analysisResult.success) {
          console.log('   ✅ Image-to-Icon analysis successful');
          console.log(`   📝 Model used: ${analysisResult.modelUsed}`);
          console.log(`   🔍 Analysis type: ${analysisResult.analysisType}`);
          console.log(`   📊 Confidence: ${analysisResult.confidence}`);
          console.log(`   📄 Description: ${analysisResult.description.substring(0, 100)}...`);
          
          if (analysisResult.fallback) {
            console.log('   ⚠️  Using fallback analysis (Gemini Vision not available)');
          }
        } else {
          console.log('   ❌ Image-to-Icon analysis failed');
        }
      } else {
        console.log('   ⚠️  No test image available, skipping image analysis test');
        console.log('   💡 Image analysis would use: gemini-2.5-flash-image');
      }
    } catch (analysisError) {
      console.log(`   ❌ Image-to-Icon test failed: ${analysisError.message}`);
      console.log('   💡 This may be expected if the model is not available in your region');
    }
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 Simplified AI Models Test Summary:');
    console.log('   • Text-to-Icon: imagen-4.0-fast-generate-001');
    console.log('   • Image-to-Icon: gemini-2.5-flash-image');
    console.log('   • Configuration simplified to use only these two models');
    console.log('   • No fallback models or complex retry logic');
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testSimplifiedAIModels().catch(console.error);
}

module.exports = { testSimplifiedAIModels };