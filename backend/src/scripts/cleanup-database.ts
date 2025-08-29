#!/usr/bin/env tsx

import { config } from 'dotenv';
import mongoose from 'mongoose';
import { CleanupService } from '../services/cleanupService';

// Load environment variables
config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI or DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function main() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    const command = process.argv[2];

    switch (command) {
      case 'stats':
        console.log('\n📊 Getting database statistics...');
        const stats = await CleanupService.getDatabaseStats();
        console.log('\n📋 Database Statistics:');
        console.log('Collection Counts:');
        Object.entries(stats.collections).forEach(([collection, count]) => {
          console.log(`  ${collection}: ${count.toLocaleString()}`);
        });
        console.log(`\nTotal Documents: ${stats.totalDocuments.toLocaleString()}`);
        console.log(`Database Size: ${stats.dbSizeGB} GB`);
        break;

      case 'recommendations':
        console.log('\n💡 Getting cleanup recommendations...');
        const recommendations = await CleanupService.getCleanupRecommendations();
        console.log('\n📋 Current Stats:');
        Object.entries(recommendations.currentStats.collections).forEach(([collection, count]) => {
          console.log(`  ${collection}: ${count.toLocaleString()}`);
        });
        
        console.log('\n💡 Recommendations:');
        Object.entries(recommendations.recommendations).forEach(([key, message]) => {
          if (message) {
            console.log(`  ⚠️  ${message}`);
          }
        });
        
        if (recommendations.shouldRunCleanup) {
          console.log('\n🚨 Recommendation: Run cleanup now with: npm run cleanup run');
        } else {
          console.log('\n✅ No immediate cleanup needed');
        }
        break;

      case 'run':
        console.log('\n🧹 Running complete database cleanup...');
        const results = await CleanupService.runCompleteCleanup();
        
        console.log('\n📋 Cleanup Results:');
        console.log(`  Analytics: ${results.analytics.deleted} deleted`);
        console.log(`  Invitations: ${results.invitations.deleted} deleted, ${results.invitations.markedExpired} marked expired`);
        console.log(`  Notifications: ${results.notifications.deleted} deleted`);
        console.log(`  Activity Logs: ${results.activityLogs.deleted} deleted`);
        console.log(`  User Sessions: ${results.userSessions.deleted} deleted`);
        console.log(`\nTotal: ${results.totalDeleted} documents removed`);
        
        console.log('\n📊 Database after cleanup:');
        Object.entries(results.statsAfterCleanup.collections).forEach(([collection, count]) => {
          console.log(`  ${collection}: ${count.toLocaleString()}`);
        });
        break;

      case 'analytics':
        console.log('\n🧹 Cleaning up old analytics...');
        const analyticsResult = await CleanupService.cleanupOldAnalytics(180);
        console.log(`✅ Deleted ${analyticsResult.deleted} analytics records older than ${analyticsResult.cutoffDate}`);
        break;

      case 'invitations':
        console.log('\n🧹 Cleaning up expired invitations...');
        const invitationsResult = await CleanupService.cleanupExpiredInvitations();
        console.log(`✅ Marked ${invitationsResult.markedExpired} invitations as expired`);
        console.log(`✅ Deleted ${invitationsResult.deleted} old expired/cancelled invitations`);
        break;

      case 'notifications':
        console.log('\n🧹 Cleaning up old notifications...');
        const notificationsResult = await CleanupService.cleanupOldNotifications(90);
        console.log(`✅ Deleted ${notificationsResult.deleted} notifications older than ${notificationsResult.cutoffDate}`);
        break;

      case 'sessions':
        console.log('\n🧹 Cleaning up inactive sessions...');
        const sessionsResult = await CleanupService.cleanupInactiveSessions();
        console.log(`✅ Deleted ${sessionsResult.deleted} inactive sessions`);
        break;

      default:
        console.log(`
🧹 Database Cleanup Tool

Usage: npm run cleanup <command>

Commands:
  stats           Show database statistics
  recommendations Get cleanup recommendations  
  run             Run complete cleanup
  analytics       Clean old analytics only
  invitations     Clean expired invitations only
  notifications   Clean old notifications only
  sessions        Clean inactive sessions only

Examples:
  npm run cleanup stats
  npm run cleanup recommendations  
  npm run cleanup run
        `);
        break;
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

main();