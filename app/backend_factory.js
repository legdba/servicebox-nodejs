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

const backend_factories = {
  'memory'        : require('./api/helpers/memory_backend'),
  'cassandra'     : require('./api/helpers/cassandra_backend'),
  //'redis-cluster' : require('./api/helpers/rediscluster_backend'),
  //'redis-sentinel': require('./api/helpers/redissentinel_backend'),
  //'dynamodb'      : require('./api/helpers/dynamodb_backend'),
}

/**
 * @return an array of string of valid backend type names.
 */
module.exports.list = function list() {
  return Object.keys(backend_factories);
};

/**
 * Create and init a backend based on it's type and a JSON opts config
 * that is backend-specific.
 * Success/failur enotified with the callback.
 * @param type the backend type
 * @param opts json configuration for the backend
 * @param callback function(err, backend) called with err set in case of error backend set with the backend instance otherwhise
 */
module.exports.create = function create(type, opts, callback) {
  if (typeof callback !== 'function') throw new Error('invalid callback');
  if (backend_factories.hasOwnProperty(type)) {
    var backend_factory = backend_factories[type];
    var be = backend_factory.create(opts);
    be.bind(function (err) {
      if (err) return callback(err);
      return callback(null, be);
    });
  } else {
    return callback(new Error("invalid backend type: '" + type + "', valid values are '" + Object.keys(backend_factories).join("', '")));
  }
};
