[![License Apache](https://www.brimarx.com/pub/apache2.svg)](http://www.apache.org/licenses/LICENSE-2.0)
[![Circle CI](https://circleci.com/gh/legdba/servicebox-nodejs.svg?style=shield)](https://circleci.com/gh/legdba/servicebox-nodejs)
[![Docker Image](https://quay.io/repository/legdba/servicebox-nodejs/status "Docker Repository on Quay.io")](https://quay.io/repository/legdba/servicebox-nodejs)
[![Code Climate](https://codeclimate.com/github/legdba/servicebox-nodejs/badges/gpa.svg)](https://codeclimate.com/github/legdba/servicebox-nodejs)
# Overview
HTTP REST services for infra/containers testing: echo, leaks, CPU-intensive ops, backend usage, etc.

# Exposed REST Services

See full Swagger definition and sample CURL commands at http://yourhost:8080/api/v2/swagger.yaml
See Swagger-UI at http://yourhost:8080/docs/ (mind the final '/').

## GET /api/v2/echo/{message} or POST /api/v2/echo
Return back message.

Sample requests (both GET and POST)
```
curl -i -H 'Accept: application/json' http://192.168.59.103:8080/api/v2/echo/hello
curl -X POST  -H "Accept: Application/json" -H "Content-Type: application/json" http://localhost:8080/api/v2/echo -d '{"message":"hello"}'
```

## GET /api/v2/echo/{message}/{delay}
Return back message after {delayms} milliseconds

Sample request:
```
curl -i -H 'Accept: application/json' http://localhost:8080/api/v2/echo/hello/1000
```

## GET /api/v2/env/vars
Display REST server environment.

Sample request:
```
curl -i -H 'Accept: application/json' http://localhost:8080/api/v2/env/vars
```

## GET /api/v2/env/vars/{name}
Return the server ENV value for variable {name}.

Sample request:
```
curl -i -H 'Accept: application/json' http://localhost:8080/api/v2/env/vars/HOME
```

## GET /api/v2/env/hostname
Return the server hostname.

Sample request:
```
curl -i -H 'Accept: application/json' http://localhost:8080/api/v2/env/hostname
```

## GET /api/v2/env/pid
Return the REST server process ID (PID).

Sample request:
```
curl -i -H 'Accept: application/json' http://localhost:8080/api/v2/env/pid
```

## GET /api/v2/health
Health check service.

Sample request:
```
curl -i -H 'Accept: application/json' http://localhost:8080/api/v2/health
```

## GET /api/v2/health/{percentage}
Return a 'up' message {percentage}% time and an HTTP error 503 otherwise. The {percentage} is a float from 0 (0%) to 1 (100%).

Sample request:
```
curl -i -H 'Accept: application/json' http://localhost:8080/api/v2/health/0.5
```

## GET /api/v2/leak/{size}
Leak {size} bytes of memory.

Sample request:
```
curl -i -H 'Accept: application/json' http://localhost:8080/api/v2/leak/1024
```

## GET /api/v2/leak/free
Free all memory leaked by calls to /api/v2/leak/{size}.

Sample request:
```
curl -i -H 'Accept: application/json' http://localhost:8080/api/v2/leak/free
```

## GET /api/v2/calc/sum/{id}/{value}
Sum {value} to {id} counter in and return the new value. The data is stored in the instance memory by defaul( statefull) and can be set to Cassandra or Redis to emulate a stateless 12-factor behavior.

Sample request:
```
curl -i -H 'Accept: application/json' http://localhost:8080/api/v2/calc/sum/0/1
```

## GET /api/v2/calc/fibo-nth/{n}
Compute the n-th term of fibonacci", notes = "Compute the n-th term of fibonacci which is CPU intensive, expecially if {n} > 50.

Sample request:
```
curl -i -H 'Accept: application/json' http://localhost:8080/api/v2/calc/fibo-nth/42
```

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
--be-type=redis-cluster --be-opts='{"drivercfg":[{"host":"localhost","port":"6379"}]}'
```

The "drivercfg" JSON param is the IORedis client JSON connection object.
Any IORedis config is supported. This is basically a list of of the cluster nodes
to connect to in order to discover the cluster topology. A single node can be
configured and this enough, but to improve reliability it is advised to configure
three (3) nodes.

Note that the redis cluster client will try to connect to the cluster until it succeeds.

### Redis-sentinel
To use a redis with sentinels as a backend add the following options:
```
--be-type=redis-sentinel --be-opts='{"drivercfg":{ "sentinels": [ {"host": "104.131.130.202", "port":26379}, {"host": "104.236.144.145", "port":26379}, {"host": "104.236.145.222", "port":26379} ], "name": "mymaster" }}'
```

The "drivercfg" JSON param is the IORedis client JSON connection object.
Any IORedis config is supported. This is basically a list of the sentinels to
connect to in order to discover the whole list of sentinels, masters and slaves.
While a single sentinel can be configured it is advised to configure 3 sentinels
to improve reliability.

Note that the redis client will try to connect to the groups until it succeeds.

# Exposed services

Get Swagger definition at http://yourhost:8080/api/v2/swagger (this will return JSON or YAML based your Accept header).

# TODO
* Add txn logs
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
