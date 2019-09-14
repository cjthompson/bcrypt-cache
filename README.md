# bcrypt-cache v2.0

bcrypt-cache is a module designed to reduce CPU usage when frequently doing bcrypt comparisons.

For example, you may store API secret keys in a database using bcrypt.  Checking the API secret on every API call is CPU instensive.

By using bcrypt-cache, the first time the token is received, it'll be compared to the bcrypt hash.  Once verified, a much simpler SHA1 hash of the token will be stored in the cache and used for future comparisons.

Storing the SHA1 makes comparisons less CPU instensive while not leaking secrets by storing plain text in the cache.

## Installation

```
npm install --save bcrypt-cache
```

## Usage

The `bcrypt-cache` module comes with two default caching mechanisms: Memory and Redis.

### Using Redis as the cache
Use Redis if you have multiple instances of the application running to share the cache.

```javascript
const Redis = require('ioredis')
const { BcryptCache, RedisCache } = require('.');

const cache = new RedisCache({
  redis: new Redis(),
  ttl: 300, // cache for 5 minutes
  refreshTTL: true // reset the expiration TTL on each GET
});

const bcryptCache = new BcryptCache(cache);

async function verifyApiToken (req, res, next) {
  // Get the plain text token passed in by the user
  const token = req.headers['X-API-TOKEN'];
  // Get the hashed token
  const hashedToken = req.user.apiSecretToken;
  // Compare the plain text to the bcrypt hash
  const valid = await bcryptCache.compare(token, hashedToken);

  if (!valid) {
    next(new Error('Invalid access token'));
  } else {
    next();
  }
}
```

### Using memory as a cache
Each instance of the app will have it's own cache.

```js
const { BcryptCache, MemoryCache } = require('bcrypt-cache');

const cache = new MemoryCache({
  pruneTimer: 60, // how frequenctly to prune expired cache entries
  ttl: 300, // cache for 5 minutes
  refreshTTL: true // reset the expiration TTL on each GET
});

const bcryptCache = new BcryptCache(cache);
```

### RedisBcryptCache options

| Option | Description |
| ------ | ----------- |
| redis (required) | A Redis client instance (must expose async functions, such as `ioredis`) |
| ttl    | The number of seconds a token will be stored in the cache. Default: `600` |
| prefix | A string to use to prefix cache keys in Redis. Default: `bcrypt-cache:` |
| refreshTTL | Whether to refresh the expiration time when `compare` finds a token in the cache. Default: `true`

### MemoryCache options

| Option | Description |
| ------ | ----------- |
| ttl      | The number of seconds a token will be stored in the cache. Default: `600` |
| pruneTimer | The number of seconds the memory cache will be scanned for expired tokens. Set to a `falsy` value to disable. Default: `60` |
| refreshTTL | Whether to refresh the expiration time when `compare` finds a token in the cache. Default: `true`

## Create your own custom cache

You can create your own cache mechanism.

```typescript
interface Cache {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<boolean>;
}
```

See [memory-cache.js](./lib/memory-cache.js) or [redis-cache.js](./lib/redis-cache.js) for examples.

## Debug
Use the `debug` module to get error messages

```js
DEBUG='bcrypt-cache:*'
```

# Change Log
### v2.0.0:
* Refactor to split the BcryptCache module to only expose `compare` function.
* Pass a cache instance into the BcryptCache constructor
* `bcrypt` and `bcryptjs` are now peerDependency
* Requires node v8 or higher

### v1.1.0:
* Update depdendencies due to vulnerabilities reported by GitHub/npm

### v1.0.0:
* Initial release
