
const BcryptCache = require('./lib/bcrypt-cache');
const MemoryCache = require('./lib/memory-cache');
const RedisCache = require('./lib/redis-cache');

module.exports = {
  BcryptCache,
  RedisCache,
  MemoryCache,
};
