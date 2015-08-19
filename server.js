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
opt = require('node-getopt').create([
    ['p' , 'port=PORT'           , 'http server port; default=8080'],
    ['l' , 'log-level=LOGLEVEL'  , 'log level (debug|info|warn|error); default=info'],
    ['h' , 'help'                , 'display this help'],
])
.bindHelp()
.parseSystem();
if (!opt.options['log-level']) opt.options['log-level']='info';
if (!opt.options.port) opt.options.port=8080;
//console.info(opt);

var lugg = require('lugg');
lugg.init({level: opt.options['log-level']});
var log = lugg('servicebox');

log.debug('DEBUG enabled');
log.info('INFO enabled');

// Module dependencies.
var application_root = __dirname,
    express = require( 'express' ); //Web framework

//Create server
var app = express();

// Configure server
app.set('case sensitive routing', true);
app.configure( function() {
    //parses request body and populates request.body
    app.use( express.bodyParser() );

    //checks request.body for HTTP method overrides
    app.use( express.methodOverride() );

    //perform route lookup based on url and HTTP method
    app.use( app.router );

    //Show all errors in development
    app.use( express.errorHandler({ dumpExceptions: true, showStack: true }));
});

var echo = function(req, res) {
    lugg('echo').info('echoing %s', req.params.txt);
    res.send(req.params.txt)
}

var delayedEcho = function(req, res) {
    var delay = req.params.delay;
    var log = lugg('delayedecho');
    log.info('will echo in %sms: %s', delay, req.params.txt);
    setTimeout(function(req, res) { // see https://github.com/jmar777/suspend for a promise-based approach
        log.info('echo after %sms: %s', delay, req.params.txt);
        res.send(req.params.txt);
    }, delay, req, res);
};

var intensiveEcho = function(req, res) {
    var log = lugg('intensiveEcho');
    log.info('about to intensiveEcho: %s', req.params.txt);
    for (i = 100000000 ; i > 0 ; i--) {
        Math.atan(Math.sqrt(Math.pow(i, 10)));
    }
    log.info('intensiveEcho: %s', req.params.txt);
    res.send(req.params.txt)
}

var env_vars = function(req, res) {
    res.send(process.env);
}

var env_var = function(req, res) {
    var json = {};
    json[req.params.name] = process.env[req.params.name];
    res.send(json);
}

var os = require("os");
var env_hostname = function(req, res) {
    res.send(os.hostname());
}

var baseurl = '/api/v2';
app.get(baseurl+'/echo/:txt', echo);
app.get(baseurl+'/echooo/:txt/:delay', delayedEcho);
app.get(baseurl+'/ECHO/:txt', intensiveEcho);
app.get(baseurl+'/env/vars', env_vars)
app.get(baseurl+'/env/vars/:name', env_var)
app.get(baseurl+'/env/hostname', env_hostname)

//Start server
var port = opt.options.port;
app.listen( port, function() {
    log.warn('Express server listening on port %d in %s mode', port, app.settings.env);
});