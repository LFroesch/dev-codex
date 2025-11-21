import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { connectDatabase } from '../config/database';

dotenv.config();

async function deleteDemoUser() {
  try {
    await connectDatabase();

    const demoEmail = 'demo@projectmanager.example';

    // Find demo user
    const demoUser = await User.findOne({ email: demoEmail });

    if (!demoUser) {
      console.log('No demo user found to delete');
      process.exit(0);
    }

    console.log('Found demo user:', demoEmail);
    console.log('User ID:', demoUser._id);

    // Delete all projects owned by demo user
    const deletedProjects = await Project.deleteMany({ ownerId: demoUser._id });
    console.log(`✓ Deleted ${deletedProjects.deletedCount} demo projects`);

    // Delete demo user
    await User.deleteOne({ _id: demoUser._id });
    console.log('✓ Demo user deleted');

    console.log('\n✅ Demo user and all associated data deleted successfully!');
    console.log('You can now run the seed script to recreate the demo user.');

  } catch (error) {
    console.error('Error deleting demo user:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

deleteDemoUser();
