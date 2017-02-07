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
var log = lugg('dynamodb-clt');
var aws = require('aws-sdk');

var DynamoDbBackend = makeClass.makeClass();
exports.DynamoDbBackend = DynamoDbBackend;

DynamoDbBackend.prototype.constructor = function() {};

DynamoDbBackend.prototype.init = function init(jsoncfg, callback) {
  jsoncfg = jsoncfg || {"region":"localhost","apiVersion":"2012-08-10","endpoint":{"protocol":"http:","host":"localhost:8000","port":8000,"hostname":"localhost","pathname":"/","path":"/","href":"http://localhost:8000/"}};
  aws.config.update(jsoncfg);
  var dynamodb = new aws.DynamoDB(jsoncfg);
  var self=this;
  self.table = 'servicebox';
  // validate connection and required table
  log.debug('contacting DynamoDB at %j', jsoncfg);
  dynamodb.listTables(function(err, data) {
    if (err) {
      callback(err);
    } else {
      log.debug("reply: %j", data);
      if (data.hasOwnProperty('TableNames') &&
          data.TableNames.indexOf(self.table) != -1) {
        self.dynamodb = dynamodb;
        log.info('DynamoDB check suceeded');
        callback(null);
      } else {
        log.warn('DynamodDB check failed; maybe there is no \'servicebox\' table.');
        callback("missing DynamoDB table: " + self.table);
      }
    }
  });
};

/**
 * @param callback Executes callback(err, new_counter)
 */
DynamoDbBackend.prototype.addAndGet = function addAndGet(id, number, callback) {
  var self=this;
  if (self.dynamodb) {
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
      TableName: "servicebox"
    };
    log.debug('DynamoDB updateItem request: %j', params);
    self.dynamodb.updateItem(params, function(err, data) {
      if (err) {
        callback(err);
      } else {
        log.debug('DynamoDB updateItem response: %j', data);
        var new_n = data.Attributes.n.N;
        callback(undefined, new_n);
      }
    });
  } else {
    callback('DynamoDbBackend is not properly initialized. Have you called DynamoDbBackend.init()?');
  }
};
