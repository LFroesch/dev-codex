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
      mongoUri = process.env.MONGODB_URI_DEV || process.env.MONGODB_URI || 'mongodb://localhost:27017/dev-codex-dev';
    }
    
    
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10, // Maximum number of connections in the pool
      serverSelectionTimeoutMS: 5000, // How long to wait for server selection
      socketTimeoutMS: 45000, // Socket timeout
      family: 4, // Use IPv4, skip trying IPv6
      // Connection optimizations
      bufferCommands: false,
      bufferMaxEntries: 0,
    });
    
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};