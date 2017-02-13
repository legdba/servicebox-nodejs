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

var util = require('util');
var lugg = require('lugg');
var cassandra = require('cassandra-driver');
var log;

module.exports = {
  create: function create(jsoncfg) {
    if (!log) log = lugg('cassandra-clt'); // init as late as possible to avoid a 'missing lugg.init() error'
    return new CassandraBackend(jsoncfg);
  }
};

/**
 * Create a CassandraBackend.
 * bind() or connect() must be called to connect to Cassandra.
 * @param <json | Config> connection configuration; defaults to localhost:9042
 * @return <CassandraBackend> instance
 */
function CassandraBackend(jsoncfg) {
  this._config = buildConfig(jsoncfg);
};
CassandraBackend.prototype.constructor = CassandraBackend;

/**
 * Connect Cassandra backend, check the connection and check the ability to increment counters.
 * @param <Function> callback Executes callback(err) with err set upon failure, with err set to null upon success.
 * @return <CassandraBackend> self to allow chaining
 */
CassandraBackend.prototype.bind = function bind(callback) {
  if (typeof callback !== 'function') throw new Error('invalid callback');
  var _this = this;
  this.connect(function(err) {
    if (err) return callback(err);
    _this.healthcheck(function(err) {
      if (err) return _this.disconnect();
      return callback(null);
    });
  });
  return _this;
};

/**
 * Connect to Cassandra backend. No L7 verification.
 */
CassandraBackend.prototype.connect = function connect(callback) {
    if (typeof callback !== 'function') throw new Error('invalid callback');
    var _this = this;

    log.debug('contacting Cassandra cluster at %j', _this._config);
    _this._client = new cassandra.Client(_this._config);
    _this._client.connect(function connectCassandraCallback(err) {
      if (err) {
        log.debug('Cassandra connection failed: %s', err);
        return callback(err);
      }
      log.debug('Cassandra connection succeeded');
      return callback(null);
    });
    return _this;
};

/**
 * Disconnect from cassandra.
 */
CassandraBackend.prototype.disconnect = function disconnect(callback) {
  if (typeof callback != 'function') throw new Error('invalid callback');
  this.client.shutdown();
  _this._client = null;
  callback(null);
  return this;
}

/**
 * L7 health-check: add 0 to counter 0.
 * @param <Function> callback(err)
 */
CassandraBackend.prototype.healthcheck = function healthcheck(callback) {
  if (typeof callback != 'function') throw new Error('invalid callback');
  var _this = this;
  if (!_this._client) throw new Error('not connected');
  log.debug('health-checking Cassandra...');
  _this.addAndGet('healthcheck', 0, function checkCassandraCallback(err, new_counter) {
    if(err) {
      log.warn("Cassandra check failed; maybe Keyspace does not exist. If so, run the following command: CREATE KEYSPACE calc WITH REPLICATION = { 'class' : 'SimpleStrategy', 'replication_factor' : 3 } AND DURABLE_WRITES = false ; CREATE TABLE calc.sum (id varchar, sum counter, PRIMARY KEY(id)) ;");
      return callback(err);
    }
    log.debug("Cassandra check succeeded");
    return callback(null);
  });
  return _this;
};

CassandraBackend.prototype.dropAndCreateKeyspace = function dropAndCreateKeyspace(callback) {
  if (typeof callback != 'function') throw new Error('invalid callback');
  var _this = this;
  if (!_this._client) throw new Error('not connected');
  var q = util.format("DROP KEYSPACE IF EXISTS calc");
  log.debug('CQL query:', q);
  _this._client.execute(q, function (err, results) {
      if (err) return callback(err);
      var q = util.format("CREATE KEYSPACE calc WITH REPLICATION = { 'class' : 'SimpleStrategy', 'replication_factor' : 3 } AND DURABLE_WRITES = false");
      log.debug('CQL query:', q);
      _this._client.execute(q, function (err, results) {
        if (err) return callback(err);
        var q = util.format("CREATE TABLE calc.sum (id varchar, sum counter, PRIMARY KEY(id))");
        log.debug('CQL query:', q);
        _this._client.execute(q, function execute(err, results) {
          log.debug('CQL result(s): ', results);
          if (err) return callback(err);
          return callback(null);
        });
      });
  });
  return _this;
};

