// Description
//   Get status of apps on Github
//
// Dependencies
//   None
//
// Commands:
//   hubot status of <app> - get status of <app>
//   hubot status on <env> - get status of all apps on <env>

'use strict';

var async = require('async');
var github = require('octonode');

// Monkey patch to implement compare
github.repo.prototype.compare = function(diff, cb) {
  return this.client.get("repos/" + this.name + "/compare/" + diff, function(err, s, b) {
    if(err) {
      return cb(err);
    }

    return cb(null, b.commits);
  });
};

var config = require('../config');
var utils = require('../config/utils');

var client = github.client(config.githubToken);

function generateMessage(name, diff, commits) {
  var messageRepo = '';

  messageRepo += name + ' ' + commits.length + ' commits behind ( https://github.com/' + name + '/compare/' + diff + ' )' + "\n";

  commits.forEach(function(commit) {
    messageRepo += "\t" + commit.sha.slice(0, 7) + ": " + commit.commit.message.split('\n')[0] + " (" + commit.author.login + ")\n";
  });

  return messageRepo;
}

function sendStatusFor(diff, apps, msg, cb) {
  var message = '';
  var messageRepos = [];

  var commitsCount = 0;

  message += "Comparing " + diff + " ";

  async.eachLimit(apps, 10, function(name, cb) {
    var ghrepo = client.repo(name);

    ghrepo.compare(diff, function(err, commits) {
      if(err) {
        if(err.toString().match(/Not Found/)) {
          message += "\n Not in production or staging: nothing to compare\n";
        }
        else {
          console.warn(ghrepo.name, err);
          return cb(new Error(ghrepo.name + ": " + err.toString()));
        }
      }

      if(commits.length === 0) {
        return cb();
      }

      commitsCount += commits.length;

      messageRepos[name] = generateMessage(ghrepo.name, diff, commits);
      cb();
    });
  }, function(err) {
    if(err) {
      return msg.send(err.toString());
    }

    if(commitsCount === 0) {
      message += "\nEverything up-to-date\n";
    }
    else {
      message += commitsCount + " commits behind in " + Object.keys(messageRepos).length + " repos\n";
    }

    Object.keys(messageRepos).sort().forEach(function(name) {
      message += "\n" + messageRepos[name];
    });

    msg.send(message);
    cb();
  });
}

module.exports = function initStatus(robot) {
  robot.respond(/status( on (staging|production|all))?\s*$/i, function(msg) {
    var env = (msg.match[2] || 'all').toLowerCase();

    if(env === 'all') {
      return async.eachSeries(['staging...master', 'production...staging'], function(diff, cb) {
        sendStatusFor(diff, utils.getRepoNames(Object.keys(config.apps)), msg, cb);
      }, function() {});
    }

    sendStatusFor(env === 'staging' ? 'staging...master' : 'production...staging', utils.getRepoNames(Object.keys(config.apps)), msg, function() {});
  });

  robot.respond(/status of (.+)\s*$/i, function(msg) {
    var apps = utils.generateAppsList([msg.match[1].trim().toLowerCase()]);

    if(apps instanceof Error) {
      return msg.send(apps.toString());
    }

    return async.eachSeries(['staging...master', 'production...staging'], function(diff, cb) {
      sendStatusFor(diff, utils.getRepoNames(apps), msg, cb);
    }, function() {});
  });
};
