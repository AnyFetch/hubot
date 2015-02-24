'use strict';

var dotenv = require('dotenv');
dotenv.load();

module.exports = {
  password: process.env.PASSWORD || 'anyfetch',
  opsUrl: process.env.OPS_URL || 'http://anyfetch-ops.herokuapp.com',
  githubToken: process.env.GITHUB_TOKEN,

  aliases: {},
  apps: {}
};
