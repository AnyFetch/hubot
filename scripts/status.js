'use strict';

var async = require('async');
var github = require('octonode');

var config = require('../config');

var client = github.client(config.githubToken);

module.exports = function initStatus(robot) {
  robot.respond(/status( on (staging|production))?/i, function(msg) {
    console.log("STATUS");

    var env = msg.match[2] || 'staging';
    var diff = env === 'staging' ? 'staging...master' : 'production...staging';

    var message = '';
    var nbDiffs = 0;

    message += "Comparing " + diff + " on " + env + "\n";

    async.eachSeries(Object.keys(config.apps), function(name, cb) {
      var ghrepo = client.repo(config.apps[name]);

      ghrepo.commits('production...staging', function(err, commits) {
        if(err) {
          return cb(err);
        }

        if(commits.length === 0) {
          return cb();
        }

        nbDiffs += 1;
        message += ghrepo.name + '( https://github.com/' + ghrepo.name + '/compare/' + diff + ' )' + "\n";

        commits.forEach(function(commit) {
          message +=  "  " + commit.sha.slice(0, 7) + ": " + commit.commit.message.split('\n')[0] + "\n";
        });

        cb();
      });
    }, function(err) {
      if(err) {
        return msg.send(err.toString());
      }

      if(nbDiffs === 0) {
        message += "Everything up-to-date\n";
      }

      msg.send(message);
    });

  });
};
