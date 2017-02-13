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

module.exports = {
  create: function create(opts) {
    return new DBProcessCLIWrapper(opts);
  }
};

function DBProcessCLIWrapper(opts) {
  this._marker = opts.marker,
  this._fn = opts.fn;
  this._opts = opts.opts || [];
  this._ok_exit_codes = opts.okcodes || [0];
  this._tti = opts.tti || 20000;
};

DBProcessCLIWrapper.prototype.constructor = DBProcessCLIWrapper;

/**
 * Starts process.
 * Events:
 * - .on('up', function()): process started and stdout contained the marker string; emitted once
 * - .on('exit', function(code)): process exited with status code 'code'; emitted once
 * - .on('error', function(err)): error; can be emitted several times
 * @return this to allow chaining event listening
 */
DBProcessCLIWrapper.prototype.start = function start() {
  var _this = this; // use _this as this will get lost on emitter callback sections
  if (_this._child)  throw new Error('process is already running');

  _this._timeout = timers.setTimeout(function() {
    _this.stop();
    _this.emit('error', new Error('timeout on process startup'), _this.stdout, _this.stderr);
  }, _this._tti);

  _this._child = spawn(_this._fn, _this._opts);

  _this.stdout = "";
  _this._child.stdout.on('data', function(chunk) {
    var str = chunk.toString();
    _this.stdout = _this.stdout + str;
    if (str.indexOf(_this._marker) > -1) {
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
    if (_this._ok_exit_codes.indexOf(code) < 0) {
      _this.emit('error', new Error('unexpected exit code: ' + code));
    }
    _this.emit('exit', code, _this.stdout, _this.stderr);
    _this._child = null;
    _this.stdout = "";
    _this.stderr = "";

  });

  return _this;
};

DBProcessCLIWrapper.prototype.stop = function stop() {
  var _this = this; // use _this as this will get lost on emitter callback sections
  if (_this._timeout) {
    timers.clearTimeout(_this._timeout);
    _this._timeout = null;
  }
  if (_this._child) {
    _this._child.kill('SIGHUP');
    _this._child = null;
  } else {
    //process is already stopped
  }
  return _this;
};

DBProcessCLIWrapper.prototype.__proto__ = events.EventEmitter.prototype;
