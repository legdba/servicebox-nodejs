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

var lugg = require('lugg');
var BackendFactory = require('./backend_factory');

/**
 * Init logs.
 * @return log instance
 */
var initLogs = function initLogs(config) {
  var loglevel = config.get('log.level');
  lugg.init({level: loglevel});
  var log = lugg('servicebox');
  log.debug('DEBUG enabled');
  log.info('INFO enabled');
  return log;
}

/**
 * Get the config from Node config, overriten by env varaibles,
 * overriten by CLI arguments. This function is usefull only
 * when starting the Server via command line.
 * @return node-config instance
 */
var getConfig = function getConfig() {
  // Read CLI args
  var CRLS="\n              ";
  var opt = require('node-getopt').create([
    ['p' , 'port=PORT'       , 'http server port; default=8080'],
    ['l' , 'log-level=LOGLEVEL'  , 'log level (debug|info|warn|error); default=info'],
    ['b' , 'be-type=TYPE'    , 'backend type (' + BackendFactory.list().join('|') + '); default=memory'+CRLS+'  memory:'+CRLS+'  Use local memory as a backend; application is then statefull and'+CRLS+'  cannot be used to test 12-factor-app type of dpeloyemnt.'+CRLS+'  cassandra'+CRLS+'  use a cassandra cluster as a backed, providing real state-less processing and 12-factor-app deployment'],
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
 * MAIN
 */
if(require.main === module) {

  // Ensure async exception in callbacks get cautch and properly logged
  var d = require('domain').create();
  d.on('error', function(err) {
    console.error(err.stack, err);
    process.exit(2);
  });

  // Run the server
  d.run(function run() {
    var config = getConfig();
    var log = initLogs(config);

    var Server = require('./server');
    var server = Server.create(config);

    server.initServer(function init(err) {
      if(err) {
        log.error(err, 'server init failed');
        process.exit(1);
      }
      server.bindHttp(function bind(err) {
        if (err) {
          log.error(err, 'server binding failed');
          process.exit(1);
        }
        return;
      });
    });
  });
}
