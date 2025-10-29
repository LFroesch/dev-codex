import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalTeardown() {
  const mongoServer: MongoMemoryServer = (global as any).__MONGOSERVER__;

  if (mongoServer) {
    await mongoServer.stop({ doCleanup: true, force: true });
  }

  console.log('Global test database stopped');
}
