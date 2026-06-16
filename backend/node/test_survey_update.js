/**
 * Test script to verify survey updates work correctly
 * Run with: node test_survey_update.js
 */

const DatabaseConnectivity = require('./Database/databaseConnectivity');
const { ObjectId } = require('mongodb');
const SurveyController = require('./Controller/Survey/surveyController');

async function testSurveyUpdate() {
  const db = DatabaseConnectivity.getInstance();
  const controller = new SurveyController();
  
  try {
    console.log('\n🧪 SURVEY UPDATE TEST\n');
    
    await db.initialize();
    console.log('✅ Database connected\n');
    
    const databaseName = "Straw-Headed-Bulbul";
    const collectionName = "Wildlife Survey";
    
    // Get first document
    const documents = await db.getAllDocuments(databaseName, collectionName);
    
    if (!documents || documents.length === 0) {
      console.log('❌ No documents found');
      return;
    }
    
    const testDoc = documents[0];
    const recordId = testDoc._id;
    
    console.log('📋 TEST DOCUMENT:');
    console.log(`  ID: ${recordId}`);
    console.log(`  Location: ${testDoc.Location}`);
    console.log(`  Height of tree/m: ${testDoc["Height of tree/m"]}`);
    console.log(`  Height of bird/m: ${testDoc["Height of bird/m"]}`);
    console.log(`  Date: ${testDoc.Date}\n`);
    
    // Test 1: Update Location
    console.log('🧪 TEST 1: Updating Location...');
    const updateData1 = {
      Location: 'Test Location Update ' + new Date().getTime()
    };
    
    const result1 = await controller.updateSurvey(recordId.toString(), updateData1);
    console.log(`  Result: ${result1.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`  Message: ${result1.message}`);
    console.log(`  Modified: ${result1.modifiedCount} documents\n`);
    
    // Test 2: Update Height of Tree
    console.log('🧪 TEST 2: Updating Height of Tree...');
    const updateData2 = {
      'Height of tree/m': '25'
    };
    
    const result2 = await controller.updateSurvey(recordId.toString(), updateData2);
    console.log(`  Result: ${result2.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`  Message: ${result2.message}`);
    console.log(`  Modified: ${result2.modifiedCount} documents\n`);
    
    // Test 3: Update Height of Bird
    console.log('🧪 TEST 3: Updating Height of Bird...');
    const updateData3 = {
      'Height of bird/m': '20'
    };
    
    const result3 = await controller.updateSurvey(recordId.toString(), updateData3);
    console.log(`  Result: ${result3.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`  Message: ${result3.message}`);
    console.log(`  Modified: ${result3.modifiedCount} documents\n`);
    
    // Test 4: Update Date
    console.log('🧪 TEST 4: Updating Date...');
    const updateData4 = {
      'Date': '2024-12-20'
    };
    
    const result4 = await controller.updateSurvey(recordId.toString(), updateData4);
    console.log(`  Result: ${result4.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`  Message: ${result4.message}`);
    console.log(`  Modified: ${result4.modifiedCount} documents\n`);
    
    // Verify all updates
    console.log('🔍 VERIFICATION: Checking updated document...\n');
    const updatedDocs = await db.getAllDocuments(databaseName, collectionName);
    const updatedDoc = updatedDocs.find(doc => doc._id.toString() === recordId.toString());
    
    if (updatedDoc) {
      console.log('📋 UPDATED DOCUMENT:');
      console.log(`  ID: ${updatedDoc._id}`);
      console.log(`  Location: ${updatedDoc.Location}`);
      console.log(`  Height of tree/m: ${updatedDoc["Height of tree/m"]}`);
      console.log(`  Height of bird/m: ${updatedDoc["Height of bird/m"]}`);
      console.log(`  Date: ${updatedDoc.Date}\n`);
      
      console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!\n');
    } else {
      console.log('❌ Could not find updated document\n');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

testSurveyUpdate();
