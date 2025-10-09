import { logInfo, logWarn } from '../config/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface ProjectCacheData {
  _id: string;
  name: string;
  ownerId: string;
  userId: string;
  members?: Array<{ userId: string; role: string }>;
  isArchived: boolean;
  updatedAt: Date;
}

/**
 * In-memory cache for user projects with TTL
 * Reduces database queries for frequently accessed project lists
 */
export class ProjectCache {
  private cache: Map<string, CacheEntry<ProjectCacheData[]>>;
  private readonly defaultTTL: number;
  private readonly maxCacheSize: number;
  private hits: number;
  private misses: number;

  constructor(ttlMinutes: number = 5, maxSize: number = 1000) {
    this.cache = new Map();
    this.defaultTTL = ttlMinutes * 60 * 1000; // Convert to milliseconds
    this.maxCacheSize = maxSize;
    this.hits = 0;
    this.misses = 0;

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Get user projects from cache
   */
  get(userId: string): ProjectCacheData[] | null {
    const entry = this.cache.get(userId);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(userId);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data;
  }

  /**
   * Set user projects in cache
   */
  set(userId: string, projects: ProjectCacheData[], ttl?: number): void {
    // Enforce max cache size (LRU eviction)
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        logWarn('Project cache evicted oldest entry (max size reached)');
      }
    }

    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(userId, {
      data: projects,
      timestamp: Date.now(),
      expiresAt
    });
  }

  /**
   * Invalidate user's cached projects
   */
  invalidate(userId: string): void {
    this.cache.delete(userId);
    logInfo('Project cache invalidated', { userId });
  }

  /**
   * Invalidate all users who have access to a specific project
   */
  invalidateProject(projectId: string): void {
    let invalidatedCount = 0;

    for (const [userId, entry] of this.cache.entries()) {
      const hasProject = entry.data.some(p => p._id.toString() === projectId);
      if (hasProject) {
        this.cache.delete(userId);
        invalidatedCount++;
      }
    }

    if (invalidatedCount > 0) {
      logInfo('Project cache invalidated for project', { projectId, usersAffected: invalidatedCount });
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    logInfo('Project cache cleared', { entriesCleared: size });
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [userId, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logInfo('Project cache cleanup', { entriesRemoved: cleanedCount });
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.hits + this.misses > 0
      ? ((this.hits / (this.hits + this.misses)) * 100).toFixed(2)
      : '0.00';

    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`,
      maxSize: this.maxCacheSize,
      ttlMinutes: this.defaultTTL / 60000
    };
  }
}

// Global cache instance
export const projectCache = new ProjectCache(5, 1000); // 5 min TTL, max 1000 users
