#!/usr/bin/env node

/**
 * Test Updated API with New Models
 * 
 * This script tests the updated Smart AAC API with the new Gemini 2.5 and Imagen 4.0 models
 */

require('dotenv').config();
const vertexAIService = require('../src/services/vertexai');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testTextToIcon() {
  try {
    log('\n🎨 Testing Text-to-Icon Generation with Imagen 4.0...', colors.blue);
    
    const result = await vertexAIService.generateIconFromText(
      'house', 
      { language: 'en', region: 'US', symbolStyle: 'simple' },
      'primary' // Use primary quality (imagen-4.0-generate-001)
    );
    
    if (result.success && result.imageData) {
      log(`✅ Text-to-Icon: SUCCESS`, colors.green);
      log(`   Model Used: ${result.modelUsed}`, colors.cyan);
      log(`   Image Size: ${Math.round(result.imageData.length * 0.75)} bytes`, colors.cyan);
      return true;
    } else {
      log(`❌ Text-to-Icon: FAILED - No image data`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Text-to-Icon: ERROR - ${error.message}`, colors.red);
    return false;
  }
}

async function testImageAnalysis() {
  try {
    log('\n🔍 Testing Image Analysis with Gemini 2.5...', colors.blue);
    
    // Create a simple test image buffer (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
      0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);
    
    const result = await vertexAIService.analyzeImage(testImageBuffer, 'description');
    
    if (result.success && result.description) {
      log(`✅ Image Analysis: SUCCESS`, colors.green);
      log(`   Model Used: ${result.modelUsed || 'fallback'}`, colors.cyan);
      log(`   Description: "${result.description}"`, colors.cyan);
      log(`   Confidence: ${result.confidence}`, colors.cyan);
      return true;
    } else {
      log(`❌ Image Analysis: FAILED - No description`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Image Analysis: ERROR - ${error.message}`, colors.red);
    return false;
  }
}

async function testDifferentQualities() {
  try {
    log('\n⚡ Testing Different Imagen Quality Levels...', colors.blue);
    
    const qualities = ['primary', 'fast', 'ultra'];
    const results = [];
    
    for (const quality of qualities) {
      try {
        log(`\nTesting ${quality} quality...`);
        const startTime = Date.now();
        
        const result = await vertexAIService.generateIconFromText(
          'star', 
          { language: 'en', region: 'US', symbolStyle: 'simple' },
          quality
        );
        
        const duration = Date.now() - startTime;
        
        if (result.success && result.imageData) {
          log(`✅ ${quality.toUpperCase()}: SUCCESS (${duration}ms)`, colors.green);
          log(`   Model: ${result.modelUsed}`, colors.cyan);
          results.push({ quality, success: true, duration, model: result.modelUsed });
        } else {
          log(`❌ ${quality.toUpperCase()}: FAILED`, colors.red);
          results.push({ quality, success: false, duration });
        }
      } catch (error) {
        log(`❌ ${quality.toUpperCase()}: ERROR - ${error.message}`, colors.red);
        results.push({ quality, success: false, error: error.message });
      }
    }
    
    return results;
  } catch (error) {
    log(`❌ Quality Testing: ERROR - ${error.message}`, colors.red);
    return [];
  }
}

async function main() {
  log('🚀 Testing Updated Smart AAC API', colors.bright + colors.cyan);
  log('================================', colors.cyan);
  
  try {
    // Initialize the service
    log('\n🔧 Initializing Vertex AI Service...', colors.yellow);
    await vertexAIService.initialize();
    log('✅ Service initialized successfully', colors.green);
    
    // Test text-to-icon generation
    const textToIconSuccess = await testTextToIcon();
    
    // Test image analysis
    const imageAnalysisSuccess = await testImageAnalysis();
    
    // Test different quality levels
    const qualityResults = await testDifferentQualities();
    
    // Summary
    log('\n📊 TEST SUMMARY', colors.bright + colors.magenta);
    log('===============', colors.magenta);
    
    log(`\n🎨 Text-to-Icon Generation: ${textToIconSuccess ? '✅ WORKING' : '❌ FAILED'}`, 
        textToIconSuccess ? colors.green : colors.red);
    
    log(`🔍 Image Analysis: ${imageAnalysisSuccess ? '✅ WORKING' : '❌ FAILED'}`, 
        imageAnalysisSuccess ? colors.green : colors.red);
    
    log(`\n⚡ Quality Level Results:`, colors.blue);
    qualityResults.forEach(result => {
      const status = result.success ? '✅ WORKING' : '❌ FAILED';
      const color = result.success ? colors.green : colors.red;
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      log(`   ${result.quality.toUpperCase()}: ${status}${duration}`, color);
      if (result.model) {
        log(`      Model: ${result.model}`, colors.cyan);
      }
    });
    
    const totalTests = 2 + qualityResults.length;
    const passedTests = (textToIconSuccess ? 1 : 0) + 
                       (imageAnalysisSuccess ? 1 : 0) + 
                       qualityResults.filter(r => r.success).length;
    
    log(`\n🎯 OVERALL STATUS: ${passedTests}/${totalTests} tests passed`, 
        passedTests === totalTests ? colors.green : colors.yellow);
    
    if (passedTests === totalTests) {
      log('🎉 All systems operational with latest AI models!', colors.bright + colors.green);
    } else {
      log('⚠️  Some features may have limited functionality', colors.yellow);
    }
    
    process.exit(passedTests > 0 ? 0 : 1);
    
  } catch (error) {
    log(`❌ Fatal error: ${error.message}`, colors.red);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    log(`Fatal error: ${error.message}`, colors.red);
    process.exit(1);
  });
}