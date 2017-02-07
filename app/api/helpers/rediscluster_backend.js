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
var log = lugg('rediscluster-clt');
var Redis = require('ioredis');

var RedisClusterBackend = makeClass.makeClass();
exports.RedisClusterBackend = RedisClusterBackend;

RedisClusterBackend.prototype.constructor = function() {};

/**
 * Connect Redis cluster backend.
 * @param jsoncfg contains the ioredis connection string in the "driver-config"
 * param (could contain other non-ioredis params later on).
 * Example:
 * {
 *   "driver-config":
 *     [
 *       { "host":"1.2.3.4", "port":"6379"},
 *       { "host":"2.3.4.5", "port":"6379"},
 *       { "host":"3.4.5.6", "port":"6379"}
 *     ]
 * }
 * @param callback Executes callback(err) with err set upon failure, with err set to null upon success.
 * The RedisClusterBackend is ready to be used as soon as the calllback has been called with a success.
 */
RedisClusterBackend.prototype.init = function init(jsoncfg, callback) {
    var self = this;
    jsoncfg = jsoncfg || {"drivercfg":[{"host":"localhost","port":"6379"}]};
    var cfg = jsoncfg.drivercfg;

    // NOTE regarding ioredis behavior:
    // By default ioredis will try to connect to the cluster forever, suspending any ongoing request
    // till the cluster is back online. This is annoying since it cause huge delay for the client without
    // any wait to control it.
    // The implementation below is forcing enableOfflineQueue:false. This means that if the cluster is offline
    // any request will fail immediatly without retry which sounds better.
    // TODO: test if this cause errors upon a single master node failure.
    log.debug("Contacting Redis Cluster at " + JSON.stringify(cfg));
    self.cluster = new Redis.Cluster(cfg, {enableOfflineQueue:false});

    var redisInitErrorCallback = function redisInitCallback(err) {
        callback(err);
    };

    self.cluster
    .once('error', redisInitErrorCallback)
    .once('ready', function redisInitReadyCallback(stream) {
        // Remove existing event handler and setup new ones to logs cluster state changes
        // (we don't want the .once('error',...) event handler below to do a callback later on upon error
        //  while we have already setup the backend connection once and did a callback)
        self.cluster.removeListener('error', redisClusterInitErrorCallback);
        self.cluster.on('error', function redisClusterErrorCallback(err) {
            log.warn('redis-cluster error: %s', err);
        }).on('connect', function redisClusterConnectCallback(stream) {
            log.warn('redis-cluster connected: %s', stream);
        }).on('reconnecting', function redisClusterReconnectingCallback() {
            log.warn('redis-cluster reconnecting');
        }).on('end', function redisClusterEndCallback() {
            log.warn('redis-cluster ended');
        }).on('drain', function redisClusterDrainCallback() {
            log.warn('redis-cluster drained');
        }).on('idle', function redisClusterIdleCallback() {
            log.warn('redis-cluster idle: %s');
        });
        // Test cluster
        log.info('testing backend with a sum(\'0\', 0) request...');
        self.addAndGet('0', 0, function incrCallback(err, result) {
            if (err) { callback(err); }
            log.info("counter: " + result);
            log.info('backend test passed');
            callback(null); // cluster is up and running, init() is done
        });
    });
};

/**
 * Add 'number' to counter 'id' and return the new value in callback.
 * @param callback Executes callback(err, new_counter) with err set upon error and with new_counter upon success
 */
RedisClusterBackend.prototype.addAndGet = function addAndGet(id, number, callback) {
    this.cluster.incrby('servicebox:calc:sum:'+id, number, function incrCallback(err, result) {
        if (err) {
            if (callback) { callback(err); }
        } else {
            if (callback) { callback(null, result); }
        }
    });
};
