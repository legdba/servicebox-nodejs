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
module.exports = {
  calcFiboNthRest: calcFiboNthRest,
  sum: sum
};
var lugg = require('lugg');

var datastore = require('../helpers/cassandra_store');
datastore.init(); // TODO: how to have a proper init with params while using swagger?

function calcFiboNth(num) {
    if (num > 2) {
        return calcFiboNth(num - 2) + calcFiboNth(num - 1);
    } else {
        return 1;
    }
}

function calcFiboNthRest(req, res) {
    var log = lugg('calcFiboNth');
    var n = req.swagger.params.n.value;
    if (n > 0) {
        log.info('calculating fibonacci Nth term for n=%s', n);
        var x  = calcFiboNth(n);
        log.info('calculated fibonacci Nth term for n=%s : %s', n, x);
        res.json({n:n, term:x});
    } else {
        res.status(422).json({message:'n must be a positive integer'});
    }
}

function sum(req, res) {
    var log = lugg('sum');
    var id = req.swagger.params.id.value;
    var n = req.swagger.params.n.value;
    datastore.addAndGet(id, n, function(err, new_counter) {
        if (err) { throw err; }
        res.json({id:id, value:new_counter});
    });
}
