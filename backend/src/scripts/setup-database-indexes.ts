#!/usr/bin/env ts-node

import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import Analytics from '../models/Analytics';
import { User } from '../models/User';
import { Project } from '../models/Project';
import UserSession from '../models/UserSession';
import ActivityLog from '../models/ActivityLog';
import Notification from '../models/Notification';
import ProjectInvitation from '../models/ProjectInvitation';
import RateLimit from '../models/RateLimit';
import NoteLock from '../models/NoteLock';

const setupIndexes = async () => {
  try {
    console.log('🔗 Connecting to database...');
    await connectDatabase();
    
    console.log('📊 Setting up database indexes for optimal performance...');

    // Analytics Collection Indexes
    console.log('📈 Creating Analytics indexes...');
    await Analytics.collection.createIndex({ userId: 1, timestamp: -1 });
    await Analytics.collection.createIndex({ eventType: 1, timestamp: -1 });
    await Analytics.collection.createIndex({ sessionId: 1 });
    await Analytics.collection.createIndex({ timestamp: 1 }, { expireAfterSeconds: 15552000 }); // 180 days TTL
    console.log('✅ Analytics indexes created');

    // User Collection Indexes  
    console.log('👤 Creating User indexes...');
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ createdAt: -1 });
    await User.collection.createIndex({ planTier: 1 });
    await User.collection.createIndex({ isAdmin: 1 });
    console.log('✅ User indexes created');

    // Project Collection Indexes
    console.log('📁 Creating Project indexes...');
    await Project.collection.createIndex({ userId: 1, createdAt: -1 });
    await Project.collection.createIndex({ ownerId: 1, createdAt: -1 });
    await Project.collection.createIndex({ updatedAt: -1 });
    await Project.collection.createIndex({ category: 1 });
    await Project.collection.createIndex({ isArchived: 1 });
    await Project.collection.createIndex({ "todos.assignedTo": 1 });
    await Project.collection.createIndex({ "todos.dueDate": 1 });
    console.log('✅ Project indexes created');

    // UserSession Collection Indexes
    console.log('🔄 Creating UserSession indexes...');
    await UserSession.collection.createIndex({ userId: 1, startTime: -1 });
    await UserSession.collection.createIndex({ sessionId: 1 }, { unique: true });
    await UserSession.collection.createIndex({ isActive: 1, lastActivity: -1 });
    await UserSession.collection.createIndex({ lastActivity: 1 }, { expireAfterSeconds: 86400 }); // 1 day TTL for inactive sessions
    await UserSession.collection.createIndex({ currentProjectId: 1 });
    console.log('✅ UserSession indexes created');

    // ActivityLog Collection Indexes
    console.log('📝 Creating ActivityLog indexes...');
    await ActivityLog.collection.createIndex({ userId: 1, timestamp: -1 });
    await ActivityLog.collection.createIndex({ projectId: 1, timestamp: -1 });
    await ActivityLog.collection.createIndex({ action: 1, timestamp: -1 });
    await ActivityLog.collection.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL
    console.log('✅ ActivityLog indexes created');

    // Notification Collection Indexes
    console.log('🔔 Creating Notification indexes...');
    await Notification.collection.createIndex({ userId: 1, createdAt: -1 });
    await Notification.collection.createIndex({ type: 1, createdAt: -1 });
    await Notification.collection.createIndex({ isRead: 1 });
    await Notification.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL
    console.log('✅ Notification indexes created');

    // ProjectInvitation Collection Indexes
    console.log('✉️ Creating ProjectInvitation indexes...');
    await ProjectInvitation.collection.createIndex({ email: 1 });
    await ProjectInvitation.collection.createIndex({ projectId: 1 });
    await ProjectInvitation.collection.createIndex({ invitedBy: 1 });
    await ProjectInvitation.collection.createIndex({ status: 1 });
    await ProjectInvitation.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-expire based on expiresAt field
    console.log('✅ ProjectInvitation indexes created');

    // RateLimit Collection Indexes
    console.log('⏱️ Creating RateLimit indexes...');
    await RateLimit.collection.createIndex({ key: 1 }, { unique: true });
    await RateLimit.collection.createIndex({ windowStart: 1 }, { expireAfterSeconds: 86400 }); // 1 day TTL
    console.log('✅ RateLimit indexes created');

    // NoteLock Collection Indexes
    console.log('🔒 Creating NoteLock indexes...');
    await NoteLock.collection.createIndex({ projectId: 1, noteId: 1 }, { unique: true });
    await NoteLock.collection.createIndex({ userId: 1 });
    await NoteLock.collection.createIndex({ lastHeartbeat: 1 }, { expireAfterSeconds: 3600 }); // 1 hour TTL
    console.log('✅ NoteLock indexes created');

    // Compound indexes for common query patterns
    console.log('🔗 Creating compound indexes...');
    
    // Analytics compound indexes
    await Analytics.collection.createIndex({ userId: 1, eventType: 1, timestamp: -1 });
    await Analytics.collection.createIndex({ "eventData.projectId": 1, timestamp: -1 });
    
    // Project compound indexes
    await Project.collection.createIndex({ userId: 1, category: 1, updatedAt: -1 });
    
    // UserSession compound indexes
    await UserSession.collection.createIndex({ userId: 1, isActive: 1, startTime: -1 });
    
    console.log('✅ Compound indexes created');

    console.log('🎉 All database indexes created successfully!');
    console.log('📊 Performance optimization complete');

    // Display index statistics
    console.log('\n📈 Index Statistics:');
    const collections = [
      { name: 'Analytics', model: Analytics },
      { name: 'Users', model: User },
      { name: 'Projects', model: Project },
      { name: 'UserSessions', model: UserSession },
      { name: 'ActivityLogs', model: ActivityLog },
      { name: 'Notifications', model: Notification },
      { name: 'ProjectInvitations', model: ProjectInvitation },
      { name: 'RateLimits', model: RateLimit },
      { name: 'NoteLocks', model: NoteLock }
    ];

    for (const { name, model } of collections) {
      const indexes = await model.collection.listIndexes().toArray();
      console.log(`  ${name}: ${indexes.length} indexes`);
    }

  } catch (error) {
    console.error('❌ Error setting up indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the setup
setupIndexes();