'use strict';

var EventEmitter = require('events').EventEmitter;
var event = new EventEmitter();

module.exports = function initYes(robot) {
  robot.hear(/y(es)?$/, function(msg) {
    event.emit('yes', msg);
  });

  robot.hear(/n(o)?$/, function(msg) {
    event.emit('no', msg);
  });
};

module.exports.event = event;
