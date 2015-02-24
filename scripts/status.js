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
  return this.client.get("repos/" + this.name + "/compare/" + diff, function(err, s, b, h) {
    if (err) {
      return cb(err);
    }

    return cb(null, b.commits);
  });
};

var config = require('../config');
config.apps = {};

var client = github.client(config.githubToken);

function initApps() {
  console.log("Start of init apps");
  var ghorg = client.org('Anyfetch');

  ghorg.repos({
    page: 1,
    per_page: 150
  }, function(err, repos) {
    async.eachLimit(repos, 10, function(repo, cb) {
      var ghrepo = client.repo(ghorg.name + '/' + repo.name);

      ghrepo.tags(function(err, tags) {
        tags = tags.map(function(tag) {
          return tag.name;
        });

        if(tags.indexOf('staging') !== -1) {
          config.apps[repo.name.split(/\.|-/)[0]] = ghrepo.name;
        }

        cb();
      });
    }, function(err) {
      if(err) {
        throw err;
      }

      console.log("End of init apps");
    });
  });
}

initApps();

function generateMessage(name, diff, commits) {
  var messageRepo = '';

  messageRepo += name + ' ' + commits.length + ' commits behind ( https://github.com/' + name + '/compare/' + diff + ' )' + "\n";

  commits.forEach(function(commit) {
    messageRepo +=  "\t" + commit.sha.slice(0, 7) + ": " + commit.commit.message.split('\n')[0] + " (" + commit.author.login + ")\n";
  });

  return messageRepo;
}

function sendStatusFor(env, msg, cb) {
  var diff = env === 'staging' ? 'staging...master' : 'production...staging';

  var message = '';
  var messageRepos = [];

  var commitsCount = 0;

  message += "Comparing " + diff + " ";

  async.eachLimit(Object.keys(config.apps), 10, function(name, cb) {
    var ghrepo = client.repo(config.apps[name]);

    ghrepo.compare(diff, function(err, commits) {
      if(err) {
        console.warn(ghrepo.name, err);
        return cb(new Error(ghrepo.name + ": " + err.toString()));
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
      return async.eachSeries(['staging', 'production'], function(env, cb) {
        sendStatusFor(env, msg, cb);
      }, function() {});
    }

    sendStatusFor(env, msg, function() {});
  });

  robot.respond(/status of (.+)\s*$/i, function(msg) {
    var app = msg.match[1].trim().toLowerCase();

    if(!config.apps[app]) {
      return msg.send("Unknown app `" + app + "`");
    }

    var ghrepo = client.repo(config.apps[app]);
    var messages = {};

    async.eachSeries(['staging...master', 'production...staging'], function(diff, cb) {
      ghrepo.compare(diff, function(err, commits) {
        if(err) {
          console.warn(ghrepo.name, err);
          return cb(new Error(ghrepo.name + ": " + err.toString()));
        }

        if(commits.length === 0) {
          messages[diff] = "Everything up-to-date\n";
          return cb();
        }

        messages[diff] = generateMessage(ghrepo.name, diff, commits);
        cb();
      });
    }, function(err) {
      if(err) {
        return msg.send(err.toString());
      }

      var message = '';

      Object.keys(messages).sort().forEach(function(diff) {
        message += "Comparing " + diff;
        message += "\n" + messages[diff] + "\n";
      });

      msg.send(message);
    });
  });
};
