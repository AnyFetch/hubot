'use strict';

module.exports = function initYes(robot) {
  robot.hear(/^y(es)?$/, function(msg) {
    robot.emit('yes', msg);
  });

  robot.hear(/^n(o)?$/, function(msg) {
    robot.emit('no', msg);
  });
};
