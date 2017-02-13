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
var aws = require('aws-sdk');
var log;

module.exports = {
  create: function create(jsoncfg) {
    if (!log) log = lugg('dynamodb-clt'); // init as late as possible to avoid a 'missing lugg.init() error'
    return new DynamoDbBackend(jsoncfg);
  }
};

function DynamoDbBackend(jsoncfg) {
  this._jsoncfg = jsoncfg || {"region":"localhost","apiVersion":"2012-08-10","endpoint":{"protocol":"http:","host":"localhost:8000","port":8000,"hostname":"localhost","pathname":"/","path":"/","href":"http://localhost:8000/"}};
  this._table = 'servicebox';
  //aws.config.update(jsoncfg);
}
DynamoDbBackend.prototype.constructor = DynamoDbBackend;

DynamoDbBackend.prototype.bind = function bind(callback) {
  if (typeof callback !== 'function') throw new Error('invalid callback');
  var _this = this;
  _this.connect(function(err) {
    if (err) return callback(err);
    _this.healthcheck(function(err) {
      if (err) return callback(err);
      return callback(null);
    });
  });
  return _this;
}

DynamoDbBackend.prototype.connect = function connect(callback) {
  if (typeof callback !== 'function') throw new Error('invalid callback');
  var _this = this;
  _this._dynamodb = new aws.DynamoDB(_this._jsoncfg);
  // DynamoDB client auto-connects...
  callback(null);
  return _this;
};

DynamoDbBackend.prototype.disconnect = function disconnect(callback) {
  if (typeof callback != 'function') throw new Error('invalid callback');
  this._dynamodb = null;
  callback(null);
  return this;
}

DynamoDbBackend.prototype.healthcheck = function healthcheck(callback) {
  if (typeof callback !== 'function') throw new Error('invalid callback');
  var _this = this;
  if (!_this._dynamodb) throw new Error('not connected');
  // validate connection and required table
  log.debug('contacting DynamoDB at %j', _this._jsoncfg);
  log.debug('DynamoDB listTables request');
  _this._dynamodb.listTables(function(err, data) {
    if (err) return callback(err);
    log.debug('DynamoDB listTables response: %j', data);
    if (data.hasOwnProperty('TableNames') &&
        data.TableNames.indexOf(_this._table) != -1) {
      log.info('DynamoDB check suceeded');
      return callback(null);
    } else {
      log.warn('DynamodDB check failed; maybe there is no \'' + _this._table + '\' table.');
      return callback(new Error('missing DynamoDB table: ' + _this._table));
    }
  });
  return _this;
};

/**
 * @param callback Executes callback(err, new_counter)
 */
DynamoDbBackend.prototype.addAndGet = function addAndGet(id, number, callback) {
  if (typeof callback !== 'function') throw new Error('invalid callback');
  var _this = this;
  if (!_this._dynamodb) throw new Error('not connected');
  var params = {
    Key: {
      "id": {
        S: id
      }
    },
    UpdateExpression: "set n = if_not_exists(n , :start) + :num",
    ExpressionAttributeValues: {
      ":num": {
        N: number.toString()
      },
      ":start": {
        N: "0"
      }
    },
    ReturnValues : "ALL_NEW",
    ReturnConsumedCapacity: "TOTAL",
    TableName: this._table
  };
  log.debug('DynamoDB updateItem request: %j', params);
  _this._dynamodb.updateItem(params, function(err, data) {
    if (err) return callback(err);
    log.debug('DynamoDB updateItem response: %j', data);
    var new_n = data.Attributes.n.N;
    return callback(null, parseInt(new_n,10));
  });
  return _this;
};

/**
 * Get an entry by ID.
 * @param callback(err, value); value is set to undefined if it does not exist
 */
DynamoDbBackend.prototype.get = function get(id, callback) {
  if (typeof callback !== 'function') throw new Error('invalid callback');
  var _this = this;
  if (!_this._dynamodb) throw new Error('not connected');
  var params = {
  Key: {
   "id": {
     S: id
    }
  },
  TableName: this._table
 };
 log.debug('DynamoDB getItem request: %j', params);
 _this._dynamodb.getItem(params, function(err, data) {
   if (err) return callback(err);
   log.debug('DynamoDB getItem response: %j', data);
   if (data.hasOwnProperty('Item')) {
     var new_n = data.Item.n.N;
     return callback(null, parseInt(new_n,10));
   } else {
     // no such entry in DB
     return callback(null, undefined);
   }
 });
}

DynamoDbBackend.prototype.dropAndCreateTable = function dropAndCreateTable(callback) {
  if (typeof callback !== 'function') throw new Error('invalid callback');
  var _this = this;
  if (!_this._dynamodb) throw new Error('not connected');
  _this.deleteTableIfAny(function(err) {
    if (err) return callback(err);
    _this.createTable(function(err){
      if (err) return callback(err);
      return callback(null);
    });
  });
  return _this;
};

DynamoDbBackend.prototype.deleteTableIfAny = function deleteTableIfAny(callback) {
  if (typeof callback !== 'function') throw new Error('invalid callback');
  var _this = this;
  if (!_this._dynamodb) throw new Error('not connected');
  log.debug('DynamoDB listTables request');
  _this._dynamodb.listTables(function(err, data) {
    if (err) return callback(err);
    log.debug('DynamoDB listTables response: %j', data);
    if (data.hasOwnProperty('TableNames') && data.TableNames.indexOf(_this._table) != -1) {
      // The table exist, lets delete it
      log.debug('DynamoDB table exist, to be deleted...');
      var params = {
        TableName: _this._table
      };
      log.debug('DynamoDB deleteTable request: %j', params);
      _this._dynamodb.deleteTable(params, function(err, data) {
        if (err) return callback(err, data);
        log.debug('DynamoDB deleteTable response: %j', data);
        return callback(null, data);
      });
    } else {
      // The table does not exist
      return callback(null);
    }
  });
  return _this;
};

DynamoDbBackend.prototype.createTable = function createTable(callback) {
  if (typeof callback !== 'function') throw new Error('invalid callback');
  var _this = this;
  if (!_this._dynamodb) throw new Error('not connected');
  var params =
  {
    TableName : _this._table,
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH"}
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" }
    ],
    ProvisionedThroughput:
    {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  };
  log.debug('DynamoDB createTable request: %j', params);
    _this._dynamodb.createTable(params, function(err, data) {
      if (err) return callback(err, data);
      log.debug('DynamoDB createTable response: %j', data);
      return callback(null, data);
    });
  return _this;
};
