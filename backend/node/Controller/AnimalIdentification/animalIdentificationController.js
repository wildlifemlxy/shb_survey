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
   * Combines Gemini identification with Wikipedia reference images (multiple angles)
   */
  async handleIdentification(req, res) {
    try {
      const { image, mimeType, maxImages = 10 } = req.body;

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

      // Step 2: Fetch Wikipedia images for identified species (ALL ANGLES)
      console.log('📚 Fetching Wikipedia reference images from all angles...');
      const identification = identificationResult.identification;
      
      // Get ALL images for primary match (multiple angles)
      let primaryWikipediaData = null;
      if (identification.primaryMatch?.scientificName) {
        primaryWikipediaData = await AnimalIdentificationController.getWikipediaImages(
          identification.primaryMatch.scientificName,
          maxImages
        );
        console.log(`📷 Found ${primaryWikipediaData.images?.length || 0} images for primary match`);
      }

      // Get images for alternative matches (multiple angles each)
      const alternativesWithImages = [];
      if (identification.alternatives && Array.isArray(identification.alternatives)) {
        for (const alt of identification.alternatives) {
          if (alt.scientificName) {
            const wikiData = await AnimalIdentificationController.getWikipediaImages(
              alt.scientificName,
              Math.min(5, maxImages) // Fewer images for alternatives
            );
            console.log(`📷 Found ${wikiData.images?.length || 0} images for alternative: ${alt.commonName}`);
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
        totalImagesRetrieved: (primaryWikipediaData?.images?.length || 0) + 
          alternativesWithImages.reduce((sum, alt) => sum + (alt.wikipediaData?.images?.length || 0), 0),
        timestamp: new Date().toISOString()
      };

      console.log(`✅ Animal identification complete - ${finalResult.totalImagesRetrieved} reference images retrieved`);
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
