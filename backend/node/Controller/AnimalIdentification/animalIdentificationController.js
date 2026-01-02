const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
const sharp = require('sharp'); // For image optimization

class AnimalIdentificationController {
  // Optimal image settings for AI accuracy
  static IMAGE_CONFIG = {
    minWidth: 512,           // Minimum width for good accuracy
    maxWidth: 2048,          // Maximum width (larger wastes resources)
    optimalWidth: 1024,      // Sweet spot for accuracy vs speed
    quality: 90,             // JPEG quality (higher = more detail)
    minFileSize: 50000,      // Warn if image < 50KB (too small)
  };
  
  // Gemini API Keys - Multiple keys for quota rotation (doubles daily limit)
  static GEMINI_API_KEYS = [
    'AIzaSyAZA-yYhbVjNeqTJX3-TDXG0qN6cnfi9S8', // Key 1 - FREE tier
    'AIzaSyC5Yqa13oE8Szkxs7oYMPAZ4EurvSCma64', // Key 2 - FREE tier (backup)
  ];
  static currentKeyIndex = 0; // Current API key index
  static GEMINI_API_KEY = AnimalIdentificationController.GEMINI_API_KEYS[0]; // Active key
  
  // Model configuration with automatic fallback (ordered by accuracy, then by quota)
  static GEMINI_MODEL_PRIMARY = 'gemini-2.5-pro';      // BEST accuracy (25 req/day per key)
  static GEMINI_MODEL_FALLBACK = 'gemini-2.5-flash';   // Good accuracy (500 req/day per key)
  static GEMINI_MODEL_FALLBACK2 = 'gemini-2.0-flash';  // Good accuracy (1500 req/day per key) - NO thinkingConfig support
  static GEMINI_MODEL = 'gemini-2.5-pro'; // Current active model (changes automatically)
  static usingFallbackModel = false; // Track if we're using fallback model
  static fallbackLevel = 0; // 0=primary, 1=fallback, 2=fallback2
  
  // iNaturalist API for species verification (free, no API key needed)
  static INATURALIST_API_URL = 'https://api.inaturalist.org/v1';
  
  // Quota tracking - auto-switch to fallback model/key when quota exceeded
  static geminiQuotaExceeded = false;
  static geminiQuotaResetTime = null;
  static keyQuotaStatus = {}; // Track quota status per key
  
  /**
   * Switch to next available API key
   * @returns {boolean} - True if switched successfully, false if all keys exhausted
   */
  static switchToNextKey() {
    const nextIndex = AnimalIdentificationController.currentKeyIndex + 1;
    if (nextIndex < AnimalIdentificationController.GEMINI_API_KEYS.length) {
      AnimalIdentificationController.currentKeyIndex = nextIndex;
      AnimalIdentificationController.GEMINI_API_KEY = AnimalIdentificationController.GEMINI_API_KEYS[nextIndex];
      // Reset model to primary for new key
      AnimalIdentificationController.GEMINI_MODEL = AnimalIdentificationController.GEMINI_MODEL_PRIMARY;
      AnimalIdentificationController.fallbackLevel = 0;
      AnimalIdentificationController.usingFallbackModel = false;
      console.log(`🔑 Switched to API key ${nextIndex + 1}/${AnimalIdentificationController.GEMINI_API_KEYS.length}`);
      console.log(`   Reset to primary model: ${AnimalIdentificationController.GEMINI_MODEL_PRIMARY}`);
      return true;
    }
    console.log('❌ All API keys exhausted');
    return false;
  }
  
  /**
   * Reset all keys to start fresh (called at quota reset time)
   */
  static resetAllKeys() {
    AnimalIdentificationController.currentKeyIndex = 0;
    AnimalIdentificationController.GEMINI_API_KEY = AnimalIdentificationController.GEMINI_API_KEYS[0];
    AnimalIdentificationController.GEMINI_MODEL = AnimalIdentificationController.GEMINI_MODEL_PRIMARY;
    AnimalIdentificationController.fallbackLevel = 0;
    AnimalIdentificationController.usingFallbackModel = false;
    AnimalIdentificationController.geminiQuotaExceeded = false;
    AnimalIdentificationController.keyQuotaStatus = {};
    console.log('🔄 All API keys reset - quotas refreshed');
  }
  
  /**
   * Get all available models in fallback order
   */
  static getAllModels() {
    return [
      AnimalIdentificationController.GEMINI_MODEL_PRIMARY,
      AnimalIdentificationController.GEMINI_MODEL_FALLBACK,
      AnimalIdentificationController.GEMINI_MODEL_FALLBACK2,
    ];
  }
  
  /**
   * Switch to next fallback model
   * @returns {boolean} - True if switched, false if no more models
   */
  static switchToNextModel() {
    const models = AnimalIdentificationController.getAllModels();
    const nextLevel = AnimalIdentificationController.fallbackLevel + 1;
    
    if (nextLevel < models.length) {
      AnimalIdentificationController.fallbackLevel = nextLevel;
      AnimalIdentificationController.GEMINI_MODEL = models[nextLevel];
      AnimalIdentificationController.usingFallbackModel = true;
      console.log(`🔄 Switched to fallback ${nextLevel}: ${AnimalIdentificationController.GEMINI_MODEL}`);
      return true;
    }
    return false;
  }
  
  /**
   * Get next Pacific midnight timestamp (Google API quotas reset at midnight PT)
   * @returns {number} - Timestamp for next midnight Pacific Time
   */
  static getNextPacificMidnight() {
    const now = new Date();
    // Create date string in Pacific timezone
    const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    // Set to next midnight
    const nextMidnight = new Date(pacificTime);
    nextMidnight.setDate(nextMidnight.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);
    // Convert back to local timestamp
    const pacificMidnightStr = nextMidnight.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
    // Calculate the difference and add to current time
    const diffMs = nextMidnight.getTime() - pacificTime.getTime();
    return Date.now() + diffMs;
  }
  
  // Generation config optimized for MAXIMUM accuracy and precision (for 2.5 models)
  static GENERATION_CONFIG = {
    temperature: 0,          // Zero temperature for most deterministic responses
    topP: 0.05,              // EXTREMELY focused - only highest probability tokens
    topK: 1,                 // Only the SINGLE most likely token - maximum determinism
    maxOutputTokens: 32768,  // Allow extremely detailed responses for thorough analysis
    thinkingConfig: {
      thinkingBudget: 24576  // Extended thinking for complex identification
    }
  };

  // Generation config for gemini-2.0-flash (NO thinkingConfig - not supported)
  static GENERATION_CONFIG_2_0 = {
    temperature: 0,          // Zero temperature for most deterministic responses
    topP: 0.05,              // EXTREMELY focused - only highest probability tokens
    topK: 1,                 // Only the SINGLE most likely token - maximum determinism
    maxOutputTokens: 32768,  // Allow extremely detailed responses for thorough analysis
  };

  /**
   * Get the appropriate generation config for the current model
   */
  static getGenerationConfig() {
    // gemini-2.0-flash doesn't support thinkingConfig
    if (AnimalIdentificationController.GEMINI_MODEL === 'gemini-2.0-flash') {
      return AnimalIdentificationController.GENERATION_CONFIG_2_0;
    }
    return AnimalIdentificationController.GENERATION_CONFIG;
  }

  constructor() {
    // Initialize Gemini client
    if (AnimalIdentificationController.GEMINI_API_KEY) {
      AnimalIdentificationController.genAI = new GoogleGenerativeAI(
        AnimalIdentificationController.GEMINI_API_KEY
      );
      const keyCount = AnimalIdentificationController.GEMINI_API_KEYS.length;
      console.log('✓ Gemini AI client initialized');
      console.log(`   API Keys: ${keyCount} keys available (auto-rotation enabled)`);
      console.log(`   Primary: ${AnimalIdentificationController.GEMINI_MODEL_PRIMARY} (${25 * keyCount}/day)`);
      console.log(`   Fallback 1: ${AnimalIdentificationController.GEMINI_MODEL_FALLBACK} (${500 * keyCount}/day)`);
      console.log(`   Fallback 2: ${AnimalIdentificationController.GEMINI_MODEL_FALLBACK2} (${1500 * keyCount}/day) - uses config without thinkingConfig`);
      console.log(`   📊 TOTAL CAPACITY: ${(25 + 500 + 1500) * keyCount} identifications/day`);
      console.log('   ℹ️ All models use IDENTICAL 7-phase diagnostic protocol');
      console.log('✓ iNaturalist API ready for species verification');
      
      // Check quota status on startup
      AnimalIdentificationController.checkAndSetBestModel();
    } else {
      console.warn('⚠ GEMINI_API_KEY not configured');
    }
  }

