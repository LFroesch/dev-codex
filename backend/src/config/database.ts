import mongoose from 'mongoose';
import { logInfo, logError } from './logger';

export const connectDatabase = async (): Promise<void> => {
  try {
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    const mongoUri = process.env.MONGODB_URI || '';
    if (!mongoUri) {
      throw new Error('MONGODB_URI is required but not provided');
    }
    
    
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10, // Maximum number of connections in the pool
      serverSelectionTimeoutMS: 5000, // How long to wait for server selection
      socketTimeoutMS: 45000, // Socket timeout
      family: 4, // Use IPv4, skip trying IPv6
    });
    
    logInfo('Database connected successfully', { 
      environment: process.env.NODE_ENV || 'development',
      database: mongoUri.includes('localhost') ? 'local' : 'remote'
    });
    
  } catch (error) {
    logError('MongoDB connection failed', error as Error, {
      environment: process.env.NODE_ENV || 'development',
      mongoUri: 'connection string masked for security'
    });
    throw error;
  }
};