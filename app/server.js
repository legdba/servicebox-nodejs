#!/usr/bin/env node
/**
 ##############################################################
 # Licensed to the Apache Software Foundation (ASF) under one
 # or more contributor license agreements.  See the NOTICE file
 # distributed with this work for additional information
 # regarding copyright ownership.  The ASF licenses this file
 # to you under the Apache License, Version 2.0 (the
 # "License"); you may not use this file except in compliance
 # with the License.  You may obtain a copy of the License at
 #
 #   http://www.apache.org/licenses/LICENSE-2.0
 #
 # Unless required by applicable law or agreed to in writing,
 # software distributed under the License is distributed on an
 # "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 # KIND, either express or implied.  See the License for the
 # specific language governing permissions and limitations
 # under the License.
 ##############################################################
 */

'use strict';

var express = require('express');
var lugg = require('lugg');
var app = express();
var log;
module.exports = app;

/**
 * Initialize the server by reading config,
 * configuring express, adding swagger, and
 * binding attached resources (backend).
 * @param <Object> cfg node-config object
 * @param <Function> callback(err) to notify success/failure
 */
var initServer = function initServer(cfg, callback) {
  if (typeof callback != 'function') throw new Error('invalid callback');
  var config = cfg;
  var backendType = config.get('backend.type');
  var backendOpts = config.get('backend.options');

  log.debug('init backend...');
  var backend_factory = require('./backend_factory');
  if (backendOpts) {
    backendOpts = JSON.parse(backendOpts);
  }
  backend_factory.create(backendType, backendOpts, function init_backend_callback(err, backend) {
    if (err) return callback("failed to init backend: " + err);

    // Ensure the backend instance will be in the context of all requests
    app.use(function(req, res, next){
      req.locals = {
        backend: backend
      };
      next();
    });

    // Init swagger and express
    log.debug('init swagger-express...');
    var SwaggerExpress = require('swagger-express-mw');
    var express_config = {
      appRoot: __dirname // required config
    };
    SwaggerExpress.create(express_config, function init_swagger_callback(err, swaggerExpress) {
      if (err) return callback("failed to init swagger: " + err);

      // install middleware
      swaggerExpress.register(app);

      callback(null);
    });
  });
};

/**
 * Get the config from Node config,
 * overriten by env varaibles,
 * overriten by CLI arguments
 * @return config
 */
var getConfig = function getConfig() {
  // Read CLI args
  var CRLS="\n              ";
  var opt = require('node-getopt').create([
    ['p' , 'port=PORT'       , 'http server port; default=8080'],
    ['l' , 'log-level=LOGLEVEL'  , 'log level (debug|info|warn|error); default=info'],
    ['b' , 'be-type=TYPE'    , 'backend type (memory|cassandra|redis-cluster|redis-sentinel|dynamodb); default=memory'+CRLS+'  memory:'+CRLS+'  Use local memory as a backend; application is then statefull and'+CRLS+'  cannot be used to test 12-factor-app type of dpeloyemnt.'+CRLS+'  cassandra'+CRLS+'  use a cassandra cluster as a backed, providing real state-less processing and 12-factor-app deployment'],
    ['o' , 'be-opts=OPTS'    , 'backend connection options; depends on type.'+CRLS+'  memory:'+CRLS+'  ignore any --be-opts value.'+CRLS+'  cassandra:'+CRLS+'  contactPoints string as per https://github.com/datastax/java-driver;'+CRLS+'  example: --be-opts \'"{contactPoints":["46.101.16.49","178.62.108.56"]}\''],
    ['h' , 'help'        , 'display this help'],
  ])
  .bindHelp()
  .parseSystem();

  // Get Node config overriten by env variables
  var config = require('config');

  // Override with CLI arguments:
  if (opt.options['log-level']) config.log.level       = opt.options['log-level'];
  if (opt.options.port)         config.http.port       = opt.options.port;
  if (opt.options['be-type'])   config.backend.type    = opt.options['be-type'];
  if (opt.options['be-opts'])   config.backend.options = opt.options['be-opts'];

  return config;
}

/**
 * Init logs
 */
var initLogs = function initLogs(config) {
  var loglevel = config.get('log.level');
  lugg.init({level: loglevel});
  log = lugg('servicebox');
  log.debug('DEBUG enabled');
  log.info('INFO enabled');
}

/**
 * Bind express app to HTTP port to server requests.
 */
var bindHttp = function bindHttp(config, callback) {
  if (typeof callback != 'function') throw new Error('invalid callback');
  var port = config.get('http.port');
  log.debug('binding port %d...', port);
  app.listen(port, function app_listen_callback(err) {
    if (err) return callback(err);
    log.warn('server listening on port %d in %s mode', port, app.settings.env);
    callback(null);
  });
}

/**
 * MAIN
 */
if(require.main === module) {

  // Ensure async exception in callbacks get cautch and properly logged
  var d = require('domain').create();
  d.on('error', function(err) {
    if (log) log.error(err.stack);
    else console.error(err.stack);
    process.exit(2);
  });
  // Run the server
  d.run(function run() {
    var config = getConfig();
    initLogs(config);
    initServer(config, function init(err) {
      if(err) {
        log.error(err);
        process.exit(1);
      }
      bindHttp(config, function bind(err) {
        if (err) {
          log.error(err);
          process.exit(1);
        }
        return;
      });
    });
  });
}

/**
 * FOR TESTING PURPOSE
 * This section is the one called when require('server') is
 * called by the test framework. The following section init
 * config from node config and env only, init everything
 * but does not bind the HTTP port as this is uncessary.
 */
else {
  var config = require('config');
  initLogs(config);
  initServer(config, function(err) {
    if (err) throw new Error(err);
  });
}
