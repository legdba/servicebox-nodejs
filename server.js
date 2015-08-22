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
var express = require('express');
var app = express();
module.exports = app; // for testing

var start = function(config) {
    // Default config
    var def = {port:8080, loglevel:'warn'};
    config = config || def
    var port = config.port || def.port;
    var loglevel = config.loglevel || def.loglevel;

    // Init logs
    lugg.init({level: loglevel});
    var log = lugg('servicebox');

    log.debug('DEBUG enabled');
    log.info('INFO enabled');
    
    // Ensure async exception in callbacks get cautch and properly logged
    var d = require('domain').create();
    d.on('error', function(err){
        log.error(err)
    });
    
    d.run(function() {
        var SwaggerExpress = require('swagger-express-mw');

        var express_config = {
            appRoot: __dirname // required config
        };

        SwaggerExpress.create(express_config, function(err, swaggerExpress) {
            if (err) { throw err; }

            // install middleware
            swaggerExpress.register(app);

            // start server
            app.listen(port, function() {
                log.warn('server listening on port %d in %s mode', port, app.settings.env)
            });
        });
    });
    return app; // for testing purpose
}
exports.start = start;

if(require.main === module) {
    // Read CLI args
    var opt = require('node-getopt').create([
        ['p' , 'port=PORT'           , 'http server port; default=8080'],
        ['l' , 'log-level=LOGLEVEL'  , 'log level (debug|info|warn|error); default=info'],
        ['h' , 'help'                , 'display this help'],
    ])
    .bindHelp()
    .parseSystem();
    if (!opt.options['log-level']) opt.options['log-level']='info';
    if (!opt.options.port) opt.options.port=8080;
    //console.info(opt);

    start({
        port: opt.options.port,
        loglevel: opt.options['log-level']
    });
} else {
    start({loglevel:'fatal'}); // for testing purpose
}
