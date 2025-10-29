import { MongoMemoryServer } from 'mongodb-memory-server';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export default async function globalSetup() {
  // Kill any existing mongod processes that might be hanging
  try {
    await execAsync('pkill -9 mongod').catch(() => {
      // Ignore errors if no processes to kill
    });
  } catch (error) {
    // Ignore
  }

  // Create ONE MongoDB server for entire test suite
  // Using wiredTiger storage engine (default) to avoid deprecation warnings
  const mongoServer = await MongoMemoryServer.create();

  const mongoUri = mongoServer.getUri();

  // Store the URI and server instance for tests to use
  (global as any).__MONGOSERVER__ = mongoServer;
  (global as any).__MONGO_URI__ = mongoUri;

  console.log('Global test database created');
}
