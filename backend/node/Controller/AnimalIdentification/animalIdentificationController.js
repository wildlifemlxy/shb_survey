const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');

class AnimalIdentificationController {
  // Gemini API Configuration
  static GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  static GEMINI_MODEL = 'gemini-2.5-pro';

  constructor() {
    // Initialize Gemini client
    if (AnimalIdentificationController.GEMINI_API_KEY) {
      AnimalIdentificationController.genAI = new GoogleGenerativeAI(
        AnimalIdentificationController.GEMINI_API_KEY
      );
      console.log('✓ Gemini AI client initialized');
    } else {
      console.warn('⚠ GEMINI_API_KEY not configured');
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

      const genAI = new GoogleGenerativeAI(AnimalIdentificationController.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: AnimalIdentificationController.GEMINI_MODEL });

      // Detailed prompt for species identification
      const prompt = `You are an expert wildlife biologist and ornithologist. Analyze this image and identify the animal or bird species shown.

Please provide your response in the following JSON format:
{
  "primaryMatch": {
    "commonName": "Common name of the species",
    "scientificName": "Scientific name (genus species)",
    "confidence": "high/medium/low",
    "description": "Brief description of identifying features observed"
  },
  "alternatives": [
    {
      "commonName": "Alternative species 1 common name",
      "scientificName": "Scientific name",
      "confidence": "high/medium/low",
      "reason": "Why this could be an alternative match"
    },
    {
      "commonName": "Alternative species 2 common name",
      "scientificName": "Scientific name",
      "confidence": "high/medium/low",
      "reason": "Why this could be an alternative match"
    },
    {
      "commonName": "Alternative species 3 common name",
      "scientificName": "Scientific name",
      "confidence": "high/medium/low",
      "reason": "Why this could be an alternative match"
    }
  ],
  "identificationNotes": "Any additional notes about the identification, habitat, or distinguishing features",
  "imageQuality": "Assessment of image quality for identification purposes"
}

If you cannot identify the species or if the image does not contain an animal/bird, respond with:
{
  "error": true,
  "message": "Reason why identification could not be made"
}

Important: Return ONLY valid JSON, no markdown formatting or code blocks.`;

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
        parsedResponse = JSON.parse(cleanedText.trim());
      } catch (parseError) {
        console.error('Error parsing Gemini response:', parseError);
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
   * Fetch reference image from Wikipedia REST API
   * @param {string} scientificName - Scientific name of the species
   * @returns {Object} - Wikipedia image data
   */
  static async getWikipediaImage(scientificName) {
    try {
      if (!scientificName) {
        throw new Error('Scientific name is required');
      }

      // Format scientific name for Wikipedia search
      const searchTerm = scientificName.trim();

      // Wikipedia REST API endpoint for page summary (includes main image)
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`;

      try {
        const summaryResponse = await axios.get(summaryUrl, {
          headers: {
            'User-Agent': 'SHB-Survey-Assistant/1.0 (Wildlife Identification Bot)'
          },
          timeout: 10000
        });

        if (summaryResponse.data && summaryResponse.data.thumbnail) {
          return {
            success: true,
            image: {
              url: summaryResponse.data.thumbnail.source,
              width: summaryResponse.data.thumbnail.width,
              height: summaryResponse.data.thumbnail.height
            },
            originalImage: summaryResponse.data.originalimage ? {
              url: summaryResponse.data.originalimage.source,
              width: summaryResponse.data.originalimage.width,
              height: summaryResponse.data.originalimage.height
            } : null,
            title: summaryResponse.data.title,
            description: summaryResponse.data.description,
            extract: summaryResponse.data.extract,
            wikipediaUrl: summaryResponse.data.content_urls?.desktop?.page || null
          };
        }
      } catch (summaryError) {
        // If summary endpoint fails, try the images endpoint
        console.log(`Summary endpoint failed for ${scientificName}, trying images endpoint...`);
      }

      // Fallback: Use MediaWiki API to search for images with original size
      const mediaWikiUrl = `https://en.wikipedia.org/w/api.php`;
      const params = {
        action: 'query',
        titles: searchTerm,
        prop: 'pageimages|extracts|imageinfo',
        piprop: 'original|thumbnail',
        pithumbsize: 500,
        exintro: true,
        explaintext: true,
        format: 'json',
        origin: '*'
      };

      const mediaWikiResponse = await axios.get(mediaWikiUrl, {
        params,
        headers: {
          'User-Agent': 'SHB-Survey-Assistant/1.0 (Wildlife Identification Bot)'
        },
        timeout: 10000
      });

      const pages = mediaWikiResponse.data.query?.pages;
      if (pages) {
        const pageId = Object.keys(pages)[0];
        const page = pages[pageId];

        if (pageId !== '-1' && (page.thumbnail || page.original)) {
          return {
            success: true,
            image: page.thumbnail ? {
              url: page.thumbnail.source,
              width: page.thumbnail.width,
              height: page.thumbnail.height
            } : null,
            originalImage: page.original ? {
              url: page.original.source,
              width: page.original.width,
              height: page.original.height
            } : null,
            title: page.title,
            extract: page.extract,
            wikipediaUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`
          };
        }
      }

      // No image found
      return {
        success: false,
        message: `No Wikipedia image found for: ${scientificName}`
      };

    } catch (error) {
      console.error('Error fetching Wikipedia image:', error.message);
      return {
        success: false,
        message: `Failed to fetch Wikipedia image: ${error.message}`
      };
    }
  }

  /**
   * Main handler for animal identification endpoint
   * Combines Gemini identification with Wikipedia reference images
   */
  async handleIdentification(req, res) {
    try {
      const { image, mimeType } = req.body;

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

      // Step 1: Identify with Gemini
      console.log('🔍 Starting animal identification with Gemini...');
      const identificationResult = await AnimalIdentificationController.identifyWithGemini(
        base64Image,
        detectedMimeType
      );

      if (!identificationResult.success || identificationResult.identification?.error) {
        return res.status(200).json({
          success: false,
          error: identificationResult.identification?.message || 'Could not identify the animal',
          details: identificationResult
        });
      }

      // Step 2: Fetch Wikipedia images for identified species
      console.log('📚 Fetching Wikipedia reference images...');
      const identification = identificationResult.identification;
      
      // Get image for primary match
      let primaryWikipediaData = null;
      if (identification.primaryMatch?.scientificName) {
        primaryWikipediaData = await AnimalIdentificationController.getWikipediaImage(
          identification.primaryMatch.scientificName
        );
      }

      // Get images for alternative matches
      const alternativesWithImages = [];
      if (identification.alternatives && Array.isArray(identification.alternatives)) {
        for (const alt of identification.alternatives) {
          if (alt.scientificName) {
            const wikiData = await AnimalIdentificationController.getWikipediaImage(
              alt.scientificName
            );
            alternativesWithImages.push({
              ...alt,
              wikipediaData: wikiData
            });
          } else {
            alternativesWithImages.push(alt);
          }
        }
      }

      // Combine results
      const finalResult = {
        success: true,
        identification: {
          primaryMatch: {
            ...identification.primaryMatch,
            wikipediaData: primaryWikipediaData
          },
          alternatives: alternativesWithImages,
          identificationNotes: identification.identificationNotes,
          imageQuality: identification.imageQuality
        },
        model: identificationResult.model,
        timestamp: new Date().toISOString()
      };

      console.log('✅ Animal identification complete');
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
