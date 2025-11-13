import { ProjectCache, projectCache } from '../../services/ProjectCache';

jest.mock('../../config/logger');

// Unmock ProjectCache to test the real implementation
jest.unmock('../../services/ProjectCache');

describe('ProjectCache', () => {
  let cache: ProjectCache;

  beforeAll(() => {
    // Destroy the global instance to prevent open handles
    projectCache.destroy();
  });

  beforeEach(() => {
    cache = new ProjectCache(1, 100); // 1 min TTL, max 100 entries for testing
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.maxSize).toBe(100);
      expect(stats.ttlMinutes).toBe(1);
    });
  });

  describe('get and set', () => {
    const userId = 'user123';
    const mockProjects = [
      {
        _id: 'proj1',
        name: 'Project 1',
        ownerId: userId,
        userId,
        isArchived: false,
        updatedAt: new Date()
      },
      {
        _id: 'proj2',
        name: 'Project 2',
        ownerId: userId,
        userId,
        isArchived: false,
        updatedAt: new Date()
      }
    ];

    it('should return null for cache miss', () => {
      const result = cache.get(userId);
      expect(result).toBeNull();

      const stats = cache.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
    });

    it('should store and retrieve projects', () => {
      cache.set(userId, mockProjects);
      const result = cache.get(userId);

      expect(result).toEqual(mockProjects);
      expect(result?.length).toBe(2);

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.size).toBe(1);
    });

    it('should track multiple hits', () => {
      cache.set(userId, mockProjects);

      cache.get(userId);
      cache.get(userId);
      cache.get(userId);

      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(0);
    });

    it('should calculate hit rate correctly', () => {
      cache.set(userId, mockProjects);

      cache.get(userId); // hit
      cache.get('nonexistent'); // miss
      cache.get(userId); // hit

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe('66.67%');
    });

    it('should respect custom TTL', () => {
      const now = Date.now();
      const dateSpy = jest.spyOn(Date, 'now');

      // Mock for set operation
      dateSpy.mockReturnValue(now);
      const shortTTL = 100; // 100ms
      cache.set(userId, mockProjects, shortTTL);

      // Should be available immediately (still within TTL)
      dateSpy.mockReturnValue(now + 50);
      expect(cache.get(userId)).toEqual(mockProjects);

      // Mock time passing beyond TTL
      dateSpy.mockReturnValue(now + 150);

      // Should be expired
      expect(cache.get(userId)).toBeNull();

      dateSpy.mockRestore();
    });

    it('should handle expired entries', () => {
      const now = Date.now();
      const dateSpy = jest.spyOn(Date, 'now');

      dateSpy.mockReturnValue(now);
      cache.set(userId, mockProjects, 100); // 100ms TTL

      // Mock time passing beyond expiration
      dateSpy.mockReturnValue(now + 200);

      const result = cache.get(userId);
      expect(result).toBeNull();

      const stats = cache.getStats();
      expect(stats.misses).toBe(1);

      dateSpy.mockRestore();
    });
  });

  describe('invalidate', () => {
    it('should remove specific user from cache', () => {
      const userId1 = 'user1';
      const userId2 = 'user2';

      cache.set(userId1, [{ _id: 'p1', name: 'P1', ownerId: userId1, userId: userId1, isArchived: false, updatedAt: new Date() }]);
      cache.set(userId2, [{ _id: 'p2', name: 'P2', ownerId: userId2, userId: userId2, isArchived: false, updatedAt: new Date() }]);

      expect(cache.getStats().size).toBe(2);

      cache.invalidate(userId1);

      expect(cache.get(userId1)).toBeNull();
      expect(cache.get(userId2)).not.toBeNull();
      expect(cache.getStats().size).toBe(1);
    });
  });

  describe('invalidateProject', () => {
    it('should invalidate all users with access to a project', () => {
      const projectId = 'shared-project';
      const user1 = 'user1';
      const user2 = 'user2';
      const user3 = 'user3';

      // Users 1 and 2 have access to the project
      cache.set(user1, [
        { _id: projectId, name: 'Shared', ownerId: user1, userId: user1, isArchived: false, updatedAt: new Date() }
      ]);
      cache.set(user2, [
        { _id: projectId, name: 'Shared', ownerId: user1, userId: user2, isArchived: false, updatedAt: new Date() }
      ]);

      // User 3 doesn't have access
      cache.set(user3, [
        { _id: 'other-project', name: 'Other', ownerId: user3, userId: user3, isArchived: false, updatedAt: new Date() }
      ]);

      expect(cache.getStats().size).toBe(3);

      cache.invalidateProject(projectId);

      // Users 1 and 2 should be invalidated
      expect(cache.get(user1)).toBeNull();
      expect(cache.get(user2)).toBeNull();

      // User 3 should still have cache
      expect(cache.get(user3)).not.toBeNull();
      expect(cache.getStats().size).toBe(1);
    });

    it('should do nothing if no users have the project', () => {
      const user1 = 'user1';
      cache.set(user1, [
        { _id: 'proj1', name: 'P1', ownerId: user1, userId: user1, isArchived: false, updatedAt: new Date() }
      ]);

      expect(cache.getStats().size).toBe(1);

      cache.invalidateProject('nonexistent-project');

      expect(cache.getStats().size).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all cache entries and reset stats', () => {
      cache.set('user1', [{ _id: 'p1', name: 'P1', ownerId: 'user1', userId: 'user1', isArchived: false, updatedAt: new Date() }]);
      cache.set('user2', [{ _id: 'p2', name: 'P2', ownerId: 'user2', userId: 'user2', isArchived: false, updatedAt: new Date() }]);

      cache.get('user1'); // Create some stats
      cache.get('nonexistent');

      const statsBefore = cache.getStats();
      expect(statsBefore.size).toBe(2);
      expect(statsBefore.hits).toBe(1);
      expect(statsBefore.misses).toBe(1);

      cache.clear();

      const statsAfter = cache.getStats();
      expect(statsAfter.size).toBe(0);
      expect(statsAfter.hits).toBe(0);
      expect(statsAfter.misses).toBe(0);
    });
  });

  describe('max cache size', () => {
    it('should evict oldest entry when max size is reached', () => {
      const smallCache = new ProjectCache(1, 3); // Max 3 entries

      smallCache.set('user1', [{ _id: 'p1', name: 'P1', ownerId: 'u1', userId: 'u1', isArchived: false, updatedAt: new Date() }]);
      smallCache.set('user2', [{ _id: 'p2', name: 'P2', ownerId: 'u2', userId: 'u2', isArchived: false, updatedAt: new Date() }]);
      smallCache.set('user3', [{ _id: 'p3', name: 'P3', ownerId: 'u3', userId: 'u3', isArchived: false, updatedAt: new Date() }]);

      expect(smallCache.getStats().size).toBe(3);

      // Adding 4th entry should evict the first one
      smallCache.set('user4', [{ _id: 'p4', name: 'P4', ownerId: 'u4', userId: 'u4', isArchived: false, updatedAt: new Date() }]);

      expect(smallCache.getStats().size).toBe(3);
      expect(smallCache.get('user1')).toBeNull(); // Evicted
      expect(smallCache.get('user2')).not.toBeNull();
      expect(smallCache.get('user3')).not.toBeNull();
      expect(smallCache.get('user4')).not.toBeNull();

      smallCache.destroy();
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries during cleanup', () => {
      const now = Date.now();
      const dateSpy = jest.spyOn(Date, 'now');
      const testCache = new ProjectCache(0.01, 100); // 0.01 min = 600ms

      // Mock Date.now for set operations
      dateSpy.mockReturnValue(now);

      testCache.set('user1', [{ _id: 'p1', name: 'P1', ownerId: 'u1', userId: 'u1', isArchived: false, updatedAt: new Date() }]);
      testCache.set('user2', [{ _id: 'p2', name: 'P2', ownerId: 'u2', userId: 'u2', isArchived: false, updatedAt: new Date() }]);

      expect(testCache.getStats().size).toBe(2);

      // Mock time passing beyond expiration (0.01 min = 600ms)
      dateSpy.mockReturnValue(now + 700);

      // Manually trigger cleanup
      (testCache as any).cleanup();

      // Entries should be removed
      expect(testCache.getStats().size).toBe(0);

      testCache.destroy();
      dateSpy.mockRestore();
    });
  });

  describe('destroy', () => {
    it('should clear cache and stop cleanup interval', () => {
      const testCache = new ProjectCache(1, 100);

      testCache.set('user1', [{ _id: 'p1', name: 'P1', ownerId: 'u1', userId: 'u1', isArchived: false, updatedAt: new Date() }]);
      expect(testCache.getStats().size).toBe(1);

      testCache.destroy();

      expect(testCache.getStats().size).toBe(0);
      // Note: cleanup interval is cleared internally
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      cache.set('user1', [{ _id: 'p1', name: 'P1', ownerId: 'u1', userId: 'u1', isArchived: false, updatedAt: new Date() }]);
      cache.set('user2', [{ _id: 'p2', name: 'P2', ownerId: 'u2', userId: 'u2', isArchived: false, updatedAt: new Date() }]);

      cache.get('user1'); // hit
      cache.get('user1'); // hit
      cache.get('nonexistent'); // miss

      const stats = cache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe('66.67%');
      expect(stats.maxSize).toBe(100);
      expect(stats.ttlMinutes).toBe(1);
    });

    it('should show 0.00% hit rate when no operations', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe('0.00%');
    });
  });
});
