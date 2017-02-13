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

var should = require('chai').should;
var expect = require('chai').expect;
var request = require('supertest');
var lugg = require('lugg');
lugg.init({level: 'error'});

module.exports = {
  serviceBoxWithDbSmokeTest: function serviceBoxWithDbSmokeTest(db, Backend, beopts) {
    var Server = require('../../app/server');
    var app;
    var backend;

    step('start DB and drop servicebox table if any', function(done) {
      this.timeout(20000);
      db.run(function(err) {
        if (err) return done(err);
        done();
      });
    });

    step('test DB and Backend implementation', function(done) {
      backend = Backend.create();
      backend.bind(function(err) {
        if (err) return done(err);
        backend.addAndGet('test', 123, function(err, data) { // a get(1) would fail as there is no entry...
          if (err) return done(err);
          expect(data).to.equal(123);
          backend.get('test', function(er, data){
            if (err) return done(err);
            expect(data).to.equal(123);
            done();
          });
        });
      });

    });

    step('start servicebox', function(done) {
      this.timeout(5000);
      Server.test(beopts, function(err, server) {
        if (err) return done(err);
        app = server.app;
        done();
      });
    });

    step('test DB state is calc.sum.id[0]=undefined', function(done) {
      backend.get('0', function(err, data){
        if (err) return done(err);
        expect(data).to.equal(undefined);
        done();
      });
    });

    step('check GET /api/v2/calc/sum/0/42 return 42', function(done) {
      request(app)
      .get('/api/v2/calc/sum/0/42')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function(err, res) {
        if (err) done(err);
        expect(res.body).to.eql({id:'0', value:42});
        done();
      });
    });

    step('check DB state has been updated to calc.sum.id[0]={counter:42}', function(done) {
      backend.get('0', function(err, data) {
        if (err) return done(err);
        expect(data).to.equal(42);
        done();
      });
    });

    after(function(done) {
      db.stop();
      done();
    });
  }
};
