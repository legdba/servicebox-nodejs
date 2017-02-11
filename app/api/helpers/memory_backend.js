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

module.exports = {
  create: function create(jsoncfg) {
    return new MemoryBackend();
  }
};

function MemoryBackend() {};
MemoryBackend.prototype.constructor = MemoryBackend;

MemoryBackend.prototype.bind = function init(callback) {
  if (callback && typeof callback !== 'function') throw new Error('invalid callback');
  this.counters = {};
  if (callback) return callback(null);
  return this;
};

MemoryBackend.prototype.addAndGet = function addAndGet(id, number, callback) {
  if (typeof callback !== 'function') throw new Error('invalid callback');
  if (this.hasOwnProperty('counters')) {
    if (this.counters[id]) { this.counters[id] += number; }
    else { this.counters[id] = number; }
    return callback(undefined, this.counters[id]);
  } else {
    // The following failure is totally artificial (counters could be initialized in the constructor)
    // But intended to simulate the behavior of a real backend class (which requires a call to bind()).
    callback(new Error('MemoryBackend is not properly initialized. Have you called MemoryBackend.bind()?'))
  }
};