/**
 * Add 'number' to counter 'id' and return the new value in callback.
 * @param <Function> callback Executes callback(err, new_counter) with err set upon error and with new counter upon success
 */
CassandraBackend.prototype.addAndGet = function addAndGet(id, number, callback) {
  if (typeof callback != 'function') throw new Error('invalid callback');
  var _this = this;
  if (!_this._client) throw new Error('not connected');
  _this.add(id, number, function add(err, results) {
    if (err) return callback(err);
    _this.get(id, function get(err, new_counter) {
      if (err) return callback(err);
      callback(null, new_counter);
    });
  });
};

CassandraBackend.prototype.add = function add(id, number, callback) {
  if (typeof callback != 'function') throw new Error('invalid callback');
  var _this = this;
  if (!_this._client) throw new Error('not connected');
  log.debug('adding %s to counter %s', number, id);
  var q = util.format("UPDATE calc.sum SET sum=sum+%s WHERE id='%s'", number, id);
  log.debug('CQL query: ', q);
  _this._client.execute(q, function execute(err, results) {
    log.debug('CQL result(s): ', results);
    if (err) return callback(err);
    callback(null, results);
  });
};

/**
 * Get an entry by ID.
 * @param callback(err, value); value is set to undefined if it does not exist
 */
CassandraBackend.prototype.get = function get(id, callback) {
  if (typeof callback != 'function') throw new Error('invalid callback');
  var _this = this;
  if (!_this._client) throw new Error('not connected');
  log.debug('getting counter %s', id);
  var q = util.format("SELECT * FROM calc.sum WHERE id='%s'", id);
  log.debug('CQL query:', q);
  _this._client.execute(q, function cqslExecCallback(err, results) {
      if (err) return callback(err);
      log.debug('CQL result(s):', results);
      if ( !results || !results.rows[0] ) {
        return callback(null, undefined);
      } else {
        var n = parseInt(results.rows[0].sum, 10);
        log.debug('counter %s = %s', id, n);
        return callback(null, n);
      }
  });
};

/**
 * Build configuration from a Json object, generating
 * Cassandra instances instead of plain text config.
 * @return <Object> config
 */
var buildConfig = function buildConfig(jsoncfg) {
  jsoncfg = jsoncfg || {contactPoints: ['localhost:9042']};
  var config = {};

  config.contactPoints = jsoncfg.contactPoints;

  if (jsoncfg.authProvider) {
      switch (jsoncfg.authProvider.type) {
      case 'PlainTextAuthProvider':
          config.authProvider = new cassandra.auth.PlainTextAuthProvider(jsoncfg.authProvider.username, jsoncfg.authProvider.password);
          break;
      default:
          throw new Error("invalid cassandra authProvider: " + jsoncfg.authProvider.type);
      }
  }

  if (jsoncfg.loadBalancingPolicy) {
      switch(jsoncfg.loadBalancingPolicy.type) {
      case 'DCAwareRoundRobinPolicy':
          if ( ! config.policies ) { config.policies = {}; }
          config.policies.loadBalancing = new cassandra.policies.loadBalancing.DCAwareRoundRobinPolicy(jsoncfg.loadBalancingPolicy.localDC);
          break;
      default:
          throw new Error("invalid cassandra loadBalancingPolicy: " + jsoncfg.loadBalancingPolicy.type);
      }
  }

  //cfg.authProvider = new cassandra.auth.PlainTextAuthProvider('my_user', 'p@ssword1!');

  return config;
};
