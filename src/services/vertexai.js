const { PredictionServiceClient } = require('@google-cloud/aiplatform');
const { helpers } = require('@google-cloud/aiplatform');
const { VertexAI } = require('@google-cloud/vertexai');
const textToSpeech = require('@google-cloud/text-to-speech');
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
    this.ttsClient = null;
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

      // Initialize Text-to-Speech client
      this.ttsClient = new textToSpeech.TextToSpeechClient();

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
   * Process and clean up image to create a transparent icon
   * Removes background and text labels using Imagen in a single step
   * @param {Buffer} imageBuffer - Input image buffer
   * @param {string} description - Optional description of what the icon should represent
   * @returns {Promise<Object>} Processed icon result with transparent background
   */
  async processImageToTransparentIcon(imageBuffer, description = null) {
    if (!this.isServiceReady()) {
      throw new Error('Vertex AI service not initialized. Call initialize() first.');
    }

    try {
      console.log('Processing image to create transparent icon...');
      
      // Convert image to base64
      const imageBase64 = imageBuffer.toString('base64');
      
      // Use Imagen to edit the image directly - remove text and make background transparent
      const editPrompt = `Remove the background of this image and make it transparent. Also remove any text, labels, and words from the image`;      
      
      console.log(`Using Imagen model: ${this.textToIconModel}`);
      
      // Prepare the request for Imagen with image editing
      const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.textToIconModel}`;
      
      const instanceValue = helpers.toValue({
        prompt: editPrompt,
        image: {
          bytesBase64Encoded: imageBase64
        },
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

      console.log('Processing image with Imagen to remove text and make transparent...');
      const [response] = await this.predictionClient.predict(request);
      
      if (!response.predictions || response.predictions.length === 0) {
        throw new Error('No processed image from Imagen API');
      }

      // Extract the processed image data
      const prediction = helpers.fromValue(response.predictions[0]);
      
      console.log('✅ Successfully processed image to transparent icon');
      
      return {
        success: true,
        imageData: prediction.bytesBase64Encoded,
        mimeType: prediction.mimeType || 'image/png',
        prompt: editPrompt,
        modelUsed: this.textToIconModel,
        processed: true
      };
      
    } catch (error) {
      console.error('Error processing image to transparent icon:', error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Construct culturally-aware prompt for icon generation using comprehensive profile data
   */
  constructCulturalPrompt(baseText, cultureProfile) {
    let prompt = baseText;
    
    // If the base text doesn't already contain detailed instructions, add them
    if (!baseText.toLowerCase().includes('aac icon') && !baseText.toLowerCase().includes('transparent background')) {
      prompt = `${baseText}. Create a culturally appropriate AAC icon. `;
      
      // Add accessibility constraints
      prompt += 'Use a simple, high-contrast 2D style with a completely transparent background. ';
      prompt += 'Ensure the final PNG is optimized below 200KB. ';
      
      // Add comprehensive cultural context if available
      if (cultureProfile) {
        // Language and dialect context
        if (cultureProfile.languages?.primary?.language) {
          prompt += `User profile context -> Primary language: ${cultureProfile.languages.primary.language}`;
          if (cultureProfile.languages.primary.dialect) {
            prompt += `, Dialect: ${cultureProfile.languages.primary.dialect}`;
          }
          prompt += '. ';
        } else if (cultureProfile.language) {
          prompt += `User profile context -> Primary language: ${cultureProfile.language}`;
          if (cultureProfile.dialect) {
            prompt += `, Dialect: ${cultureProfile.dialect}`;
          }
          prompt += '. ';
        }
        
        // Geographic context (country is more specific than region)
        if (cultureProfile.country) {
          prompt += `Country: ${cultureProfile.country}`;
          if (cultureProfile.region && cultureProfile.region !== cultureProfile.country) {
            prompt += `, Region: ${cultureProfile.region}`;
          }
          prompt += '. ';
        } else if (cultureProfile.region) {
          prompt += `Region: ${cultureProfile.region}. `;
        }
        
        // Demographics-informed context
        if (cultureProfile.demographics) {
          const demo = cultureProfile.demographics;
          
          // Age-appropriate complexity and style
          if (demo.age) {
            prompt += `Age: ${demo.age}. `;
          }
          
          // Gender considerations
          if (demo.gender) {
            prompt += `Gender: ${demo.gender}. `;
          }
          
          // Religious considerations for cultural appropriateness
          if (demo.religion) {
            prompt += `Religion: ${demo.religion}. `;
          }
          
          // Ethnic representation considerations
          if (demo.ethnicity) {
            prompt += `Ethnicity: ${demo.ethnicity}. `;
          }
        }
      }
    }
    
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
   * Translate text to primary language and dialect using Gemini
   * @param {string} text - Text to translate
   * @param {string} targetLanguage - Target language
   * @param {string} targetDialect - Target dialect (optional)
   * @returns {Promise<Object>} Translation result
   */
  async translateText(text, targetLanguage, targetDialect = null) {
    if (!this.isServiceReady()) {
      throw new Error('Vertex AI service not initialized. Call initialize() first.');
    }

    try {
      console.log(`Translating text to ${targetLanguage}${targetDialect ? ` (${targetDialect})` : ''}`);
      
      // Construct translation prompt
      let translationPrompt = `Translate the following text to ${targetLanguage}`;
      if (targetDialect) {
        translationPrompt += ` using the ${targetDialect} dialect`;
      }
      translationPrompt += `. Provide only the translated text without any explanations or additional context.\n\nText to translate: "${text}"`;
      
      // Use Gemini 2.5  for translation
      const translationModel = process.env.GEMINI_TRANSLATE_MODEL || 'gemini-2.5-pro';

      const generativeModel = this.vertexAI.getGenerativeModel({
        model: translationModel,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
          topP: 0.8,
          topK: 40
        }
      });

      console.log(`Calling Gemini for translation with model: ${translationModel}`);
      const result = await generativeModel.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: translationPrompt }]
        }]
      });
      
      if (!result.response) {
        throw new Error('No translation result from Gemini API');
      }

      let translatedText;
      if (typeof result.response.text === 'function') {
        translatedText = result.response.text();
      } else if (result.response.candidates && result.response.candidates[0]) {
        translatedText = result.response.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Invalid response format from Gemini API');
      }
      
      if (!translatedText) {
        throw new Error('Empty translation from Gemini API');
      }

      // Clean up the translation (remove quotes, extra whitespace)
      translatedText = translatedText.trim().replace(/^["']|["']$/g, '');
      
      console.log(`✅ Successfully translated text using ${translationModel}`);
      
      return {
        success: true,
        originalText: text,
        translatedText: translatedText,
        targetLanguage: targetLanguage,
        targetDialect: targetDialect,
        modelUsed: translationModel
      };
      
    } catch (error) {
      console.error('Error translating text:', error);
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  /**
   * Generate audio from text using Gemini text-to-speech
   * @param {string} text - Text to convert to speech
   * @param {string} language - Language code
   * @param {string} dialect - Dialect (optional)
   * @param {string} accent - Speaker/accent name (optional, e.g., 'Puck', 'Aoede', 'Kore', 'Charon', 'Fenrir')
   * @param {string} speechPrompt - Optional speech prompt to prepend to text (optional)
   * @returns {Promise<Object>} Audio generation result with base64 audio data
   */
  async generateAudioFromText(text, language = 'en', dialect = null, accent = null) {
    if (!this.isServiceReady()) {
      throw new Error('Vertex AI service not initialized. Call initialize() first.');
    }

    //TEXT TO SPEECH
      try {

    let speakerGender = 'female';

    let languageCode = `${language}-${(dialect || 'US').toUpperCase()}`;
    const audioConfig = {
      audioEncoding: 'MP3',
      audioEncoding: 'LINEAR16',
      sampleRateHertz: 44100,
    };

    const voice = {
      languageCode: languageCode,
      ssmlGender: (speakerGender === 'female'?'FEMALE':'MALE'),
    };

    // Construct the request
    const request = {
      input: { text: text },
      voice: voice,
      audioConfig: audioConfig,
    };

    // Performs the text-to-speech request
    const [response] = await this.ttsClient.synthesizeSpeech(request);

    // The audio_content is binary data. We convert it to Base64 for your desired output format.
    const audioBase64 = Buffer.from(response.audioContent).toString('base64');


    return {
      success: true,
      text: text,
      language: language,
      dialect: dialect,
      speaker: null,
      audioData: audioBase64,
      mimeType: 'audio/mpeg', // Corresponds to MP3 audioEncoding
    };
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    return {
      success: false,
      text: input.text,
      language: input.language,
      dialect: input.dialect,
      speaker: input.speaker,
      audioData: null,
      mimeType: null,
      error: error.message,
    };
  }

  }

  /**
   * Get appropriate speaker for language and dialect
   * Available speakers: Aoede, Charon, Fenrir, Kore, Puck
   * @param {string} language - Language code
   * @param {string} dialect - Dialect (optional)
   * @returns {string} Speaker name
   */
  getSpeakerForLanguage(language, dialect) {
    // Map language codes to Gemini TTS speaker names
    // Distribute languages across available speakers for variety
    const speakerMap = {
      // Achird - English and related
      'en': 'Achird',
      'en-US': 'Achird',
      'en-GB': 'Achird',
      'en-AU': 'Achird',
      'en-IN': 'Achird',
      
      // Aoede - Romance languages
      'es': 'Aoede',
      'es-ES': 'Aoede',
      'es-MX': 'Aoede',
      'es-419': 'Aoede',
      'pt': 'Aoede',
      'pt-BR': 'Aoede',
      'pt-PT': 'Aoede',
      'ro': 'Aoede',
      'ro-RO': 'Aoede',
      'ca': 'Aoede',
      'ca-ES': 'Aoede',
      'gl': 'Aoede',
      'gl-ES': 'Aoede',
      
      // Charon - French and related
      'fr': 'Charon',
      'fr-FR': 'Charon',
      'fr-CA': 'Charon',
      'nl': 'Charon',
      'nl-NL': 'Charon',
      'af': 'Charon',
      'af-ZA': 'Charon',
      
      // Fenrir - Germanic languages
      'de': 'Fenrir',
      'de-DE': 'Fenrir',
      'sv': 'Fenrir',
      'sv-SE': 'Fenrir',
      'da': 'Fenrir',
      'da-DK': 'Fenrir',
      'nb': 'Fenrir',
      'nb-NO': 'Fenrir',
      'nn': 'Fenrir',
      'nn-NO': 'Fenrir',
      'is': 'Fenrir',
      'is-IS': 'Fenrir',
      
      // Kore - Asian, Slavic, and other languages
      'it': 'Kore',
      'it-IT': 'Kore',
      'ja': 'Kore',
      'ja-JP': 'Kore',
      'ko': 'Kore',
      'ko-KR': 'Kore',
      'zh': 'Kore',
      'cmn': 'Kore',
      'cmn-CN': 'Kore',
      'cmn-TW': 'Kore',
      'hi': 'Kore',
      'hi-IN': 'Kore',
      'bn': 'Kore',
      'bn-BD': 'Kore',
      'ar': 'Kore',
      'ar-EG': 'Kore',
      'ar-001': 'Kore',
      'ru': 'Kore',
      'ru-RU': 'Kore',
      'pl': 'Kore',
      'pl-PL': 'Kore',
      'uk': 'Kore',
      'uk-UA': 'Kore',
      'cs': 'Kore',
      'cs-CZ': 'Kore',
      'sk': 'Kore',
      'sk-SK': 'Kore',
      'bg': 'Kore',
      'bg-BG': 'Kore',
      'hr': 'Kore',
      'hr-HR': 'Kore',
      'sr': 'Kore',
      'sr-RS': 'Kore',
      'sl': 'Kore',
      'sl-SI': 'Kore',
      'mk': 'Kore',
      'mk-MK': 'Kore',
      'be': 'Kore',
      'be-BY': 'Kore',
      'th': 'Kore',
      'th-TH': 'Kore',
      'vi': 'Kore',
      'vi-VN': 'Kore',
      'id': 'Kore',
      'id-ID': 'Kore',
      'ms': 'Kore',
      'ms-MY': 'Kore',
      'fil': 'Kore',
      'fil-PH': 'Kore',
      'tr': 'Kore',
      'tr-TR': 'Kore',
      'el': 'Kore',
      'el-GR': 'Kore',
      'he': 'Kore',
      'he-IL': 'Kore',
      'fa': 'Kore',
      'fa-IR': 'Kore',
      'ur': 'Kore',
      'ur-PK': 'Kore',
      'ta': 'Kore',
      'ta-IN': 'Kore',
      'te': 'Kore',
      'te-IN': 'Kore',
      'mr': 'Kore',
      'mr-IN': 'Kore',
      'gu': 'Kore',
      'gu-IN': 'Kore',
      'kn': 'Kore',
      'kn-IN': 'Kore',
      'ml': 'Kore',
      'ml-IN': 'Kore',
      'pa': 'Kore',
      'pa-IN': 'Kore',
      'or': 'Kore',
      'or-IN': 'Kore',
      'hu': 'Kore',
      'hu-HU': 'Kore',
      'fi': 'Kore',
      'fi-FI': 'Kore',
      'et': 'Kore',
      'et-EE': 'Kore',
      'lv': 'Kore',
      'lv-LV': 'Kore',
      'lt': 'Kore',
      'lt-LT': 'Kore'
    };
    
    // Try to match with full language-dialect code first
    if (dialect) {
      const fullCode = `${language}-${dialect}`;
      if (speakerMap[fullCode]) {
        return speakerMap[fullCode];
      }
    }
    
    // Try to match with language code only
    if (speakerMap[language]) {
      return speakerMap[language];
    }
    
    // Default to Puck for any unmapped languages
    return 'Puck';
  }

  /**
   * Get language code for TTS API
   * Only returns supported Gemini TTS language codes
   * @param {string} language - Language code
   * @param {string} dialect - Dialect (optional)
   * @returns {string} Language code in format like 'en-US'
   */
  getLanguageCode(language, dialect) {
    // Supported Gemini TTS language codes (GA = Generally Available, Preview = Preview)
    const supportedLanguageCodes = {
      // GA Languages
      'ar-EG': true,  // Arabic (Egypt)
      'bn-BD': true,  // Bangla (Bangladesh)
      'nl-NL': true,  // Dutch (Netherlands)
      'en-IN': true,  // English (India)
      'en-US': true,  // English (United States)
      'fr-FR': true,  // French (France)
      'de-DE': true,  // German (Germany)
      'hi-IN': true,  // Hindi (India)
      'id-ID': true,  // Indonesian (Indonesia)
      'it-IT': true,  // Italian (Italy)
      'ja-JP': true,  // Japanese (Japan)
      'ko-KR': true,  // Korean (South Korea)
      'mr-IN': true,  // Marathi (India)
      'pl-PL': true,  // Polish (Poland)
      'pt-BR': true,  // Portuguese (Brazil)
      'ro-RO': true,  // Romanian (Romania)
      'ru-RU': true,  // Russian (Russia)
      'es-ES': true,  // Spanish (Spain)
      'ta-IN': true,  // Tamil (India)
      'te-IN': true,  // Telugu (India)
      'th-TH': true,  // Thai (Thailand)
      'tr-TR': true,  // Turkish (Turkey)
      'uk-UA': true,  // Ukrainian (Ukraine)
      'vi-VN': true,  // Vietnamese (Vietnam)
      
      // Preview Languages
      'af-ZA': true,   // Afrikaans (South Africa)
      'sq-AL': true,   // Albanian (Albania)
      'am-ET': true,   // Amharic (Ethiopia)
      'ar-001': true,  // Arabic (World)
      'hy-AM': true,   // Armenian (Armenia)
      'az-AZ': true,   // Azerbaijani (Azerbaijan)
      'eu-ES': true,   // Basque (Spain)
      'be-BY': true,   // Belarusian (Belarus)
      'bg-BG': true,   // Bulgarian (Bulgaria)
      'my-MM': true,   // Burmese (Myanmar)
      'ca-ES': true,   // Catalan (Spain)
      'ceb-PH': true,  // Cebuano (Philippines)
      'cmn-CN': true,  // Chinese, Mandarin (China)
      'cmn-TW': true,  // Chinese, Mandarin (Taiwan)
      'hr-HR': true,   // Croatian (Croatia)
      'cs-CZ': true,   // Czech (Czech Republic)
      'da-DK': true,   // Danish (Denmark)
      'en-AU': true,   // English (Australia)
      'en-GB': true,   // English (United Kingdom)
      'et-EE': true,   // Estonian (Estonia)
      'fil-PH': true,  // Filipino (Philippines)
      'fi-FI': true,   // Finnish (Finland)
      'fr-CA': true,   // French (Canada)
      'gl-ES': true,   // Galician (Spain)
      'ka-GE': true,   // Georgian (Georgia)
      'el-GR': true,   // Greek (Greece)
      'gu-IN': true,   // Gujarati (India)
      'ht-HT': true,   // Haitian Creole (Haiti)
      'he-IL': true,   // Hebrew (Israel)
      'hu-HU': true,   // Hungarian (Hungary)
      'is-IS': true,   // Icelandic (Iceland)
      'jv-JV': true,   // Javanese (Java)
      'kn-IN': true,   // Kannada (India)
      'kok-IN': true,  // Konkani (India)
      'lo-LA': true,   // Lao (Laos)
      'la-VA': true,   // Latin (Vatican City)
      'lv-LV': true,   // Latvian (Latvia)
      'lt-LT': true,   // Lithuanian (Lithuania)
      'lb-LU': true,   // Luxembourgish (Luxembourg)
      'mk-MK': true,   // Macedonian (North Macedonia)
      'mai-IN': true,  // Maithili (India)
      'mg-MG': true,   // Malagasy (Madagascar)
      'ms-MY': true,   // Malay (Malaysia)
      'ml-IN': true,   // Malayalam (India)
      'mn-MN': true,   // Mongolian (Mongolia)
      'ne-NP': true,   // Nepali (Nepal)
      'nb-NO': true,   // Norwegian, Bokmål (Norway)
      'nn-NO': true,   // Norwegian, Nynorsk (Norway)
      'or-IN': true,   // Odia (India)
      'ps-AF': true,   // Pashto (Afghanistan)
      'fa-IR': true,   // Persian (Iran)
      'pt-PT': true,   // Portuguese (Portugal)
      'pa-IN': true,   // Punjabi (India)
      'sr-RS': true,   // Serbian (Serbia)
      'sd-IN': true,   // Sindhi (India)
      'si-LK': true,   // Sinhala (Sri Lanka)
      'sk-SK': true,   // Slovak (Slovakia)
      'sl-SI': true,   // Slovenian (Slovenia)
      'es-419': true,  // Spanish (Latin America)
      'es-MX': true,   // Spanish (Mexico)
      'sw-KE': true,   // Swahili (Kenya)
      'sv-SE': true,   // Swedish (Sweden)
      'ur-PK': true    // Urdu (Pakistan)
    };
    
    // Map common language codes to their default regional variants
    const languageDefaults = {
      'ar': 'ar-EG',
      'bn': 'bn-BD',
      'nl': 'nl-NL',
      'en': 'en-US',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'hi': 'hi-IN',
      'id': 'id-ID',
      'it': 'it-IT',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'mr': 'mr-IN',
      'pl': 'pl-PL',
      'pt': 'pt-BR',
      'ro': 'ro-RO',
      'ru': 'ru-RU',
      'es': 'es-ES',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'th': 'th-TH',
      'tr': 'tr-TR',
      'uk': 'uk-UA',
      'vi': 'vi-VN',
      'af': 'af-ZA',
      'sq': 'sq-AL',
      'am': 'am-ET',
      'hy': 'hy-AM',
      'az': 'az-AZ',
      'eu': 'eu-ES',
      'be': 'be-BY',
      'bg': 'bg-BG',
      'my': 'my-MM',
      'ca': 'ca-ES',
      'zh': 'cmn-CN',
      'cmn': 'cmn-CN',
      'hr': 'hr-HR',
      'cs': 'cs-CZ',
      'da': 'da-DK',
      'et': 'et-EE',
      'fil': 'fil-PH',
      'fi': 'fi-FI',
      'gl': 'gl-ES',
      'ka': 'ka-GE',
      'el': 'el-GR',
      'gu': 'gu-IN',
      'ht': 'ht-HT',
      'he': 'he-IL',
      'hu': 'hu-HU',
      'is': 'is-IS',
      'jv': 'jv-JV',
      'kn': 'kn-IN',
      'kok': 'kok-IN',
      'lo': 'lo-LA',
      'la': 'la-VA',
      'lv': 'lv-LV',
      'lt': 'lt-LT',
      'lb': 'lb-LU',
      'mk': 'mk-MK',
      'mai': 'mai-IN',
      'mg': 'mg-MG',
      'ms': 'ms-MY',
      'ml': 'ml-IN',
      'mn': 'mn-MN',
      'ne': 'ne-NP',
      'nb': 'nb-NO',
      'nn': 'nn-NO',
      'or': 'or-IN',
      'ps': 'ps-AF',
      'fa': 'fa-IR',
      'pa': 'pa-IN',
      'sr': 'sr-RS',
      'sd': 'sd-IN',
      'si': 'si-LK',
      'sk': 'sk-SK',
      'sl': 'sl-SI',
      'sw': 'sw-KE',
      'sv': 'sv-SE',
      'ur': 'ur-PK'
    };
    
    // If dialect is provided, construct and validate the code
    if (dialect) {
      const constructedCode = `${language}-${dialect.toUpperCase()}`;
      if (supportedLanguageCodes[constructedCode]) {
        return constructedCode;
      }
    }
    
    // Try to find default for language code
    if (languageDefaults[language]) {
      return languageDefaults[language];
    }
    
    // Check if the language itself is a valid code (e.g., 'en-US' passed as language)
    const upperLanguage = language.toUpperCase();
    if (supportedLanguageCodes[upperLanguage]) {
      return upperLanguage;
    }
    
    // Default to English (United States)
    console.warn(`Language code '${language}${dialect ? '-' + dialect : ''}' not supported, defaulting to en-US`);
    return 'en-US';
  }

  /**
   * Generate audio from recorded audio input using Gemini
   * @param {Buffer} audioBuffer - Input audio buffer
   * @param {string} targetLanguage - Target language for output
   * @param {string} targetDialect - Target dialect (optional)
   * @returns {Promise<Object>} Audio generation result
   */
  async generateAudioFromRecording(audioBuffer, targetLanguage = 'en', targetDialect = null) {
    if (!this.isServiceReady()) {
      throw new Error('Vertex AI service not initialized. Call initialize() first.');
    }

    try {
      console.log(`Processing recorded audio for ${targetLanguage}${targetDialect ? ` (${targetDialect})` : ''}`);
      
      // Convert audio buffer to base64
      const audioBase64 = audioBuffer.toString('base64');
      
      // Use Gemini 2.0 Flash for audio processing
      const audioModel = 'gemini-2.0-flash-exp';
      
      const generativeModel = this.vertexAI.getGenerativeModel({
        model: audioModel,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000
        }
      });

      // First, transcribe the audio
      const transcriptionPrompt = 'Transcribe the following audio and provide only the text content without any additional explanations.';
      
      const audioPart = {
        inlineData: {
          data: audioBase64,
          mimeType: 'audio/mpeg'
        }
      };

      console.log(`Transcribing audio with model: ${audioModel}`);
      const transcriptionResult = await generativeModel.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: transcriptionPrompt },
            audioPart
          ]
        }]
      });
      
      if (!transcriptionResult.response) {
        throw new Error('No transcription result from Gemini API');
      }

      let transcribedText;
      if (typeof transcriptionResult.response.text === 'function') {
        transcribedText = transcriptionResult.response.text();
      } else if (transcriptionResult.response.candidates && transcriptionResult.response.candidates[0]) {
        transcribedText = transcriptionResult.response.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Invalid response format from Gemini API');
      }
      
      if (!transcribedText) {
        throw new Error('Empty transcription from Gemini API');
      }

      transcribedText = transcribedText.trim();
      console.log(`✅ Audio transcribed: "${transcribedText}"`);
      
      // Now generate audio in target language
      const audioResult = await this.generateAudioFromText(transcribedText, targetLanguage, targetDialect);
      
      return {
        success: true,
        transcribedText: transcribedText,
        targetLanguage: targetLanguage,
        targetDialect: targetDialect,
        audioData: audioResult.audioData,
        mimeType: audioResult.mimeType,
        modelUsed: audioModel
      };
      
    } catch (error) {
      console.error('Error processing recorded audio:', error);
      throw new Error(`Audio processing failed: ${error.message}`);
    }
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