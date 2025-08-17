/**
 * Migration script to update existing analytics records with plan tiers and expiration dates
 * Run this once after deploying the plan-aware analytics system
 */

import mongoose from 'mongoose';
import Analytics from '../models/Analytics';
import { User } from '../models/User';
import { getAnalyticsTTL } from '../config/analyticsConfig';

async function migrateAnalyticsRecords() {
  console.log('🚀 Starting analytics migration to plan-aware system...');
  
  try {
    // Connect to database if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/project-manager');
    }

    // Get all users with their plan information
    const users = await User.find({}, { _id: 1, planTier: 1, subscriptionStatus: 1 }).lean();
    console.log(`Found ${users.length} users to migrate`);

    let migratedCount = 0;
    let errorCount = 0;

    // Process each user's analytics records
    for (const user of users) {
      try {
        const userId = user._id.toString();
        const planTier = user.planTier || 'free';
        const subscriptionStatus = user.subscriptionStatus;

        // Calculate TTL based on plan
        const ttlSeconds = getAnalyticsTTL(planTier, subscriptionStatus);
        const expiresAt = ttlSeconds > 0 ? new Date(Date.now() + (ttlSeconds * 1000)) : undefined;

        // Update all analytics records for this user
        const updateResult = await Analytics.updateMany(
          { 
            userId, 
            planTier: { $exists: false } // Only update records that haven't been migrated
          },
          {
            $set: {
              planTier,
              ...(expiresAt && { expiresAt })
            }
          }
        );

        migratedCount += updateResult.modifiedCount;
        
        if (updateResult.modifiedCount > 0) {
          console.log(`✅ User ${userId} (${planTier}): ${updateResult.modifiedCount} records migrated`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error migrating user ${user._id}:`, error);
      }
    }

    console.log('📊 Migration Summary:');
    console.log(`   • Total records migrated: ${migratedCount}`);
    console.log(`   • Errors encountered: ${errorCount}`);
    console.log(`   • Users processed: ${users.length}`);

    // Create new indexes if they don't exist
    console.log('🔍 Ensuring plan-based indexes exist...');
    
    await Analytics.collection.createIndex({ planTier: 1, timestamp: -1 });
    await Analytics.collection.createIndex({ userId: 1, planTier: 1, timestamp: -1 });
    await Analytics.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    
    console.log('✅ Indexes created successfully');
    console.log('🎉 Analytics migration completed successfully!');

    // Cleanup - remove old TTL index if it exists
    try {
      await Analytics.collection.dropIndex('timestamp_1');
      console.log('🧹 Removed old TTL index');
    } catch (error) {
      console.log('ℹ️ Old TTL index not found (this is normal)');
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateAnalyticsRecords()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateAnalyticsRecords };
