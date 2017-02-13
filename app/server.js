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

var express = require('express');
var lugg = require('lugg');

module.exports = {
  create: create,
  test  : test
};

/**
 * Create a new server.
 * @param <JSON> json config with:
 *                 - loglevel : debug|info|warn|error (string)
 *                 - port : the port to listen at (integer)
 *                 - betype   : memory|cassandra|redis-sentinel|redis-cluster|dynamodb (string)
 *                 - beoptions: backend json configuration (see each backend documentation) (json)
 * @return a Server instance, ready for initServer() and bind() calls.
 */
function create(config) {
  return new Server(config);
};

/**
 * Create a server for test purpose, async initilializing it
 * and calling back when it is ready.
 * The server is NOT bound to a TCP port, as test frameworks usually don't need this.
 * @param <Function> callback(err, server) called back when init is over; can be null
 * @return the server
 */
function test(config, callback) {
  if (callback && typeof callback != 'function') throw new Error('invalid callback');
  config = config || {'betype' : 'memory'}
  var server = create(config);
  server.initServer(function(err) {
    if (err) {
      if (callback) return callback(err);
      else console.error(err.stack, err);
    }
    if (callback) callback(null, server);
  });
  return server;
};

/**
 * Create a new server.
 * @param <Object> config a node-config object with:
 *                 - loglevel : debug|info|warn|error
 *                 - port     : the port to listen at
 *                 - betype   : memory|cassandra|redis-sentinel|redis-cluster|dynamodb
 *                 - beopts   : backen configuration (see each backend documentation)
 * @return a Server instance, ready for initServer() and bind() calls.
 */
function Server(config) {
  this.backend = undefined; // will be define when calling initServer(), public member for testing purpose
  this.app     = express(); // public member for testing purpose
  this._config = config;
};
Server.prototype.constructor = Server;

/**
 * Asynchronously initialize the server by reading config,
 * configuring express, adding swagger, and binding attached
 * resources (backend).
 * @param <Function> callback(err) to notify success/failure
 */
Server.prototype.initServer = function initServer(callback) {
  if (typeof callback != 'function') throw new Error('invalid callback');
  var _this = this;
  _this._log = lugg('servicebox');
  var backendType = _this._config.betype;
  var backendOpts = _this._config.beopts;

  _this._log.debug('init backend...');
  var Backend = require('./backend_factory');
  _this._log.debug('creating backend with:', {'type':backendType, 'opts':backendOpts});
  Backend.create(backendType, backendOpts, function init_backend_callback(err, backend) {
    if (err) {
      _this._log.error('backend creation failed: ', err);
      return callback(err);
    }

    // Ensure the backend instance will be in the context of all requests
    _this.backend = backend;
    _this._log.debug('created backend:', backend);
    _this.app.use(function(req, res, next){
      req.locals = {
        backend: backend
      };
      next();
    });

    // Init swagger and express
    _this._log.debug('init swagger-express...');
    var SwaggerExpress = require('swagger-express-mw');
    var express_config = {
      appRoot: __dirname // required config
    };
    SwaggerExpress.create(express_config, function init_swagger_callback(err, swaggerExpress) {
      if (err) return callback(err);

      // install middleware
      swaggerExpress.register(_this.app);

      callback(null);
    });
  });
};

/**
 * Bind express app to HTTP port to server requests.
 */
Server.prototype.bindHttp = function bindHttp(callback) {
  if (typeof callback != 'function') throw new Error('invalid callback');
  var _this = this;
  var port = this._config.port;
  _this._log.debug('binding port %d...', port);
  _this.app.listen(port, function app_listen_callback(err) {
    if (err) return callback(err);
    _this._log.warn('server listening on port %d in %s mode', port, _this.app.settings.env);
    callback(null);
  });
}
