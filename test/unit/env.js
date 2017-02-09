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
var os = require('os'),
    should = require('should'),
    expect = require('chai').expect,
    request = require('supertest'),
    app = require('../../app/server');

process.env.A127_ENV = 'test';

describe('controllers', function() {

  describe('env', function() {

    describe('GET /api/v2/env/vars', function() {

      it('should return current OS environment variables', function(done) {

        request(app)
          .get('/api/v2/env/vars')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            should.not.exist(err);
            expect(res.body).to.deep.equal(process.env);
            done();
          });
      });

    });

    describe('GET /api/v2/env/vars/{name}', function() {

      it('should return {name} current OS environment variable', function(done) {

        request(app)
          .get('/api/v2/env/vars/PATH')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            should.not.exist(err);
            res.body.should.eql({PATH: process.env['PATH']});
            done();
          });
      });

    });

    describe('GET /api/v2/env/hostname', function() {

      it('should return {hostname} of current OS environment', function(done) {

        request(app)
          .get('/api/v2/env/hostname')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            should.not.exist(err);
            res.body.should.eql({hostname: os.hostname()});
            done();
          });
      });

    });

  });

});
