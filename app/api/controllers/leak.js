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
  leak: leak,
  free: free
};
//var util = require('util');
var lugg = require('lugg');
var log = lugg('leak');

var retainedObjs = [];
var retainedSize = 0;

function leak(req, res) {
    var size = req.swagger.params.size.value;
    if (size <= 0) {
        res.status(422).json({message: '{size} shall be a positive integer'});
        return;
    }
    // Leak references to leak heap
    // (leaking big arrays, strings or buffers would leak the RSS, not the heap, and would not cause an OOM error
    // Leak random bytes to workaround various OS and NodeJS tricks with paging and memory compression
    for (var i = size/2; i > 0; i--) { retainedObjs.push(1); }
    retainedSize += size;
    log.info('leaked %d bytes of heap for a total of %d bytes with %d buffer objects; process size is ', size, retainedSize, retainedObjs.length, process.memoryUsage());
    res.json({retainedHeap: retainedSize});
}

function free(req, res) {
    retainedObjs = [];
    retainedSize = 0;
    log.info('released leaked heap');
    res.json({retainedHeap: retainedSize});
}
