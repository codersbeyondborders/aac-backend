#!/usr/bin/env node

/**
 * Debug script to test board creation and see why title is not being retained
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:8080';

async function testBoardCreation() {
  console.log('🔍 Debugging Board Creation Issue');
  console.log('================================');
  
  // Test data with explicit title/name
  const testBoardData = {
    name: "My Test Board Title",
    description: "This is a test board to debug the title retention issue",
    isPublic: false,
    icons: [
      {
        id: "test-icon-1",
        text: "Hello",
        position: { x: 0, y: 0 }
      }
    ]
  };
  
  console.log('📤 Sending board creation request:');
  console.log(JSON.stringify(testBoardData, null, 2));
  
  try {
    // First, test without authentication to see the error
    console.log('\n1. Testing without authentication (should fail):');
    try {
      const response = await axios.post(`${BASE_URL}/api/v1/boards`, testBoardData);
      console.log('❌ Unexpected success without auth');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected without authentication');
      } else {
        console.log(`❌ Unexpected error: ${error.response?.status} - ${error.response?.data?.error}`);
      }
    }
    
    // Test validation endpoint if it exists
    console.log('\n2. Testing validation (if available):');
    try {
      const validationResponse = await axios.post(`${BASE_URL}/api/v1/boards/validate`, testBoardData);
      console.log('✅ Validation passed:', validationResponse.data);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('ℹ️  No validation endpoint available');
      } else {
        console.log(`❌ Validation error: ${error.response?.status} - ${error.response?.data?.error}`);
      }
    }
    
    // Test with a mock token to see server processing
    console.log('\n3. Testing with mock token (will fail auth but show processing):');
    try {
      const response = await axios.post(`${BASE_URL}/api/v1/boards`, testBoardData, {
        headers: {
          'Authorization': 'Bearer mock-token-for-testing'
        }
      });
      console.log('❌ Unexpected success with mock token');
    } catch (error) {
      console.log(`Status: ${error.response?.status}`);
      console.log(`Error: ${error.response?.data?.error}`);
      console.log(`Code: ${error.response?.data?.code}`);
      
      // Check if the error suggests the data was processed
      if (error.response?.data?.code === 'INVALID_TOKEN') {
        console.log('✅ Request reached authentication middleware (data processing likely OK)');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test the validation function directly
function testValidationFunction() {
  console.log('\n🧪 Testing Validation Function Directly');
  console.log('=====================================');
  
  // Simulate the validation function
  const testData = {
    name: "My Test Board Title",
    description: "Test description",
    isPublic: false,
    icons: []
  };
  
  console.log('Input data:');
  console.log(JSON.stringify(testData, null, 2));
  
  // Basic validation checks
  const errors = [];
  
  if (!testData.name || typeof testData.name !== 'string' || testData.name.trim().length === 0) {
    errors.push('Board name is required and must be a non-empty string');
  }
  
  if (!testData.description || typeof testData.description !== 'string') {
    errors.push('Board description is required and must be a string');
  }
  
  if (testData.isPublic !== undefined && typeof testData.isPublic !== 'boolean') {
    errors.push('isPublic must be a boolean');
  }
  
  if (testData.icons !== undefined && !Array.isArray(testData.icons)) {
    errors.push('Icons must be an array');
  }
  
  console.log('\nValidation result:');
  if (errors.length === 0) {
    console.log('✅ Validation passed');
    console.log('Sanitized data would be:');
    console.log({
      name: testData.name.trim(),
      description: testData.description.trim(),
      isPublic: testData.isPublic || false,
      icons: testData.icons || []
    });
  } else {
    console.log('❌ Validation failed:');
    errors.forEach(error => console.log(`  - ${error}`));
  }
}

async function main() {
  await testBoardCreation();
  testValidationFunction();
  
  console.log('\n💡 Debugging Tips:');
  console.log('1. Check server logs while creating a board');
  console.log('2. Verify the request payload in browser dev tools');
  console.log('3. Check if the frontend is sending the correct field name ("name" vs "title")');
  console.log('4. Verify Firebase authentication is working');
  console.log('5. Check Firestore database to see what data is actually saved');
}

if (require.main === module) {
  main();
}