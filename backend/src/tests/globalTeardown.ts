import { MongoMemoryServer } from 'mongodb-memory-server';
import { projectCache } from '../services/ProjectCache';

export default async function globalTeardown() {
  const mongoServer: MongoMemoryServer = (global as any).__MONGOSERVER__;

  if (mongoServer) {
    await mongoServer.stop({ doCleanup: true, force: true });
  }

  // Clean up ProjectCache interval to prevent Jest hanging
  projectCache.destroy();

  console.log('Global test database stopped and resources cleaned up');
}
