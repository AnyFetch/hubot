'use strict';

var request = require('supertest');

var config = require('../config');

function deploy(msg, apps, env) {
  request(config.opsUrl)
    .post('/deploy')
    .send({
      end: env,
      app: apps.join(' '),
      user: msg.envelope.user.name,
      password: config.password
    })
    .end(function(err, res) {
      if(err || res.body !== 'Deploying') {
        msg.send(err ? err.toString() : res.body);
      }

      msg.send("Deploying " + apps.join(', ') + ' on ' + env);
    });
}

module.exports = function initDeploy(robot) {
  robot.respond(/deploy (.+?)(?: (?:on (staging|production))?$|$)/i, function(msg) {
    var apps = msg.match[1].split(/,| /);
    var env = msg.match[2] || 'staging';

    for(var i = 0, c = apps.length; i < c; i += 1) {
      if(!apps[i]) {
        apps.splice(i, 1);

        c -= 1;
        i -= 1;
      }
    }

    deploy(msg, apps, env);
  });
};
