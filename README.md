[![License Apache](https://img.shields.io/hexpm/l/plug.svg)](http://www.apache.org/licenses/LICENSE-2.0)
[![Circle CI](https://circleci.com/gh/legdba/servicebox-nodejs.svg?style=shield)](https://circleci.com/gh/legdba/servicebox-nodejs)
[![Docker Image](https://quay.io/repository/legdba/servicebox-nodejs/status "Docker Repository on Quay.io")](https://quay.io/repository/legdba/servicebox-nodejs)
[![Code Climate](https://codeclimate.com/github/legdba/servicebox-nodejs/badges/gpa.svg)](https://codeclimate.com/github/legdba/servicebox-nodejs)
# Overview
HTTP REST services for infra/containers testing: echo, leaks, CPU-intensive ops, backend usage, etc.

# Usage
The application runs either as a NodeJS application or as a Docker container.

## NodeJS
Get from GIT and run:
```
git clone https://github.com/legdba/servicebox-nodejs.git && cd servicebox-nodejs && npm install && npm test && npm start
```
Swagger API available at http://localhost:8080/swagger; use it to explore exposed services and how to use them.

Display help for more CLI details:
```
npm start -- --help
```

## Docker
Latest version is always available in Quai.io and can be used as a docker application:
```
docker run -ti -p :8080:8080 --rm=true quay.io/legdba/servicebox-nodejs:latest
```
Help available the usual way:
```
docker run -ti -p :8080:8080 --rm=true quay.io/legdba/servicebox-nodejs:latest --help
```
Swagger API documentation available on http://your_container_ip:8080/swagger

Note that in the docker registry each image is tagged with the git revision, commit and branch of the code
used to generate the image. If you run quay.io/legdba/servicebox-nodejs:r23-7be1d82-master this is the revision 'r23'
and commit '7be1d82' on branch 'master'. The associated code can be seen at https://github.com/legdba/servicebox-nodejs/commit/7be1d82
or with a 'git 7be1d82' command when in the servicebox-nodejs repo.

## Using a Backend

### Memory
This is the default. No configuration needed.

### Cassandra
To use cassandra as a backend add the following options:
```
--be-type=cassandra --be-opts='{"contactPoints":["46.101.16.49","178.62.87.192"]}'
```
Plain-text credentials can be set this way (no other credentials supported so far):
```
--be-type cassandra --be-opts '{"contactPoints":["52.88.93.64","52.89.85.132","52.89.133.153"], "authProvider":{"type":"PlainTextAuthProvider", "username":"username", "password":"p@ssword"}}'
```
Set load balancing policies:
```
--be-type cassandra --be-opts '{"contactPoints":["52.88.93.64","52.89.85.132","52.89.133.153"], "loadBalancingPolicy":{"type":"DCAwareRoundRobinPolicy","localDC":"DC_name_"}}'
```

### Redis-cluster
To use a redis cluster as a backend add the following options:
```
--be-type=redis-cluster --be-opts='{"contactPoints":["46.101.16.49","178.62.87.192"]}'
```
Only redis v3 cluster is supported as of today. Plain old redis instances are not supported.

Note that the redis cluster client will try to connect to the cluster until it succeeds.

# Exposed services

Get Swagger definition at http://yourhost:8080/api/v2/swagger (this will return JSON or YAML based your Accept header).

# TODO
* Add txn logs
* Add POST support for echo service
* Add support for Cassandra cluster options (same as in Java)

# License
This software is under Apache 2.0 license.
```
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
```
