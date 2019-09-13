const CacheInternals = Symbol('redis-cache');

class RedisCache {
  /**
   * Create a bcrypt cache that uses Redis to store the cached results
   *
   * @param {Object} options
   * @param {Object} options.redis - Redis client instance
   * @param {number} [options.pruneTimer=60] - Time, in seconds, to prune expired entries
   * @param {number} [options.ttl=600] - Time-to-live for each cache entry
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
   *
   * @param {string} key
   * @returns {Promise<string>} Returns the value associated with the key or a rejected Promise
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
   * @returns {Promise<boolean>} Always returns true
   */
  async set(key, value) {
    const result = await this[CacheInternals].redis.setex(
      this.getKey(key), this[CacheInternals].ttl, value,
    );
    return Boolean(result);
  }
}

module.exports = RedisCache;
