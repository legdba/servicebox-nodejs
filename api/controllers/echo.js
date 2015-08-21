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
  echo: echo
};
var lugg = require('lugg');
var log = lugg('echo');

function echo(req, res) {
    var message = req.swagger.params.message.value;
    var delay = 0;
    if (req.swagger.params.delay != undefined) delay = req.swagger.params.delay.value;
    if (delay <= 0) {
        log.info('echo: %s', message);
        res.json(message);
    } else {
        setTimeout(function(req, res) { // see https://github.com/jmar777/suspend for a promise-based approach
            log.info('echo after %sms: %s', delay, message);
            res.json(message);
        }, delay, req, res);
    }
}
