'use strict';

const TA = require('../index');
const bcrypt = require('../lib/bcrypt');
const sinon = require('sinon');
const MockRedis = require('ioredis-mock');

describe('Token Authentication Cache', () => {
  const token = 'token';
  const tokenHash = '$2a$10$o4ezyhBv1b2tOQmHH1kiO.vdeIPLQQcY.1aCtH9VODTK.1/CpyRPa';
  const tokenSha = '7pd4BtcoZRDai5p0krpY4khMDsw=';

  describe('BcryptCache', () => {
    let memoryCache;
    let bcryptCache;

    beforeEach(() => {
      memoryCache = new TA.MemoryCache({ pruneTimer: null });
      bcryptCache = new TA.BcryptCache(memoryCache);
    });

    it('should verify a key from the cache', async () => {
      await memoryCache.set(tokenHash, tokenSha);

      const result = await bcryptCache.compare(token, tokenHash);
      result.should.be.true;
    });

    it('should verify a key that is not in the cache', async () => {
      const result = await memoryCache.get(tokenHash)
      should.not.exist(result);

      const compare = await bcryptCache.compare(token, tokenHash);
      compare.should.be.true;

      const get = await memoryCache.get(tokenHash);
      should.exist(get);
      get.should.equal(tokenSha);
    });

    it('should verify a key if lookup fails', async () => {
      sinon.stub(memoryCache, 'get').rejects(new Error('Connection closed'));
      const result = await bcryptCache.compare(token, tokenHash);
      result.should.be.true;
    });

    it('should verify if saving key to the cache fails', async () => {
      sinon.stub(memoryCache, 'set').rejects(new Error('Connection closed'));
      const result = await bcryptCache.compare(token, tokenHash);
      result.should.be.true;
    });

    it('should not verify a key that is not in the cache', async () => {
      const result = await memoryCache.get('key');
      should.not.exist(result);

      const compare = await bcryptCache.compare('token123', tokenHash);
      compare.should.be.false;
    });

    it('should not verify a key from the cache', async () => {
      await memoryCache.set(tokenHash, tokenSha);
      const result = await bcryptCache.compare('token123', tokenHash);
      result.should.be.false;
    });
  });

  [
    ['With MemoryCache', TA.MemoryCache, { ttl: 1, pruneTimer: null }],
    ['With RedisCache', TA.RedisCache, { ttl: 1, redis: new MockRedis() }]
  ].forEach(([description, Ctor, options]) => {
    describe(description, () => {
      let t = new Ctor(options);

      it('should have required functions', () => {
        t.get.should.be.a('function');
        t.set.should.be.a('function');
        t.del.should.be.a('function');
      });

      it('should store a key and retrieve it', async () => {
        const result = await t.set(tokenHash, token);
        result.should.be.true;
        const get = await t.get(tokenHash);
        get.should.be.a('string');
      })

      it('should not get a non-existant key', async () => {
        const result = await t.get('otherkey');
        should.not.exist(result);
      });

      it('should remove a key', async () => {
        await t.set('key', token);
        const result = await t.del('key')
        result.should.be.true;

        const get = await t.get('key');
        should.not.exist(get);
      });

      it('should not remove a non-existant key', async () => {
        const result = await t.del('otherkey');
        result.should.be.false;
      });
    });
  });

  describe('expiration', () => {
    describe('with RedisCache', () => {
      // Use timekeeper here because `fakeredis` uses setTimeout and the promises
      // will hang because the timers will never fire.
      let clock;
      let t;

      before(() => { clock = require('timekeeper'); });
      beforeEach(() => {
        t = new TA.RedisCache({ redis: new MockRedis(), ttl: 1 });
      });
      after(() => { clock.reset(); });

      it('should prune expiring cache keys', async () => {
        await t.set('key', token)
        clock.travel(Date.now() + 2000);
        const result = await t.get('key');
        should.not.exist(result);
      });

      it('should reset expiration on get', async () => {
        await t.set('key', token)
        clock.travel(Date.now() + 900);
        let result = await t.get('key');
        should.exist(result);

        clock.travel(Date.now() + 900);
        result = await t.get('key');
        should.exist(result);

        clock.travel(Date.now() + 2000);
        result = await t.get('key');
        should.not.exist(result);
      });
    });

    describe('with MemoryCache', () => {
      let clock;
      let t;

      beforeEach(() => {
        clock = sinon.useFakeTimers();
        t = new TA.MemoryCache({ ttl: 1, pruneTimer: 5 });
      });
      after(() => { clock.reset(); });

      it('should prune expiring cache keys', async () => {
        sinon.spy(t, 'prune');
        await t.set('key', token)
        console.log(t.pruneInterval);
        clock.tick(10000);
        // Make sure the value was pruned before the get
        t.prune.should.have.been.called;
        const result = t.get('key');
        should.not.exist(result);
      });

      it('should reset expiration on get', async () => {
        sinon.spy(t, 'prune');

        await t.set('key', tokenSha);
        let result = await t.get('key');
        result.should.equal(tokenSha);

        // Hasn't expired yet
        clock.tick(900);
        result = t.get('key');
        result.should.equal(tokenSha);

        // The expiration should have been reset
        clock.tick(900);
        result = await t.get('key')
        result.should.equal(tokenSha);

        t.prune.should.not.have.been.called;
        // Now we let it expire
        clock.tick(5000);
        result = await t.get('key');
        should.not.exist(result);

        t.prune.should.have.been.called;
      });
    });
  });
});
