/**
 * Diagnostic script to examine the Wildlife Survey collection schema
 * Run with: node diagnostic_survey_schema.js
 */

const DatabaseConnectivity = require('./Database/databaseConnectivity');

async function analyzeSurveySchema() {
  const db = DatabaseConnectivity.getInstance();
  
  try {
    console.log('\n🔍 WILDLIFE SURVEY COLLECTION DIAGNOSTIC\n');
    
    await db.initialize();
    console.log('✅ Database connected\n');
    
    // Get documents from the collection
    const databaseName = "Straw-Headed-Bulbul";
    const collectionName = "Wildlife Survey";
    
    const documents = await db.getAllDocuments(databaseName, collectionName);
    
    if (!documents || documents.length === 0) {
      console.log('⚠️  No documents found in Wildlife Survey collection');
      return;
    }
    
    console.log(`📊 Total documents: ${documents.length}\n`);
    
    // Analyze first document
    const firstDoc = documents[0];
    console.log('📋 FIRST DOCUMENT STRUCTURE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(JSON.stringify(firstDoc, null, 2));
    console.log('');
    
    // Collect all unique field names across all documents
    const allFields = new Set();
    const fieldTypes = {};
    const fieldSamples = {};
    
    documents.forEach((doc, index) => {
      Object.keys(doc).forEach(field => {
        allFields.add(field);
        
        if (!fieldTypes[field]) {
          fieldTypes[field] = [];
          fieldSamples[field] = [];
        }
        
        const valueType = typeof doc[field];
        const actualType = doc[field] === null ? 'null' : 
                          Array.isArray(doc[field]) ? 'array' :
                          valueType === 'object' ? doc[field].constructor.name : 
                          valueType;
        
        fieldTypes[field].push(actualType);
        
        // Collect first 3 unique samples
        if (fieldSamples[field].length < 3) {
          fieldSamples[field].push({
            doc_index: index,
            value: doc[field],
            type: actualType
          });
        }
      });
    });
    
    // Display all fields with their types
    console.log('📋 ALL FIELDS IN COLLECTION:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const sortedFields = Array.from(allFields).sort();
    
    sortedFields.forEach(field => {
      const uniqueTypes = [...new Set(fieldTypes[field])];
      const samplesStr = fieldSamples[field]
        .map(s => `${s.value} (${s.type})`)
        .join(' | ');
      
      console.log(`Field: "${field}"`);
      console.log(`  Types: ${uniqueTypes.join(', ')}`);
      console.log(`  Samples: ${samplesStr}`);
      console.log('');
    });
    
    // Check for common survey fields
    console.log('🎯 CRITICAL SURVEY FIELDS CHECK:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const requiredFields = [
      'Location',
      'Height of tree/m',
      'Height of bird/m',
      'Date',
      'Time',
      'Observer name',
      'SHB individual ID',
      'Number of Birds',
      'Activity',
      'Seen/Heard'
    ];
    
    requiredFields.forEach(field => {
      const exists = allFields.has(field);
      const coverage = documents.filter(doc => doc[field] !== undefined && doc[field] !== null).length;
      const percentage = ((coverage / documents.length) * 100).toFixed(1);
      
      if (exists) {
        console.log(`✅ "${field}" - Present (${coverage}/${documents.length} documents = ${percentage}%)`);
      } else {
        console.log(`❌ "${field}" - MISSING`);
      }
    });
    
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error analyzing collection:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

analyzeSurveySchema();
