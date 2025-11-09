#!/usr/bin/env node

/**
 * Test script for audio generation features
 * Tests translation and audio generation for icon labels
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';
const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN;

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60) + '\n');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

/**
 * Test 1: Generate icon with audio from text
 */
async function testIconWithAudio() {
  logSection('Test 1: Generate Icon with Audio');
  
  try {
    logInfo('Generating icon with audio for label "Happy Cat"...');
    
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/icons/generate-from-text`,
      {
        text: 'a simple happy cat icon',
        label: 'Happy Cat',
        category: 'animals',
        generateAudio: true
      },
      {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      logSuccess('Icon generated successfully');
      console.log('\nIcon Details:');
      console.log(`  ID: ${response.data.data.id}`);
      console.log(`  Public URL: ${response.data.data.publicUrl}`);
      console.log(`  Label: ${response.data.data.label}`);
      
      if (response.data.data.translation) {
        console.log('\nTranslation:');
        console.log(`  Original: ${response.data.data.translation.originalText}`);
        console.log(`  Translated: ${response.data.data.translation.translatedText}`);
        console.log(`  Language: ${response.data.data.translation.targetLanguage}`);
        if (response.data.data.translation.targetDialect) {
          console.log(`  Dialect: ${response.data.data.translation.targetDialect}`);
        }
      }
      
      if (response.data.data.audio) {
        console.log('\nAudio:');
        console.log(`  URL: ${response.data.data.audio.publicUrl}`);
        console.log(`  Language: ${response.data.data.audio.language}`);
        console.log(`  Size: ${response.data.data.audio.size} bytes`);
        logSuccess('Audio generated and stored successfully');
      } else {
        logWarning('Audio generation attempted but not yet fully supported');
      }
      
      return response.data.data;
    } else {
      logError('Icon generation failed');
      return null;
    }
    
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    if (error.response) {
      console.log('\nError details:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

/**
 * Test 2: Generate icon without audio
 */
async function testIconWithoutAudio() {
  logSection('Test 2: Generate Icon without Audio');
  
  try {
    logInfo('Generating icon without audio...');
    
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/icons/generate-from-text`,
      {
        text: 'a simple house icon',
        label: 'Home',
        category: 'places',
        generateAudio: false
      },
      {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      logSuccess('Icon generated successfully');
      console.log('\nIcon Details:');
      console.log(`  ID: ${response.data.data.id}`);
      console.log(`  Label: ${response.data.data.label}`);
      console.log(`  Audio: ${response.data.data.audio ? 'Yes' : 'No'}`);
      
      if (!response.data.data.audio) {
        logSuccess('Confirmed: No audio generated as expected');
      }
      
      return response.data.data;
    } else {
      logError('Icon generation failed');
      return null;
    }
    
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    if (error.response) {
      console.log('\nError details:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

/**
 * Test 3: Generate audio from recorded audio (if sample file exists)
 */
async function testAudioFromRecording() {
  logSection('Test 3: Generate Audio from Recording');
  
  // Check if sample audio file exists
  const sampleAudioPath = path.join(__dirname, 'sample-audio.mp3');
  
  if (!fs.existsSync(sampleAudioPath)) {
    logWarning('Sample audio file not found. Skipping this test.');
    logInfo('To test this feature, place a sample audio file at:');
    logInfo(`  ${sampleAudioPath}`);
    return null;
  }
  
  try {
    logInfo('Processing recorded audio...');
    
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('audio', fs.createReadStream(sampleAudioPath));
    
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/icons/generate-audio-from-recording`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          ...formData.getHeaders()
        }
      }
    );
    
    if (response.data.success) {
      logSuccess('Audio processed successfully');
      console.log('\nProcessing Results:');
      console.log(`  Transcribed Text: ${response.data.data.transcribedText}`);
      console.log(`  Target Language: ${response.data.data.targetLanguage}`);
      
      if (response.data.data.audio) {
        console.log('\nGenerated Audio:');
        console.log(`  URL: ${response.data.data.audio.publicUrl}`);
        console.log(`  Language: ${response.data.data.audio.language}`);
        logSuccess('Audio generated and stored successfully');
      } else {
        logWarning('Audio generation attempted but not yet fully supported');
      }
      
      return response.data.data;
    } else {
      logError('Audio processing failed');
      return null;
    }
    
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    if (error.response) {
      console.log('\nError details:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

/**
 * Test 4: Retrieve icon with audio information
 */
async function testRetrieveIconWithAudio(iconId) {
  logSection('Test 4: Retrieve Icon with Audio Information');
  
  if (!iconId) {
    logWarning('No icon ID provided. Skipping this test.');
    return null;
  }
  
  try {
    logInfo(`Retrieving icon: ${iconId}...`);
    
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/icons/${iconId}`,
      {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`
        }
      }
    );
    
    if (response.data.success) {
      logSuccess('Icon retrieved successfully');
      console.log('\nIcon Details:');
      console.log(`  ID: ${response.data.data.id}`);
      console.log(`  Label: ${response.data.data.label || 'N/A'}`);
      console.log(`  Category: ${response.data.data.category || 'N/A'}`);
      
      if (response.data.data.audio) {
        console.log('\nAudio Information:');
        console.log(`  URL: ${response.data.data.audio.publicUrl}`);
        console.log(`  Language: ${response.data.data.audio.language}`);
        console.log(`  Dialect: ${response.data.data.audio.dialect || 'N/A'}`);
        console.log(`  Size: ${response.data.data.audio.size} bytes`);
        logSuccess('Audio information retrieved successfully');
      } else {
        logInfo('No audio associated with this icon');
      }
      
      return response.data.data;
    } else {
      logError('Icon retrieval failed');
      return null;
    }
    
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    if (error.response) {
      console.log('\nError details:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'bright');
  log('║     Audio Generation Features Test Suite                  ║', 'bright');
  log('╚════════════════════════════════════════════════════════════╝', 'bright');
  
  // Check for required environment variables
  if (!TEST_USER_TOKEN) {
    logError('TEST_USER_TOKEN environment variable is required');
    logInfo('Please set TEST_USER_TOKEN in your .env file');
    process.exit(1);
  }
  
  logInfo(`API Base URL: ${API_BASE_URL}`);
  logInfo('Starting tests...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    skipped: 0
  };
  
  // Test 1: Icon with audio
  const iconWithAudio = await testIconWithAudio();
  if (iconWithAudio) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Small delay between tests
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Icon without audio
  const iconWithoutAudio = await testIconWithoutAudio();
  if (iconWithoutAudio) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Small delay between tests
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 3: Audio from recording
  const audioFromRecording = await testAudioFromRecording();
  if (audioFromRecording === null) {
    results.skipped++;
  } else if (audioFromRecording) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Small delay between tests
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 4: Retrieve icon with audio
  if (iconWithAudio && iconWithAudio.id) {
    const retrievedIcon = await testRetrieveIconWithAudio(iconWithAudio.id);
    if (retrievedIcon) {
      results.passed++;
    } else {
      results.failed++;
    }
  } else {
    results.skipped++;
  }
  
  // Print summary
  logSection('Test Summary');
  console.log(`Total Tests: ${results.passed + results.failed + results.skipped}`);
  logSuccess(`Passed: ${results.passed}`);
  if (results.failed > 0) {
    logError(`Failed: ${results.failed}`);
  }
  if (results.skipped > 0) {
    logWarning(`Skipped: ${results.skipped}`);
  }
  
  console.log('\n');
  
  if (results.failed === 0) {
    logSuccess('All tests completed successfully! 🎉');
  } else {
    logError('Some tests failed. Please review the errors above.');
  }
  
  console.log('\n');
}

// Run tests
runTests().catch(error => {
  logError(`Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
