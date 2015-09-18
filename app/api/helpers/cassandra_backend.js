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
 * Connect Cassandra backend.
 * @param callback Executes callback(err) with err set upon failure, with err set to null upon success.
 */
CassandraBackend.prototype.init = function init(contactPoints, callback) {
    contactPoints = contactPoints || {contactPoints: ['localhost:9042']};
    log.info('contacting Cassandra cluster at %s', contactPoints);
    var self=this;
    self.client = new cassandra.Client(contactPoints);
    self.client.connect(function connectCassandraCallback(err) {
        if(err) {
            self.client.shutdown();
            callback(err);
        } else {
            // Run a stupid request to ensure everything is fine
            CassandraBackend.prototype.addAndGet.apply(self, [0, 0, function checkCassandraCallback(err, new_counter) {
                if(err) {
                    log.warn("Cassandra check failed; maybe Keyspace does not exist. If so run the following command: CREATE KEYSPACE calc WITH REPLICATION = { 'class' : 'SimpleStrategy', 'replication_factor' : 3 } AND DURABLE_WRITES = false ; CREATE TABLE calc.sum (id varchar, sum counter, PRIMARY KEY(id)) ;");
                    self.client.shutdown();
                    callback(err);
                } else {
                    log.info("Cassandra check succeeded");
                    callback(null);
                }
            }]);
        }
    });
};

/**
 * Add 'number' to counter 'id' and return the new value in callback.
 * @param callback Executes callback(err, new_counter) with err set upon error and with new counter upon success
 */
CassandraBackend.prototype.addAndGet = function addAndGet(id, number, callback) {
    var q = util.format("UPDATE calc.sum SET sum=sum+%s WHERE id='%s'", number, id);
    var self = this;
    log.debug('CQL query:', q);
    self.client.execute(q, function (err, results) {
       if (err) {
           callback(err);
       } else {
           log.debug('CQL result(s):', results);
           var q = util.format("SELECT * FROM calc.sum WHERE id='%s'", id);
           log.debug('CQL query:', q);
           self.client.execute(q, function cqslExecCallback(err, results) {
               if (err) {
                   callback(err);
               } else {
                   log.debug('CQL result(s):', results);
                   if ( !results || !results.rows[0] ) {
                       callback( new Error('empty results for: SELECT * FROM calc.sum WHERE id='+id) );
                   } else {
                       callback( null, parseInt(results.rows[0].sum) );
                   }
               }
           });
       }
    });
};
