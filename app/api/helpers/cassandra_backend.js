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
var log = lugg('cassandra-clt');
var cassandra = require('cassandra-driver');

var CassandraBackend = makeClass.makeClass();
exports.CassandraBackend = CassandraBackend;

CassandraBackend.prototype.constructor = function() {};

/**
 * Connect Cassandra backend, check the connection and check the ability to increment counters.
 * @param <Function> callback Executes callback(err) with err set upon failure, with err set to null upon success.
 */
CassandraBackend.prototype.init = function init(jsoncfg, callback) {
  if (typeof callback != 'function') throw new Error('invalid callback');
  this.connect(jsoncfg, function(err) {
    if (err) {
      return callback(err);
    } else {
      this.healthcheck(function(err) {
        if (err) this.disconnect();
        if (callback) callback(err);
      });
    }
  });
};

CassandraBackend.prototype.connect = function connect(jsoncfg, callback) {
    if (typeof callback != 'function') throw new Error('invalid callback');
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

    log.debug('contacting Cassandra cluster at %j', config);
    var _this=this;
    _this.client = new cassandra.Client(config);
    _this.client.connect(function connectCassandraCallback(err) {
      if (err) {
        log.debug('Cassandra connection failed: %s', err);
        return callback(err);
      } else {
        log.debug('Cassandra connection succeeded');
        return callback(null);
      }
    });
};

CassandraBackend.prototype.disconnect = function disconnect(jsoncfg, callback) {
  this.client.shutdown();
}

CassandraBackend.prototype.healthcheck = function healthcheck(callback) {
  if (typeof callback != 'function') throw new Error('invalid callback');
  var _this=this;
  log.debug('health-checking Cassandra...');
  CassandraBackend.prototype.addAndGet.apply(_this, [0, 0, function checkCassandraCallback(err, new_counter) {
      if(err) {
          log.warn("Cassandra check failed; maybe Keyspace does not exist. If so run the following command: CREATE KEYSPACE calc WITH REPLICATION = { 'class' : 'SimpleStrategy', 'replication_factor' : 3 } AND DURABLE_WRITES = false ; CREATE TABLE calc.sum (id varchar, sum counter, PRIMARY KEY(id)) ;");
          return callback(err);
      } else {
          log.debug("Cassandra check succeeded");
          return callback(null);
      }
  }]);
};

CassandraBackend.prototype.dropAndCreateKeyspace = function dropAndCreateKeyspace(callback) {
  if (typeof callback != 'function') throw new Error('invalid callback');
  var _this = this;

  var q = util.format("DROP KEYSPACE IF EXISTS calc");
  log.debug('CQL query:', q);
  _this.client.execute(q, function (err, results) {
    log.debug("::: %j", err);
      if (err) {
        return callback("failed to drop keyspace: " + err);
      } else {

        var q = util.format("CREATE KEYSPACE calc WITH REPLICATION = { 'class' : 'SimpleStrategy', 'replication_factor' : 3 } AND DURABLE_WRITES = false");
        log.debug('CQL query:', q);
        _this.client.execute(q, function (err, results) {
            if (err) {
              return callback("failed to create keyspace: " + err);
            } else {

              var q = util.format("CREATE TABLE calc.sum (id varchar, sum counter, PRIMARY KEY(id))");
              log.debug('CQL query:', q);
              _this.client.execute(q, function execute(err, results) {
                  if (err) {
                    return callback("failed to create table: " + err);
                  } else {
                    return callback(null);
                  }
                });

            }
          });

      }
    });
};

/**
 * Add 'number' to counter 'id' and return the new value in callback.
 * @param <Function> callback Executes callback(err, new_counter) with err set upon error and with new counter upon success
 */
CassandraBackend.prototype.addAndGet = function addAndGet(id, number, callback) {
    if (typeof callback != 'function') throw new Error('invalid callback');
    var q = util.format("UPDATE calc.sum SET sum=sum+%s WHERE id='%s'", number, id);
    var _this = this;
    log.debug('CQL query:', q);
    _this.client.execute(q, function execute(err, results) {
       if (err) {
           return callback(err);
       } else {
           log.debug('CQL result(s):', results);
           var q = util.format("SELECT * FROM calc.sum WHERE id='%s'", id);
           log.debug('CQL query:', q);
           _this.client.execute(q, function cqslExecCallback(err, results) {
               if (err) {
                   return callback(err);
               } else {
                   log.debug('CQL result(s):', results);
                   if ( !results || !results.rows[0] ) {
                       return callback( 'empty results for: SELECT * FROM calc.sum WHERE id='+id );
                   } else {
                       return callback( null, parseInt(results.rows[0].sum, 10) );
                   }
               }
           });
       }
    });
};
