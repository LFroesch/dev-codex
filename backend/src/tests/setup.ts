import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Load test environment variables
dotenv.config({ path: '.env.test' });

let mongoServer: MongoMemoryServer;

// Global test setup
beforeAll(async () => {
  try {
    // Create in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to in-memory database
    await mongoose.connect(mongoUri);
    console.log('Connected to in-memory test database');
  } catch (error) {
    console.error('Failed to set up test database:', error);
    throw error;
  }
}, 30000); // 30 second timeout for MongoDB memory server setup

// Cleanup after all tests
afterAll(async () => {
  try {
    // Close mongoose connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    
    // Stop the in-memory MongoDB server
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
}, 10000);

// Clear database before each test
beforeEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
});

// Increase timeout for database operations
jest.setTimeout(30000);