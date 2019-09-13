const chai = require('chai');
global.sinon = require('sinon');
const sinonChai = require('sinon-chai');
global.should = chai.should();
// global.expect = chai.expect;
chai.use(sinonChai);
chai.use(require('chai-as-promised'));
