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

module.exports = function initStatus(robot) {
  robot.respond(/status( on (staging|production))?/i, function(msg) {
    var env = msg.match[2] || 'staging';
    var diff = env === 'staging' ? 'staging...master' : 'production...staging';

    var message = '';
    var messageRepos = [];

    var nbDiffs = 0;

    message += "Comparing " + diff + " on " + env + "\n";

    async.eachLimit(Object.keys(config.apps), 10, function(name, cb) {
      var ghrepo = client.repo(config.apps[name]);

      ghrepo.compare(diff, function(err, commits) {
        if(err) {
          return cb(err);
        }

        if(commits.length === 0) {
          return cb();
        }

        var messageRepo = '';

        nbDiffs += 1;
        messageRepo += "\n" + ghrepo.name + ' ( https://github.com/' + ghrepo.name + '/compare/' + diff + ' )' + "\n";

        commits.forEach(function(commit) {
          messageRepo +=  "\t" + commit.sha.slice(0, 7) + ": " + commit.commit.message.split('\n')[0] + "\n";
        });

        messageRepos[name] = messageRepo;

        cb();
      });
    }, function(err) {
      if(err) {
        return msg.send(err.toString());
      }

      if(nbDiffs === 0) {
        message += "Everything up-to-date\n";
      }

      Object.keys(messageRepos).sort().forEach(function(name) {
        message += messageRepos[name];
      });

      msg.send(message);
    });

  });
};
