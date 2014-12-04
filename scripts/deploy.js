'use strict';

var request = require('supertest');

var config = require('../config');
var eventConfirm = require('./yes.js').event;

function deploy(msg, apps, env) {
  request(config.opsUrl)
    .post('/deploy')
    .send({
      env: env,
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

    for(var j = 0; j < apps.length; j += 1) {
      if(!config.apps[apps[i]] && !(apps[i] === 'providers' || apps[i] === 'hydraters' || apps[i] === 'all')) {
        return msg.send("Unknown app `" + apps[i] + "`");
      }
    }

    function callDeploy() {
      deploy(msg, apps, env);
    }

    function yes(msgYes) {
      eventConfirm.removeListener('no', no);
      msgYes.send("Let's go !");
      callDeploy();
    }

    function no(msgNo) {
      eventConfirm.removeListener('yes', yes);
      msgNo.send('Ok ! I cancel the deployment :cry:');
    }

    if(env === 'staging') {
      return callDeploy();
    }

    eventConfirm.once('yes', yes);
    eventConfirm.once('no', no);

    msg.reply('Are you sure ?');
  });
};
