const CacheInternals = Symbol('memory-cache');

const debug = require('./debug').extend('MemoryCache');

class MemoryCache {
  /**
   * Create a bcrypt cache that uses Redis to store the cached results
   *
   * @param {Object} [options]
   * @param {Number} [options.pruneTimer=60]
   * Time, in seconds, to prune the cache for expired entries
   * @param {Number} [options.ttl=600]
   * Time-to-live for each cache entry
   * @constructor
   */
  constructor(options) {
    this[CacheInternals] = { // Default options
      ttl: 600,
      pruneTimer: 60,
      refreshTTL: true,
      ...options,
    };

    this[CacheInternals].ttl *= 1000;
    this[CacheInternals].pruneTimer *= 1000;
    this[CacheInternals].cache = {};

    if (this[CacheInternals].pruneTimer > 0) {
      this[CacheInternals].pruneInterval = setInterval(() => {
        debug('Pruning...');
        this.prune();
      }, this[CacheInternals].pruneTimer);
    }
  }

  /**
   * Remove all expired cache entries from the memory cache
   */
  prune() {
    const now = Date.now();
    Object.keys(this[CacheInternals].cache).forEach((key) => {
      if (this[CacheInternals].cache[key] && this[CacheInternals].cache[key].expiration < now) {
        delete this[CacheInternals].cache[key];
      }
    });
  }

  del(key) {
    if (this[CacheInternals].cache[key]) {
      delete this[CacheInternals].cache[key];
      return true;
    }

    return false;
  }

  /**
   * Get a cached value by key
   *
   * @param {string} key
   * @returns {string | null} Returns the value associated with the key or a rejected Promise
   */
  get(key) {
    const value = this[CacheInternals].cache[key];

    if (value) {
      if (this[CacheInternals].refreshTTL) {
        value.expiration = Date.now() + this[CacheInternals].ttl;
      }

      return value.value;
    }

    return null;
  }

  /**
   * Add a value to the cache with a given key
   * @param {string} key
   * @param {*} value
   * @returns {boolean} Always returns true
   */
  set(key, value) {
    this[CacheInternals].cache[key] = {
      value,
      expiration: Date.now() + this[CacheInternals].ttl,
    };

    return true;
  }
}

module.exports = MemoryCache;
