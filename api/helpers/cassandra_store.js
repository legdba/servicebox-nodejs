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

var log = lugg('cassandra-clt');

var cassandra = require('cassandra-driver');
var client = undefined;

/**
 * @param callback Executes callback(err) when finished
 */
exports.init = function(contactPoints, callback) {
    contactPoints = contactPoints || {contactPoints: ['localhost:9042']};
    if(client) { client.shutdown(); }
    client = new cassandra.Client(contactPoints);
    client.connect(function (err) {
        if(callback) { callback(err); }
        else if (err) { throw err; }
    });
}

/**
 * @param callback Executes callback(err, new_counter)
 */
exports.addAndGet = function(id, number, callback) {
    var q = util.format("UPDATE calc.sum SET sum=sum+%s WHERE id='%s'", number, id);
    log.info('CQL query:', q);
    client.execute(q, function (err, results) {
        if (err) {
            if (callback) { callback(err); }
            else { throw err; }
        } else {
            log.info('CQL result(s):', results);
        }

        if(callback) {
            var q = util.format("SELECT * FROM calc.sum WHERE id='%s'", id);
            log.info('CQL query:', q);
            client.execute(q, function (err, results) {
                if (err) {
                    if (callback) { callback(err); }
                    else { throw err; }
                } else {
                    log.info('CQL result(s):', results);
                    if (callback) { callback( undefined, parseInt(results.rows[0].sum) ); }
                }
            })
        }
        else if (err) { throw err; }
    });
}

/*
init();
console.log('connected');
addAndGet(0, 1, function(err, res) {
    if (err) { throw err; }
    console.log("addAndGet result: ", res);
});
*/