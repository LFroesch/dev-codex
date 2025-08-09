const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User schema (simplified version)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  theme: { type: String, default: 'retro' },
  planTier: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
  projectLimit: { type: Number, default: 3 },
  stripeCustomerId: String,
  subscriptionId: String,
  subscriptionStatus: { type: String, enum: ['active', 'inactive', 'canceled', 'past_due', 'incomplete_expired'], default: 'inactive' },
  isAdmin: { type: Boolean, default: false },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  googleId: String
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function makeAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://lucasfroeschner:ET6zHyFkbfqRMaM6@projectmanager.2veml9g.mongodb.net/project-manager?retryWrites=true&w=majority&appName=ProjectManager');
    console.log('Connected to MongoDB');

    // Find and update the user
    const user = await User.findOne({ email: 'lucas.froeschner@gmail.com' });
    
    if (user) {
      user.isAdmin = true;
      await user.save();
      console.log('✅ Successfully made lucas.froeschner@gmail.com an admin');
      console.log('User details:', {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        isAdmin: user.isAdmin,
        planTier: user.planTier
      });
    } else {
      console.log('❌ User not found with email: lucas.froeschner@gmail.com');
      console.log('Available users:');
      const allUsers = await User.find({}, 'email firstName lastName isAdmin');
      allUsers.forEach(u => console.log(`- ${u.email} (${u.firstName} ${u.lastName}) - Admin: ${u.isAdmin}`));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed');
  }
}

makeAdmin();