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
lugg.init({level: 'error'});
var express = require('express');
var app = express();
module.exports = app; // for testing

var build_be = function build_backend(type) {
    switch (type) {
        case 'memory':
            return require('./api/helpers/memory_backend').MemoryBackend();
        case 'cassandra':
            return require('./api/helpers/cassandra_backend').CassandraBackend();
        case 'redis-cluster':
            return require('./api/helpers/rediscluster_backend').RedisClusterBackend();
        default:
            throw new Error("invalid backend type: " + type);
    }
};

var start = function start_server(config) {
    // Default config
    var def = {port:8080, loglevel:'warn', backendType:'memory', backendOpts:{} };
    config = config || def;
    var port = config.port || def.port;
    var loglevel = config.loglevel || def.loglevel;
    var backendType = config.backendType || def.backendType;
    var backendOpts = config.backendOpts || def.backendOpts;

    // Init logs
    lugg.init({level: loglevel});
    var log = lugg('servicebox');

    log.debug('DEBUG enabled');
    log.info('INFO enabled');

    // Ensure async exception in callbacks get cautch and properly logged
    var d = require('domain').create();
    d.on('error', function(err) {
        log.error(err, "unhandled exception");
        process.exit(2);
    });

    d.run(function() {
        var backend = build_be(backendType);

        backend.init(backendOpts, function init_backend_callback(err) {
            if (err) {
                log.error(err, "failed to init backend: %s", err);
                process.exit(2);
            } else {
                // Ensure the backend instance will be in the context of all requests
                app.use(function(req, res, next){
                    req.locals = {
                        backend: backend
                    };
                    next();
                });

                // Init swagger and express
                var SwaggerExpress = require('swagger-express-mw');

                var express_config = {
                    appRoot: __dirname // required config
                };

                SwaggerExpress.create(express_config, function init_swagger_callback(err, swaggerExpress) {
                    if (err) {
                        log.error(err, "failed to init swagger");
                        process.exit(2);
                    } else {
                        // install middleware
                        swaggerExpress.register(app);

                        // start server
                        app.listen(port, function app_listen_callback() {
                            log.warn('server listening on port %d in %s mode', port, app.settings.env);
                        });
                    }
                });
            }
        });
    });
    return app; // for testing purpose
};
exports.start = start;

if(require.main === module) {
    // Read CLI args
    var CRLS="\n                            ";
    var opt = require('node-getopt').create([
        ['p' , 'port=PORT'           , 'http server port; default=8080'],
        ['l' , 'log-level=LOGLEVEL'  , 'log level (debug|info|warn|error); default=info'],
        ['b' , 'be-type=TYPE'        , 'backend type (memory|cassandra); default=memory'+CRLS+'  memory:'+CRLS+'    Use local memory as a backend; application is then statefull and'+CRLS+'    cannot be used to test 12-factor-app type of dpeloyemnt.'+CRLS+'  cassandra'+CRLS+'    use a cassandra cluster as a backed, providing real state-less processing and 12-factor-app deployment'],
        ['o' , 'be-opts=OPTS'        , 'backend connection options; depends on type.'+CRLS+'  memory:'+CRLS+'    ignore any --be-opts value.'+CRLS+'  cassandra:'+CRLS+'    contactPoints string as per https://github.com/datastax/java-driver;'+CRLS+'    example: --be-opts \'"{contactPoints":["46.101.16.49","178.62.108.56"]}\''],
        ['h' , 'help'                , 'display this help'],
    ])
    .bindHelp()
    .parseSystem();
    if (!opt.options['log-level']) { opt.options['log-level']='info'; }
    if (!opt.options.port) { opt.options.port=8080; }
    if (!opt.options['be-type']) { opt.options['be-type']='memory'; }
    if (opt.options['be-type'] === 'cassandra' && opt.options['be-opts'] === undefined) { opt.options['be-opts'] = '{"contactPoints":["localhost:9042"]}'; }
    if (opt.options['be-type'] === 'memory') { opt.options['be-opts'] = "{}"; }
    //console.info(opt);

    start({
        port: opt.options.port,
        loglevel: opt.options['log-level'],
        backendType: opt.options['be-type'],
        backendOpts: JSON.parse(opt.options['be-opts']),
    });
} else {
    start({loglevel:'fatal'}); // for testing purpose
}
