/**
 * Migration script to clean up Wildlife Survey collection
 * Removes frontend-only fields, standardizes field names, and fixes inconsistencies
 * Run with: node migrate_survey_collection.js
 */

const DatabaseConnectivity = require('./Database/databaseConnectivity');
const { ObjectId } = require('mongodb');

async function migrateCollection() {
  const db = DatabaseConnectivity.getInstance();
  
  try {
    console.log('\n🔧 WILDLIFE SURVEY COLLECTION MIGRATION\n');
    console.log('This will cleanup the collection by:');
    console.log('  1. Removing frontend-only fields (_originalIndex, _rowId, serialNumber)');
    console.log('  2. Removing duplicate lowercase "date" field');
    console.log('  3. Standardizing field names\n');
    
    await db.initialize();
    console.log('✅ Database connected\n');
    
    const databaseName = "Straw-Headed-Bulbul";
    const collectionName = "Wildlife Survey";
    
    // Get all documents
    const documents = await db.getAllDocuments(databaseName, collectionName);
    console.log(`📊 Found ${documents.length} documents to process\n`);
    
    let successCount = 0;
    let errorCount = 0;
    let noChangeCount = 0;
    
    // Process each document
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const docId = doc._id;
      
      try {
        // Build the update operation
        const updateOps = {
          $unset: {},    // Fields to remove
          $set: {}       // Fields to set/update
        };
        
        let hasChanges = false;
        
        // Remove frontend-only fields
        if (doc._originalIndex !== undefined) {
          updateOps.$unset._originalIndex = "";
          hasChanges = true;
        }
        if (doc._rowId !== undefined) {
          updateOps.$unset._rowId = "";
          hasChanges = true;
        }
        if (doc.serialNumber !== undefined) {
          updateOps.$unset.serialNumber = "";
          hasChanges = true;
        }
        
        // Remove duplicate lowercase "date" field
        if (doc.date !== undefined && doc.Date !== undefined) {
          updateOps.$unset.date = "";
          hasChanges = true;
        }
        
        // Remove "Activity Details" if it's not needed (optional - comment out if you want to keep it)
        // if (doc["Activity Details"] !== undefined) {
        //   updateOps.$unset["Activity Details"] = "";
        //   hasChanges = true;
        // }
        
        if (hasChanges) {
          // Convert string ID to ObjectId if necessary
          let objectId = docId;
          if (typeof docId === 'string' && ObjectId.isValid(docId)) {
            objectId = new ObjectId(docId);
          }
          
          const query = { _id: objectId };
          const result = await db.updateDocument(databaseName, collectionName, query, updateOps);
          
          if (result.modifiedCount > 0) {
            successCount++;
            if ((i + 1) % 10 === 0) {
              console.log(`  Processed: ${i + 1}/${documents.length}`);
            }
          } else {
            noChangeCount++;
          }
        } else {
          noChangeCount++;
        }
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Error processing document ${i + 1}:`, error.message);
      }
    }
    
    console.log('\n✅ MIGRATION COMPLETE\n');
    console.log(`Results:`);
    console.log(`  ✅ Successfully updated: ${successCount} documents`);
    console.log(`  ⏭️  No changes needed: ${noChangeCount} documents`);
    console.log(`  ❌ Errors: ${errorCount} documents`);
    
    // Verify the cleanup
    console.log('\n🔍 VERIFYING CLEANUP...\n');
    const cleanedDocs = await db.getAllDocuments(databaseName, collectionName);
    const sampleDoc = cleanedDocs[0];
    
    console.log('Sample document after cleanup:');
    console.log(JSON.stringify(sampleDoc, null, 2));
    
    // Check if frontend-only fields still exist
    console.log('\n📋 VERIFICATION CHECK:\n');
    
    let stillHas_originalIndex = cleanedDocs.some(doc => doc._originalIndex !== undefined);
    let stillHas_rowId = cleanedDocs.some(doc => doc._rowId !== undefined);
    let stillHasSerialNumber = cleanedDocs.some(doc => doc.serialNumber !== undefined);
    let stillHasLowercaseDate = cleanedDocs.some(doc => doc.date !== undefined);
    
    console.log(`_originalIndex removed: ${!stillHas_originalIndex ? '✅ YES' : '❌ NO'}`);
    console.log(`_rowId removed: ${!stillHas_rowId ? '✅ YES' : '❌ NO'}`);
    console.log(`serialNumber removed: ${!stillHasSerialNumber ? '✅ YES' : '❌ NO'}`);
    console.log(`lowercase "date" removed: ${!stillHasLowercaseDate ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

migrateCollection();
