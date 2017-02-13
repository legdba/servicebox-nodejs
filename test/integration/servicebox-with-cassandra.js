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

var CassandraProcess = require('../helpers/cassandra');
var db = CassandraProcess('./apache-cassandra-2.2.8/bin/cassandra');
var CassandraBackend = require('../../app/api/helpers/cassandra_backend');
var tester = require('../helpers/servicebox-with-db');
var beopts = {'betype':'cassandra'};

describe('Servicebox + Cassandra smoke tests', function() {
    tester.serviceBoxWithDbSmokeTest(db, CassandraBackend, beopts);
  }
);
