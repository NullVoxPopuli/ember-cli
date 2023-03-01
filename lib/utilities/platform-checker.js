'use strict';

const semver = require('semver');
const logger = require('heimdalljs-logger')('ember-cli:platform-checker:');
const loadConfig = require('./load-config');

const nodeVersions = new Set();

const testedEngines = '18';

nodeVersions.add('18')

let supportedEngines = loadConfig('package.json').engines.node;

module.exports = class PlatformChecker {
  constructor(version) {
    this.version = version;
    this.isValid = this.checkIsValid();
    this.isTested = this.checkIsTested();
    this.isDeprecated = this.checkIsDeprecated();

    logger.info('%o', {
      version: this.version,
      isValid: this.isValid,
      isTested: this.isTested,
      isDeprecated: this.isDeprecated,
    });
  }

  checkIsValid(range) {
    range = range || supportedEngines;
    return semver.satisfies(this.version, range) || semver.gtr(this.version, range);
  }

  checkIsDeprecated(range) {
    return !this.checkIsValid(range);
  }

  checkIsTested(range) {
    range = range || testedEngines;
    return semver.satisfies(this.version, range);
  }
};
