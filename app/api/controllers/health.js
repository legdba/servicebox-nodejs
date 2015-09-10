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
module.exports = {
  health: health,
  health_conditional: health_conditional
};
//var util = require('util');
var lugg = require('lugg');
var log = lugg('health');

function health(req, res) {
    res.json({message:'up'});
}

function health_conditional(req, res) {
    var chance_of_being_up = req.swagger.params.f.value
    if (chance_of_being_up < 0) chance_of_being_up = 0;
    if (Math.random() > chance_of_being_up) {
        return res.status(500).json({message: 'down'});
    } else {
        return res.json({message: up});
    }
}
