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
 var lugg = require('lugg');
 lugg.init({level:'warn'});
 var app = require('../../app/server').test()._app;

process.env.A127_ENV = 'test';

describe('controllers', function() {

  describe('leak', function() {

    describe('GET /api/v2/heap/leak/1024', function() {

      it('should leak 1024 bytes of heap for a total of 1024 when called 1st time', function(done) {

        request(app)
          .get('/api/v2/heap/leak/1024')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            should.not.exist(err);
            res.body.should.eql({retainedHeap: 1024});
            done();
          });
      });

      it('should leak 1024 bytes of heap for a total of 2048 when called 2nd time', function(done) {

        request(app)
          .get('/api/v2/heap/leak/1024')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            should.not.exist(err);
            res.body.should.eql({retainedHeap: 2048});
            done();
          });
      });

      it('should return 422 on invalid leak size', function(done) {

        request(app)
          .get('/api/v2/heap/leak/-1')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(422, done);
      });

    });

    describe('GET /api/v2/heap/free', function() {

      it('should release all retained (leaked) heap', function(done) {

        request(app)
          .get('/api/v2/heap/free')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            should.not.exist(err);
            res.body.should.eql({retainedHeap: 0});
            done();
          });
      });

    });

  });

});
