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

var Server = require('../../app/server');
var Cassandra = require('./cassandra');
var Backend = require('../../app/api/helpers/cassandra_backend');
var app;
var backend;

describe('when cassandra starts', function() {

  var db = Cassandra('./apache-cassandra-2.2.8/bin/cassandra');

  before(function(done) {
    this.timeout(20000);
    db.run(function(err) {
      if (err) return done(err);
      backend = Backend.create();
      backend.bind(function(err) {
        if (err) return done(err);
        done();
      });
    });
  });

  describe('when the server starts', function() {

    it('it should bind to cassandra', function(done) {
      this.timeout(5000);
      Server.test({'betype':'cassandra'}, function(err, server) {
        if (err) return done(err);
        app = server.app;
        done();
      });
    });

  });

  it('there should be calc.sum.id[0]={counter:0} into cassandra', function(done) {
    backend.addAndGet('0', 0, function(err, data) { // a get(1) would fail as there is no entry...
      if (err) return done(err);
      expect(data).to.equal(0);
      done();
    });
  });

  describe('GET /api/v2/calc/sum/0/42', function() {

    it('should return return value 42', function() {
      request(app)
      .get('/api/v2/calc/sum/0/42')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function(err, res) {
        should.not.exist(err);
        res.body.should.eql({id:'0', value:42});
        done();
      });
    });

    it('there should be calc.sum.id[0]={counter:42} into cassandra', function(done) {
      backend.get('0', function(err, data) {
        if (err) return done(err);
        expect(data).to.equal(42);
        done();
      });
    });

  });

  after(function(done) {
    db.stop();
    done();
  });

});
