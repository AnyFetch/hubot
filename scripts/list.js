'use strict';

var config = require('../config');

module.exports = function initList(robot) {
  robot.respond(/list( of apps)?\s*$/i, function(msg) {
    msg.send(Object.keys(config.apps).join('\n'));
  });
};
