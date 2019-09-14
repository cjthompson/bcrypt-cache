const debug = require('./debug');
const bcrypt = require('./bcrypt');
const sha = require('./hash');

class BcryptCache {
  constructor(cache) {
    this.cache = cache;
  }

  async compare(text, hash) {
    let valid = false;
    let result;

    try {
      result = await this.cache.get(hash);
    } catch (e) {
      debug('Error: failed to get from cache\n%O', e);
      // Error with the cache, so we need to fall back to bcrypt comparison
      result = undefined;
    }

    // Hash is not available in the cache
    if (result) {
      valid = result === sha(text);
    } else {
      // Fall back to doing the full bcrypt comparison
      valid = await bcrypt.compare(text, hash);
      if (valid) {
        // Store the MD5 hash to avoid storing sensitive data in the cache
        debug('Add to cache: %s', hash);
        try {
          await this.cache.set(hash, sha(text));
        } catch (e) {
          debug('Error: failed to set value in cache\n%O', e);
        }
      }
    }

    return valid;
  }
}

module.exports = BcryptCache;
