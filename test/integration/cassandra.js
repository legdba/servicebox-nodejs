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
var CassendraBackend = require('../../app/api/helpers/cassandra_backend');

module.exports = function(fn) {
  return new CassandraCLIWrapper(fn);
};

function CassandraCLIWrapper(fn) {
  this._fn = fn;
  this._tti = 20000;
};

CassandraCLIWrapper.prototype.constructor = CassandraCLIWrapper;

CassandraCLIWrapper.prototype.getReady = function getReady(callback) {
  if(typeof callback !== 'function') throw new Error('invalid callback');
  var _this = this;
  _this.startAndInit()
    .once('error', function(err) {
      cassandra.stop();
      if (callback) callback(err);
      callback = null; // ensure a single callback
      return;
    })
    .once('exit', function(code, stdout, stderr) {
      if (code !== 0 && code !== 129 && code !== 130) {
        console.error(stdout + stderr);
        if (callback) callback(new Error('cassandra terminated with unexpected code: ' + code));
        callback = null; // ensure a single callback
        return;
      }

    })
    .once('ready', function() {
      if (callback) callback(null);
      callback = null; // ensure a single callback
      return;
    });
};

/**
 * Starts cassandra server and re-provision keyspace and table.
 * Pre-existing data will be lost.
 * The following events can be listened:
 * - .on('up', function()): cassandra is up and running; emitted once
 * - .on('ready', function()): cassandra is up and running and it's keyspace has been provisionned; emitted once
 * - .on('exit', function(code)): cassandra exited with status code 'code'; emitted once
 * - .on('error', function(err)): error; can be emitted several times
 * @return this to allow chaining event listening
 */
CassandraCLIWrapper.prototype.startAndInit = function startAndInit() {
  var _this = this; // use _this as this will get lost on emitter callback sections
  if (_this._child)  throw new Error('Cassandra is already running');

  _this.start()
  .once('up', function() {
    var be = CassendraBackend.create({contactPoints: ['localhost:9042']});
    be.connect(function(err) {
      if (err) return _this.emit('error', err);
      be.dropAndCreateKeyspace(function(err) {
        if (err) return _this.emit('error', err);
        _this.emit('ready');
      });
    });
  });
  return _this;
};

/**
 * Start cassandra without provisionning key space and table
 * @see startAndInit
 */
CassandraCLIWrapper.prototype.start = function start() {
  var _this = this; // use _this as this will get lost on emitter callback sections
  if (_this._child)  throw new Error('Cassandra is already running');

  _this._timeout = timers.setTimeout(function() {
    _this.stop();
    _this.emit('error', new Error('timeout on cassandra startup'));
  }, _this._tti);

  _this._child = spawn(_this._fn, ['-f']);

  _this.stdout = "";
  _this._child.stdout.on('data', function(chunk) {
    var str = chunk.toString();
    _this.stdout = _this.stdout + str;
    if (str.indexOf('Not starting RPC server as requested. Use JMX') > -1) {
      if (_this._timeout) {
        timers.clearTimeout(_this._timeout);
        _this._timeout = null;
      }
      _this.emit('up');
    }
  });

  _this.stderr = "";
  _this._child.stderr.on('data', function(chunk) {
    _this.stderr = _this.stderr + chunk.toString();
  });

  _this._child.once('exit', function(code) {
    if (_this._timeout) {
      timers.clearTimeout(_this._timeout);
      _this._timeout = null;
    }
    _this.emit('exit', code, _this.stdout, _this.stderr);
    _this._child = null;
    _this.stdout = "";
    _this.stderr = "";
  });

  return _this;
};

CassandraCLIWrapper.prototype.stop = function stop() {
  var _this = this; // use _this as this will get lost on emitter callback sections
  if (_this._timeout) {
    timers.clearTimeout(_this._timeout);
    _this._timeout = null;
  }
  if (_this._child) {
    _this._child.kill('SIGHUP');
    _this._child = null;
  } else {
    //Cassandra is already stopped
  }
  return _this;
};

CassandraCLIWrapper.prototype.__proto__ = events.EventEmitter.prototype;
