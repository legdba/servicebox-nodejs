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

CassandraBackend.prototype.constructor = function() {}

CassandraBackend.prototype.init = function init(contactPoints, callback) {
    contactPoints = contactPoints || {contactPoints: ['localhost:9042']};
    this.client = new cassandra.Client(contactPoints);
    this.client.connect(function (err) {
        if(callback) { callback(err); }
        else if (err) { throw err; }
    });
}

/**
 * @param callback Executes callback(err, new_counter)
 */
CassandraBackend.prototype.addAndGet = function addAndGet(id, number, callback) {
    var q = util.format("UPDATE calc.sum SET sum=sum+%s WHERE id='%s'", number, id);
    var self = this;
    log.debug('CQL query:', q);
    self.client.execute(q, function (err, results) {
       if (err) {
           if (callback) { callback(err); }
           else { throw err; }
       } else {
           log.debug('CQL result(s):', results);
       }

       if(callback) {
           var q = util.format("SELECT * FROM calc.sum WHERE id='%s'", id);
           log.debug('CQL query:', q);
           self.client.execute(q, function (err, results) {
               if (err) {
                   if (callback) { callback(err); }
                   else { throw err; }
               } else {
                   log.debug('CQL result(s):', results);
                   if (callback) { callback( null, parseInt(results.rows[0].sum) ); }
               }
           })
       }
       else if (err) { throw err; }
    });
}