  /**
   * Check model availability and set the best available model
   * Tries all 5 models in order, then switches API keys if all exhausted
   */
  static async checkAndSetBestModel() {
    console.log('🔍 Checking Gemini model availability...');
    const models = AnimalIdentificationController.getAllModels();
    const genAI = new GoogleGenerativeAI(AnimalIdentificationController.GEMINI_API_KEY);
    
    // Try each model in order
    for (let i = 0; i < models.length; i++) {
      const modelName = models[i];
      try {
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: { maxOutputTokens: 100 }
        });
        
        const testResult = await model.generateContent('Reply with just: OK');
        const response = await testResult.response;
        
        if (response.text()) {
          console.log(`✅ ${modelName} is available - using as ${i === 0 ? 'primary' : `fallback ${i}`}`);
          AnimalIdentificationController.GEMINI_MODEL = modelName;
          AnimalIdentificationController.fallbackLevel = i;
          AnimalIdentificationController.usingFallbackModel = i > 0;
          if (i > 0) {
            AnimalIdentificationController.geminiQuotaResetTime = AnimalIdentificationController.getNextPacificMidnight();
            const resetTimeStr = new Date(AnimalIdentificationController.geminiQuotaResetTime).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'short', timeStyle: 'short' });
            console.log(`   Will retry primary model at: ${resetTimeStr} PT`);
          }
          return true;
        }
      } catch (error) {
        if (error.message?.includes('429') || 
            error.message?.includes('quota') || 
            error.message?.includes('RESOURCE_EXHAUSTED') ||
            error.message?.includes('exceeded')) {
          console.log(`⚠️ ${modelName} quota exceeded, trying next...`);
          continue;
        } else {
          console.log(`⚠️ ${modelName} error: ${error.message}`);
          continue;
        }
      }
    }
    
    // All models on current key exhausted, try next key
    console.log(`❌ All models exhausted on key ${AnimalIdentificationController.currentKeyIndex + 1}`);
    if (AnimalIdentificationController.switchToNextKey()) {
      console.log('🔄 Retrying with new API key...');
      return await AnimalIdentificationController.checkAndSetBestModel();
    }
    
    AnimalIdentificationController.geminiQuotaExceeded = true;
    console.log('❌ All API keys and models exhausted - identification will be unavailable until quota resets');
    return false;
  }

  /**
   * Helper to try next fallback model
   * Uses IDENTICAL 7-phase diagnostic protocol and criteria as primary models
   */
  static async tryNextFallback(base64Image, mimeType, callback) {
    const models = AnimalIdentificationController.getAllModels();
    const nextLevel = AnimalIdentificationController.fallbackLevel + 1;
    
    // Try remaining models
    for (let i = nextLevel; i < models.length; i++) {
      const modelName = models[i];
      console.log(`🔄 Trying ${modelName}...`);
      AnimalIdentificationController.GEMINI_MODEL = modelName;
      AnimalIdentificationController.fallbackLevel = i;
      AnimalIdentificationController.usingFallbackModel = true;
      
      try {
        const result = await AnimalIdentificationController.identifyWithGemini(base64Image, mimeType);
        if (result.success && !result.identification?.error) {
          console.log(`✓ ${modelName} identification successful`);
          callback(result, modelName);
          return true;
        }
      } catch (error) {
        if (error.message?.includes('429') || error.message?.includes('quota')) {
          console.log(`⚠️ ${modelName} quota exceeded, trying next...`);
          continue;
        }
        console.error(`${modelName} error:`, error.message);
      }
    }
    
    // All models exhausted on current key, try next key
    if (AnimalIdentificationController.switchToNextKey()) {
      console.log('🔄 Switched to new API key, retrying...');
      try {
        const result = await AnimalIdentificationController.identifyWithGemini(base64Image, mimeType);
        if (result.success) {
          callback(result, AnimalIdentificationController.GEMINI_MODEL);
          return true;
        }
      } catch (retryError) {
        console.error('Retry with new key failed:', retryError.message);
      }
    }
    
    AnimalIdentificationController.geminiQuotaExceeded = true;
    console.log('❌ All API keys and models exhausted');
    return false;
  }

  /**
   * Helper to try fallback 2 model (gemini-2.0-flash)
   * Uses IDENTICAL 7-phase diagnostic protocol and criteria as primary models
   */
  static async tryFallback2(base64Image, mimeType, callback) {
    return await AnimalIdentificationController.tryNextFallback(base64Image, mimeType, callback);
  }

  /**
   * Get all species in a genus from iNaturalist for comparison
   * @param {string} genusName - The genus name to search
   * @returns {Object} - All species in the genus with their features
   */
  static async getSpeciesInGenus(genusName) {
    try {
      // First get the genus taxon ID
      const genusResponse = await axios.get(
        `${AnimalIdentificationController.INATURALIST_API_URL}/taxa`,
        {
          params: {
            q: genusName,
            rank: 'genus',
            per_page: 1
          },
          timeout: 10000
        }
      );

      const genusTaxon = genusResponse.data?.results?.[0];
      if (!genusTaxon) {
        return { success: false, message: `Genus ${genusName} not found` };
      }

      // Get all species in this genus
      const speciesResponse = await axios.get(
        `${AnimalIdentificationController.INATURALIST_API_URL}/taxa`,
        {
          params: {
            taxon_id: genusTaxon.id,
            rank: 'species,subspecies',
            per_page: 100,
            order: 'observations_count',
            order_by: 'desc'
          },
          timeout: 15000
        }
      );

      if (speciesResponse.data && speciesResponse.data.results) {
        return {
          success: true,
          genusId: genusTaxon.id,
          genusName: genusTaxon.name,
          species: speciesResponse.data.results.map(sp => ({
            taxonId: sp.id,
            commonName: sp.preferred_common_name || sp.name,
            scientificName: sp.name,
            rank: sp.rank,
            observationsCount: sp.observations_count,
            wikipediaSummary: sp.wikipedia_summary,
            defaultPhoto: sp.default_photo ? {
              url: sp.default_photo.medium_url,
              largeUrl: sp.default_photo.large_url,
              attribution: sp.default_photo.attribution
            } : null,
            conservation_status: sp.conservation_status,
            establishmentMeans: sp.establishment_means
          }))
        };
      }

      return { success: false, message: 'No species found in genus' };
    } catch (error) {
      console.error('Error getting species in genus:', error.message);
      return { success: false, message: error.message };
    }
  }

  /**
   * Validate species identification using iNaturalist observations and photos
   * Compares the identified species against similar species in the same genus
   * @param {string} identifiedSpecies - Scientific name identified by Gemini
   * @param {string} base64Image - Original image for comparison
   * @param {string} mimeType - Image mime type
   * @returns {Object} - Validation results with confidence adjustment
   */
  static async validateWithINaturalist(identifiedSpecies, genusName, geminiFeatures) {
    try {
      console.log(`🔬 Validating ${identifiedSpecies} against iNaturalist database...`);
      
      // Get all species in the genus for comparison
      const genusSpecies = await AnimalIdentificationController.getSpeciesInGenus(genusName);
      
      if (!genusSpecies.success) {
        return { validated: false, message: genusSpecies.message };
      }

      // Find the identified species in iNaturalist
      const matchedSpecies = genusSpecies.species.find(
        sp => sp.scientificName.toLowerCase() === identifiedSpecies.toLowerCase()
      );

      if (!matchedSpecies) {
        // Species not found - might be misidentified
        console.log(`⚠ ${identifiedSpecies} not found in iNaturalist genus ${genusName}`);
        return {
          validated: false,
          possibleSpeciesInGenus: genusSpecies.species.slice(0, 10),
          message: `Species "${identifiedSpecies}" not found in genus ${genusName}. Please review alternatives.`,
          suggestion: genusSpecies.species[0] ? genusSpecies.species[0].scientificName : null
        };
      }

      // Get detailed observations to compare visual features
      const obsPhotos = await AnimalIdentificationController.getINaturalistObservationPhotos(
        identifiedSpecies,
        5
      );

      // Get similar species for comparison
      const similarSpecies = genusSpecies.species
        .filter(sp => sp.scientificName !== identifiedSpecies)
        .slice(0, 5);

      return {
        validated: true,
        matchedSpecies: matchedSpecies,
        observationsCount: matchedSpecies.observationsCount,
        referencePhotos: obsPhotos.success ? obsPhotos.photos : [],
        similarSpeciesInGenus: similarSpecies,
        confidenceBoost: matchedSpecies.observationsCount > 1000 ? 10 : 5
      };

    } catch (error) {
      console.error('iNaturalist validation error:', error.message);
      return { validated: false, message: error.message };
    }
  }

  /**
   * Use Gemini to compare the original image against iNaturalist reference photos
   * This is a second-pass verification to ensure correct species identification
   * @param {string} base64Image - Original image
   * @param {string} mimeType - Image mime type  
   * @param {string} identifiedSpecies - Initially identified species
   * @param {Array} candidateSpecies - Alternative species to compare against
   * @returns {Object} - Refined identification result
   */
  static async refineIdentificationWithComparison(base64Image, mimeType, identifiedSpecies, candidateSpecies) {
    try {
      if (!AnimalIdentificationController.GEMINI_API_KEY || candidateSpecies.length === 0) {
        return { refined: false, message: 'Cannot refine - missing API key or candidates' };
      }

      const genAI = new GoogleGenerativeAI(AnimalIdentificationController.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: AnimalIdentificationController.GEMINI_MODEL,
        generationConfig: {
          temperature: 0,
          topP: 0.05,
          topK: 1,
          maxOutputTokens: 4096
        }
      });

      // Build comparison prompt with candidate species
      const speciesList = candidateSpecies.map(sp => 
        `- ${sp.commonName} (${sp.scientificName}): ${sp.observationsCount || 0} observations on iNaturalist`
      ).join('\n');

      const prompt = `You are validating a species identification. The AI initially identified this bird as: "${identifiedSpecies}"

However, here are ALL species in the same genus found on iNaturalist (sorted by observation count - more observations = more common/likely):

${speciesList}

Look at the image VERY carefully and determine which species from this list is the CORRECT match.

## CRITICAL DIAGNOSTIC KEYS:

### For CYORNIS Flycatchers (VERY IMPORTANT - READ CAREFULLY):

⚠️ **CRITICAL: Mangrove Blue vs Hill Blue Flycatcher - EXTENT OF ORANGE IS KEY**

**MALE CYORNIS - MOST IMPORTANT DIAGNOSTIC:**
| Feature | Mangrove Blue (rufigastra) | Hill Blue (whitei) | Tickell's |
|---------|---------------------------|-------------------|-----------|
| ORANGE EXTENT | LIMITED - throat + upper breast ONLY | EXTENSIVE - breast + FLANKS | Throat only |
| BELLY | WHITE/pale buff - CLEARLY visible | Orange-washed, little white | White with blue band |
| Orange % | ~30-40% of underparts | ~50-70% of underparts | ~20% |
| Demarcation | SHARP orange-to-white line | Gradual, more orange overall | Blue band |

**RULE: WHITE BELLY with LIMITED ORANGE = Mangrove Blue Flycatcher**
**RULE: Orange extending to FLANKS = Hill Blue Flycatcher**

**Female Cyornis - check these features:**
| Feature | Mangrove Blue | Hill Blue | Tickell's | Large Blue |
|---------|---------------|-----------|-----------|------------|
| Head | BLUE-GREY | Olive-brown | Grey-brown | Grey-brown |
| Wings/Tail | GREYISH-BLUE | Brown | Brown | Brown |
| Breast | Deep rufous-orange | Rufous | Orange | Rufous |
| Eye-ring | Pale, distinct | Faint | Pale | Faint |
| Habitat | Mangroves/coast | Hills | Various | Hills |

### For PITTA species:
- Eye-stripe thickness (Mangrove=THICK, Blue-winged=THIN)
- Crown color (Mangrove=rufous-brown, Blue-winged=greenish)
- Bill size (Mangrove=larger/heavier)

### For NILTAVA species:
- Forehead patch color and extent
- Amount of orange on underparts

RESPOND IN JSON FORMAT ONLY:
{
  "originalIdentification": "${identifiedSpecies}",
  "isCorrect": true/false,
  "correctSpecies": {
    "commonName": "Correct common name",
    "scientificName": "Correct scientific name",
    "confidence": 0-100
  },
  "sex": "male/female/unknown",
  "keyDiagnosticFeatures": ["Feature 1 that confirms ID", "Feature 2"],
  "whyOriginalWasWrong": "Explanation if original was wrong, or null if correct"
}`;

      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      // Parse response
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```json')) cleanedText = cleanedText.slice(7);
      if (cleanedText.startsWith('```')) cleanedText = cleanedText.slice(3);
      if (cleanedText.endsWith('```')) cleanedText = cleanedText.slice(0, -3);
      
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }

      const refinedResult = JSON.parse(cleanedText.trim());
      return {
        refined: true,
        ...refinedResult
      };

    } catch (error) {
      console.error('Refinement error:', error.message);
      return { refined: false, message: error.message };
    }
  }

  /**
   * Identify species using iNaturalist Computer Vision API (PRIMARY when Gemini unavailable)
   * NOTE: The /computervision/score_image endpoint requires authentication (JWT token)
   * Since we don't have iNaturalist auth, we'll use the taxa search as a fallback
   * @param {string} base64Image - Base64 encoded image data
   * @param {string} mimeType - Image mime type
   * @param {boolean} asPrimary - Whether to format as primary identification result
   * @returns {Object} - Species identification results with full diagnostic analysis
   */
  static async identifyWithINaturalist(base64Image, mimeType = 'image/jpeg', asPrimary = false) {
    try {
      console.log('🌿 iNaturalist Computer Vision requires authentication - returning unavailable...');
      console.log('⚠️ iNaturalist CV API needs JWT token. Gemini quota exceeded and no alternative available.');
      
      // The iNaturalist Computer Vision API requires authentication
      // Return a helpful message indicating the limitation
      return {
        success: false,
        message: 'iNaturalist Computer Vision API requires authentication. Please wait for Gemini quota to reset.',
        quotaInfo: {
          geminiQuotaExceeded: AnimalIdentificationController.geminiQuotaExceeded,
          retryAt: AnimalIdentificationController.geminiQuotaResetTime
            ? new Date(AnimalIdentificationController.geminiQuotaResetTime).toLocaleString()
            : 'Unknown'
        }
      };

    } catch (error) {
      console.error('iNaturalist API error:', error.message);
      return { success: false, message: error.message };
    }
  }

  /**
   * Format iNaturalist results with enhanced taxonomy and details
   * Used when Gemini is unavailable - provides comprehensive results
   */
  static async formatINaturalistAsEnhanced(iNatResults) {
    const topResult = iNatResults[0];
    const alternatives = iNatResults.slice(1, 5);
    
    // Extract taxonomy from ancestors
    let taxonomy = {
      kingdom: 'Animalia',
      phylum: 'Chordata',
      class: 'Unknown',
      order: 'Unknown',
      family: 'Unknown',
      genus: topResult.scientificName?.split(' ')[0] || 'Unknown',
      species: topResult.scientificName?.split(' ')[1] || 'Unknown'
    };
    
    let wikipediaSummary = null;
    let conservationStatus = null;
    
    // Try to get detailed taxonomy and info
    if (topResult.taxonId) {
      try {
        console.log(`📚 Fetching detailed info for taxon ${topResult.taxonId}...`);
        const taxonDetails = await axios.get(
          `${AnimalIdentificationController.INATURALIST_API_URL}/taxa/${topResult.taxonId}`,
          { timeout: 10000 }
        );
        
        const taxonData = taxonDetails.data?.results?.[0];
        if (taxonData) {
          // Extract full taxonomy
          if (taxonData.ancestors) {
            taxonData.ancestors.forEach(a => {
              if (a.rank === 'class') taxonomy.class = a.name;
              if (a.rank === 'order') taxonomy.order = a.name;
              if (a.rank === 'family') taxonomy.family = a.name;
            });
          }
          
          // Get Wikipedia summary if available
          wikipediaSummary = taxonData.wikipedia_summary || null;
          
          // Get conservation status
          conservationStatus = taxonData.conservation_status?.status_name || null;
        }
        
        console.log(`✅ Taxonomy: ${taxonomy.class} > ${taxonomy.order} > ${taxonomy.family}`);
      } catch (e) {
        console.log('⚠️ Could not fetch detailed taxonomy:', e.message);
      }
    }
    
    // Build key identifying features from iNaturalist data
    const keyFeatures = [
      `Top match from iNaturalist with ${topResult.confidencePercentage}% confidence`,
      `Scientific name: ${topResult.scientificName}`,
      `Family: ${taxonomy.family}`,
      `Order: ${taxonomy.order}`
    ];
    
    if (conservationStatus) {
      keyFeatures.push(`Conservation: ${conservationStatus}`);
    }

    return {
      success: true,
      source: 'iNaturalist Computer Vision',
      identification: {
        primaryMatch: {
          commonName: topResult.commonName,
          scientificName: topResult.scientificName,
          confidence: topResult.confidencePercentage >= 85 ? 'high' : 
                     topResult.confidencePercentage >= 60 ? 'medium' : 'low',
          confidencePercentage: topResult.confidencePercentage,
          taxonId: topResult.taxonId,
          photoUrl: topResult.photoUrl,
          wikipediaUrl: topResult.wikipediaUrl,
          wikipediaSummary: wikipediaSummary,
          conservationStatus: conservationStatus,
          keyIdentifyingFeatures: keyFeatures,
          sex: { 
            determination: 'unknown', 
            confidence: 'unknown', 
            evidence: ['iNaturalist CV mode - manual sex determination required'],
            note: 'Check plumage patterns to determine sex manually'
          },
          ageClass: { 
            determination: 'unknown', 
            evidence: ['iNaturalist CV mode - manual age determination required'],
            note: 'Check plumage wear and coloration to determine age'
          },
          distinguishedFrom: alternatives.slice(0, 3).map(alt => ({
            similarSpecies: alt.commonName,
            scientificName: alt.scientificName,
            howDistinguished: `iNaturalist scored this ${topResult.confidencePercentage - alt.confidencePercentage}% lower`
          }))
        },
        alternatives: alternatives.map(alt => ({
          commonName: alt.commonName,
          scientificName: alt.scientificName,
          confidencePercentage: alt.confidencePercentage,
          taxonId: alt.taxonId,
          photoUrl: alt.photoUrl,
          reasonConsidered: `iNaturalist score: ${alt.score?.toFixed(3)} (${alt.confidencePercentage}%)`,
          reasonLessLikely: `${topResult.confidencePercentage - alt.confidencePercentage}% lower confidence than primary`
        })),
        taxonomicInfo: taxonomy
      },
      model: 'iNaturalist Computer Vision',
      iNaturalistCandidates: iNatResults,
      note: '⚠️ Gemini AI unavailable - using iNaturalist results. Sex and age must be determined manually.'
    };
  }

  /**
   * Format basic iNaturalist results without Gemini analysis (fallback)
   */
  static async formatINaturalistAsBasic(iNatResults) {
    const topResult = iNatResults[0];
    const alternatives = iNatResults.slice(1, 5);
    
    // Extract taxonomy from ancestors
    let taxonomy = {
      kingdom: 'Animalia',
      phylum: 'Chordata',
      class: 'Unknown',
      order: 'Unknown',
      family: 'Unknown',
      genus: topResult.scientificName?.split(' ')[0] || 'Unknown',
      species: topResult.scientificName?.split(' ')[1] || 'Unknown'
    };
    
    // Try to get more taxonomy info
    if (topResult.taxonId) {
      try {
        const taxonDetails = await axios.get(
          `${AnimalIdentificationController.INATURALIST_API_URL}/taxa/${topResult.taxonId}`,
          { timeout: 10000 }
        );
        if (taxonDetails.data?.results?.[0]?.ancestors) {
          const ancestors = taxonDetails.data.results[0].ancestors;
          ancestors.forEach(a => {
            if (a.rank === 'class') taxonomy.class = a.name;
            if (a.rank === 'order') taxonomy.order = a.name;
            if (a.rank === 'family') taxonomy.family = a.name;
          });
        }
      } catch (e) {
        console.log('Could not fetch detailed taxonomy');
      }
    }

    return {
      success: true,
      source: 'iNaturalist (basic)',
      identification: {
        primaryMatch: {
          commonName: topResult.commonName,
          scientificName: topResult.scientificName,
          confidence: topResult.confidencePercentage >= 85 ? 'high' : 
                     topResult.confidencePercentage >= 60 ? 'medium' : 'low',
          confidencePercentage: topResult.confidencePercentage,
          taxonId: topResult.taxonId,
          photoUrl: topResult.photoUrl,
          keyIdentifyingFeatures: [
            `Identified by iNaturalist Computer Vision`,
            `Score: ${topResult.score?.toFixed(3)}`,
            `${topResult.iconicTaxonName || 'Animal'}`
          ],
          sex: { determination: 'unknown', confidence: 'unknown', evidence: ['Basic mode - sex not determined'] },
          ageClass: { determination: 'unknown', evidence: ['Basic mode - age not determined'] }
        },
        alternatives: alternatives.map(alt => ({
          commonName: alt.commonName,
          scientificName: alt.scientificName,
          confidencePercentage: alt.confidencePercentage,
          taxonId: alt.taxonId,
          photoUrl: alt.photoUrl,
          reasonConsidered: `iNaturalist score: ${alt.score?.toFixed(3)}`
        })),
        taxonomicInfo: taxonomy
      },
      model: 'iNaturalist Computer Vision (basic)',
      iNaturalistCandidates: iNatResults
    };
  }

  /**
   * Use Gemini with FULL 7-phase diagnostic protocol to analyze image against iNaturalist candidates
   * This gives the SAME comprehensive analysis as direct Gemini identification
   */
  static async analyzeWithGeminiProtocol(base64Image, mimeType, iNatCandidates, candidateList) {
    try {
      if (!AnimalIdentificationController.GEMINI_API_KEY) {
        return { success: false, message: 'Gemini API key not configured' };
      }

      const genAI = new GoogleGenerativeAI(AnimalIdentificationController.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: AnimalIdentificationController.GEMINI_MODEL,
        generationConfig: AnimalIdentificationController.getGenerationConfig()
      });

      // FULL 7-phase diagnostic prompt - SAME as identifyWithGemini
      const prompt = `You are a world-class taxonomist with 40+ years of field experience. iNaturalist Computer Vision has provided these candidate species:

${candidateList}

You MUST analyze this image using the FULL 7-PHASE DIAGNOSTIC PROTOCOL and determine which candidate is correct, or if none match, identify the correct species.

## ⚠️ CRITICAL WARNING - DO NOT MAKE THESE COMMON MISTAKES:

### CYORNIS FLYCATCHERS (CRITICAL - Often Confused):

⚠️ **MOST COMMON ERROR: Confusing Mangrove Blue with Hill Blue Flycatcher**
The KEY difference is the EXTENT of orange on the underparts:

**CRITICAL DIAGNOSTIC TABLE FOR MALE CYORNIS:**
| Feature | Mangrove Blue (rufigastra) | Hill Blue (whitei/banyumas) | Tickell's (tickelliae) |
|---------|---------------------------|----------------------------|------------------------|
| ORANGE EXTENT | LIMITED to throat + upper breast ONLY | EXTENSIVE - covers breast + extends to FLANKS | Throat only, stops at breast |
| BELLY COLOR | WHITE or pale buff - CLEARLY WHITE | Orange-washed, less white visible | White with blue breast band |
| DEMARCATION | SHARP line between orange and white | Gradual fade, MORE orange overall | Blue band separates |
| Orange coverage | ~30-40% of underparts | ~50-70% of underparts | ~20% of underparts |

**RULE: If belly is clearly WHITE/pale with LIMITED orange = Mangrove Blue**
**RULE: If orange covers most of breast AND extends to flanks = Hill Blue**

### For PITTA species:
- Eye-stripe thickness (Mangrove=THICK, Blue-winged=THIN)
- Crown color (Mangrove=rufous-brown, Blue-winged=greenish)

### For NILTAVA species:
- Forehead patch color and extent
- Amount of orange on underparts

## 🔬 SEXUAL DIMORPHISM - YOU MUST DETERMINE SEX

For birds showing sexual dimorphism, you MUST determine:
- Male vs Female based on plumage
- Use the diagnostic features specific to each family

**Cyornis Blue Flycatchers:**
- MALE: Blue upperparts, orange/rufous breast
- FEMALE: Brown/grey-brown upperparts, paler breast

**Sunbirds:**
- MALE: Metallic/iridescent throat/breast
- FEMALE: Plain olive-yellow, no metallic

**Kingfishers (Common/Collared):**
- MALE: All-black bill
- FEMALE: Orange/red lower mandible

## MANDATORY 7-PHASE IDENTIFICATION PROTOCOL:

### PHASE 1: RAW OBSERVATION
Describe EVERYTHING you see without naming any species:
- Exact colors of each body part
- Patterns, markings, streaks
- Bill shape and color
- Eye features
- Body proportions

### PHASE 2: TAXONOMIC PLACEMENT
- Class → Order → Family → Genus
- Reasoning for each level

### PHASE 3: CANDIDATE EVALUATION
Review EACH iNaturalist candidate:
- Does this specimen match?
- Which features support/contradict?

### PHASE 4: DIAGNOSTIC FEATURE MATRIX
Create matrix comparing this specimen to top candidates:
| Feature | Weight | This Specimen | Species A | Species B | Match? |

### PHASE 5: ELIMINATION
- Which candidates are ELIMINATED and why
- Which remain POSSIBLE

### PHASE 6: FINAL DETERMINATION
- Select the CORRECT species
- State confidence level
- DETERMINE SEX (male/female/unknown)
- DETERMINE AGE (adult/immature/juvenile)

### PHASE 7: SUBSPECIES
- Check if subspecies determinable
- Geographic/morphological basis

## OUTPUT FORMAT - STRICT JSON:
{
  "analysisPhases": {
    "phase1_observation": {
      "rawObservation": "Detailed description",
      "colorInventory": {
        "head": "exact colors",
        "upperparts": "exact colors",
        "underparts": "exact colors",
        "wings": "exact colors",
        "tail": "exact colors"
      }
    },
    "phase2_genus": {
      "identifiedClass": "Aves",
      "identifiedOrder": "Order",
      "identifiedFamily": "Family",
      "identifiedGenus": "Genus",
      "genusReasoning": "Why"
    },
    "phase3_candidates": {
      "iNaturalistCandidatesEvaluated": [
        {"species": "Name", "supported": true/false, "reasoning": "Why"}
      ]
    },
    "phase4_diagnosticMatrix": {
      "featuresAnalyzed": [
        {"feature": "Name", "weight": "HIGH/MEDIUM/LOW", "thisSpecimen": "value", "matchesTopCandidate": true/false}
      ]
    },
    "phase5_elimination": {
      "eliminatedSpecies": [{"species": "Name", "reason": "Why eliminated"}],
      "remainingCandidates": [{"species": "Name", "confidence": 0-100}]
    }
  },
  "finalIdentification": {
    "commonName": "EXACT species name",
    "scientificName": "Genus species",
    "confidence": "definite/highly_likely/probable/possible",
    "confidencePercentage": 0-100,
    "matchesINaturalistTop": true/false,
    "subspecies": {
      "name": "subspecies or null",
      "trinomial": "Genus species subspecies",
      "reasoning": "Why"
    },
    "sex": {
      "determination": "male/female/unknown",
      "confidence": "definite/probable/unknown",
      "evidence": ["Feature 1 indicating sex", "Feature 2"]
    },
    "ageClass": {
      "determination": "adult/immature/juvenile/unknown",
      "evidence": ["Feature 1", "Feature 2"]
    },
    "keyDiagnosticFeatures": [
      "Most important feature",
      "Second feature",
      "Third feature"
    ],
    "distinguishedFrom": [
      {"similarSpecies": "Name", "howDistinguished": "Key difference"}
    ]
  },
  "alternatives": [
    {
      "commonName": "Alternative",
      "scientificName": "Genus species",
      "confidencePercentage": 0-100,
      "reasonLessLikely": "Why not primary"
    }
  ],
  "fullTaxonomy": {
    "kingdom": "Animalia",
    "phylum": "Chordata",
    "class": "Class",
    "order": "Order",
    "family": "Family",
    "genus": "Genus",
    "species": "species"
  }
}

RESPOND WITH VALID JSON ONLY.`;

      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      // Parse response
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```json')) cleanedText = cleanedText.slice(7);
      if (cleanedText.startsWith('```')) cleanedText = cleanedText.slice(3);
      if (cleanedText.endsWith('```')) cleanedText = cleanedText.slice(0, -3);
      
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }

      const parsedResponse = JSON.parse(cleanedText.trim());

      // Format to standard structure
      return {
        success: true,
        identification: {
          primaryMatch: {
            commonName: parsedResponse.finalIdentification.commonName,
            scientificName: parsedResponse.finalIdentification.scientificName,
            confidence: parsedResponse.finalIdentification.confidence,
            confidencePercentage: parsedResponse.finalIdentification.confidencePercentage,
            subspecies: parsedResponse.finalIdentification.subspecies,
            sex: parsedResponse.finalIdentification.sex,
            ageClass: parsedResponse.finalIdentification.ageClass,
            keyIdentifyingFeatures: parsedResponse.finalIdentification.keyDiagnosticFeatures,
            distinguishedFrom: parsedResponse.finalIdentification.distinguishedFrom,
            matchesINaturalistTop: parsedResponse.finalIdentification.matchesINaturalistTop
          },
          alternatives: parsedResponse.alternatives || [],
          taxonomicInfo: parsedResponse.fullTaxonomy,
          analysisPhases: parsedResponse.analysisPhases
        }
      };

    } catch (error) {
      console.error('Gemini protocol analysis error:', error.message);
      // Check if quota error - try next fallback model
      if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        if (AnimalIdentificationController.fallbackLevel < 2) {
          // Can still try another fallback
          const nextFallback = AnimalIdentificationController.fallbackLevel === 0 
            ? AnimalIdentificationController.GEMINI_MODEL_FALLBACK 
            : AnimalIdentificationController.GEMINI_MODEL_FALLBACK2;
          console.log(`⚠️ Quota exceeded, will use ${nextFallback} for next request`);
          AnimalIdentificationController.GEMINI_MODEL = nextFallback;
          AnimalIdentificationController.fallbackLevel++;
          AnimalIdentificationController.usingFallbackModel = true;
        } else {
          AnimalIdentificationController.geminiQuotaExceeded = true;
          console.log('❌ All 3 Gemini models quota exceeded');
        }
        AnimalIdentificationController.geminiQuotaResetTime = AnimalIdentificationController.getNextPacificMidnight();
      }
      return { success: false, message: error.message };
    }
  }

  /**
   * Get species details from iNaturalist by scientific name
   * @param {string} scientificName - Scientific name to look up
   * @returns {Object} - Species details including photos
   */
  static async getINaturalistSpeciesDetails(scientificName) {
    try {
      const response = await axios.get(
        `${AnimalIdentificationController.INATURALIST_API_URL}/taxa`,
        {
          params: {
            q: scientificName,
            rank: 'species,subspecies',
            per_page: 5
          },
          timeout: 10000
        }
      );

      if (response.data && response.data.results && response.data.results.length > 0) {
        const taxon = response.data.results[0];
        return {
          success: true,
          taxonId: taxon.id,
          commonName: taxon.preferred_common_name || taxon.name,
          scientificName: taxon.name,
          rank: taxon.rank,
          observationsCount: taxon.observations_count,
          wikipediaUrl: taxon.wikipedia_url,
          wikipediaSummary: taxon.wikipedia_summary,
          photos: taxon.taxon_photos?.map(p => ({
            url: p.photo?.medium_url || p.photo?.url,
            largeUrl: p.photo?.large_url,
            originalUrl: p.photo?.original_url,
            attribution: p.photo?.attribution
          })) || [],
          defaultPhoto: taxon.default_photo ? {
            url: taxon.default_photo.medium_url,
            largeUrl: taxon.default_photo.large_url,
            attribution: taxon.default_photo.attribution
          } : null,
          ancestorNames: taxon.ancestors?.map(a => a.name) || [],
          iconicTaxonName: taxon.iconic_taxon_name
        };
      }

      return { success: false, message: `Species not found: ${scientificName}` };
    } catch (error) {
      console.error('Error fetching iNaturalist species details:', error.message);
      return { success: false, message: error.message };
    }
  }

  /**
   * Analyze image quality - NO RESIZING, keep original
   * @param {string} base64Image - Base64 encoded image
   * @param {string} mimeType - Image MIME type
   * @returns {Object} - Original image with quality info
   */
  static async prepareImageForAnalysis(base64Image, mimeType = 'image/jpeg') {
    try {
      const imageBuffer = Buffer.from(base64Image, 'base64');
      const originalSize = imageBuffer.length;
      
      // Get image metadata only - NO RESIZING
      const metadata = await sharp(imageBuffer).metadata();
      const { width, height, format } = metadata;
      
      let qualityAssessment = {
        width: width,
        height: height,
        fileSize: originalSize,
        fileSizeKB: Math.round(originalSize / 1024),
        fileSizeMB: (originalSize / (1024 * 1024)).toFixed(2),
        format: format,
        action: 'none',
        reason: 'Original image preserved - no resizing'
      };

      // Just assess quality, don't modify
      if (width < 500 || height < 500) {
        qualityAssessment.overallQuality = 'fair';
        qualityAssessment.warning = 'Low resolution may affect accuracy';
      } else if (width >= 2000 || height >= 2000) {
        qualityAssessment.overallQuality = 'excellent';
      } else {
        qualityAssessment.overallQuality = 'good';
      }

      console.log(`📐 Image: ${width}x${height}, ${qualityAssessment.fileSizeMB}MB - ORIGINAL (no resize)`);

      return {
        success: true,
        // Return ORIGINAL image - no processing
        processedBase64: base64Image,
        mimeType: mimeType,
        qualityAssessment
      };

    } catch (error) {
      console.error('Error analyzing image:', error.message);
      return {
        success: true,
        processedBase64: base64Image,
        mimeType,
        qualityAssessment: { overallQuality: 'unknown', error: error.message }
      };
    }
  }

  /**
   * Get multiple photos of a species from iNaturalist observations
   * @param {string} scientificName - Scientific name of species
   * @param {number} maxPhotos - Maximum photos to fetch
   * @returns {Object} - Photos from real observations
   */
  static async getINaturalistObservationPhotos(scientificName, maxPhotos = 10) {
    try {
      // First get taxon ID
      const taxonResponse = await axios.get(
        `${AnimalIdentificationController.INATURALIST_API_URL}/taxa`,
        {
          params: { q: scientificName, rank: 'species,subspecies', per_page: 1 },
          timeout: 10000
        }
      );

      const taxonId = taxonResponse.data?.results?.[0]?.id;
      if (!taxonId) {
        return { success: false, message: 'Taxon not found' };
      }

      // Get research-grade observations with photos
      const obsResponse = await axios.get(
        `${AnimalIdentificationController.INATURALIST_API_URL}/observations`,
        {
          params: {
            taxon_id: taxonId,
            quality_grade: 'research',
            photos: true,
            per_page: maxPhotos,
            order: 'votes',
            order_by: 'votes'
          },
          timeout: 15000
        }
      );

      if (obsResponse.data && obsResponse.data.results) {
        const photos = [];
        obsResponse.data.results.forEach(obs => {
          if (obs.photos) {
            obs.photos.forEach(photo => {
              photos.push({
                url: photo.url?.replace('square', 'medium'),
                largeUrl: photo.url?.replace('square', 'large'),
                originalUrl: photo.url?.replace('square', 'original'),
                attribution: photo.attribution,
                observationId: obs.id,
                observedOn: obs.observed_on,
                location: obs.place_guess,
                source: 'iNaturalist'
              });
            });
          }
        });

        return {
          success: true,
          taxonId,
          photos: photos.slice(0, maxPhotos),
          totalObservations: obsResponse.data.total_results
        };
      }

      return { success: false, message: 'No observations found' };
    } catch (error) {
      console.error('Error fetching iNaturalist photos:', error.message);
      return { success: false, message: error.message };
    }
  }

  /**
   * Identify animal/bird species using Google Gemini Vision API
   * @param {string} base64Image - Base64 encoded image data
   * @param {string} mimeType - MIME type of the image (default: image/jpeg)
   * @returns {Object} - Species identification results
   */
  static async identifyWithGemini(base64Image, mimeType = 'image/jpeg') {
    try {
      if (!AnimalIdentificationController.GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured');
      }

      // Log which model and config is being used
      const currentConfig = AnimalIdentificationController.getGenerationConfig();
      console.log(`🤖 Using model: ${AnimalIdentificationController.GEMINI_MODEL}`);
      console.log(`   Config: temp=${currentConfig.temperature}, topP=${currentConfig.topP}, topK=${currentConfig.topK}`);
      console.log(`   ThinkingBudget: ${currentConfig.thinkingConfig?.thinkingBudget || 'N/A (not supported by this model)'}`);

      const genAI = new GoogleGenerativeAI(AnimalIdentificationController.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: AnimalIdentificationController.GEMINI_MODEL,
        generationConfig: currentConfig
      });

      // ULTRA-PRECISE taxonomic identification prompt with MANDATORY diagnostic key approach
      const prompt = `You are a world-class taxonomist with 40+ years of field experience in Southeast Asian wildlife identification. You MUST identify to the EXACT species and subspecies.

## ⚠️ CRITICAL WARNING - DO NOT MAKE THESE COMMON MISTAKES:

### CYORNIS FLYCATCHERS (CRITICAL - Often Confused):

⚠️ **MOST COMMON ERROR: Confusing Mangrove Blue with Hill Blue Flycatcher**
The KEY difference is the EXTENT of orange on the underparts:

**CRITICAL DIAGNOSTIC TABLE FOR MALE CYORNIS:**
| Feature | Mangrove Blue (rufigastra) | Hill Blue (whitei/banyumas) | Tickell's (tickelliae) |
|---------|---------------------------|----------------------------|------------------------|
| ORANGE EXTENT | LIMITED to throat + upper breast ONLY | EXTENSIVE - covers breast + extends to FLANKS | Throat only, stops at breast |
| BELLY COLOR | WHITE or pale buff - CLEARLY WHITE | Orange-washed, less white visible | White with blue breast band |
| DEMARCATION | SHARP line between orange and white | Gradual fade, MORE orange overall | Blue band separates |
| Orange coverage | ~30-40% of underparts | ~50-70% of underparts | ~20% of underparts |

**RULE: If belly is clearly WHITE/pale with LIMITED orange = Mangrove Blue**
**RULE: If orange covers most of breast AND extends to flanks = Hill Blue**

- **Mangrove Blue Flycatcher (Cyornis rufigastra)**: 
  * Male: Deep blue upperparts, BRIGHT ORANGE on throat/upper breast ONLY, belly is WHITE/pale buff
  * KEY: Orange is RESTRICTED - does NOT extend to flanks or lower belly
  * KEY: Sharp demarcation between orange breast and white belly
  * Female: BLUE-GREY head (not brown), rufous-orange breast, PALE eye-ring, greyish-blue wings/tail
  * Habitat: Coastal mangroves, lowland forests, Singapore, Malaysia lowlands
  
- **Hill Blue Flycatcher (Cyornis whitei / banyumas)**:
  * Male: Blue upperparts, EXTENSIVE orange-rufous covering breast AND extending to FLANKS
  * KEY: Orange covers MORE of the underparts - flanks are orange-washed
  * KEY: Less white visible on belly compared to Mangrove Blue
  * Female: OLIVE-BROWN upperparts (NOT blue-grey), rufous breast, brown wings
  * Habitat: Hill forests, higher elevations (NOT coastal/mangroves)
  
- **Tickell's Blue Flycatcher (Cyornis tickelliae)**:
  * Male: Blue with ORANGE throat, distinctive BLUE breast band separating orange from white
  * KEY: Look for the BLUE BAND on breast
  * Female: Grey-brown with orange throat, pale eye-ring
  
- **Large Blue Flycatcher (Cyornis magnirostris)**:
  * Larger bill, male has PALE BLUE forehead patch
  
- **Pale Blue Flycatcher (Cyornis unicolor)**:
  * Male: Uniform pale blue, NO orange at all
  * Female: Grey-brown, whitish underparts

---

## 🔬 SEXUAL DIMORPHISM REFERENCE GUIDE (CRITICAL FOR SEX DETERMINATION)

### FLYCATCHERS (Muscicapidae)

**Cyornis (Blue Flycatchers):**
| Species | Male | Female |
|---------|------|--------|
| Mangrove Blue | Deep blue upperparts, bright orange throat/breast | BLUE-GREY head, greyish-blue wings/tail, rufous breast |
| Hill Blue | Blue upperparts, orange-rufous underparts | OLIVE-BROWN upperparts, brown wings, rufous breast |
| Tickell's | Blue with orange throat, blue breast band | Grey-brown, orange throat |
| Pale Blue | Uniform pale blue all over | Grey-brown, whitish underparts |
| Large Blue | Blue with pale blue forehead patch | Brown-grey, pale underparts |

**Niltava:**
| Species | Male | Female |
|---------|------|--------|
| Large Niltava | Deep blue with brilliant blue forehead/neck patch | Brown with blue tail, rufous patch on neck |
| Small Niltava | Blue with brilliant blue forehead patch | Brown, whitish throat patch |
| Rufous-bellied Niltava | Blue upperparts, orange belly | Brown with blue tail |
| Vivid Niltava | Brilliant blue with orange underparts | Brown, pale throat |

**Ficedula (Flycatchers):**
| Species | Male | Female |
|---------|------|--------|
| Mugimaki | Black/white/orange pattern | Brown, orange wash on breast |
| Narcissus | Yellow/black pattern | Olive-brown, yellow wash |
| Yellow-rumped | Blue-black with yellow rump | Brown with yellow rump |

### SUNBIRDS (Nectariniidae) - STRONG DIMORPHISM

| Species | Male | Female |
|---------|------|--------|
| Olive-backed Sunbird | Metallic blue-black throat, yellow belly | Plain olive above, yellow below, NO metallic |
| Crimson Sunbird | Crimson breast, metallic green/purple | Olive-green, yellowish below |
| Purple-throated Sunbird | Purple throat, maroon breast | Olive, yellow-washed below |
| Brown-throated Sunbird | Metallic purple/green, brown throat | Olive-brown, pale below |
| Copper-throated Sunbird | Copper-red throat, metallic green | Olive, yellowish below |
| Ruby-cheeked Sunbird | Orange face patch, metallic green | Olive, pale orange wash |

### PITTAS (Pittidae) - SUBTLE TO NO DIMORPHISM
Most Pittas show NO obvious sexual dimorphism - males and females look similar.
- Mangrove Pitta: Sexes alike
- Blue-winged Pitta: Sexes alike  
- Hooded Pitta: Sexes alike
- Banded Pitta: EXCEPTION - Male has blue breast band, female has greenish

### KINGFISHERS (Alcedinidae)
| Species | Male | Female |
|---------|------|--------|
| Common Kingfisher | All-black bill | Lower mandible ORANGE/RED |
| White-throated | Sexes similar | Similar |
| Stork-billed | Sexes similar | Similar |
| Collared | Blue with white collar, ALL-BLACK bill | Lower mandible RED-ORANGE |

### SHAMAS & ROBINS (Muscicapidae)
| Species | Male | Female |
|---------|------|--------|
| White-rumped Shama | Glossy blue-black, long tail, white rump | Brown-grey, shorter tail, buff rump |
| Oriental Magpie-Robin | Black and white | Grey replacing black |

### BARBETS (Megalaimidae) - SUBTLE DIMORPHISM
Most barbets show minimal dimorphism:
- Blue-eared Barbet: Sexes similar
- Coppersmith Barbet: Sexes similar
- Red-crowned Barbet: Male has more red on crown

### BROADBILLS (Eurylaimidae)
| Species | Male | Female |
|---------|------|--------|
| Black-and-red Broadbill | Brighter red, more contrast | Duller, less red |
| Banded Broadbill | Brighter pink/purple | Duller coloration |
| Long-tailed Broadbill | Sexes similar | Similar |

### FLOWERPECKERS (Dicaeidae)
| Species | Male | Female |
|---------|------|--------|
| Scarlet-backed | Scarlet back and crown | Olive-green, no red |
| Orange-bellied | Blue-black above, orange below | Olive-grey, pale orange wash |
| Crimson-breasted | Red breast patch | No red, olive-grey |

### LEAFBIRDS (Chloropseidae)
| Species | Male | Female |
|---------|------|--------|
| Greater Green | Black throat/face mask | Green, no black mask |
| Lesser Green | Blue throat patch, black border | Green, yellowish throat |
| Blue-winged | Black mask, blue wing patch | Green face, reduced blue |

### DRONGOS (Dicruridae) - NO DIMORPHISM
- All drongo species: Sexes identical (no dimorphism)

### BULBULS (Pycnonotidae) - MINIMAL DIMORPHISM
- Most bulbuls: Sexes identical or nearly so
- Exception: Some species males slightly brighter

### HORNBILLS (Bucerotidae)
| Species | Male | Female |
|---------|------|--------|
| Rhinoceros Hornbill | Orange-red eye, larger casque | White eye, smaller casque |
| Great Hornbill | Red eye, yellow casque | White eye |
| Oriental Pied | Red orbital skin | Blue orbital skin |
| Wreathed Hornbill | Yellow throat pouch | Blue throat pouch |

### WOODPECKERS (Picidae)
| Species | Male | Female |
|---------|------|--------|
| Most species | RED on head (crown, moustache, or nape) | NO red or reduced red |
| Common Flameback | Red crown | Black crown with white spots |
| Laced Woodpecker | Red crown | Black crown |
| Banded Woodpecker | Red crown/nape | Black crown |

### RAPTORS (Accipitridae)
- Most raptors: Female LARGER than male (reverse dimorphism)
- Plumage usually similar between sexes
- Sparrowhawks: Females browner, males more grey-blue

### PARROTS & PARAKEETS (Psittacidae)
| Species | Male | Female |
|---------|------|--------|
| Long-tailed Parakeet | Red bill, red face patch | Duller bill, reduced red |
| Blue-rumped Parrot | Red head | Green head |
| Rose-ringed Parakeet | Black/pink neck ring | NO neck ring |

---

## 🚨 COMMONLY CONFUSED SPECIES PAIRS - CRITICAL DIAGNOSTIC KEYS

### FLYCATCHERS - CYORNIS (Blue Flycatchers) ⚠️ MOST COMMONLY CONFUSED
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Mangrove Blue vs Hill Blue** | ORANGE EXTENT | LIMITED to throat/upper breast, WHITE belly | EXTENSIVE - covers breast + FLANKS |
| | Belly color | WHITE/pale buff clearly visible | Orange-washed, little white |
| | Orange coverage | ~30-40% of underparts | ~50-70% of underparts |
| | Demarcation | SHARP orange-to-white line | Gradual transition |
| | Habitat | Coastal mangroves, lowlands | Hill forests, higher elevation |
| **Mangrove Blue vs Tickell's** | Breast pattern | Plain orange to white | Orange throat + BLUE breast band |
| | Blue band | ABSENT | Present, separates orange/white |
| **Hill Blue vs Tickell's** | Orange extent | Extensive on flanks | Limited to throat |
| | Blue band | ABSENT | PRESENT |
| **Pale Blue vs all others** | Orange | NO orange at all | Has orange |
| | Color | Uniform pale blue | Blue with orange |
| **Large Blue vs others** | Forehead | PALE BLUE patch | No pale patch |
| | Bill size | LARGER | Smaller |
| **Malaysian Blue vs Hill Blue** | Range | Peninsular Malaysia lowlands | Higher elevations |
| | Belly | More white | More orange |

### FLYCATCHERS - NILTAVA
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Large vs Small Niltava (Male)** | Size | Larger (18cm) | Smaller (14cm) |
| | Blue patch | Forehead + neck sides brilliant | Forehead only |
| **Large vs Rufous-bellied (Male)** | Belly | Blue-black with orange sides | RUFOUS/orange belly |
| **Small vs Vivid Niltava (Male)** | Throat | Blue with whitish patch | Orange throat |
| | Size | Smaller | Slightly larger |
| **Niltava vs Cyornis (Males)** | Blue patches | BRILLIANT blue forehead patch | No brilliant patches |
| | Blue intensity | Electric/iridescent blue spots | Uniform deep blue |

### FLYCATCHERS - NILTAVA (Females - VERY DIFFICULT)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Large Niltava vs Hill Blue (F)** | Neck patch | RUFOUS patch on neck side | No neck patch |
| | Tail | Blue tail | Brown tail |
| **Small Niltava vs Pale Blue (F)** | Throat | Whitish throat PATCH | Plain whitish |
| | Size | Smaller | Larger |

### FLYCATCHERS - FICEDULA (Pied Flycatchers)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Mugimaki vs Narcissus (Male)** | Breast color | ORANGE | YELLOW |
| | Back pattern | Black with white eyebrow | Black with yellow patches |
| **Yellow-rumped vs Narcissus** | Rump | YELLOW rump prominent | Yellow on wings |
| | Head pattern | White eyebrow | Yellow crown |
| **Taiga vs Asian Brown** | Streaking | Streaked breast | Plain breast |
| | Eye-ring | Complete | Broken |
| **Asian Brown vs Dark-sided** | Flanks | Plain brown | STREAKED/dark flanks |
| | Breast | Plain | Mottled |
| **Ferruginous vs Asian Brown** | Overall color | RUFOUS-orange tones | Grey-brown |
| **Snowy-browed vs Little Pied** | Eyebrow | WHITE, prominent | Less prominent |
| | Size | Larger | Smaller |

### FLYCATCHERS - MUSCICAPA (Brown Flycatchers)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Asian Brown vs Grey-streaked** | Breast | Plain | STREAKED |
| | Bill | Smaller | Larger |
| **Dark-sided vs Grey-streaked** | Flank pattern | Dark wash on sides | Streaked overall |
| **Brown-streaked vs Grey-streaked** | Streaking | BROWN streaks | GREY streaks |
| | Overall tone | Warmer brown | Cooler grey |

### FLYCATCHERS - RHINOMYIAS (Jungle Flycatchers)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Fulvous-chested vs Brown-chested** | Breast | FULVOUS/buff | Brown wash |
| **Grey-chested vs Fulvous-chested** | Breast | GREY | Fulvous |

### FANTAILS (Rhipiduridae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Pied vs Malaysian Pied** | Throat | White | Black bib |
| | Range | Different ranges | Malaysia specific |
| **White-throated vs Spotted** | Throat | WHITE | Spotted/scaled |
| | Breast | Plain | Spotted |

### MONARCHS & PARADISE FLYCATCHERS (Monarchidae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Asian Paradise (white vs rufous morph)** | Body color | WHITE body | RUFOUS body |
| | Both have | Long tail streamers | Long tail streamers |
| **Asian Paradise vs Blyth's** | Tail | VERY LONG streamers | Shorter tail |
| | Range | Common, widespread | More restricted |
| **Black-naped Monarch vs Asian Paradise (F)** | Tail | Normal length | Long streamers |
| | Nape | BLACK nape | Blue-grey nape |

### PITTAS (Pittidae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Mangrove vs Blue-winged Pitta** | Eye-stripe thickness | THICK black stripe | THIN black stripe |
| | Crown color | Rufous-brown | Greenish |
| | Bill size | LARGER, heavier | Smaller, lighter |
| | Supercilium | Buff, broader | Paler, narrower |
| **Blue-winged vs Fairy Pitta** | Crown pattern | Plain greenish | Black with buff stripe |
| | Back color | Green | Green with blue |
| **Hooded vs Blue Pitta** | Head pattern | Black hood | Blue crown |
| **Banded Pitta (M vs F)** | Breast | BLUE breast band (male) | Green/brown (female) |
| **Blue-naped vs Blue-headed** | Nape | BLUE nape | Whole head blue |
| **Rusty-naped vs Blue-naped** | Nape color | RUSTY | Blue |

### KINGFISHERS (Alcedinidae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Common vs Blue-eared** | Ear coverts | Orange-rufous | BLUE patch |
| | Size | Smaller (16cm) | Larger (20cm) |
| **Stork-billed vs Ruddy** | Bill color | RED bill | BLACK bill |
| | Size | Very large (35cm) | Medium (25cm) |
| **Collared vs Sacred** | Collar | WHITE collar complete | Collar may be incomplete |
| | Cap color | Dark brown/black | Greenish-blue |
| **White-throated vs Black-capped** | Crown | Blue | BLACK cap |
| **Blue-banded vs Common** | Breast band | BLUE band on white | No band |
| **Rufous-backed vs Stork-billed** | Back | RUFOUS back | Blue-grey back |
| **Banded vs Blue-banded** | Banding | Multiple bands | Single blue band |

### DRONGOS (Dicruridae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Greater vs Lesser Racket-tailed** | Crest | PROMINENT tuft | SMALL/absent tuft |
| | Size | Larger | Smaller |
| | Racket shape | Larger rackets | Smaller rackets |
| **Crow-billed vs Black** | Bill | HEAVY, arched | Normal drongo bill |
| **Hair-crested vs Spangled** | Crest | Fine hair-like | Spangled/spotted breast |
| **Bronzed vs Black** | Gloss | BRONZE iridescence | Blue-green gloss |
| **Ashy vs Black** | Color | ASHY grey | Black |

### BULBULS (Pycnonotidae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Yellow-vented vs Olive-winged** | Vent | BRIGHT yellow | Olive-yellow |
| | Eye-ring | White | Less prominent |
| **Stripe-throated vs Yellow-bellied** | Throat | STREAKED | Plain yellow |
| **Red-whiskered vs Red-vented** | Crest | Tall pointed crest + red whisker | Short crest, no whisker |
| **Black-headed vs Black-crested** | Crest shape | Rounded head | POINTED crest |
| **Cream-vented vs Red-eyed** | Vent | CREAM | Red-brown |
| | Eye | Brown | RED |
| **Spectacled vs Grey-cheeked** | Eye-ring | YELLOW spectacles | Grey cheek, pale eye-ring |
| **Hairy-backed vs Buff-vented** | Back | Hairy texture | Smooth |
| | Vent | Different color | BUFF |

### TAILORBIRDS (Cisticolidae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Common vs Dark-necked** | Throat/neck | White throat, grey sides | DARK grey neck sides |
| **Rufous-tailed vs Ashy** | Tail color | RUFOUS tail | Grey tail |
| | Crown | Rufous crown | Grey crown |
| **Olive-backed vs Rufous-tailed** | Back | OLIVE | Rufous tones |
| **Dark-necked vs Black-necked** | Neck darkness | Dark grey | BLACK |

### SUNBIRDS (Nectariniidae) - Males
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Olive-backed vs Plain** | Throat | Metallic BLUE-BLACK | Metallic RED |
| **Crimson vs Temminck's** | Underparts | CRIMSON breast | Scarlet, different pattern |
| **Purple-throated vs Van Hasselt's** | Throat | PURPLE | Dark metallic |
| **Copper-throated vs Brown-throated** | Throat | COPPER-RED | Brown/maroon |
| **Ruby-cheeked vs Crimson** | Cheek | ORANGE cheek patch | No orange cheek |
| **Purple vs Purple-naped** | Nape | All purple | PURPLE nape distinct |
| **Black-throated vs Purple-throated** | Throat | BLACK | Purple |

### SPIDERHUNTERS (Nectariniidae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Little vs Thick-billed** | Bill | Shorter, thinner | THICK, heavy |
| **Long-billed vs Little** | Bill length | VERY LONG | Short |
| **Yellow-eared vs Spectacled** | Ear patch | YELLOW ear tuft | Eye-ring/spectacles |
| **Grey-breasted vs Streaked** | Breast | GREY, plain | Streaked |

### WHITE-EYES (Zosteropidae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Oriental vs Everett's** | Eye-ring | Complete white ring | May be broken |
| | Flanks | Greyish | More rufous |
| **Japanese vs Swinhoe's** | Forehead | Yellow-green | Brighter yellow |
| **Black-capped vs Oriental** | Cap | BLACK cap | Green cap |

### MYNAS & STARLINGS (Sturnidae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Common vs Jungle Myna** | Crest | Small tuft | Larger frontal crest |
| | Eye patch | Yellow patch | Less yellow |
| **White-vented vs Javan** | Vent | WHITE | Pale/grey |
| **Hill vs Common** | Head feathers | Bare yellow patch | Feathered |
| **Asian Glossy vs Common Starling** | Plumage | Glossy green-black | Spotted/iridescent |
| **Golden-crested vs Hill Myna** | Crest | GOLDEN crest | Yellow wattles |
| **Daurian vs Chestnut-cheeked** | Cheek | Grey | CHESTNUT |

### MUNIAS/FINCHES (Estrildidae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Scaly-breasted vs White-rumped** | Rump | Brown | WHITE |
| | Breast scaling | More prominent | Less prominent |
| **Chestnut vs Black-headed** | Head | CHESTNUT | BLACK |
| **White-headed vs Pale-headed** | Head color | WHITE | PALE buff |
| **Dusky vs Black-faced** | Face | Dusky grey | BLACK face |
| **White-bellied vs Javan** | Belly | WHITE | Buff/brown |

### SHAMAS & ROBINS (Muscicapidae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **White-rumped vs Rufous-tailed** | Rump | WHITE | Rufous-brown |
| | Tail length | Very long | Shorter |
| **Oriental Magpie-Robin vs White-rumped Shama** | Tail | Shorter, white outer | Very long, white rump |
| **Siberian Blue vs White-tailed Robin** | Tail | Blue | WHITE outer tail |
| **White-tailed vs Slaty-backed** | Tail | White outer tail | Blue-grey |

### THRUSHES (Turdidae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Orange-headed vs Siberian** | Head | ORANGE | Grey-brown |
| **Eyebrowed vs Grey-backed** | Back | Brown with spots | GREY back |
| **Scaly vs Orange-headed** | Breast | SCALED pattern | Plain orange |
| **Island vs Grey-backed** | Range | Island endemic | Mainland |

### WARBLERS - LEAF WARBLERS (Phylloscopidae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Arctic vs Greenish** | Wing bars | TWO bars | ONE bar or none |
| **Yellow-browed vs Inornate** | Supercilium | Long, prominent | Short, less prominent |
| | Wing bars | Two distinct | Less distinct |
| **Two-barred vs Arctic** | Wing bars | BOLD white bars | Less prominent |
| **Pale-legged vs Arctic** | Legs | PALE pink | Dark |
| **Eastern Crowned vs Mountain** | Crown stripe | Indistinct | More prominent |
| **Sulphur-breasted vs Mountain** | Underparts | YELLOW wash | Less yellow |

### WARBLERS - BUSH/REED WARBLERS (Acrocephalidae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Oriental Reed vs Clamorous** | Size | Smaller | LARGER |
| | Bill | Smaller | Heavier |
| **Black-browed vs Manchurian** | Eyebrow | Dark bordered | Plain |
| **Thick-billed vs Clamorous** | Bill | THICK | Normal |

### CUCKOOS (Cuculidae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Indian vs Common** | Breast barring | Narrower bars | Wider bars |
| **Plaintive vs Rusty-breasted** | Breast | Grey | RUSTY |
| **Asian Koel (M) vs Crow** | Eye | RED eye | Dark eye |
| | Bill | Pale green | Black |
| **Drongo Cuckoo vs Drongo** | Eye | Red/brown | Dark |
| | Tail | Slightly forked | More forked |
| **Chestnut-winged vs Banded Bay** | Wing color | CHESTNUT | Banded pattern |
| **Violet vs Asian Emerald** | Gloss | VIOLET | Green |
| **Lesser vs Sunda Cuckoo** | Size | Smaller | Larger |
| | Range | Different ranges | Sunda region |

### WOODPECKERS (Picidae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Common Flameback vs Greater Flameback** | Size | Smaller (25cm) | LARGER (33cm) |
| | Rump | Red | RED, larger |
| **Laced vs Streak-breasted** | Breast | Scaled/laced | STREAKED |
| **Grey-capped vs Buff-rumped** | Crown | GREY cap | Red crown |
| | Rump | Golden | BUFF |
| **Banded vs Buff-necked** | Pattern | Barred back | BUFF neck |
| **Crimson-winged vs Greater Flameback** | Back | Black with white | Golden back |
| **Rufous vs Buff-rumped** | Overall color | RUFOUS tones | Buff/olive |

### BARBETS (Megalaimidae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Blue-eared vs Blue-throated** | Throat | Green | BLUE |
| **Gold-whiskered vs Red-crowned** | Whisker | GOLD | Red crown |
| **Coppersmith vs Blue-eared** | Breast | RED patch | No red patch |
| **Red-throated vs Golden-throated** | Throat | RED | GOLDEN |
| **Yellow-crowned vs Blue-eared** | Crown | YELLOW | Blue-eared |

### BROADBILLS (Eurylaimidae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Black-and-red vs Banded** | Pattern | Black + RED | Black + PINK bands |
| **Long-tailed vs Banded** | Tail | LONG tail | Normal tail |
| **Green vs Lesser Green** | Size | Larger | SMALLER |
| | Bill | Larger | Smaller |
| **Dusky vs Black-and-yellow** | Color | DUSKY brown | Black + Yellow |

### IORAS (Aegithinidae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Common vs Green** | Wing bars | Two WHITE bars | Less prominent |
| **Great vs Common** | Size | LARGER | Smaller |
| | Bill | Heavier | Smaller |

### MINIVETS (Campephagidae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Scarlet vs Grey-chinned (M)** | Chin | Red | GREY chin |
| **Small vs Fiery (M)** | Size | Smaller | Larger |
| | Red intensity | Lighter red | FIERY red |
| **Ashy vs Rosy** | Male color | ASHY grey | Rosy pink |
| **Scarlet (F) vs Grey-chinned (F)** | Yellow shade | Orange-yellow | Paler yellow |

### ORIOLES (Oriolidae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Black-naped vs Slender-billed** | Bill | Normal | SLENDER |
| | Nape | Black nape band | Less distinct |
| **Dark-throated vs Black-naped** | Throat | DARK streaks | Plain yellow |
| **Black-hooded vs Black-naped** | Head | BLACK hood | Black nape only |

### FLOWERPECKERS (Dicaeidae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Scarlet-backed vs Orange-bellied (M)** | Back | SCARLET | Blue-black |
| | Belly | White | ORANGE |
| **Plain vs Thick-billed** | Bill | Thin | THICK |
| | Plumage | Plain | Plain |
| **Yellow-vented vs Yellow-bellied** | Vent | Yellow spot | Yellow overall |
| **Crimson-breasted vs Fire-breasted** | Red location | Breast | Throat + breast |

### RAPTORS (Accipitridae)
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Crested Serpent vs Changeable Hawk-Eagle** | Crest | Short, broad | Long, prominent |
| **Japanese vs Chinese Sparrowhawk** | Throat | White with dark line | Plain white |
| **Black vs Brahminy Kite** | Adult plumage | All dark | White head/breast |
| **Shikra vs Besra** | Breast | Rufous bars | Darker, thicker bars |

### SWALLOWS & SWIFTS
| Confusion Pair | Key Diagnostic | Species A | Species B |
|----------------|----------------|-----------|-----------|
| **Barn vs Pacific Swallow** | Breast band | Complete dark band | Incomplete/absent |
| | Tail streamers | Very long | Shorter |
| **House vs Asian Palm Swift** | Rump | White rump patch | No white rump |
| | Shape | Stockier | More slender |

---

## 📚 COMPLETE SOUTHEAST ASIAN BIRD FAMILY & GENUS REFERENCE

### ACCIPITRIDAE (Hawks, Eagles, Kites)
**Genera & Key Species:**
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Accipiter** | Crested Goshawk, Japanese Sparrowhawk, Chinese Sparrowhawk, Besra, Shikra | Small-medium raptors, short rounded wings, long tail, barred underparts |
| **Aquila** | Imperial Eagle, Steppe Eagle | Large dark eagles, feathered tarsi |
| **Haliaeetus** | White-bellied Sea Eagle, Grey-headed Fish Eagle | Large eagles near water, fish-eating |
| **Haliastur** | Brahminy Kite, Black Kite | Medium kites, forked tail (Black), white head (Brahminy) |
| **Icthyophaga** | Lesser Fish Eagle, Grey-headed Fish Eagle | Fish-eating eagles |
| **Nisaetus** | Changeable Hawk-Eagle, Blyth's Hawk-Eagle, Wallace's Hawk-Eagle | Crested eagles, barred underparts |
| **Pernis** | Oriental Honey-buzzard, Crested Honey-buzzard | Small head, pigeon-like, honey-eating |
| **Spilornis** | Crested Serpent Eagle | Short crest, snake-eating, yellow cere |
| **Circus** | Eastern Marsh Harrier, Pied Harrier | Long wings, owl-like face, low flight |
| **Buteo** | Eastern Buzzard | Soaring, variable plumage |
| **Elanus** | Black-winged Kite | White with black shoulders, hovering |
| **Ictinaetus** | Black Eagle | All black, slow flight, yellow feet |
| **Lophotriorchis** | Rufous-bellied Eagle | Dark above, rufous below |
| **Hieraaetus** | Booted Eagle | Small, variable plumage |

### FALCONIDAE (Falcons)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Falco** | Peregrine, Oriental Hobby, Eurasian Hobby, Kestrel, Merlin | Pointed wings, fast flight, moustachial stripe |
| **Microhierax** | Black-thighed Falconet, White-fronted Falconet | Tiny falcons, 15cm |

### PANDIONIDAE (Osprey)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Pandion** | Osprey | White head, dark eye-stripe, fish-eating |

### STRIGIDAE (Owls)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Otus** | Collared Scops, Sunda Scops, Oriental Scops, Mountain Scops, Rajah Scops | Small, ear tufts, streaked |
| **Bubo** | Barred Eagle-Owl, Spot-bellied Eagle-Owl, Buffy Fish Owl | Large, prominent ear tufts |
| **Ketupa** | Brown Fish Owl, Tawny Fish Owl, Buffy Fish Owl | Fish-eating, yellow eyes |
| **Strix** | Brown Wood Owl, Spotted Wood Owl | Round head, no ear tufts |
| **Glaucidium** | Collared Owlet, Asian Barred Owlet, Jungle Owlet | Tiny, false "eyes" on nape |
| **Ninox** | Brown Boobook, Northern Boobook | Dark eyes, hawk-like |
| **Tyto** | Barn Owl, Oriental Bay Owl, Grass Owl | Heart-shaped face |

### CAPRIMULGIDAE (Nightjars)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Caprimulgus** | Large-tailed, Grey, Indian, Savanna Nightjar | Cryptic, white tail/wing patches |
| **Lyncornis** | Great Eared Nightjar | Large, ear tufts |
| **Eurostopodus** | Malaysian Eared Nightjar | Ear tufts, grey plumage |

### HEMIPROCNIDAE (Treeswifts)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Hemiprocne** | Grey-rumped, Whiskered, Crested Treeswift | Long forked tail, crest, perch on branches |

### APODIDAE (Swifts)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Apus** | House Swift, Pacific Swift | Forked tail, white rump (House) |
| **Aerodramus** | Black-nest, Edible-nest, Mossy-nest Swiftlet | Cave nesting, echolocation |
| **Collocalia** | Glossy Swiftlet | Glossy blue-black |
| **Hirundapus** | Brown-backed, White-throated Needletail | Large, cigar-shaped, fast |
| **Cypsiurus** | Asian Palm Swift | Very slender, long tail |

### TROGONIDAE (Trogons)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Harpactes** | Red-headed, Orange-breasted, Diard's, Scarlet-rumped, Whitehead's, Cinnamon-rumped | Soft plumage, red/pink breast (M), brown (F), sit still |
| **Apalharpactes** | Javan Trogon | Java endemic |

### CORACIIDAE (Rollers)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Coracias** | Indian Roller, Dollarbird (Eurystomus) | Blue wings, sit-and-wait |
| **Eurystomus** | Dollarbird | Dark with red bill, blue wing patch |

### ALCEDINIDAE (Kingfishers)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Alcedo** | Common, Blue-eared Kingfisher | Small, blue-orange, fish-eating |
| **Ceyx** | Oriental Dwarf, Rufous-backed Kingfisher | Tiny, forest |
| **Halcyon** | White-throated, Black-capped, Collared, Ruddy | Medium, tree kingfishers |
| **Todiramphus** | Collared, Sacred Kingfisher | White collar |
| **Pelargopsis** | Stork-billed Kingfisher | Large red bill |
| **Lacedo** | Banded Kingfisher | Barred plumage, forest |
| **Actenoides** | Rufous-collared Kingfisher | Rufous collar |

### MEROPIDAE (Bee-eaters)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Merops** | Blue-throated, Blue-tailed, Chestnut-headed, Red-bearded | Long tail, curved bill, bright colors |
| **Nyctyornis** | Red-bearded Bee-eater | Large, shaggy red throat |

### BUCEROTIDAE (Hornbills)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Buceros** | Rhinoceros, Great, Helmeted Hornbill | Large casque |
| **Anthracoceros** | Oriental Pied, Black Hornbill | Black and white |
| **Anorrhinus** | Bushy-crested Hornbill | Grey, bushy crest |
| **Aceros** | Wreathed Hornbill | Corrugated casque |
| **Rhyticeros** | Wrinkled, Narcondam Hornbill | Wrinkled casque |
| **Berenicornis** | White-crowned Hornbill | White crest |

### UPUPIDAE (Hoopoe)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Upupa** | Eurasian Hoopoe | Cinnamon, black-white wings, crest |

### MEGALAIMIDAE (Asian Barbets)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Psilopogon** | Blue-eared, Blue-throated, Red-crowned, Gold-whiskered, Red-throated, Golden-throated, Coppersmith | Colorful head pattern, stout bill, hole-nesting |

### PICIDAE (Woodpeckers)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Picus** | Streak-breasted, Grey-headed, Laced, Streak-throated | Green woodpeckers |
| **Dinopium** | Common Flameback, Black-rumped Flameback | Golden back, red crown (M) |
| **Chrysocolaptes** | Greater Flameback, Crimson-backed Flameback | Large, red crown (M) |
| **Dendrocopos** | Sunda, Fulvous-breasted, Grey-capped, Freckle-breasted | Black-white, red on head (M) |
| **Picumnus** | Speckled Piculet | Tiny, no tail prop |
| **Sasia** | White-browed Piculet, Rufous Piculet | Tiny, rufous |
| **Hemicircus** | Grey-and-buff Woodpecker | Short-tailed |
| **Meiglyptes** | Buff-rumped, Buff-necked, Grey-and-buff | Barred |
| **Blythipicus** | Bay, Maroon Woodpecker | Dark, forest |
| **Reinwardtipicus** | Orange-backed Woodpecker | Orange back |
| **Mulleripicus** | Great Slaty Woodpecker | Very large, grey |
| **Dryocopus** | White-bellied Woodpecker | Large, black-white |

### EURYLAIMIDAE (Broadbills)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Eurylaimus** | Banded, Black-and-yellow Broadbill | Wide flat bill, colorful |
| **Cymbirhynchus** | Black-and-red Broadbill | Red and black |
| **Corydon** | Dusky Broadbill | Huge pink bill |
| **Serilophus** | Silver-breasted Broadbill | Silver breast |
| **Psarisomus** | Long-tailed Broadbill | Green, blue cap, long tail |
| **Calyptomena** | Green Broadbill | Bright green |

### PITTIDAE (Pittas)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Pitta** | Blue-winged, Mangrove, Hooded, Fairy, Blue-naped, Rusty-naped, Giant | Short tail, colorful, ground-dwelling |
| **Erythropitta** | Blue-banded Pitta | Red and blue |
| **Hydrornis** | Banded, Malayan Banded Pitta | Barred pattern |

### HIRUNDINIDAE (Swallows & Martins)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Hirundo** | Barn Swallow, Pacific Swallow, Wire-tailed Swallow | Forked tail, aerial |
| **Delichon** | Asian House Martin | White rump |
| **Riparia** | Sand Martin | Brown, colonial |
| **Petrochelidon** | Red-rumped Swallow | Rufous rump, striped |

### CAMPEPHAGIDAE (Cuckooshrikes & Minivets)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Pericrocotus** | Scarlet, Small, Fiery, Grey-chinned, Ashy, Rosy Minivet | Red/orange (M), yellow (F) |
| **Coracina** | Large, Javan, Sunda Cuckooshrike | Grey, barred |
| **Lalage** | Pied Triller, Black-winged Cuckooshrike | Black-white, smaller |
| **Hemipus** | Bar-winged Flycatcher-shrike, Black-winged | Small, flycatcher-like |

### AEGITHINIDAE (Ioras)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Aegithina** | Common Iora, Green Iora, Great Iora | Yellow-green, wing bars |

### CHLOROPSEIDAE (Leafbirds)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Chloropsis** | Greater Green, Lesser Green, Blue-winged, Orange-bellied | Green, black throat (M), mimics |

### ORIOLIDAE (Orioles)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Oriolus** | Black-naped, Black-hooded, Dark-throated, Maroon Oriole | Yellow/maroon, black head markings |

### DICRURIDAE (Drongos)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Dicrurus** | Black, Ashy, Crow-billed, Greater Racket-tailed, Lesser Racket-tailed, Hair-crested, Bronzed, Spangled | Black, forked tail, aggressive |

### RHIPIDURIDAE (Fantails)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Rhipidura** | Pied, Malaysian Pied, White-throated, Spotted Fantail | Fan-shaped tail, active |

### MONARCHIDAE (Monarchs)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Terpsiphone** | Asian Paradise Flycatcher, Blyth's Paradise | Long tail (M), rufous/white morphs |
| **Hypothymis** | Black-naped Monarch | Blue, black nape |

### LANIIDAE (Shrikes)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Lanius** | Tiger, Brown, Long-tailed, Bull-headed, Burmese Shrike | Hooked bill, mask, sit-and-wait |

### CORVIDAE (Crows & Jays)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Corvus** | House Crow, Large-billed Crow, Slender-billed Crow | Black, intelligent |
| **Cissa** | Common Green Magpie, Indochinese Green Magpie, Bornean Green Magpie | Bright green/blue |
| **Urocissa** | Red-billed Blue Magpie, Yellow-billed Blue Magpie | Long blue tail |
| **Dendrocitta** | Racket-tailed Treepie, Black Racket-tailed Treepie | Racket tail |
| **Platysmurus** | Black Magpie | All black, forest |

### ARTAMIDAE (Woodswallows)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Artamus** | Ashy, White-breasted Woodswallow | Grey, stout bill, aerial |

### PARADOXORNITHIDAE (Parrotbills)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Psittiparus** | Grey-headed Parrotbill | Rounded bill |
| **Paradoxornis** | Spot-breasted Parrotbill | Spotted |

### PARIDAE (Tits)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Parus** | Great Tit, Japanese Tit, Cinereous Tit | Black head stripe |
| **Machlolophus** | Sultan Tit | Yellow crest, black |
| **Melanochlora** | Sultan Tit | Large, crested |

### SITTIDAE (Nuthatches)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Sitta** | Chestnut-bellied, Velvet-fronted, Blue, Giant Nuthatch | Tree-climbing, head-down |

### CERTHIIDAE (Treecreepers)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Certhia** | Brown-throated Treecreeper | Curved bill, creeps up bark |

### AEGITHALIDAE (Long-tailed Tits)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Aegithalos** | Black-throated Tit | Tiny, long tail, flocking |

### CISTICOLIDAE (Cisticolas & Tailorbirds)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Orthotomus** | Common, Dark-necked, Rufous-tailed, Ashy, Olive-backed Tailorbird | Rufous crown, sews nest |
| **Prinia** | Yellow-bellied, Plain, Hill, Rufescent Prinia | Long tail, cocked |
| **Cisticola** | Zitting, Golden-headed Cisticola | Small, streaked, grassland |

### PYCNONOTIDAE (Bulbuls)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Pycnonotus** | Yellow-vented, Olive-winged, Cream-vented, Red-vented, Red-whiskered, Black-headed, Black-crested | Common, yellow/red vent |
| **Alophoixus** | Ochraceous, Grey-cheeked, Yellow-bellied Bulbul | Forest bulbuls |
| **Iole** | Buff-vented, Charlotte's Bulbul | Plain, brownish |
| **Hemixos** | Ashy Bulbul | Ashy grey |
| **Hypsipetes** | Black, Ashy, Streaked Bulbul | Dark, streaked |
| **Tricholestes** | Hairy-backed Bulbul | Hairy texture |
| **Setornis** | Hook-billed Bulbul | Hooked bill |

### PHYLLOSCOPIDAE (Leaf Warblers)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Phylloscopus** | Arctic, Greenish, Two-barred, Yellow-browed, Inornate, Pale-legged, Eastern Crowned, Mountain | Small, olive, supercilium |
| **Seicercus** | Chestnut-crowned, Grey-cheeked, Yellow-breasted Warbler | Colorful crown/face |

### ACROCEPHALIDAE (Reed Warblers)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Acrocephalus** | Oriental Reed, Clamorous Reed, Black-browed, Thick-billed Warbler | Reed beds, streaked |

### LOCUSTELLIDAE (Grasshopper Warblers)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Locustella** | Lanceolated, Pallas's Grasshopper, Rusty-rumped Warbler | Skulking, streaked |

### TIMALIIDAE (Babblers)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Stachyris** | Grey-throated, Grey-headed, Black-throated, Spot-necked Babbler | Small, forest |
| **Macronus** | Striped, Grey-faced Tit-Babbler | Striped cap |
| **Mixornis** | Pin-striped Tit-Babbler | Streaked |
| **Timalia** | Chestnut-capped Babbler | Chestnut cap |
| **Pellorneum** | Black-capped, Buff-breasted, Puff-throated Babbler | Ground, secretive |
| **Trichastoma** | Short-tailed, Abbott's Babbler | Plain, ground |
| **Malacopteron** | Scaly-crowned, Rufous-crowned, Grey-breasted Babbler | Crown pattern |
| **Pomatorhinus** | White-browed, Black-streaked Scimitar Babbler | Curved bill |
| **Garrulax** | Black, White-crested, Greater Necklaced, Lesser Necklaced Laughingthrush | Loud, social |
| **Ianthocincla** | Chestnut-capped Laughingthrush | Cap color |
| **Argya** | Striped, Abbott's Babbler | Streaked |

### LEIOTHRICHIDAE (Laughingthrushes)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Garrulax** | White-crested, Black, Greater Necklaced, Lesser Necklaced | Laughing calls, social |
| **Trochalopteron** | Chestnut-capped Laughingthrush | Chestnut cap |
| **Pterorhinus** | Black-throated Laughingthrush | Black throat |

### ZOSTEROPIDAE (White-eyes)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Zosterops** | Oriental, Japanese, Swinhoe's, Everett's, Black-capped White-eye | White eye-ring, green |

### MUSCICAPIDAE (Old World Flycatchers)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Cyornis** | Mangrove Blue, Hill Blue, Tickell's, Pale Blue, Large Blue, Malaysian Blue | Blue (M), orange breast |
| **Niltava** | Large, Small, Vivid, Rufous-bellied Niltava | Brilliant blue patches (M) |
| **Eumyias** | Verditer Flycatcher | All turquoise-blue |
| **Ficedula** | Mugimaki, Narcissus, Yellow-rumped, Taiga, Snowy-browed, Little Pied | Pied pattern, colorful (M) |
| **Muscicapa** | Asian Brown, Dark-sided, Grey-streaked, Brown-streaked | Plain brown, streaked |
| **Rhinomyias** | Fulvous-chested, Brown-chested, Grey-chested Jungle Flycatcher | Forest, brown |
| **Culicicapa** | Grey-headed Canary Flycatcher | Yellow below, grey head |
| **Copsychus** | Oriental Magpie-Robin, White-rumped Shama | Black-white, long tail |
| **Kittacincla** | White-rumped Shama | Very long tail, white rump |
| **Tarsiger** | Siberian Blue Robin, White-tailed Robin | Blue (M), skulking |
| **Larvivora** | Siberian Blue Robin | Blue (M), rufous (F) |
| **Saxicola** | Siberian Stonechat, Pied Bushchat | Perches openly |

### TURDIDAE (Thrushes)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Geokichla** | Orange-headed, Siberian, Scaly, Chestnut-capped Thrush | Colorful head |
| **Turdus** | Eyebrowed, Grey-backed, Island Thrush | Spotted breast |
| **Zoothera** | Scaly, Pied, Long-tailed Thrush | Scaled pattern |

### STURNIDAE (Starlings & Mynas)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Acridotheres** | Common, Jungle, White-vented, Great, Crested Myna | Yellow eye patch, crest |
| **Gracula** | Hill Myna | Yellow wattles, mimics |
| **Aplonis** | Asian Glossy, Philippine Glossy Starling | Glossy black-green |
| **Sturnia** | Chestnut-tailed, Brahminy Starling | Pale grey |
| **Agropsar** | Daurian, Chestnut-cheeked Starling | Pale, cheek patch |

### NECTARINIIDAE (Sunbirds & Spiderhunters)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Cinnyris** | Olive-backed, Crimson, Purple-throated, Brown-throated, Copper-throated | Metallic throat (M) |
| **Anthreptes** | Ruby-cheeked, Brown-throated, Plain Sunbird | Less curved bill |
| **Aethopyga** | Crimson, Temminck's, Fire-tailed Sunbird | Brilliant red (M) |
| **Leptocoma** | Purple, Van Hasselt's, Black-throated Sunbird | Dark metallic |
| **Arachnothera** | Little, Long-billed, Yellow-eared, Spectacled, Grey-breasted, Streaked Spiderhunter | Long bill, larger |

### PASSERIDAE (Sparrows)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Passer** | House Sparrow, Eurasian Tree Sparrow | Brown streaked |

### PLOCEIDAE (Weavers)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Ploceus** | Baya, Asian Golden, Streaked Weaver | Weaves elaborate nests |

### ESTRILDIDAE (Munias & Finches)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Lonchura** | Scaly-breasted, White-rumped, Chestnut, Black-headed, White-headed, Dusky Munia | Conical bill, flocking |
| **Erythrura** | Pin-tailed Parrotfinch | Green, red face |
| **Amandava** | Red Avadavat | Red, spotted |

### MOTACILLIDAE (Wagtails & Pipits)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Motacilla** | White, Grey, Yellow, Eastern Yellow, Citrine Wagtail | Long tail, wags |
| **Anthus** | Paddyfield, Richard's, Olive-backed Pipit | Streaked, walks |
| **Dendronanthus** | Forest Wagtail | Unique side-to-side tail wag |

### FRINGILLIDAE (Finches)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Chloris** | Grey-capped Greenfinch | Green, grey cap |
| **Carpodacus** | Vinaceous, Scarlet Rosefinch | Red (M) |
| **Pyrrhula** | Brown Bullfinch | Round, stubby bill |

### EMBERIZIDAE (Buntings)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Emberiza** | Yellow-breasted, Black-headed, Chestnut, Little Bunting | Streaked, colorful head (M) |

### CUCULIDAE (Cuckoos)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Cuculus** | Common, Indian, Himalayan, Oriental, Lesser, Sunda Cuckoo | Barred breast, parasitic |
| **Cacomantis** | Plaintive, Brush, Rusty-breasted Cuckoo | Rufous morphs |
| **Chrysococcyx** | Asian Emerald, Violet Cuckoo | Metallic green/violet |
| **Surniculus** | Drongo Cuckoo, Square-tailed Cuckoo | Drongo-like |
| **Hierococcyx** | Large Hawk-Cuckoo, Hodgson's Hawk-Cuckoo | Hawk-like |
| **Eudynamys** | Asian Koel | Black (M), spotted (F) |
| **Phaenicophaeus** | Chestnut-bellied, Black-bellied, Raffles's, Red-billed Malkoha | Long tail, colored bill |
| **Centropus** | Greater, Lesser Coucal | Heavy, pheasant-like |

### PSITTACIDAE (Parrots)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Psittacula** | Long-tailed, Red-breasted, Blossom-headed, Grey-headed Parakeet | Long tail, colorful |
| **Loriculus** | Blue-crowned Hanging Parrot | Tiny, hangs upside down |
| **Tanygnathus** | Blue-naped, Blue-backed Parrot | Large, green |

### COLUMBIDAE (Pigeons & Doves)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Treron** | Pink-necked, Thick-billed, Yellow-vented, Little Green Pigeon | Green, fruit-eating |
| **Ptilinopus** | Black-naped, Jambu Fruit Dove | Colorful fruit doves |
| **Ducula** | Green, Pied, Mountain Imperial Pigeon | Large, grey/green |
| **Chalcophaps** | Emerald Dove | Bronze-green wings |
| **Geopelia** | Zebra Dove | Barred, small |
| **Streptopelia** | Spotted, Red Turtle Dove | Neck collar |
| **Macropygia** | Little, Barred Cuckoo-Dove | Long tail, cinnamon |
| **Columba** | Rock Pigeon | Grey, urban |
| **Spilopelia** | Spotted Dove | Spotted collar |

### RALLIDAE (Rails & Crakes)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Rallus** | Slaty-breasted Rail | Long bill, barred |
| **Gallirallus** | Slaty-breasted Rail | Olive-brown |
| **Amaurornis** | White-breasted Waterhen | White face, red base of bill |
| **Porzana** | Baillon's, Ruddy-breasted Crake | Small, secretive |
| **Gallinula** | Common Moorhen | Red frontal shield |
| **Fulica** | Common Coot | White frontal shield |
| **Gallicrex** | Watercock | Horn on forehead (M) |

### CHARADRIIDAE (Plovers)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Pluvialis** | Pacific, Grey Golden Plover | Spangled, migratory |
| **Charadrius** | Little Ringed, Kentish, Malaysian, Lesser Sand Plover | Breast bands |
| **Vanellus** | Red-wattled, Grey-headed Lapwing | Wattles, loud |

### SCOLOPACIDAE (Sandpipers)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Tringa** | Common, Marsh, Wood, Green Sandpiper, Redshank, Greenshank | Long legs, probing |
| **Actitis** | Common Sandpiper | Teetering |
| **Calidris** | Dunlin, Red-necked Stint, Long-toed Stint | Small waders |
| **Gallinago** | Common, Pintail, Swinhoe's Snipe | Long bill, cryptic |
| **Numenius** | Whimbrel, Eurasian Curlew | Curved bill |
| **Limosa** | Black-tailed, Bar-tailed Godwit | Long bill, upturned |
| **Xenus** | Terek Sandpiper | Upturned bill |
| **Phalaropus** | Red-necked Phalarope | Swimming sandpiper |

### LARIDAE (Gulls & Terns)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Chroicocephalus** | Brown-headed Gull | Brown hood (breeding) |
| **Larus** | Black-tailed Gull | Grey, black tail band |
| **Sterna** | Common, Black-naped, Little, Great Crested Tern | Forked tail, plunge-diving |
| **Thalasseus** | Great Crested, Lesser Crested Tern | Yellow/orange bill |
| **Onychoprion** | Bridled Tern | White forehead |
| **Sternula** | Little Tern | Tiny, yellow bill |
| **Chlidonias** | Whiskered, White-winged Tern | Marsh terns |

### ARDEIDAE (Herons & Egrets)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Ardea** | Grey, Purple, Great-billed Heron | Large, long neck |
| **Egretta** | Little, Chinese, Pacific Reef Egret | White or dark morph |
| **Bubulcus** | Cattle Egret | Orange buff in breeding |
| **Ardeola** | Chinese, Javan Pond Heron | Brown, white in flight |
| **Butorides** | Striated Heron | Small, crouching |
| **Nycticorax** | Black-crowned Night Heron | Nocturnal, red eye |
| **Gorsachius** | Malayan Night Heron | Forest, secretive |
| **Ixobrychus** | Yellow, Cinnamon, Black Bittern | Small, secretive |

### THRESKIORNITHIDAE (Ibises & Spoonbills)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Platalea** | Black-faced Spoonbill | Spoon-shaped bill |
| **Threskiornis** | Black-headed Ibis | Curved bill |
| **Plegadis** | Glossy Ibis | Dark, iridescent |

### CICONIIDAE (Storks)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Mycteria** | Milky, Painted Stork | Colorful, large |
| **Anastomus** | Asian Openbill | Gap in bill |
| **Ciconia** | White, Black Stork | Large, black-white |
| **Leptoptilos** | Lesser, Greater Adjutant | Huge, bare head |
| **Ephippiorhynchus** | Black-necked Stork | Black-white, red legs |

### PHALACROCORACIDAE (Cormorants)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Phalacrocorax** | Little, Indian, Great Cormorant | Dark, hooked bill |
| **Microcarbo** | Little Cormorant | Small, short bill |

### ANHINGIDAE (Darters)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Anhinga** | Oriental Darter | Snake-like neck, spears fish |

### PELECANIDAE (Pelicans)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Pelecanus** | Spot-billed Pelican | Huge bill pouch |

### FREGATIDAE (Frigatebirds)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Fregata** | Great, Lesser, Christmas Frigatebird | Forked tail, red throat pouch (M) |

### PHASIANIDAE (Pheasants, Partridges, Quail)
| Genus | Species | Key Features |
|-------|---------|--------------|
| **Gallus** | Red Junglefowl | Ancestor of chicken |
| **Lophura** | Crested Fireback, Kalij, Silver Pheasant | Crested, long tail |
| **Polyplectron** | Peacock Pheasant (Grey, Malaysian, Bornean) | Ocelli on tail |
| **Argusianus** | Great Argus | Huge wing feathers |
| **Pavo** | Green Peafowl | Huge train, iridescent |
| **Arborophila** | Scaly-breasted, Grey-breasted Partridge | Forest, secretive |
| **Rollulus** | Crested Partridge | Red crest (M) |
| **Coturnix** | Blue-breasted, Japanese Quail | Small, cryptic |
| **Francolinus** | Chinese Francolin | Spotted |

---

## 🌍 GLOBAL BIRD FAMILY REFERENCE - ALL REGIONS

### ADDITIONAL FAMILIES NOT FOUND IN SE ASIA

#### AFRICA
| Family | Key Genera | Sexual Dimorphism | Key Features |
|--------|-----------|-------------------|--------------|
| **Musophagidae** (Turacos) | Tauraco, Corythaeola | Minimal - sexes similar | Crimson flight feathers, crests |
| **Coliidae** (Mousebirds) | Colius, Urocolius | None - sexes identical | Long tail, crest, grey-brown |
| **Buphagidae** (Oxpeckers) | Buphagus | None | Red/yellow bill, tick-eating |
| **Sagittariidae** (Secretary Bird) | Sagittarius | Minimal | Long legs, crest, snake-eating |
| **Numididae** (Guineafowl) | Numida, Guttera | Minimal | Spotted plumage, bare head |
| **Viduidae** (Whydahs/Indigobirds) | Vidua | EXTREME - Male long tail, black; Female brown, short | Brood parasites |
| **Ploceidae** (Weavers - African) | Ploceus, Quelea, Euplectes | STRONG - Males bright yellow/red/orange; Females streaked brown | Elaborate nests |

#### AMERICAS (NEW WORLD)
| Family | Key Genera | Sexual Dimorphism | Key Features |
|--------|-----------|-------------------|--------------|
| **Trochilidae** (Hummingbirds) | Archilochus, Selasphorus, Calypte, Amazilia, Colibri | VARIABLE - Males often have gorgets; Females plainer | Iridescent, hovering, long bill |
| **Tyrannidae** (Tyrant Flycatchers) | Tyrannus, Myiarchus, Empidonax, Contopus | Minimal to None | Erect posture, aerial sallies |
| **Thraupidae** (Tanagers) | Piranga, Tangara, Ramphocelus, Thraupis | STRONG - Males brilliant colors; Females olive/yellow | Fruit-eating, colorful |
| **Cardinalidae** (Cardinals/Grosbeaks) | Cardinalis, Pheucticus, Passerina | STRONG - Males bright red/blue; Females brown | Thick bill, seed-eating |
| **Icteridae** (New World Blackbirds) | Icterus, Quiscalus, Agelaius, Molothrus | STRONG - Males black/orange; Females brown/streaked | Colonial, diverse |
| **Parulidae** (New World Warblers) | Setophaga, Vermivora, Geothlypis, Mniotilta | STRONG - Breeding males colorful; Females/non-breeding duller | Small, insectivorous, migratory |
| **Mimidae** (Mockingbirds/Thrashers) | Mimus, Toxostoma, Dumetella | None to Minimal | Long tail, mimics, curved bill |
| **Vireonidae** (Vireos) | Vireo | None | Olive, eye-ring or spectacles |
| **Trogonidae** (Quetzals) | Pharomachrus | EXTREME - Male iridescent green, long tail; Female duller, short tail | Central American forests |
| **Ramphastidae** (Toucans) | Ramphastos, Pteroglossus, Aulacorhynchus | Minimal - Male larger bill | Huge colorful bill |
| **Furnariidae** (Ovenbirds) | Furnarius, Cinclodes, Synallaxis | None | Rufous, elaborate nests |
| **Formicariidae** (Antbirds) | Thamnophilus, Myrmeciza, Gymnopithys | STRONG - Males black/grey; Females brown/rufous | Follow army ants |
| **Cotingidae** (Cotingas) | Cotinga, Rupicola, Procnias | EXTREME - Males brilliant; Females olive/brown | Fruit-eating, displays |
| **Pipridae** (Manakins) | Pipra, Manacus, Chiroxiphia | EXTREME - Males colorful with displays; Females olive-green | Lek displays, small |
| **Odontophoridae** (New World Quail) | Callipepla, Colinus, Cyrtonyx | Moderate - Males more colorful head | Crested, ground-dwelling |
| **Cathartidae** (New World Vultures) | Cathartes, Coragyps, Gymnogyps, Sarcoramphus | Minimal | Bare head, soaring |

#### EUROPE (Additional to Asian species)
| Family | Key Genera | Sexual Dimorphism | Key Features |
|--------|-----------|-------------------|--------------|
| **Prunellidae** (Accentors) | Prunella | Minimal | Streaked, thin bill |
| **Cinclidae** (Dippers) | Cinclus | None | Aquatic, white breast |
| **Regulidae** (Kinglets/Goldcrests) | Regulus | Minimal - Male orange crown center; Female yellow | Tiny, hyperactive, crown stripe |
| **Bombycillidae** (Waxwings) | Bombycilla | None | Crested, waxy red tips |
| **Troglodytidae** (Wrens) | Troglodytes, Cistothorus | None | Tiny, cocked tail, loud song |
| **Certhiidae** (Treecreepers) | Certhia | None | Streaked brown, curved bill |

#### AUSTRALIA/OCEANIA
| Family | Key Genera | Sexual Dimorphism | Key Features |
|--------|-----------|-------------------|--------------|
| **Maluridae** (Fairywrens) | Malurus | EXTREME - Breeding male brilliant blue; Female/eclipse male brown | Cocked tail, small |
| **Meliphagidae** (Honeyeaters) | Philemon, Manorina, Lichenostomus, Myzomela | Variable - some males brighter | Brush-tipped tongue, nectar |
| **Pardalotidae** (Pardalotes) | Pardalotus | Moderate - Males more spotted | Tiny, spotted crown |
| **Acanthizidae** (Thornbills/Gerygones) | Acanthiza, Gerygone, Sericornis | None | Small, brown/olive |
| **Menuridae** (Lyrebirds) | Menura | EXTREME - Male elaborate lyre tail; Female plain | Superb mimicry |
| **Atrichornithidae** (Scrub-birds) | Atrichornis | Minimal | Rare, secretive, loud |
| **Ptilonorhynchidae** (Bowerbirds) | Ptilonorhynchus, Chlamydera, Sericulus | EXTREME - Males colorful, build bowers; Females brown | Elaborate bowers |
| **Paradisaeidae** (Birds-of-Paradise) | Paradisaea, Cicinnurus, Astrapia, Parotia | EXTREME - Males extraordinary plumes; Females brown | New Guinea, elaborate displays |
| **Cacatuidae** (Cockatoos) | Cacatua, Calyptorhynchus, Nymphicus | Variable - some dimorphic | Crested, large, intelligent |
| **Psittaculidae** (Australasian Parrots) | Platycercus, Trichoglossus, Melopsittacus | Variable | Colorful, diverse |
| **Megapodiidae** (Megapodes/Mound-builders) | Megapodius, Alectura, Leipoa | Minimal | Incubate in mounds/volcanoes |
| **Casuariidae** (Cassowaries) | Casuarius | Female larger, brighter casque | Large flightless, casque |
| **Dromaiidae** (Emus) | Dromaius | Female larger | Large flightless |
| **Apterygidae** (Kiwis) | Apteryx | Female larger | Flightless, long bill, nocturnal |

---

## 🔬 COMPREHENSIVE SEXUAL DIMORPHISM BY FAMILY (GLOBAL)

### EXTREME DIMORPHISM (Males completely different from females)
| Family | Male | Female | Dimorphism Level |
|--------|------|--------|-----------------|
| **Phasianidae** (Pheasants/Peafowl) | Elaborate plumage, long tails, spurs | Brown, cryptic, smaller | EXTREME |
| **Paradisaeidae** (Birds-of-Paradise) | Extraordinary plumes, wires, ribbons | Plain brown | EXTREME |
| **Pipridae** (Manakins) | Bright colors, modified feathers | Olive-green | EXTREME |
| **Cotingidae** (Cotingas) | Brilliant blue/purple/red | Olive/grey | EXTREME |
| **Ptilonorhynchidae** (Bowerbirds) | Often iridescent, build bowers | Brown, choose bowers | EXTREME |
| **Menuridae** (Lyrebirds) | Elaborate lyre-shaped tail | Plain brown, no lyre | EXTREME |
| **Maluridae** (Fairywrens) | Brilliant blue/purple (breeding) | Brown (both sexes eclipse) | EXTREME (seasonal) |
| **Viduidae** (Whydahs) | Long tail plumes, black | Short tail, streaked brown | EXTREME (seasonal) |
| **Ploceidae** (Weavers) | Bright yellow/red/black | Streaked brown | STRONG (seasonal) |
| **Euplectes** (Bishops/Widowbirds) | Black + red/yellow, long tail | Streaked brown | EXTREME (seasonal) |

### STRONG DIMORPHISM (Clearly different but same body plan)
| Family | Male | Female | Key Differences |
|--------|------|--------|-----------------|
| **Anatidae** (Ducks) | Colorful head/body (breeding) | Mottled brown | Head pattern, body color |
| **Thraupidae** (Tanagers) | Brilliant reds/blues/greens | Olive/yellow/brown | Overall coloration |
| **Cardinalidae** (Cardinals) | Bright red/blue | Brown/olive | Overall coloration |
| **Icteridae** (Blackbirds/Orioles) | Black with colors | Brown/streaked | Overall pattern |
| **Parulidae** (New World Warblers) | Bright patterns (breeding) | Duller versions | Pattern intensity |
| **Nectariniidae** (Sunbirds) | Metallic iridescent throat/breast | Plain olive-yellow | Iridescence |
| **Trochilidae** (Hummingbirds) | Iridescent gorget | Plain throat | Gorget color |
| **Trogonidae** (Trogons) | Brilliant green/red breast | Duller, brown replace green | Breast/back color |
| **Muscicapidae** (Flycatchers) - Cyornis/Niltava | Blue upperparts, orange breast | Brown/grey upperparts | Blue vs brown |
| **Dicaeidae** (Flowerpeckers) | Red/orange patches | Plain olive | Color patches |
| **Fringillidae** (Finches) | Bright colors (breeding) | Streaked brown | Head/breast color |

### MODERATE DIMORPHISM (Subtle differences)
| Family | Male | Female | Key Differences |
|--------|------|--------|-----------------|
| **Picidae** (Woodpeckers) | Red on head (crown/moustache/nape) | No red or reduced | Red patch location |
| **Alcedinidae** (Kingfishers) | All-dark bill (some species) | Red/orange lower mandible | Bill color |
| **Bucerotidae** (Hornbills) | Larger casque, eye color different | Smaller casque, different eye | Casque size, eye color |
| **Psittacidae** (Parrots) | Brighter colors (some species) | Duller (some) | Variable by species |
| **Ramphastidae** (Toucans) | Slightly larger bill | Slightly smaller bill | Bill size |
| **Cuculidae** (Cuckoos) | Some have different barring | Different barring | Subtle pattern |
| **Accipitridae** (Hawks/Eagles) | Smaller, sometimes different color | Larger, sometimes browner | Size, subtle color |
| **Strigidae** (Owls) | Smaller | Larger | Size only |
| **Tyrannidae** (Tyrant Flycatchers) | Sometimes brighter crown | Duller crown | Crown patch |

### MINIMAL/NO DIMORPHISM (Sexes nearly identical)
| Family | Notes | How to Sex |
|--------|-------|-----------|
| **Corvidae** (Crows/Ravens) | Sexes identical | Size only (male larger) |
| **Ardeidae** (Herons/Egrets) | Sexes identical | Behavior during breeding |
| **Ciconiidae** (Storks) | Sexes identical | Size, bill-clattering |
| **Laridae** (Gulls/Terns) | Sexes identical | Size only |
| **Scolopacidae** (Sandpipers) | Sexes identical (most) | Size varies by species |
| **Columbidae** (Pigeons/Doves) | Sexes similar | Males coo more, slightly brighter |
| **Apodidae** (Swifts) | Sexes identical | Cannot be sexed visually |
| **Hirundinidae** (Swallows) | Sexes identical or nearly so | Tail length sometimes |
| **Dicruridae** (Drongos) | Sexes identical | Cannot be sexed visually |
| **Laniidae** (Shrikes) | Sexes similar | Females slightly duller |
| **Pittidae** (Pittas) | Most sexes identical | Banded Pitta dimorphic |
| **Eurylaimidae** (Broadbills) | Sexes similar | Males slightly brighter |
| **Timaliidae** (Babblers) | Sexes identical | Cannot be sexed visually |
| **Zosteropidae** (White-eyes) | Sexes identical | Cannot be sexed visually |
| **Pycnonotidae** (Bulbuls) | Sexes identical | Cannot be sexed visually |

---

## 🎯 KEY IDENTIFICATION FEATURES BY BODY PART

### HEAD FEATURES
| Feature | What to Look For | Diagnostic For |
|---------|-----------------|----------------|
| **Crown** | Color, stripes, crest, pattern | Warblers, Bulbuls, Tailorbirds |
| **Supercilium (Eyebrow)** | Length, color, thickness | Warblers, Babblers, Thrushes |
| **Eye-stripe** | Present/absent, thickness | Pittas, Warblers, Flycatchers |
| **Eye-ring** | Complete/broken, color | White-eyes, Flycatchers |
| **Lores** | Color, pattern | Flycatchers, Warblers |
| **Ear coverts** | Color, pattern | Kingfishers, Bulbuls |
| **Moustachial stripe** | Present/absent, color | Falcons, Buntings |
| **Throat** | Color, pattern, gorget | Sunbirds, Hummingbirds, Flycatchers |
| **Crest** | Present/absent, shape, color | Bulbuls, Hornbills, Cockatoos |

### BILL FEATURES
| Feature | What to Look For | Diagnostic For |
|---------|-----------------|----------------|
| **Shape** | Straight, curved, hooked, conical | Family level ID |
| **Size** | Proportional to head | Species within genus |
| **Color** | Whole or partial colors | Kingfishers (sex), Hornbills |
| **Base color** | Gape, cere color | Raptors, Parrots |

### BODY FEATURES
| Feature | What to Look For | Diagnostic For |
|---------|-----------------|----------------|
| **Breast** | Color, streaking, scaling, bands | Most passerines |
| **Belly** | Color, contrast with breast | Flycatchers, Sunbirds |
| **Flanks** | Color, streaking | Flycatchers, Warblers |
| **Mantle/Back** | Color, pattern | Most families |
| **Rump** | Color (often diagnostic!) | Shamas, Swifts, Munias |
| **Vent/Undertail** | Color | Bulbuls, Flowerpeckers |

### WING FEATURES
| Feature | What to Look For | Diagnostic For |
|---------|-----------------|----------------|
| **Wing bars** | Number, color, prominence | Warblers, Flycatchers |
| **Wing panel** | Pale/colored patches | Doves, Warblers |
| **Primary projection** | Length beyond tertials | Warblers (migrants) |
| **Wing pattern** | Barring, spots, patches | Many families |

### TAIL FEATURES
| Feature | What to Look For | Diagnostic For |
|---------|-----------------|----------------|
| **Length** | Short, medium, long, very long | Shamas, Paradise-flycatchers |
| **Shape** | Square, rounded, forked, graduated | Swallows, Drongos |
| **Pattern** | Bars, spots, white edges | Cuckoos, Thrushes |
| **Color** | Different from body? | Robins, Niltavas |

### LEG/FEET FEATURES
| Feature | What to Look For | Diagnostic For |
|---------|-----------------|----------------|
| **Color** | Pink, yellow, black, orange | Warblers, Waders |
| **Length** | Relative to body | Waders, Herons |
| **Structure** | Webbed, lobed, zygodactyl | Family level |

---

## 🌏 REGIONAL VARIATIONS & SUBSPECIES CONSIDERATIONS

### IMPORTANT: Geographic Variation Patterns
- **Gloger's Rule**: Birds in humid regions tend to be darker
- **Bergmann's Rule**: Birds in colder regions tend to be larger
- **Allen's Rule**: Birds in colder regions have shorter extremities

### Subspecies Hotspots in SE Asia
| Island/Region | Subspecies Notes |
|---------------|------------------|
| **Borneo** | Many endemic subspecies, often darker |
| **Sumatra** | Distinct from Peninsular Malaysia |
| **Java** | Many endemic subspecies/species |
| **Philippines** | Extremely high endemism |
| **Sulawesi** | Distinct fauna, many endemics |
| **Andaman/Nicobar** | Distinct subspecies |
| **Taiwan** | Distinct subspecies of mainland species |

---

## MANDATORY IDENTIFICATION PROTOCOL:

### PHASE 1: INITIAL OBSERVATION (BEFORE identifying)
Document EXACTLY what you see - colors, patterns, shapes, sizes. Do NOT name any species yet.

### PHASE 2: GENUS DETERMINATION
Based on morphology, determine the GENUS first. What family and genus does this animal belong to?

### PHASE 3: EXHAUSTIVE SPECIES ENUMERATION
List EVERY SINGLE SPECIES in this genus that occurs in Southeast Asia. Do not skip any.

### PHASE 4: DIAGNOSTIC KEY ANALYSIS
For EACH candidate species, use this diagnostic key format:

**DIAGNOSTIC FEATURE MATRIX** (You MUST complete this for ALL similar species):

| Diagnostic Feature | Weight | Species A | Species B | Species C | THIS SPECIMEN |
|-------------------|--------|-----------|-----------|-----------|---------------|
| Eye-stripe thickness | HIGH | Thick | Thin | Medium | [MEASURE IT] |
| Crown color | HIGH | Rufous | Green | Brown | [EXACT COLOR] |
| Bill proportions | HIGH | Heavy | Medium | Small | [DESCRIBE] |
| Throat color | MEDIUM | Buff | White | Yellow | [EXACT COLOR] |
| Belly coloration | MEDIUM | Plain buff | Orange wash | Streaked | [DESCRIBE] |
| Rump color | HIGH | Blue | Green | Brown | [EXACT COLOR] |
| Wing bar presence | MEDIUM | Present | Absent | Faint | [YES/NO] |
| Leg color | LOW | Pink | Grey | Black | [EXACT COLOR] |

WEIGHT MEANINGS:
- HIGH = Must match for positive ID (diagnostic)
- MEDIUM = Should match, minor variation OK
- LOW = Variable feature, less diagnostic

### PHASE 5: ELIMINATION PROCESS
For each candidate, state:
1. Which HIGH-weight features MATCH
2. Which HIGH-weight features DO NOT MATCH
3. VERDICT: ELIMINATED or POSSIBLE MATCH

### PHASE 6: FINAL DETERMINATION
After eliminating impossible species, if only ONE remains = CONFIDENT identification
If 2-3 remain = State primary match with alternatives
If more remain = Image quality insufficient for definitive ID

### PHASE 7: SUBSPECIES DETERMINATION
For the identified species, check if subspecies are determinable:
- Geographic range (Singapore/Malaysia/Thailand/etc.)
- Any plumage/size variations between subspecies
- Sexual dimorphism considerations

## OUTPUT FORMAT - STRICT JSON:
{
  "analysisPhases": {
    "phase1_observation": {
      "rawObservation": "Describe EVERYTHING visible without naming species",
      "colorInventory": {
        "head": "exact colors",
        "body": "exact colors", 
        "wings": "exact colors",
        "tail": "exact colors",
        "legs": "exact color"
      },
      "structuralFeatures": {
        "billShape": "description",
        "billSize": "proportional description",
        "bodyShape": "compact/slender/etc",
        "tailLength": "short/medium/long relative to body"
      }
    },
    "phase2_genus": {
      "identifiedClass": "Aves/Mammalia/etc",
      "identifiedOrder": "Order name",
      "identifiedFamily": "Family name",
      "identifiedGenus": "Genus name",
      "genusReasoning": "Why this genus"
    },
    "phase3_candidates": {
      "genusName": "The genus",
      "allSpeciesInGenus": ["Complete list of species in this genus in SE Asia"],
      "candidatesConsidered": ["Species that could potentially match based on initial features"]
    },
    "phase4_diagnosticMatrix": {
      "featuresAnalyzed": [
        {
          "feature": "Feature name",
          "weight": "HIGH/MEDIUM/LOW",
          "thisSpecimen": "What this specimen shows",
          "speciesComparison": [
            {"species": "Species 1", "expectedValue": "What Species 1 shows", "matches": true/false},
            {"species": "Species 2", "expectedValue": "What Species 2 shows", "matches": true/false}
          ]
        }
      ]
    },
    "phase5_elimination": {
      "eliminatedSpecies": [
        {
          "species": "Species name",
          "scientificName": "Genus species",
          "eliminationReason": "Which diagnostic feature(s) ruled this out",
          "conflictingFeatures": ["List of features that don't match"]
        }
      ],
      "remainingCandidates": [
        {
          "species": "Species name",
          "scientificName": "Genus species",
          "matchingDiagnosticFeatures": ["List of HIGH-weight matches"],
          "supportingFeatures": ["List of MEDIUM-weight matches"],
          "matchConfidence": 0-100
        }
      ]
    }
  },
  "finalIdentification": {
    "commonName": "EXACT common name - MUST BE SPECIFIC",
    "scientificName": "Genus species",
    "confidence": "definite/highly_likely/probable/possible/uncertain",
    "confidencePercentage": 0-100,
    "subspecies": {
      "name": "subspecies name or null if not determinable",
      "trinomial": "Genus species subspecies",
      "determination_method": "geographic/morphological/both",
      "reasoning": "Why this subspecies"
    },
    "sex": {
      "determination": "male/female/unknown",
      "confidence": "definite/probable/unknown",
      "evidence": ["List of features indicating sex"]
    },
    "ageClass": {
      "determination": "adult/immature/juvenile/unknown",
      "evidence": ["List of features indicating age"]
    },
    "keyDiagnosticFeatures": [
      "The #1 most important feature confirming this ID",
      "The #2 most important feature",
      "The #3 most important feature"
    ],
    "distinguishedFrom": [
      {
        "similarSpecies": "Similar species name",
        "howDistinguished": "The specific feature(s) that separate them"
      }
    ]
  },
  "alternatives": [
    {
      "commonName": "Alternative species name",
      "scientificName": "Genus species",
      "confidencePercentage": 0-100,
      "reasonConsidered": "What features support this",
      "reasonLessLikely": "What features make this less likely than primary"
    }
  ],
  "fullTaxonomy": {
    "kingdom": "Animalia",
    "phylum": "Chordata",
    "class": "Class name",
    "order": "Order name",
    "family": "Family name",
    "genus": "Genus",
    "species": "species epithet",
    "subspecies": "subspecies epithet or null"
  },
  "identificationQuality": {
    "imageQuality": "excellent/good/fair/poor",
    "diagnosticFeaturesVisible": "all_critical/most_critical/some_critical/few_critical",
    "confidenceJustification": "Why this confidence level"
  }
}

## ⚠️ FINAL CHECKS BEFORE RESPONDING:
1. Did you complete the diagnostic matrix for ALL similar species?
2. Did you check ALL HIGH-weight features before deciding?
3. Is your identification SPECIFIC (not just genus level)?
4. Did you consider subspecies?
5. Did you distinguish from similar species explicitly?

RESPOND WITH VALID JSON ONLY. NO OTHER TEXT.`;

      // Prepare image data for Gemini
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      };

      // Generate content with Gemini
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      
      console.log('🤖 Gemini raw response length:', text.length);

      // Check for refusal responses
      if (text.toLowerCase().startsWith('i cannot') || 
          text.toLowerCase().startsWith('i\'m sorry') ||
          text.toLowerCase().startsWith('i am unable') ||
          text.toLowerCase().includes('cannot identify')) {
        console.log('⚠ Gemini refused or could not identify:', text.substring(0, 200));
        return {
          error: true,
          message: 'Could not identify the animal in this image. Please try a clearer image.',
          rawResponse: text
        };
      }

      // Parse JSON response
      let parsedResponse;
      try {
        // Clean the response text (remove any markdown code blocks if present)
        let cleanedText = text.trim();
        if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.slice(7);
        }
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.slice(3);
        }
        if (cleanedText.endsWith('```')) {
          cleanedText = cleanedText.slice(0, -3);
        }
        
        // Find JSON in the response if there's extra text
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedText = jsonMatch[0];
        }
        
        parsedResponse = JSON.parse(cleanedText.trim());
        
        // Normalize the response to expected format (handle new structure)
        if (parsedResponse.finalIdentification && !parsedResponse.primaryMatch) {
          // Convert new format to expected format
          const normalized = {
            primaryMatch: {
              commonName: parsedResponse.finalIdentification.commonName,
              scientificName: parsedResponse.finalIdentification.scientificName,
              confidence: parsedResponse.finalIdentification.confidence,
              confidencePercentage: parsedResponse.finalIdentification.confidencePercentage,
              subspecies: parsedResponse.finalIdentification.subspecies,
              sex: parsedResponse.finalIdentification.sex,
              ageClass: parsedResponse.finalIdentification.ageClass,
              keyIdentifyingFeatures: parsedResponse.finalIdentification.keyDiagnosticFeatures,
              distinguishedFrom: parsedResponse.finalIdentification.distinguishedFrom
            },
            alternatives: parsedResponse.alternatives || [],
            taxonomicInfo: parsedResponse.fullTaxonomy,
            analysisPhases: parsedResponse.analysisPhases,
            identificationQuality: parsedResponse.identificationQuality
          };
          
          // Log the diagnostic analysis for debugging
          if (parsedResponse.analysisPhases?.phase5_elimination) {
            console.log('🔬 Diagnostic Analysis:');
            console.log(`   Eliminated: ${parsedResponse.analysisPhases.phase5_elimination.eliminatedSpecies?.map(s => s.species).join(', ') || 'none'}`);
            console.log(`   Remaining: ${parsedResponse.analysisPhases.phase5_elimination.remainingCandidates?.map(s => s.species).join(', ') || 'none'}`);
          }
          
          parsedResponse = normalized;
        }
      } catch (parseError) {
        console.error('Error parsing Gemini response:', parseError);
        console.log('Raw response:', text.substring(0, 500));
        return {
          error: true,
          message: 'Failed to parse AI response',
          rawResponse: text
        };
      }

      return {
        success: true,
        identification: parsedResponse,
        model: AnimalIdentificationController.GEMINI_MODEL
      };

    } catch (error) {
      console.error('Error identifying with Gemini:', error.message);
      throw new Error(`Gemini identification failed: ${error.message}`);
    }
  }

  /**
   * Fetch multiple reference images from Wikipedia REST API (all angles)
   * @param {string} scientificName - Scientific name of the species
   * @param {number} maxImages - Maximum number of images to fetch (default: 10)
   * @returns {Object} - Wikipedia images data with multiple angles
   */
  static async getWikipediaImages(scientificName, maxImages = 10) {
    try {
      if (!scientificName) {
        throw new Error('Scientific name is required');
      }

      // Format scientific name for Wikipedia search
      const searchTerm = scientificName.trim();
      const allImages = [];
      let pageInfo = null;

      // Step 1: Get page summary for basic info
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`;

      try {
        const summaryResponse = await axios.get(summaryUrl, {
          headers: {
            'User-Agent': 'SHB-Survey-Assistant/1.0 (Wildlife Identification Bot)'
          },
          timeout: 10000
        });

        if (summaryResponse.data) {
          pageInfo = {
            title: summaryResponse.data.title,
            description: summaryResponse.data.description,
            extract: summaryResponse.data.extract,
            wikipediaUrl: summaryResponse.data.content_urls?.desktop?.page || null
          };

          // Add main thumbnail if available
          if (summaryResponse.data.thumbnail) {
            allImages.push({
              url: summaryResponse.data.thumbnail.source,
              width: summaryResponse.data.thumbnail.width,
              height: summaryResponse.data.thumbnail.height,
              type: 'main',
              description: 'Main article image'
            });
          }

          // Add original image if different from thumbnail
          if (summaryResponse.data.originalimage) {
            allImages.push({
              url: summaryResponse.data.originalimage.source,
              width: summaryResponse.data.originalimage.width,
              height: summaryResponse.data.originalimage.height,
              type: 'original',
              description: 'Original high-resolution image'
            });
          }
        }
      } catch (summaryError) {
        console.log(`Summary endpoint failed for ${scientificName}, continuing with images endpoint...`);
      }

      // Step 2: Get ALL images from the Wikipedia page
      const mediaWikiUrl = `https://en.wikipedia.org/w/api.php`;
      
      // First, get all image filenames from the page
      const imagesParams = {
        action: 'query',
        titles: searchTerm,
        prop: 'images',
        imlimit: maxImages * 2, // Request more to filter
        format: 'json',
        origin: '*'
      };

      const imagesResponse = await axios.get(mediaWikiUrl, {
        params: imagesParams,
        headers: {
          'User-Agent': 'SHB-Survey-Assistant/1.0 (Wildlife Identification Bot)'
        },
        timeout: 10000
      });

      const pages = imagesResponse.data.query?.pages;
      if (pages) {
        const pageId = Object.keys(pages)[0];
        const page = pages[pageId];

        if (pageId !== '-1' && page.images) {
          // Filter for actual image files (exclude icons, logos, commons symbols)
          const imageFiles = page.images
            .filter(img => {
              const filename = img.title.toLowerCase();
              return (
                (filename.endsWith('.jpg') || 
                 filename.endsWith('.jpeg') || 
                 filename.endsWith('.png') || 
                 filename.endsWith('.gif') ||
                 filename.endsWith('.webp')) &&
                !filename.includes('icon') &&
                !filename.includes('logo') &&
                !filename.includes('symbol') &&
                !filename.includes('flag') &&
                !filename.includes('map') &&
                !filename.includes('commons') &&
                !filename.includes('wikidata') &&
                !filename.includes('edit-clear') &&
                !filename.includes('ambox') &&
                !filename.includes('question_book')
              );
            })
            .slice(0, maxImages);

          // Get image URLs for each file
          if (imageFiles.length > 0) {
            const imageInfoParams = {
              action: 'query',
              titles: imageFiles.map(img => img.title).join('|'),
              prop: 'imageinfo',
              iiprop: 'url|size|extmetadata',
              iiurlwidth: 800, // Request scaled version
              format: 'json',
              origin: '*'
            };

            const imageInfoResponse = await axios.get(mediaWikiUrl, {
              params: imageInfoParams,
              headers: {
                'User-Agent': 'SHB-Survey-Assistant/1.0 (Wildlife Identification Bot)'
              },
              timeout: 15000
            });

            const imagePages = imageInfoResponse.data.query?.pages;
            if (imagePages) {
              Object.values(imagePages).forEach(imgPage => {
                if (imgPage.imageinfo && imgPage.imageinfo[0]) {
                  const info = imgPage.imageinfo[0];
                  const metadata = info.extmetadata || {};
                  
                  // Extract description from metadata
                  let imgDescription = 'Reference image';
                  if (metadata.ImageDescription?.value) {
                    // Strip HTML tags
                    imgDescription = metadata.ImageDescription.value.replace(/<[^>]*>/g, '').slice(0, 200);
                  } else if (metadata.ObjectName?.value) {
                    imgDescription = metadata.ObjectName.value;
                  }

                  // Add both thumbnail and original URLs
                  if (info.thumburl) {
                    allImages.push({
                      url: info.thumburl,
                      width: info.thumbwidth || 800,
                      height: info.thumbheight || null,
                      originalUrl: info.url,
                      originalWidth: info.width,
                      originalHeight: info.height,
                      type: 'gallery',
                      title: imgPage.title.replace('File:', ''),
                      description: imgDescription
                    });
                  } else if (info.url) {
                    allImages.push({
                      url: info.url,
                      width: info.width,
                      height: info.height,
                      type: 'gallery',
                      title: imgPage.title.replace('File:', ''),
                      description: imgDescription
                    });
                  }
                }
              });
            }
          }

          // Update page info if not already set
          if (!pageInfo) {
            pageInfo = {
              title: page.title,
              wikipediaUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`
            };
          }
        }
      }

      // Step 3: Also search Wikimedia Commons for more images
      const commonsImages = await AnimalIdentificationController.getWikimediaCommonsImages(
        scientificName, 
        Math.max(5, maxImages - allImages.length)
      );
      
      if (commonsImages.length > 0) {
        allImages.push(...commonsImages);
      }

      // Remove duplicate URLs
      const uniqueImages = [];
      const seenUrls = new Set();
      for (const img of allImages) {
        if (!seenUrls.has(img.url)) {
          seenUrls.add(img.url);
          uniqueImages.push(img);
        }
      }

      if (uniqueImages.length === 0) {
        return {
          success: false,
          message: `No Wikipedia images found for: ${scientificName}`
        };
      }

      return {
        success: true,
        images: uniqueImages.slice(0, maxImages),
        totalFound: uniqueImages.length,
        ...pageInfo
      };

    } catch (error) {
      console.error('Error fetching Wikipedia images:', error.message);
      return {
        success: false,
        message: `Failed to fetch Wikipedia images: ${error.message}`
      };
    }
  }

  /**
   * Fetch images from Wikimedia Commons for additional angles
   * @param {string} searchTerm - Species name to search
   * @param {number} limit - Maximum images to fetch
   * @returns {Array} - Array of image objects
   */
  static async getWikimediaCommonsImages(searchTerm, limit = 5) {
    try {
      const commonsUrl = 'https://commons.wikimedia.org/w/api.php';
      
      // Search for images on Commons
      const searchParams = {
        action: 'query',
        generator: 'search',
        gsrsearch: `${searchTerm} filetype:bitmap`,
        gsrnamespace: 6, // File namespace
        gsrlimit: limit,
        prop: 'imageinfo',
        iiprop: 'url|size|extmetadata',
        iiurlwidth: 800,
        format: 'json',
        origin: '*'
      };

      const response = await axios.get(commonsUrl, {
        params: searchParams,
        headers: {
          'User-Agent': 'SHB-Survey-Assistant/1.0 (Wildlife Identification Bot)'
        },
        timeout: 10000
      });

      const images = [];
      const pages = response.data.query?.pages;
      
      if (pages) {
        Object.values(pages).forEach(page => {
          if (page.imageinfo && page.imageinfo[0]) {
            const info = page.imageinfo[0];
            const metadata = info.extmetadata || {};
            
            let description = 'Wikimedia Commons image';
            if (metadata.ImageDescription?.value) {
              description = metadata.ImageDescription.value.replace(/<[^>]*>/g, '').slice(0, 200);
            }

            images.push({
              url: info.thumburl || info.url,
              width: info.thumbwidth || info.width,
              height: info.thumbheight || info.height,
              originalUrl: info.url,
              originalWidth: info.width,
              originalHeight: info.height,
              type: 'commons',
              title: page.title.replace('File:', ''),
              description: description,
              source: 'Wikimedia Commons'
            });
          }
        });
      }

      return images;
    } catch (error) {
      console.error('Error fetching Wikimedia Commons images:', error.message);
      return [];
    }
  }

  /**
   * Legacy method for backward compatibility - now returns multiple images
   * @param {string} scientificName - Scientific name of the species
   * @returns {Object} - Wikipedia image data
   */
  static async getWikipediaImage(scientificName) {
    const result = await AnimalIdentificationController.getWikipediaImages(scientificName, 1);
    
    if (result.success && result.images && result.images.length > 0) {
      const mainImage = result.images[0];
      return {
        success: true,
        image: {
          url: mainImage.url,
          width: mainImage.width,
          height: mainImage.height
        },
        originalImage: mainImage.originalUrl ? {
          url: mainImage.originalUrl,
          width: mainImage.originalWidth,
          height: mainImage.originalHeight
        } : null,
        title: result.title,
        description: result.description,
        extract: result.extract,
        wikipediaUrl: result.wikipediaUrl
      };
    }
    
    return result;
  }

  /**
   * Main handler for animal identification endpoint
   * Uses DUAL AI MODELS: Gemini + iNaturalist for maximum accuracy
   * Falls back to iNaturalist when Gemini quota is exceeded
   */
  async handleIdentification(req, res) {
    try {
      const { image, mimeType, maxImages = 10, useMultiModel = true } = req.body;

      // Validate input
      if (!image) {
        return res.status(400).json({
          success: false,
          error: 'No image data provided. Please provide base64 encoded image in the "image" field.'
        });
      }

      // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
      let base64Image = image;
      let detectedMimeType = mimeType || 'image/jpeg';

      if (image.includes('base64,')) {
        const parts = image.split('base64,');
        base64Image = parts[1];
        // Extract mime type from data URL
        const mimeMatch = parts[0].match(/data:([^;]+)/);
        if (mimeMatch) {
          detectedMimeType = mimeMatch[1];
        }
      }

      // Step 0: Prepare image for AI analysis (upscale small images)
      console.log('📐 Preparing image for AI analysis...');
      const imagePrep = await AnimalIdentificationController.prepareImageForAnalysis(
        base64Image,
        detectedMimeType
      );
      
      // Use processed image for better accuracy
      const analysisImage = imagePrep.processedBase64;
      const analysisMimeType = imagePrep.mimeType;
      console.log(`📊 Image quality: ${imagePrep.qualityAssessment.overallQuality}`);
      if (imagePrep.qualityAssessment.action !== 'none') {
        console.log(`🔄 ${imagePrep.qualityAssessment.action}: ${imagePrep.qualityAssessment.reason}`);
      }

      // Check if primary model quota has been reset (retry after interval)
      if (AnimalIdentificationController.usingFallbackModel && 
          AnimalIdentificationController.geminiQuotaResetTime &&
          Date.now() > AnimalIdentificationController.geminiQuotaResetTime) {
        console.log('🔄 Primary model quota retry interval passed, switching back to gemini-2.5-pro...');
        AnimalIdentificationController.GEMINI_MODEL = AnimalIdentificationController.GEMINI_MODEL_PRIMARY;
        AnimalIdentificationController.usingFallbackModel = false;
        AnimalIdentificationController.geminiQuotaExceeded = false;
        AnimalIdentificationController.geminiQuotaResetTime = null;
      }

      let geminiResult = null;
      let usedPrimaryModel = `Gemini (${AnimalIdentificationController.GEMINI_MODEL})`;
      let identification = null;

      // Step 1: Try Gemini (with automatic model fallback)
      console.log(`🔍 Starting animal identification with ${AnimalIdentificationController.GEMINI_MODEL}...`);
      try {
        geminiResult = await AnimalIdentificationController.identifyWithGemini(
          analysisImage,
          analysisMimeType
        );
          
        if (geminiResult.success && !geminiResult.identification?.error) {
          identification = geminiResult.identification;
          console.log(`✓ ${AnimalIdentificationController.GEMINI_MODEL} identification successful`);
        } else if (geminiResult.identification?.error) {
          console.log('⚠ Gemini returned error, will retry with fallback model');
          geminiResult = null;
        }
      } catch (geminiError) {
        // Check if it's a quota error (429)
        if (geminiError.message?.includes('429') || 
            geminiError.message?.includes('quota') || 
            geminiError.message?.includes('Too Many Requests') ||
            geminiError.message?.includes('RESOURCE_EXHAUSTED') ||
            geminiError.message?.includes('exceeded')) {
          
          // If we're on primary model, switch to fallback 1
          if (AnimalIdentificationController.fallbackLevel === 0) {
            console.log(`⚠️ ${AnimalIdentificationController.GEMINI_MODEL} quota exceeded! Switching to ${AnimalIdentificationController.GEMINI_MODEL_FALLBACK}...`);
            AnimalIdentificationController.GEMINI_MODEL = AnimalIdentificationController.GEMINI_MODEL_FALLBACK;
            AnimalIdentificationController.usingFallbackModel = true;
            AnimalIdentificationController.fallbackLevel = 1;
            AnimalIdentificationController.geminiQuotaResetTime = AnimalIdentificationController.getNextPacificMidnight();
            const resetTimeStr = new Date(AnimalIdentificationController.geminiQuotaResetTime).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'short', timeStyle: 'short' });
            console.log(`   Will retry ${AnimalIdentificationController.GEMINI_MODEL_PRIMARY} at: ${resetTimeStr} PT (midnight Pacific)`);
            
            // Retry immediately with fallback model
            console.log(`🔄 Retrying with ${AnimalIdentificationController.GEMINI_MODEL_FALLBACK}...`);
            try {
              geminiResult = await AnimalIdentificationController.identifyWithGemini(
                analysisImage,
                analysisMimeType
              );
              if (geminiResult.success && !geminiResult.identification?.error) {
                identification = geminiResult.identification;
                usedPrimaryModel = `Gemini (${AnimalIdentificationController.GEMINI_MODEL_FALLBACK})`;
                console.log(`✓ ${AnimalIdentificationController.GEMINI_MODEL_FALLBACK} identification successful`);
              }
            } catch (fallbackError) {
              console.error('Fallback 1 model also failed:', fallbackError.message);
              // Try fallback 2
              await AnimalIdentificationController.tryFallback2(analysisImage, analysisMimeType, (result, model) => {
                geminiResult = result;
                if (result?.success) {
                  identification = result.identification;
                  usedPrimaryModel = `Gemini (${model})`;
                }
              });
            }
          } else if (AnimalIdentificationController.fallbackLevel === 1) {
            // Fallback 1 exceeded, try fallback 2
            console.log(`⚠️ ${AnimalIdentificationController.GEMINI_MODEL_FALLBACK} quota exceeded! Switching to ${AnimalIdentificationController.GEMINI_MODEL_FALLBACK2}...`);
            await AnimalIdentificationController.tryFallback2(analysisImage, analysisMimeType, (result, model) => {
              geminiResult = result;
              if (result?.success) {
                identification = result.identification;
                usedPrimaryModel = `Gemini (${model})`;
              }
            });
          } else {
            // All models on current key exhausted, try next key
            console.log(`⚠️ All Gemini models exhausted on key ${AnimalIdentificationController.currentKeyIndex + 1}!`);
            if (AnimalIdentificationController.switchToNextKey()) {
              console.log('🔄 Retrying with new API key...');
              try {
                geminiResult = await AnimalIdentificationController.identifyWithGemini(analysisImage, analysisMimeType);
                if (geminiResult.success && !geminiResult.identification?.error) {
                  identification = geminiResult.identification;
                  usedPrimaryModel = `Gemini (${AnimalIdentificationController.GEMINI_MODEL})`;
                  console.log(`✓ New key identification successful`);
                }
              } catch (newKeyError) {
                console.error('New key also failed:', newKeyError.message);
                AnimalIdentificationController.geminiQuotaExceeded = true;
              }
            } else {
              AnimalIdentificationController.geminiQuotaExceeded = true;
              console.log('❌ All API keys and models exhausted!');
            }
          }
        } else {
          console.error('Gemini error:', geminiError.message);
        }
        if (!identification) {
          geminiResult = null;
        }
      }

      // Step 2: If Gemini failed completely, use iNaturalist as primary
      if (!geminiResult || !identification) {
        console.log('🌿 Attempting iNaturalist identification...');
        usedPrimaryModel = 'iNaturalist';
        
        const iNatResult = await AnimalIdentificationController.identifyWithINaturalist(
          analysisImage,
          analysisMimeType,  // Pass mimeType for Gemini analysis
          true  // asPrimary = true, format for main response
        );

        if (!iNatResult.success) {
          // Calculate retry time
          const retryTime = AnimalIdentificationController.geminiQuotaResetTime
            ? new Date(AnimalIdentificationController.geminiQuotaResetTime).toLocaleTimeString()
            : 'approximately 1 hour';
          
          return res.status(200).json({
            success: false,
            error: 'Animal identification temporarily unavailable',
            message: `Gemini AI quota exceeded and iNaturalist Computer Vision requires authentication. Please try again after ${retryTime}.`,
            details: {
              geminiStatus: 'quota_exceeded',
              iNaturalistStatus: 'requires_authentication',
              retryAt: AnimalIdentificationController.geminiQuotaResetTime
                ? new Date(AnimalIdentificationController.geminiQuotaResetTime).toISOString()
                : null,
              suggestion: 'The Gemini AI will automatically retry after the quota resets. Please wait and try again later.'
            }
          });
        }

        identification = iNatResult.identification;
        console.log(`✓ iNaturalist identification: ${identification.primaryMatch?.commonName}`);
      }

      let finalIdentification = { ...identification };
      let verificationData = null;
      let refinementData = null;

      // Step 3: Extract genus from identification for validation
      const identifiedSpecies = identification.primaryMatch?.scientificName;
      const genusName = identification.taxonomicInfo?.genus || 
                        identification.analysisPhases?.phase2_genus?.identifiedGenus ||
                        (identifiedSpecies ? identifiedSpecies.split(' ')[0] : null);

      // Step 3: Validate and potentially refine with iNaturalist
      if (useMultiModel && identifiedSpecies && genusName) {
        console.log(`🔬 Validating ${identifiedSpecies} (Genus: ${genusName}) with iNaturalist...`);
        
        // Get all species in the genus for comparison
        const validationResult = await AnimalIdentificationController.validateWithINaturalist(
          identifiedSpecies,
          genusName,
          identification.primaryMatch
        );

        if (validationResult.validated) {
          console.log(`✓ Species ${identifiedSpecies} validated in iNaturalist (${validationResult.observationsCount} observations)`);
          
          // Species exists in iNaturalist - now do a second-pass comparison
          if (validationResult.similarSpeciesInGenus && validationResult.similarSpeciesInGenus.length > 0) {
            console.log(`🔄 Performing second-pass refinement against ${validationResult.similarSpeciesInGenus.length} similar species...`);
            
            const allCandidates = [
              validationResult.matchedSpecies,
              ...validationResult.similarSpeciesInGenus
            ];

            // Use Gemini to compare original image against iNaturalist species data
            const refinement = await AnimalIdentificationController.refineIdentificationWithComparison(
              analysisImage,
              analysisMimeType,
              identifiedSpecies,
              allCandidates
            );

            if (refinement.refined) {
              refinementData = refinement;
              
              if (!refinement.isCorrect && refinement.correctSpecies) {
                // Gemini refined to a different species!
                console.log(`⚠️ REFINEMENT: Changed from ${identifiedSpecies} to ${refinement.correctSpecies.scientificName}`);
                console.log(`   Reason: ${refinement.whyOriginalWasWrong}`);
                
                // Update the identification with corrected species
                finalIdentification.primaryMatch = {
                  ...finalIdentification.primaryMatch,
                  commonName: refinement.correctSpecies.commonName,
                  scientificName: refinement.correctSpecies.scientificName,
                  confidencePercentage: refinement.correctSpecies.confidence,
                  confidence: refinement.correctSpecies.confidence >= 85 ? 'high' : 
                              refinement.correctSpecies.confidence >= 60 ? 'medium' : 'low',
                  keyIdentifyingFeatures: refinement.keyDiagnosticFeatures,
                  refinedFrom: identifiedSpecies,
                  refinementReason: refinement.whyOriginalWasWrong
                };
              } else {
                console.log(`✓ Refinement confirmed: ${identifiedSpecies} is correct`);
                // Boost confidence since refinement confirmed
                finalIdentification.primaryMatch.confidencePercentage = Math.min(
                  98,
                  (finalIdentification.primaryMatch.confidencePercentage || 80) + 10
                );
              }
            }
          }

          verificationData = {
            verified: true,
            source: 'iNaturalist',
            taxonId: validationResult.matchedSpecies?.taxonId,
            observationsCount: validationResult.observationsCount,
            iNaturalistPhotos: validationResult.referencePhotos || [],
            defaultPhoto: validationResult.matchedSpecies?.defaultPhoto,
            similarSpeciesChecked: validationResult.similarSpeciesInGenus?.map(s => s.scientificName) || [],
            refinement: refinementData
          };

        } else {
          // Species not found in iNaturalist - might be misidentified
          console.log(`⚠ ${identifiedSpecies} not found in iNaturalist. Checking alternatives...`);
          
          if (validationResult.possibleSpeciesInGenus && validationResult.possibleSpeciesInGenus.length > 0) {
            console.log(`🔄 Comparing against ${validationResult.possibleSpeciesInGenus.length} possible species in genus ${genusName}...`);
            
            // Use Gemini to find the correct species from iNaturalist data
            const refinement = await AnimalIdentificationController.refineIdentificationWithComparison(
              analysisImage,
              analysisMimeType,
              identifiedSpecies,
              validationResult.possibleSpeciesInGenus
            );

            if (refinement.refined && refinement.correctSpecies) {
              console.log(`✓ Refined to: ${refinement.correctSpecies.scientificName}`);
              
              finalIdentification.primaryMatch = {
                ...finalIdentification.primaryMatch,
                commonName: refinement.correctSpecies.commonName,
                scientificName: refinement.correctSpecies.scientificName,
                confidencePercentage: refinement.correctSpecies.confidence,
                confidence: refinement.correctSpecies.confidence >= 85 ? 'high' : 
                            refinement.correctSpecies.confidence >= 60 ? 'medium' : 'low',
                keyIdentifyingFeatures: refinement.keyDiagnosticFeatures,
                refinedFrom: identifiedSpecies,
                refinementReason: refinement.whyOriginalWasWrong || 'Original species not found in iNaturalist'
              };

              refinementData = refinement;
            }
          }

          verificationData = {
            verified: false,
            source: 'iNaturalist',
            message: validationResult.message,
            possibleSpecies: validationResult.possibleSpeciesInGenus?.slice(0, 5) || [],
            refinement: refinementData
          };
        }
      } else if (useMultiModel && identifiedSpecies) {
        // Fallback: Just verify the species exists
        console.log('🔬 Cross-verifying with iNaturalist species database...');
        
        const iNatDetails = await AnimalIdentificationController.getINaturalistSpeciesDetails(
          identifiedSpecies
        );

        if (iNatDetails.success) {
          console.log(`✓ Species verified in iNaturalist: ${iNatDetails.commonName}`);
          
          const iNatPhotos = await AnimalIdentificationController.getINaturalistObservationPhotos(
            identifiedSpecies,
            maxImages
          );

          verificationData = {
            verified: true,
            source: 'iNaturalist',
            taxonId: iNatDetails.taxonId,
            observationsCount: iNatDetails.observationsCount,
            wikipediaSummary: iNatDetails.wikipediaSummary,
            iNaturalistPhotos: iNatPhotos.success ? iNatPhotos.photos : [],
            defaultPhoto: iNatDetails.defaultPhoto
          };
        } else {
          verificationData = {
            verified: false,
            source: 'iNaturalist',
            message: 'Species not found in iNaturalist database'
          };
        }
      }

      // Step 4: Fetch reference images for the FINAL identified species
      console.log('📚 Fetching reference images from multiple sources...');
      
      // Use the potentially refined species name
      const finalSpeciesName = finalIdentification.primaryMatch?.scientificName;
      
      let primaryWikipediaData = null;
      if (finalSpeciesName) {
        primaryWikipediaData = await AnimalIdentificationController.getWikipediaImages(
          finalSpeciesName,
          Math.ceil(maxImages / 2)
        );
        console.log(`📷 Found ${primaryWikipediaData.images?.length || 0} Wikipedia images for: ${finalSpeciesName}`);
        
        // If we refined the species, also get iNaturalist photos for the new species
        if (finalIdentification.primaryMatch?.refinedFrom && verificationData?.verified === false) {
          const refinedINatPhotos = await AnimalIdentificationController.getINaturalistObservationPhotos(
            finalSpeciesName,
            maxImages
          );
          if (refinedINatPhotos.success) {
            verificationData.iNaturalistPhotos = refinedINatPhotos.photos;
            verificationData.verified = true;
          }
        }
      }

      // Get images for alternative matches
      const alternativesWithImages = [];
      if (identification.alternatives && Array.isArray(identification.alternatives)) {
        for (const alt of identification.alternatives) {
          if (alt.scientificName) {
            // Get iNaturalist details for alternatives too
            const altINatDetails = await AnimalIdentificationController.getINaturalistSpeciesDetails(
              alt.scientificName
            );
            
            const wikiData = await AnimalIdentificationController.getWikipediaImages(
              alt.scientificName,
              3
            );
            
            alternativesWithImages.push({
              ...alt,
              iNaturalistVerified: altINatDetails.success,
              iNaturalistPhoto: altINatDetails.success ? altINatDetails.defaultPhoto : null,
              wikipediaData: wikiData
            });
            console.log(`📷 Found ${wikiData.images?.length || 0} images for alternative: ${alt.commonName}`);
          } else {
            alternativesWithImages.push(alt);
          }
        }
      }

      // Combine all images (iNaturalist + Wikipedia)
      const allPrimaryImages = [];
      
      // Add iNaturalist photos first (real observation photos)
      if (verificationData?.iNaturalistPhotos) {
        verificationData.iNaturalistPhotos.forEach(photo => {
          allPrimaryImages.push({
            ...photo,
            type: 'iNaturalist_observation',
            verified: true
          });
        });
      }
      
      // Add Wikipedia images
      if (primaryWikipediaData?.images) {
        primaryWikipediaData.images.forEach(img => {
          allPrimaryImages.push({
            ...img,
            type: 'wikipedia',
            verified: false
          });
        });
      }

      // Combine results
      const finalResult = {
        success: true,
        identification: {
          primaryMatch: {
            ...finalIdentification.primaryMatch,
            verification: verificationData,
            referenceImages: allPrimaryImages.slice(0, maxImages),
            wikipediaData: primaryWikipediaData
          },
          alternatives: alternativesWithImages,
          identificationNotes: finalIdentification.identificationNotes,
          imageQuality: finalIdentification.imageQuality,
          uncertaintyFactors: finalIdentification.uncertaintyFactors,
          additionalViewsNeeded: finalIdentification.additionalViewsNeeded
        },
        inputImageAnalysis: imagePrep.qualityAssessment,
        models: {
          primary: usedPrimaryModel === 'iNaturalist' ? 'iNaturalist Computer Vision' : (geminiResult?.model || AnimalIdentificationController.GEMINI_MODEL),
          verification: 'iNaturalist Computer Vision',
          geminiStatus: AnimalIdentificationController.geminiQuotaExceeded ? 'quota_exceeded' : 'available',
          geminiRetryAt: AnimalIdentificationController.geminiQuotaResetTime ? new Date(AnimalIdentificationController.geminiQuotaResetTime).toISOString() : null
        },
        totalImagesRetrieved: allPrimaryImages.length + 
          alternativesWithImages.reduce((sum, alt) => sum + (alt.wikipediaData?.images?.length || 0), 0),
        timestamp: new Date().toISOString()
      };

      console.log(`✅ Identification complete - ${finalResult.totalImagesRetrieved} reference images retrieved`);
      console.log(`   Primary Model: ${usedPrimaryModel}`);
      console.log(`   Species: ${finalIdentification.primaryMatch.commonName} (${finalIdentification.primaryMatch.confidencePercentage}% confidence)`);
      console.log(`   Verified: ${verificationData?.verified ? 'Yes ✓' : 'No ⚠'}`);
      if (AnimalIdentificationController.geminiQuotaExceeded) {
        console.log(`   ⚠️ Gemini quota exceeded - retry at ${new Date(AnimalIdentificationController.geminiQuotaResetTime).toLocaleTimeString()}`);
      }
      
      return res.status(200).json(finalResult);

    } catch (error) {
      console.error('Error in animal identification:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error during identification',
        message: error.message
      });
    }
  }
}

module.exports = AnimalIdentificationController;
