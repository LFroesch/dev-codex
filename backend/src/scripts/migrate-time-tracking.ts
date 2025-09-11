#!/usr/bin/env node

/**
 * Migration script to add new fields for gap-aware time tracking
 * This script updates existing UserSession documents to include the new fields
 */

import mongoose from 'mongoose';
import UserSession from '../models/UserSession';
import '../config/database';

async function migrateTimeTracking() {
  try {
    console.log('Starting time tracking migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/project-manager');
    
    // Update all UserSession documents to add the new fields
    const updateResult = await UserSession.updateMany(
      {},
      {
        $set: {
          heartbeatTimestamps: [],
          'projectTimeBreakdown.$[].heartbeatTimestamps': [],
          'projectTimeBreakdown.$[].activeTime': '$projectTimeBreakdown.$[].timeSpent'
        }
      }
    );
    
    console.log(`Migration completed. Updated ${updateResult.modifiedCount} sessions.`);
    
    // Initialize activeTime field for existing projects where it doesn't exist
    const sessions = await UserSession.find({
      projectTimeBreakdown: { $exists: true, $ne: [] }
    });
    
    let projectsUpdated = 0;
    
    for (const session of sessions) {
      let sessionModified = false;
      
      if (session.projectTimeBreakdown) {
        for (const project of session.projectTimeBreakdown) {
          if (project.activeTime === undefined) {
            project.activeTime = project.timeSpent || 0;
            sessionModified = true;
            projectsUpdated++;
          }
          
          if (!project.heartbeatTimestamps) {
            project.heartbeatTimestamps = [];
            sessionModified = true;
          }
        }
      }
      
      if (!session.heartbeatTimestamps) {
        session.heartbeatTimestamps = [];
        sessionModified = true;
      }
      
      if (sessionModified) {
        await session.save();
      }
    }
    
    console.log(`Updated ${projectsUpdated} project entries with activeTime field.`);
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateTimeTracking();
}

export default migrateTimeTracking;