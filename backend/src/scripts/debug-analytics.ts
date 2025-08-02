import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Analytics from '../models/Analytics';
import UserSession from '../models/UserSession';
import { User } from '../models/User';
import { Project } from '../models/Project';

dotenv.config();

async function debugAnalytics() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/project-manager');
    console.log('Connected to MongoDB');

    // Get recent analytics events
    console.log('\n=== RECENT ANALYTICS EVENTS ===');
    const recentEvents = await Analytics.find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();
    
    console.log(`Found ${recentEvents.length} recent events:`);
    recentEvents.forEach((event: any, i: number) => {
      console.log(`${i + 1}. [${event.eventType}] UserId: ${event.userId} | ProjectId: ${event.eventData?.projectId} | Time: ${event.timestamp}`);
    });

    // Get all users
    console.log('\n=== ALL USERS ===');
    const users = await User.find({}, { _id: 1, firstName: 1, lastName: 1, email: 1 }).lean();
    console.log('Users in database:');
    users.forEach(user => {
      console.log(`- ${user._id} | ${user.firstName} ${user.lastName} (${user.email})`);
    });

    // Get all projects
    console.log('\n=== ALL PROJECTS ===');
    const projects = await Project.find({}, { _id: 1, name: 1, userId: 1 }).lean();
    console.log('Projects in database:');
    projects.forEach(project => {
      console.log(`- ${project._id} | "${project.name}" | Owner: ${project.userId}`);
    });

    // Check for orphaned analytics events (userId doesn't exist)
    console.log('\n=== ORPHANED EVENTS CHECK ===');
    const userIds = users.map(u => u._id.toString());
    const orphanedEvents = await Analytics.find({
      userId: { $nin: userIds }
    }).lean();
    
    if (orphanedEvents.length > 0) {
      console.log(`Found ${orphanedEvents.length} orphaned events (userId doesn't exist):`);
      orphanedEvents.forEach((event: any) => {
        console.log(`- Event: ${event.eventType} | Bad UserId: ${event.userId} | Time: ${event.timestamp}`);
      });
    } else {
      console.log('No orphaned events found.');
    }

    // Check for events with bad project IDs
    console.log('\n=== BAD PROJECT ID CHECK ===');
    const projectIds = projects.map(p => p._id.toString());
    const badProjectEvents = await Analytics.find({
      'eventData.projectId': { $exists: true, $nin: [...projectIds, null, ''] }
    }).lean();
    
    if (badProjectEvents.length > 0) {
      console.log(`Found ${badProjectEvents.length} events with bad project IDs:`);
      badProjectEvents.forEach((event: any) => {
        console.log(`- Event: ${event.eventType} | Bad ProjectId: ${event.eventData?.projectId} | UserId: ${event.userId}`);
      });
    } else {
      console.log('No events with bad project IDs found.');
    }

    // Show activity counts by user
    console.log('\n=== ACTIVITY COUNTS BY USER ===');
    const userActivity = await Analytics.aggregate([
      {
        $group: {
          _id: '$userId',
          totalEvents: { $sum: 1 },
          fieldEdits: {
            $sum: { $cond: [{ $eq: ['$eventType', 'field_edit'] }, 1, 0] }
          },
          lastEvent: { $max: '$timestamp' }
        }
      },
      { $sort: { totalEvents: -1 } }
    ]);

    console.log('Activity by userId:');
    for (const activity of userActivity) {
      const user = users.find(u => u._id.toString() === activity._id);
      const userName = user ? `${user.firstName} ${user.lastName}` : 'UNKNOWN USER';
      console.log(`- ${activity._id} (${userName}): ${activity.totalEvents} events, ${activity.fieldEdits} edits`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debugAnalytics();
