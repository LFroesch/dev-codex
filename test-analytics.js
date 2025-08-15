// Simple test script to validate analytics functionality
const mongoose = require('mongoose');

// Test analytics aggregation queries
async function testAnalytics() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dev-codex');
    console.log('Connected to MongoDB');

    const UserSession = mongoose.model('UserSession', new mongoose.Schema({
      userId: String,
      sessionId: String,
      startTime: Date,
      endTime: Date,
      duration: Number,
      lastActivity: Date,
      isActive: Boolean,
      projectTimeBreakdown: [{
        projectId: String,
        timeSpent: Number,
        lastSwitchTime: Date
      }]
    }));

    // Test duration calculation aggregation
    const testResult = await UserSession.aggregate([
      { $limit: 5 },
      {
        $addFields: {
          calculatedDuration: {
            $cond: {
              if: { $and: [{ $gt: ['$duration', 0] }] },
              then: '$duration',
              else: {
                $subtract: [
                  { $ifNull: ['$lastActivity', new Date()] },
                  '$startTime'
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          sessionId: 1,
          duration: 1,
          calculatedDuration: 1,
          startTime: 1,
          lastActivity: 1
        }
      }
    ]);

    console.log('Test aggregation result:');
    console.log(JSON.stringify(testResult, null, 2));

    await mongoose.disconnect();
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testAnalytics();