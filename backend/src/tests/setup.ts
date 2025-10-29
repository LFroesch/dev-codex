import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Connect to the global MongoDB server (created in globalSetup.ts)
beforeAll(async () => {
  try {
    const mongoUri = (global as any).__MONGO_URI__;

    if (!mongoUri) {
      throw new Error('MongoDB URI not found. Global setup may have failed.');
    }

    // Connect to the shared in-memory database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000
      });
    }
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
}, 10000);

// Cleanup after each test file
afterAll(async () => {
  try {
    // Disconnect mongoose but DON'T stop the MongoDB server
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
});

// Clear database before each test
beforeEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;

    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({}).catch(() => {
        // Ignore errors during cleanup
      });
    }
  }
});