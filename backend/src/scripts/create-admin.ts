import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { connectDatabase } from '../config/database';

dotenv.config();

async function createAdmin() {
  try {
    await connectDatabase();

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';
    const adminLastName = process.env.ADMIN_LAST_NAME || 'User';
    const adminSecret = process.env.ADMIN_CREATION_SECRET;

    if (!adminEmail || !adminPassword || !adminSecret) {
      console.error('ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_CREATION_SECRET environment variables are required');
      console.error('This script should only be run by system administrators');
      process.exit(1);
    }

    // Verify the secret matches
    if (adminSecret !== process.env.EXPECTED_ADMIN_SECRET) {
      console.error('Invalid admin creation secret. Access denied.');
      process.exit(1);
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Admin user already exists with email:', adminEmail);
      if (!existingAdmin.isAdmin) {
        existingAdmin.isAdmin = true;
        await existingAdmin.save();
        console.log('Updated existing user to admin status');
      }
      process.exit(0);
    }

    // Create new admin user
    const adminUser = new User({
      email: adminEmail,
      password: adminPassword,
      firstName: adminFirstName,
      lastName: adminLastName,
      isAdmin: true,
      planTier: 'enterprise',
      projectLimit: -1, // unlimited
      subscriptionStatus: 'active'
    });

    await adminUser.save();
    console.log('Admin user created successfully!');
    console.log('Email:', adminEmail);
    console.log('Name:', `${adminFirstName} ${adminLastName}`);
    
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

createAdmin();