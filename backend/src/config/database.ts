import mongoose from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  try {
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    let mongoUri: string;
    if (nodeEnv === 'production') {
      mongoUri = process.env.MONGODB_URI_PROD || process.env.MONGODB_URI || '';
      if (!mongoUri) {
        throw new Error('Production MongoDB URI is required but not provided');
      }
    } else {
      mongoUri = process.env.MONGODB_URI_DEV || process.env.MONGODB_URI || 'mongodb://localhost:27017/project-manager-dev';
    }
    
    console.log(`Attempting to connect to MongoDB (${nodeEnv})...`);
    console.log('Connection string:', mongoUri.replace(/:[^:@]*@/, ':****@')); // Hide password
    
    await mongoose.connect(mongoUri);
    
    console.log(`Connected to MongoDB successfully! (${nodeEnv})`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};