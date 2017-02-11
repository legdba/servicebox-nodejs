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
 var app = require('../../app/server').test();

process.env.A127_ENV = 'test';

describe('controllers', function() {

  describe('echo', function() {

    describe('POST /api/v2/echo', function() {

      it('should echo passed Message body', function(done) {

        request(app)
          .post('/api/v2/echo')
          .set('Accept', 'application/json')
          .type('json')
          .send(JSON.stringify({"message":"foo"}))
          .expect(200)
          .end(function(err, res) {
            should.not.exist(err);
            res.body.should.eql({message:'foo'});
            done();
          });
      });

    });

    describe('GET /api/v2/echo/{message}', function() {

      it('should echo passed {message}', function(done) {

        request(app)
          .get('/api/v2/echo/foo')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            should.not.exist(err);
            res.body.should.eql({message:'foo'});
            done();
          });
      });

    });

    describe('GET /api/v2/echo/{message}/{delay}', function() {

      it('should echo passed {message}', function(done) {

        request(app)
          .get('/api/v2/echo/foo/1')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            should.not.exist(err);
            res.body.should.eql({message:'foo'});
            done();
          });
      });

      it('should return 422 on negative {delay}', function(done) {

        request(app)
          .get('/api/v2/echo/foo/-1')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(422, done);
      });

    });

  });

});
