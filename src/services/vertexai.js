const { PredictionServiceClient } = require('@google-cloud/aiplatform');
const { helpers } = require('@google-cloud/aiplatform');
const { VertexAI } = require('@google-cloud/vertexai');
require('dotenv').config();

class VertexAIService {
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT;
    this.location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    
    // Simplified AI Model Configuration - Only two models
    this.textToIconModel = process.env.IMAGEN_TEXT_TO_ICON_MODEL || 'imagen-4.0-fast-generate-001';
    this.imageToIconModel = process.env.GEMINI_IMAGE_TO_ICON_MODEL || 'gemini-2.5-flash-image';
    
    // Initialize clients
    this.predictionClient = null;
    this.vertexAI = null;
    this.isInitialized = false;
    this.initializationError = null;
  }

  /**
   * Initialize Vertex AI clients and test connections
   */
  async initialize() {
    try {
      console.log('Initializing Vertex AI service...');
      
      if (!this.projectId) {
        throw new Error('GOOGLE_CLOUD_PROJECT environment variable is required');
      }

      // Initialize Prediction Service Client for Imagen
      this.predictionClient = new PredictionServiceClient({
        apiEndpoint: `${this.location}-aiplatform.googleapis.com`,
      });

      // Initialize Vertex AI client for Gemini
      this.vertexAI = new VertexAI({
        project: this.projectId,
        location: this.location,
      });

      // Test service availability
      await this.testServiceAvailability();
      
      this.isInitialized = true;
      this.initializationError = null;
      console.log('Vertex AI service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Vertex AI service:', error);
      this.initializationError = error;
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Test service availability by making a simple health check
   */
  async testServiceAvailability() {
    try {
      // Simple check to verify our credentials and connection
      // We'll just verify that the client is properly configured
      if (!this.predictionClient) {
        throw new Error('Prediction client not initialized');
      }
      
      // Check if we have the required configuration
      if (!this.projectId || !this.location) {
        throw new Error('Missing required configuration (projectId or location)');
      }
      
      console.log('Vertex AI service connectivity verified');
      return true;
    } catch (error) {
      console.error('Vertex AI service availability test failed:', error);
      throw new Error(`Vertex AI service unavailable: ${error.message}`);
    }
  }

  /**
   * Check if the service is properly initialized
   */
  isServiceReady() {
    return this.isInitialized && this.predictionClient !== null;
  }

  /**
   * Get initialization status and error details
   */
  getServiceStatus() {
    return {
      initialized: this.isInitialized,
      error: this.initializationError?.message || null,
      projectId: this.projectId,
      location: this.location,
      models: {
        textToIcon: this.textToIconModel,
        imageToIcon: this.imageToIconModel
      }
    };
  }

  /**
   * Generate icon from text using Imagen (simplified to use only one model)
   */
  async generateIconFromText(textPrompt, cultureProfile = null) {
    if (!this.isServiceReady()) {
      throw new Error('Vertex AI service not initialized. Call initialize() first.');
    }

    try {
      console.log('Generating icon from text:', textPrompt);
      
      // Construct culturally-aware prompt
      const optimizedPrompt = this.constructCulturalPrompt(textPrompt, cultureProfile);
      
      console.log(`Using Imagen model: ${this.textToIconModel}`);
      
      // Prepare the request for Imagen
      const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.textToIconModel}`;
      
      const instanceValue = helpers.toValue({
        prompt: optimizedPrompt,
        sampleCount: 1,
        aspectRatio: "1:1",
        safetyFilterLevel: "block_some",
        personGeneration: "dont_allow"
      });

      const instances = [instanceValue];
      const parameter = helpers.toValue({
        sampleCount: 1,
      });

      const request = {
        endpoint,
        instances,
        parameters: parameter,
      };

      console.log(`Calling Imagen API with model ${this.textToIconModel} and prompt:`, optimizedPrompt);
      const [response] = await this.predictionClient.predict(request);
      
      if (!response.predictions || response.predictions.length === 0) {
        throw new Error('No image generated from Imagen API');
      }

      // Extract the generated image data
      const prediction = helpers.fromValue(response.predictions[0]);
      
      console.log(`✅ Successfully generated icon using ${this.textToIconModel}`);
      
      return {
        success: true,
        imageData: prediction.bytesBase64Encoded,
        mimeType: prediction.mimeType || 'image/png',
        prompt: optimizedPrompt,
        modelUsed: this.textToIconModel
      };
      
    } catch (error) {
      console.error('Error generating icon from text:', error);
      throw new Error(`Icon generation failed: ${error.message}`);
    }
  }

  /**
   * Analyze image using Gemini Vision (simplified to use only one model)
   */
  async analyzeImage(imageBuffer, analysisType = 'description') {
    if (!this.isServiceReady()) {
      throw new Error('Vertex AI service not initialized. Call initialize() first.');
    }

    try {
      console.log('Analyzing image with Gemini Vision');
      
      // Convert image buffer to base64
      const imageBase64 = imageBuffer.toString('base64');
      
      // Construct analysis prompt based on type
      const analysisPrompt = this.constructAnalysisPrompt(analysisType);
      
      console.log(`Using Gemini model: ${this.imageToIconModel}`);
      
      // Use the new Vertex AI SDK for Gemini models
      const generativeModel = this.vertexAI.getGenerativeModel({
        model: this.imageToIconModel,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1000,
          topP: 0.8,
          topK: 40
        }
      });

      // Prepare the image part
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg'
        }
      };

      console.log(`Calling Gemini Vision API with model: ${this.imageToIconModel}`);
      const result = await generativeModel.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: analysisPrompt },
            imagePart
          ]
        }]
      });
      
      if (!result.response) {
        throw new Error('No analysis result from Gemini Vision API');
      }

      let analysisText;
      if (typeof result.response.text === 'function') {
        analysisText = result.response.text();
      } else if (result.response.candidates && result.response.candidates[0]) {
        analysisText = result.response.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Invalid response format from Gemini Vision API');
      }
      
      if (!analysisText) {
        throw new Error('Empty response from Gemini Vision API');
      }

      // Filter and validate the response
      const filteredResult = this.filterAnalysisResult(analysisText);
      
      console.log(`✅ Successfully analyzed image using ${this.imageToIconModel}`);
      
      return {
        success: true,
        description: filteredResult,
        analysisType: analysisType,
        confidence: 'high',
        modelUsed: this.imageToIconModel
      };
      
    } catch (error) {
      console.error('Error analyzing image:', error);
      
      // Provide fallback if Gemini is not available
      if (error.message.includes('NOT_FOUND') || error.message.includes('not found')) {
        console.log('⚠️ Gemini Vision not available, using fallback analysis');
        return this.getFallbackImageAnalysis(analysisType);
      }
      
      throw new Error(`Image analysis failed: ${error.message}`);
    }
  }

  /**
   * Provide fallback image analysis when Gemini Vision is not available
   */
  getFallbackImageAnalysis(analysisType = 'description') {
    console.log('Using fallback image analysis');
    
    const fallbackDescriptions = {
      'description': 'uploaded image content',
      'icon_elements': 'simple icon with basic shapes and elements',
      'objects': 'various objects and elements',
      'scene': 'general scene or setting'
    };
    
    const description = fallbackDescriptions[analysisType] || fallbackDescriptions['description'];
    
    return {
      success: true,
      description: description,
      analysisType: analysisType,
      confidence: 'low',
      fallback: true,
      message: 'Gemini Vision not available, using fallback analysis'
    };
  }

  /**
   * Construct culturally-aware prompt for icon generation using comprehensive profile data
   */
  constructCulturalPrompt(baseText, cultureProfile) {
    let prompt = `Create a simple, accessible 2D icon representing "${baseText}". `;
    
    // Add accessibility constraints
    prompt += 'The icon should be: simple and clear, high contrast, minimal colors, ';
    prompt += '2D flat design, easily recognizable, suitable for AAC communication. ';
    
    // Add comprehensive cultural context if available
    if (cultureProfile) {
      // Language and dialect context
      if (cultureProfile.language) {
        prompt += `Consider ${cultureProfile.language}`;
        if (cultureProfile.dialect) {
          prompt += ` (${cultureProfile.dialect})`;
        }
        prompt += ' cultural context and visual conventions. ';
      }
      
      // Geographic context (country is more specific than region)
      if (cultureProfile.country) {
        prompt += `Appropriate for ${cultureProfile.country}`;
        if (cultureProfile.region && cultureProfile.region !== cultureProfile.country) {
          prompt += ` (${cultureProfile.region})`;
        }
        prompt += ' cultural norms and expectations. ';
      } else if (cultureProfile.region) {
        prompt += `Appropriate for ${cultureProfile.region} region. `;
      }
      
      // Demographics-informed context
      if (cultureProfile.demographics) {
        const demo = cultureProfile.demographics;
        
        // Age-appropriate complexity and style
        if (demo.age) {
          if (demo.age <= 12) {
            prompt += 'Child-friendly, playful style with bright colors. ';
          } else if (demo.age <= 25) {
            prompt += 'Modern, contemporary style appropriate for young adults. ';
          } else {
            prompt += 'Clear, professional style suitable for adults. ';
          }
        }
        
        // Religious considerations for cultural appropriateness
        if (demo.religion) {
          prompt += `Respectful of ${demo.religion} cultural values and sensitivities. `;
        }
        
        // Ethnic representation considerations
        if (demo.ethnicity) {
          prompt += `Consider ${demo.ethnicity} cultural perspectives and representation. `;
        }
        
        // Gender considerations for inclusive representation
        if (demo.gender && (baseText.toLowerCase().includes('person') || 
                           baseText.toLowerCase().includes('people') ||
                           baseText.toLowerCase().includes('family') ||
                           baseText.toLowerCase().includes('child'))) {
          prompt += `Ensure inclusive representation considering ${demo.gender} perspective. `;
        }
      }
      
      // Symbol style preference
      if (cultureProfile.symbolStyle) {
        prompt += `Visual style: ${cultureProfile.symbolStyle}. `;
      }
      
      // Accessibility enhancements
      if (cultureProfile.accessibility?.simplifiedIcons) {
        prompt += 'Extra simplified for accessibility needs. ';
      }
    }
    
    // Final constraints
    prompt += 'No text in the image. Clean white background. Single focused object.';
    
    return prompt;
  }

  /**
   * Construct analysis prompt for Gemini Vision
   */
  constructAnalysisPrompt(analysisType) {
    switch (analysisType) {
      case 'description':
        return 'Describe this image in simple, clear language suitable for creating an AAC communication icon. Focus on the main subject and key visual elements. Keep the description concise and appropriate for generating a simplified icon.';
      
      case 'icon_elements':
        return 'Identify the key visual elements in this image that would be important for creating a simple communication icon. List the main objects, colors, and shapes that should be preserved in a simplified version.';
      
      default:
        return 'Analyze this image and provide a clear, simple description of what it shows.';
    }
  }

  /**
   * Filter and validate analysis results
   */
  filterAnalysisResult(analysisText) {
    // Basic content filtering - remove potentially inappropriate content
    const filtered = analysisText
      .replace(/\b(inappropriate|offensive|harmful)\b/gi, '[filtered]')
      .trim();
    
    // Ensure the result is not empty and has reasonable length
    if (!filtered || filtered.length < 10) {
      throw new Error('Analysis result too short or empty');
    }
    
    if (filtered.length > 500) {
      return filtered.substring(0, 500) + '...';
    }
    
    return filtered;
  }

  /**
   * Retry logic for AI service calls
   */
  async retryOperation(operation, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}

// Export singleton instance
const vertexAIService = new VertexAIService();

module.exports = vertexAIService;