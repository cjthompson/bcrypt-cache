/* eslint-disable global-require, import/no-unresolved */
module.exports = (() => {
  let bcrypt;
  try {
    bcrypt = require('bcrypt');
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') { throw e; }
    bcrypt = require('bcryptjs');
  }

  return bcrypt;
})();
