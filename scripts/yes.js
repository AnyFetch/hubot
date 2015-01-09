'use strict';

var EventEmitter = require('events').EventEmitter;
var event = new EventEmitter();

module.exports = function initYes(robot) {
  robot.hear(/^\s*y(es)?\s*$/i, function(msg) {
    event.emit('yes', msg);
  });

  robot.respond(/\s*y(es)?\s*$/i, function(msg) {
    event.emit('yes', msg);
  });

  robot.hear(/^\s*n(o)?\s*$/i, function(msg) {
    event.emit('no', msg);
  });

  robot.respond(/\s*n(o)?\s*$/i, function(msg) {
    event.emit('no', msg);
  });
};

module.exports.event = event;
