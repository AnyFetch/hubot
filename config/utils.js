'use strict';

var async = require('async');
var github = require('octonode');

var config = require('./index');

config.aliases.all = [];
config.aliases.providers = [];
config.aliases.hydraters = [];

var client = github.client(config.githubToken);

module.exports.generateAppsList = function(apps) {
  var newApps = [];

  for(var i = 0, c = apps.length; i < c; i += 1) {
    if(config.aliases[apps[i]]) {
      newApps = newApps.concat(config.aliases[apps[i]]);
      continue;
    }

    if(!config.apps[apps[i]]) {
      return new Error("Unknown app : " + apps[i]);
    }

    newApps.push(apps[i]);
  }

  return newApps;
};

module.exports.getRepoNames = function(apps) {
  var newApps = [];

  apps.forEach(function(app) {
    newApps.push(config.apps[app]);
  });

  return newApps;
};

/*
 *     INIT APPS
 */

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
          var name = repo.name.split(/(-provider)|(-hydrater)|(\.anyfetch\.com)/)[0];

          if(repo.name.indexOf("-provider") !== -1) {
            config.aliases.providers.push(name);
          }
          else if(repo.name.indexOf("-hydrater") !== -1) {
            config.aliases.hydraters.push(name);
          }

          config.aliases.all.push(name);
          config.apps[name] = ghrepo.name;
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
