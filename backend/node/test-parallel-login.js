// Test parallel login connections
// Run this with: node test-parallel-login.js

const DatabaseConnectivity = require('./Database/databaseConnectivity');
const UsersController = require('./Controller/Users/usersController');

async function testParallelConnections() {
    console.log('🧪 Testing parallel database connections...');
    
    // Simulate multiple parallel login requests
    const parallelRequests = [];
    const numParallelLogins = 10;
    
    for (let i = 0; i < numParallelLogins; i++) {
        const testRequest = async () => {
            const controller = new UsersController();
            const startTime = Date.now();
            
            try {
                // Test connection initialization
                await controller.dbConnection.initialize();
                const initTime = Date.now() - startTime;
                
                // Test a simple database operation
                const opStartTime = Date.now();
                await controller.dbConnection.executeOperation(async (client) => {
                    const db = client.db('Straw-Headed-Bulbul');
                    return await db.admin().ping();
                });
                const opTime = Date.now() - opStartTime;
                
                console.log(`✅ Request ${i + 1}: Init=${initTime}ms, Op=${opTime}ms, Instance=${controller.dbConnection.instanceId}`);
                return { success: true, requestId: i + 1, initTime, opTime };
            } catch (error) {
                console.error(`❌ Request ${i + 1} failed:`, error.message);
                return { success: false, requestId: i + 1, error: error.message };
            }
        };
        
        parallelRequests.push(testRequest());
    }
    
    // Execute all requests in parallel
    console.log(`🚀 Starting ${numParallelLogins} parallel requests...`);
    const startTime = Date.now();
    const results = await Promise.all(parallelRequests);
    const totalTime = Date.now() - startTime;
    
    // Analyze results
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const avgInitTime = results.filter(r => r.success).reduce((sum, r) => sum + r.initTime, 0) / successful;
    const avgOpTime = results.filter(r => r.success).reduce((sum, r) => sum + r.opTime, 0) / successful;
    
    console.log('\n📊 Test Results:');
    console.log(`Total time: ${totalTime}ms`);
    console.log(`Successful: ${successful}/${numParallelLogins}`);
    console.log(`Failed: ${failed}/${numParallelLogins}`);
    console.log(`Average init time: ${avgInitTime.toFixed(2)}ms`);
    console.log(`Average operation time: ${avgOpTime.toFixed(2)}ms`);
    
    if (successful === numParallelLogins) {
        console.log('🎉 All parallel connections successful!');
    } else {
        console.log('⚠️  Some connections failed - check configuration');
    }
    
    // Test connection pool stats
    console.log('\n🔍 Connection Pool Stats:');
    console.log(`Pool size: ${DatabaseConnectivity.connectionPool.size}`);
    
    process.exit(0);
}

// Run the test
testParallelConnections().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
