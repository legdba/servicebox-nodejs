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
  var loglevel = config.loglevel;
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
  var argv = require('yargs')
  .usage('Usage: $0 [option..]')
  .example('$0 --loglevel=debug --betype=memory', 'starts in debug with an in-memory backend')
  .example('')
  .example('$0 --betype=cassandra --beopts=\'{"contactPoints": ["localhost:9042"]}\'', 'starts with a cassandra backend configured with a single local node on port 9042')
  .showHelpOnFail(true, 'Specify --help for available options')
  .help('h')
  .alias('h', 'help')
  .option('port', {
    alias: ['p'],
    describe: 'http port for the server to bind to; can also be set with env variable SB_PORT',
    type: 'number',
    default: 8080
  })
  .option('loglevel', {
    alias: ['l'],
    describe: 'log level; can also be set with env variable SB_LOGLEVEL',
    type: 'string',
    choices: ['debug', 'info', 'warn', 'error'],
    default: 'warn'
  })
  .option('betype', {
    alias: ['b'],
    describe: 'backend type, for statefull operations; can also be set with env variable SB_BETYPE',
    type: 'string',
    choices: BackendFactory.list(),
    default: BackendFactory.list()[0]
  })
  .option('beopts', {
    alias: ['o'],
    describe: 'json configuration string for the selected backend; can also be set with env variable SB_BEOPTS',
  })
  .coerce({
    'beopts': JSON.parse
  })
  .env('SB')
  .strict()
  .argv;

  return argv;
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
    log.debug('config: %j', config);

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
