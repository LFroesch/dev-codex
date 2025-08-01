import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { connectDatabase } from '../config/database';

dotenv.config();

async function resetUserPassword() {
  try {
    await connectDatabase();

    const email = process.argv[2];
    const newPassword = process.argv[3];

    if (!email || !newPassword) {
      console.error('Usage: npm run reset-password <email> <newPassword>');
      console.error('Example: npm run reset-password user@example.com newpassword123');
      process.exit(1);
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.error('User not found with email:', email);
      process.exit(1);
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update the user's password
    user.password = hashedPassword;
    await user.save();

    console.log('✅ Password reset successfully for:', email);
    console.log('New password:', newPassword);
    
  } catch (error) {
    console.error('Error resetting password:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

resetUserPassword();