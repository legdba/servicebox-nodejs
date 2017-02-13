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

const events = require('events');
const timers = require('timers');
const spawn = require('child_process').spawn;
const dbproc = require('./dbproc');
var RedisBackend = require('../../app/api/helpers/redissentinel_backend');

module.exports = function(fn) {
  return new RedisCLIWrapper(fn);
};

function RedisCLIWrapper(fn, tti) {
  this._process = dbproc.create({
    marker: 'The server is now ready to accept connections on port 6379',
    fn: fn,
    opts: [],
    okcodes: [0],
    tti: tti || 5000
  });
};

RedisCLIWrapper.prototype.constructor = RedisCLIWrapper;

RedisCLIWrapper.prototype.run = function run(callback) {
  if(typeof callback !== 'function') throw new Error('invalid callback');
  var _this = this;

  _this._process.start()
  .once('up', function() {
    var be = CassendraBackend.create({contactPoints: ['localhost:9042']});
    be.connect(function(err) {
      if (err) {
        if (callback) callback(err);
        callback = null; // ensure a single callback call
        return;
      }
      be.dropAndCreateKeyspace(function(err) {
        if (err) {
          if (callback) callback(err);
          callback = null; // ensure a single callback call
          return;
        }
        if (callback) callback(null);
        callback = null; // ensure a single callback call
        return;
      });
    });
  })
  .once('exit', function(code, stdout, stderr) {
    console.log('process exited: %s', code);
    console.log(stdout);
    console.log(stderr);
    if (callback) callback(null);
    callback = null; // ensure a single callback call
    return;
  })
  .on('error', function(err) {
    if (callback) callback(err);
    callback = null; // ensure a single callback call
    return;
  });
};

RedisCLIWrapper.prototype.stop = function stop() {
  this._process.stop();
};
