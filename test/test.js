#!/usr/bin/env mocha
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
var server = require('../server.js');
server.start({port: 8080, loglevel: 'fatal'});

var should = require('should'),
    expect = require('chai').expect,
    supertest = require('supertest'),
    api = supertest('http://localhost:8080/api/v2');

describe('/echo/:txt', function() {
    var echo='foo';
    it('should echo :txt param as plain/text', function(done) {
        api.get('/echo/'+echo)
           .set('Accept', 'text/plain')
           .expect(200, echo, done);
    });
});

describe('/echooo/:txt/:delay', function() {
    var echo='bar';
    it('should echo :txt param as plain/text', function(done) {
        api.get('/echooo/'+echo+'/5')
           .set('Accept', 'text/plain')
           .expect(200, echo, done);
    });
});

describe('/env/vars[/:name]', function() {
    it('should return all OS env variables', function(done) {
        api.get('/env/vars')
           .set('Accept', 'application/json')
           .expect(200)
           .end(function(err, res){
                if (err) return done(err);
                expect(res.body).to.have.property('PWD');
                expect(res.body['PATH']).to.equal(process.env['PATH']);
                expect(res.body['HOME']).to.equal(process.env['HOME']);
                expect(res.body['USER']).to.equal(process.env['USER']);
                expect(res.body['SHELL']).to.equal(process.env['SHELL']);
                done();
           });
    });
    it('should return named OS env variables', function(done) {
        api.get('/env/vars/PATH')
           .set('Accept', 'application/json')
           .expect(200, {'PATH':process.env['PATH']}, done);
    });
});

describe('/env/hostname', function() {
    var os = require("os");
    it('should return hostname', function(done) {
        api.get('/env/hostname')
           .set('Accept', 'text/plain')
           .expect(200, os.hostname(), done);
    });
});
