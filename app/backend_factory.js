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

var makeClass = require('./api/helpers/make_class');
var BackendFactory = makeClass.makeClass();
exports.BackendFactory = BackendFactory;

const backend_types = {
  'memory'        : require('./api/helpers/memory_backend').MemoryBackend(),
  'cassandra'     : require('./api/helpers/cassandra_backend').CassandraBackend(),
  'redis-cluster' : require('./api/helpers/rediscluster_backend').RedisClusterBackend(),
  'redis-sentinel': require('./api/helpers/redissentinel_backend').RedisSentinelBackend()
}

BackendFactory.prototype.constructor = function() {};

/**
 * @return an array of string of valid backend type names.
 */
BackendFactory.prototype.list = function list() {
  return Object.keys(backend_types);
};

/**
 * Create and init a backend based on it's type and a JSON opts config
 * that is backend-specific.
 * Success/failur enotified with the callback.
 * @param type the backend type
 * @param opts json configuration for the backend
 * @param cb function(err, backend) called with err set in case of error backend set with the backend instance otherwhise
 */
BackendFactory.prototype.create = function create(type, opts, cb) {
  if (backend_types.hasOwnProperty(type)) {
    var be = backend_types[type];
    be.init(opts, function (err) {
      if (err) {
        cb(err, null);
      } else {
        cb(null, be);
      }
    });
  } else {
    callback("invalid backend type: '" + type + "', valid values are '" + backend_types.keys().join("', '"));
  }
};
