import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiCache } from '../../../src/utils/apiCache';

describe('APICache', () => {
  beforeEach(() => {
    apiCache.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Cache Set/Get', () => {
    it('should store and retrieve cached data', () => {
      const testData = { name: 'test', value: 123 };
      apiCache.set('test_key', testData, 10000);
      
      const result = apiCache.get('test_key');
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent key', () => {
      const result = apiCache.get('non_existent');
      expect(result).toBeNull();
    });

    it('should use default TTL when not specified', () => {
      const testData = { data: 'test' };
      apiCache.set('test_key', testData);
      
      // Should be available immediately
      expect(apiCache.get('test_key')).toEqual(testData);
    });
  });

  describe('TTL and Expiration', () => {
    it('should return null when entry expires', () => {
      const testData = { data: 'test' };
      apiCache.set('test_key', testData, 5000); // 5 second TTL
      
      // Advance time by 6 seconds
      vi.advanceTimersByTime(6000);
      
      const result = apiCache.get('test_key');
      expect(result).toBeNull();
    });

    it('should return data when entry is still valid', () => {
      const testData = { data: 'test' };
      apiCache.set('test_key', testData, 10000); // 10 second TTL
      
      // Advance time by 5 seconds
      vi.advanceTimersByTime(5000);
      
      const result = apiCache.get('test_key');
      expect(result).toEqual(testData);
    });

    it('should automatically delete expired entries on get', () => {
      const testData = { data: 'test' };
      apiCache.set('test_key', testData, 1000);
      
      vi.advanceTimersByTime(2000);
      
      // Get should delete expired entry
      apiCache.get('test_key');
      
      // Entry should be gone
      const cacheSize = (apiCache as any).cache?.size || 0;
      expect(cacheSize).toBe(0);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate specific cache entry', () => {
      apiCache.set('key1', { data: 'test1' });
      apiCache.set('key2', { data: 'test2' });
      
      apiCache.invalidate('key1');
      
      expect(apiCache.get('key1')).toBeNull();
      expect(apiCache.get('key2')).toEqual({ data: 'test2' });
    });

    it('should invalidate entries matching pattern', () => {
      apiCache.set('playback_state', { data: 'state' });
      apiCache.set('playback_history', { data: 'history' });
      apiCache.set('user_profile', { data: 'profile' });
      
      apiCache.invalidatePattern('^playback_');
      
      expect(apiCache.get('playback_state')).toBeNull();
      expect(apiCache.get('playback_history')).toBeNull();
      expect(apiCache.get('user_profile')).toEqual({ data: 'profile' });
    });

    it('should clear all cache entries', () => {
      apiCache.set('key1', { data: 'test1' });
      apiCache.set('key2', { data: 'test2' });
      apiCache.set('key3', { data: 'test3' });
      
      apiCache.clear();
      
      expect(apiCache.get('key1')).toBeNull();
      expect(apiCache.get('key2')).toBeNull();
      expect(apiCache.get('key3')).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should remove expired entries during cleanup', () => {
      apiCache.set('expired', { data: 'old' }, 1000);
      apiCache.set('valid', { data: 'new' }, 10000);
      
      vi.advanceTimersByTime(2000);
      
      (apiCache as any).cleanup();
      
      expect(apiCache.get('expired')).toBeNull();
      expect(apiCache.get('valid')).toEqual({ data: 'new' });
    });
  });

  describe('Request Deduplication Pattern', () => {
    it('should support caching for deduplication', () => {
      const requestData = { endpoint: '/api/test', params: { id: 123 } };
      apiCache.set('pending_request_123', requestData, 5000);
      
      // Simulate checking if request is pending
      const pending = apiCache.get('pending_request_123');
      expect(pending).toBeTruthy();
      
      // Clear when request completes
      apiCache.invalidate('pending_request_123');
      expect(apiCache.get('pending_request_123')).toBeNull();
    });
  });

  describe('Memory Management', () => {
    it('should handle many cache entries', () => {
      for (let i = 0; i < 100; i++) {
        apiCache.set(`key_${i}`, { index: i }, 10000);
      }
      
      expect(apiCache.get('key_50')).toEqual({ index: 50 });
      expect(apiCache.get('key_99')).toEqual({ index: 99 });
    });

    it('should clean up expired entries to prevent memory leaks', () => {
      // Set many entries with short TTL
      for (let i = 0; i < 50; i++) {
        apiCache.set(`temp_${i}`, { data: i }, 1000);
      }
      
      // Set some with long TTL
      for (let i = 0; i < 10; i++) {
        apiCache.set(`persistent_${i}`, { data: i }, 100000);
      }
      
      vi.advanceTimersByTime(2000);
      (apiCache as any).cleanup();
      
      // Temp entries should be gone
      expect(apiCache.get('temp_0')).toBeNull();
      // Persistent entries should remain
      expect(apiCache.get('persistent_0')).toEqual({ data: 0 });
    });
  });
});

