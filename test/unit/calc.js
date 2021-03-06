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
process.env.LOG_LEVEL = 'warn';
process.env.A127_ENV = 'test';

var should = require('should');
var expect = require('chai').expect;
var request = require('supertest');
var lugg = require('lugg');
lugg.init({level:'warn'});
var app = require('../../app/server').test().app;
var MemoryBackend = require('../../app/api/helpers/memory_backend');


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

      // Define our own backend that we controll and can inspect
      var be = MemoryBackend.create();
      be.bind();
      app.use(function(req, res, next){
        req.locals = {
          backend: be
        };
        next();
      });

      it('should get count 1 on first call with {n}=1', function(done) {
        expect(be.counters['0']).to.equals(undefined);
        request(app)
          .get('/api/v2/calc/sum/0/1')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            expect(err).to.not.exist;
            expect(res.body).to.eql({id:'0', value:1});
            expect(be.counters['0']).to.equals(1);
            done();
          });
      });

      it('should get count 3 on second call with {n}=2', function(done) {
        be.counters['0'] = 1;
        expect(be.counters['0']).to.equals(1);
        request(app)
          .get('/api/v2/calc/sum/0/2')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            expect(err).to.not.exist;
            expect(res.body).to.eql({id:'0', value:3});
            expect(be.counters['0']).to.equals(3);
            done();
          });
      });

    });

  });

});
