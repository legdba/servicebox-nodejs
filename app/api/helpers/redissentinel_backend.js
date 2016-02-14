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

var makeClass = require('./make_class');
var util = require('util');
var lugg = require('lugg');
var log = lugg('redissentinel-clt');
var Redis = require('ioredis');

var RedisSentinelBackend = makeClass.makeClass();
exports.RedisSentinelBackend = RedisSentinelBackend;

RedisSentinelBackend.prototype.constructor = function() {};

/**
 * Connect Redis Sentinel group.
 * @param jsoncfg contains the ioredis connection string in the "driver-config"
 * param (could contain other non-ioredis params later on).
 * Example:
 * {
 *   "driver-config": {
 *     sentinels: [
 *       {host: '104.131.130.202', port:26379},
 *       {host: '104.236.144.145', port:26379},
 *       {host: '104.236.145.222', port:26379},
 *     ],
 *     name: 'mymaster'
 *   };
 * }
 * @param callback Executes callback(err) with err set upon failure, with err set to null upon success.
 * The RedisSentinelBackend is ready to be used as soon as the calllback has been called with a success.
 */
RedisSentinelBackend.prototype.init = function init(jsoncfg, callback) {
    var self = this;
    var cfg = jsoncfg.drivercfg;

    // NOTE regarding ioredis behavior:
    // By default ioredis will try to connect to the group forever, suspending any ongoing request
    // till the group is back online. This is annoying since it cause huge delay for the client without
    // any wait to control it.
    // The implementation below is forcing enableOfflineQueue:false. This means that if the group is offline
    // any request will fail immediatly without retry which sounds better.
    log.info("ioredis connecting to " + JSON.stringify(cfg));
    self.redis = new Redis(cfg, {enableOfflineQueue:false});

    var redisInitErrorCallback = function redisInitCallback(err) {
        callback(err);
    };

    self.redis
    .once('error', redisInitErrorCallback)
    .once('ready', function redisInitReadyCallback(stream) {
        // Remove existing event handler and setup new ones to logs redis state changes
        // (we don't want the .once('error',...) event handler below to do a callback later on upon error
        //  while we have already setup the backend connection once and did a callback)
        self.redis.removeListener('error', redisInitErrorCallback);
        self.redis.on('error', function redisErrorCallback(err) {
            log.warn('redis error: %s', err);
        }).on('connect', function redisConnectCallback(stream) {
            log.warn('redis connected: %s', stream);
        }).on('reconnecting', function redisReconnectingCallback() {
            log.warn('redis reconnecting');
        }).on('end', function redisEndCallback() {
            log.warn('redis ended');
        }).on('drain', function redisDrainCallback() {
            log.warn('redis drained');
        }).on('idle', function redisIdleCallback() {
            log.warn('redis idle: %s');
        });
        // Test Redis
        log.info('testing backend with a sum(\'0\', 0) request...')
        self.addAndGet('0', 0, function incrCallback(err, result) {
            if (err) callback(err);
            log.info("counter: " + result);
            log.info('backend test passed');
            callback(null); // Redis is up and running, init() is done
        });
    });
};

/**
 * Add 'number' to counter 'id' and return the new value in callback.
 * @param callback Executes callback(err, new_counter) with err set upon error and with new_counter upon success
 */
RedisSentinelBackend.prototype.addAndGet = function addAndGet(id, number, callback) {
    this.redis.incrby('servicebox:calc:sum:'+id, number, function incrCallback(err, result) {
        if (err) {
            if (callback) callback(err);
        } else {
            if (callback) callback(null, result);
        }
    });
};
