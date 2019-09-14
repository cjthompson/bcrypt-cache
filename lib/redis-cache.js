const CacheInternals = Symbol('redis-cache');

class RedisCache {
  /**
   * @param {Object} options
   * @param {Object} options.redis - Redis client instance (ioredis)
   * @param {number} [options.ttl=600] - Time-to-live for each cache entry
   * @param {boolean} [options.refreshTTL=true] - Refresh the expiration time on GET
   * @param {string} [options.prefix='bcrypt-cache'] - Prefix all keys
   * @constructor
   */
  constructor(options) {
    if (!options.redis) {
      throw new Error('Missing Redis client reference');
    }

    this[CacheInternals] = { // Default options
      ttl: 600,
      prefix: 'bcrypt-cache:',
      refreshTTL: true,
      ...options,
    };
  }

  /**
   * Get a cache key with a prefix
   * @private
   * @param {string} key
   * @returns {string}
   */
  getKey(key) {
    return this[CacheInternals].prefix + key;
  }

  /**
   * Remove a key from the cache
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async del(key) {
    const result = await this[CacheInternals].redis.del(this.getKey(key));
    return Boolean(result);
  }

  /**
   * Get a cached value by key
   * @param {string} key
   * @returns {Promise<string | null>} Returns the value associated with the key or null
   */
  async get(key) {
    const value = await this[CacheInternals].redis.get(this.getKey(key));
    if (this[CacheInternals].refreshTTL) {
      // Fire-and-forget to refresh the expiration time
      this[CacheInternals].redis.expire(this.getKey(key), this[CacheInternals].ttl);
    }

    return value;
  }

  /**
   * Add a value to the cache with a given key
   * @param {string} key
   * @param {string} value
   * @returns {Promise<boolean>}
   */
  async set(key, value) {
    const result = await this[CacheInternals].redis.setex(
      this.getKey(key), this[CacheInternals].ttl, value,
    );
    return Boolean(result);
  }
}

module.exports = RedisCache;
