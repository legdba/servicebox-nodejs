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
var should = require('should');
var expect = require('chai').expect;
var request = require('supertest');
var app = require('../../../server');

// TODO: there must be a way with swagger+express to have this parametrized per test
var MemoryBackend = require('../../../api/helpers/memory_backend').MemoryBackend;

process.env.A127_ENV = 'test';

describe('controllers', function() {

  describe('calc', function() {

    describe('GET /api/v2/calc/fibo-nth/{n}', function() {

      it('should return 832040 for {n}=30', function(done) {

        request(app)
          .get('/api/v2/calc/fibo-nth/30')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            should.not.exist(err);
            res.body.should.eql({n:30, term:832040});
            done();
          });
      });

      it('should return 422 on negative {n}', function(done) {

        request(app)
          .get('/api/v2/calc/fibo-nth/-1')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(422, done);
      });

    });

    describe('GET /api/v2/calc/sum/{id}/{n}', function() {

      it('should get count 1 on first call with {n}=1', function(done) {
        app.locals = {backend: MemoryBackend()};
        request(app)
          .get('/api/v2/calc/sum/0/1')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            should.not.exist(err);
            res.body.should.eql({id:'0', value:1});
            done();
          });
      });

      it('should get count 3 on first call with {n}=2', function(done) {
        app.locals = {backend: MemoryBackend()};
        request(app)
          .get('/api/v2/calc/sum/0/2')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            should.not.exist(err);
            res.body.should.eql({id:'0', value:3});
            done();
          });
      });

    });

  });

});
