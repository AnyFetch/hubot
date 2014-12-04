'use strict';

var async = require('async');
var github = require('octonode');

var config = require('../config');

var client = github.client(config.githubToken);

module.exports = function initDeploy(robot) {
  robot.respond(/status( on (staging|production))?/i, function(msg) {
    var env = msg.match[2] || 'staging';
    var diff = env === 'staging' ? 'staging...master' : 'production...staging';

    var message = '';

    message += "Comparing " + diff + "\n";

    async.eachSeries(Object.keys(config.apps), function(name, cb) {
      var ghrepo = client.repo(config.apps[name]);

      ghrepo.commits('production...staging', function(err, commits) {
        if(err) {
          return cb(err);
        }

        message += ghrepo.name + '( https://github.com/' + ghrepo.name + '/compare/' + diff + ' )';

        commits.forEach(function(commit) {
          message +=  "  " + commit.sha.slice(0, 7) + ": " + commit.commit.message.split('\n')[0];
        });
      });
    }, function(err) {
      if(err) {
        return msg.send(err.toString());
      }

      msg.send(message);
    });

  });
};
