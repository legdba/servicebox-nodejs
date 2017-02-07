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
```shell
curl -i -H 'Accept: application/json' http://192.168.59.103:8080/api/v2/echo/hello
curl -X POST  -H "Accept: Application/json" -H "Content-Type: application/json" http://localhost:8080/api/v2/echo -d '{"message":"hello"}'
```

## GET /api/v2/echo/{message}/{delay}
Return back message after {delayms} milliseconds

Sample request:
```shell
curl -i -H 'Accept: application/json' http://localhost:8080/api/v2/echo/hello/1000
```

## GET /api/v2/env/vars
Display REST server environment.

Sample request:
```shell
curl -i -H 'Accept: application/json' http://localhost:8080/api/v2/env/vars
```

## GET /api/v2/env/vars/{name}
Return the server ENV value for variable {name}.

Sample request:
```shell
curl -i -H 'Accept: application/json' http://localhost:8080/api/v2/env/vars/HOME
```

## GET /api/v2/env/hostname
Return the server hostname.

Sample request:
```shell
curl -i -H 'Accept: application/json' http://localhost:8080/api/v2/env/hostname
```

## GET /api/v2/env/pid
Return the REST server process ID (PID).

Sample request:
```shell
curl -i -H 'Accept: application/json' http://localhost:8080/api/v2/env/pid
```

## GET /api/v2/health
Health check service.

Sample request:
```shell
curl -i -H 'Accept: application/json' http://localhost:8080/api/v2/health
```

## GET /api/v2/health/{percentage}
Return a 'up' message {percentage}% time and an HTTP error 503 otherwise. The {percentage} is a float from 0 (0%) to 1 (100%).

Sample request:
```shell
curl -i -H 'Accept: application/json' http://localhost:8080/api/v2/health/0.5
```

## GET /api/v2/leak/{size}
Leak {size} bytes of memory.

Sample request:
```shell
curl -i -H 'Accept: application/json' http://localhost:8080/api/v2/leak/1024
```

## GET /api/v2/leak/free
Free all memory leaked by calls to /api/v2/leak/{size}.

Sample request:
```shell
curl -i -H 'Accept: application/json' http://localhost:8080/api/v2/leak/free
```

## GET /api/v2/calc/sum/{id}/{n}
Sum {n} to {id} counter in and return the new value. The data is stored in the instance memory by default (statefull) and can be stored to Cassandra or Redis to emulate a stateless 12-factor behavior.

Sample request:
```shell
curl -i -H 'Accept: application/json' http://localhost:8080/api/v2/calc/sum/counter-0/1
```

## GET /api/v2/calc/fibo-nth/{n}
Compute the n-th term of fibonacci", notes = "Compute the n-th term of fibonacci which is CPU intensive, expecially if {n} > 50.

Sample request:
```shell
curl -i -H 'Accept: application/json' http://localhost:8080/api/v2/calc/fibo-nth/42
```

# Usage
The application runs either as a NodeJS application or as a Docker container.

## NodeJS
Get from GIT and run:
```shell
git clone https://github.com/legdba/servicebox-nodejs.git && cd servicebox-nodejs && npm install && npm test && npm start
```
Swagger API available at http://localhost:8080/swagger; use it to explore exposed services and how to use them.

Display help for more CLI details:
```shell
npm start -- --help
```

## Docker
Latest version is always available in Quai.io and can be used as a docker application:
```shell
docker run -ti -p :8080:8080 --rm=true quay.io/legdba/servicebox-nodejs:latest
```
Help available the usual way:
```shell
docker run -ti -p :8080:8080 --rm=true quay.io/legdba/servicebox-nodejs:latest --help
```
Swagger API documentation available on http://your_container_ip:8080/swagger

Note that in the docker registry each image is tagged with the branch name.
Initially the image tag contained the GIT commit ID, but this is a non-standard DockerHub/Quay.io feature and was available only through customer builds, which are a pain to manage and maintain.

## AWS Lambda (BETA)
Servicebox can be deployed an AWS Lambda function by setting the AWS credential in your environment (AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY):
```shell
export AWS_ACCESS_KEY_ID=xxx
export AWS_SECRET_ACCESS_KEY=xxx
```

And then running [Serverless Framework](https://serverless.com/):
```shell
npm install
./node_modules/.bin/serverless deploy
```

This will deploy the application as an AWS lambda function bound to an API Gateway endpoint as per the ```serverless.yml``` configuration. Serverless will display the HTTP endpoints once deployed. Those are servicebox REST endpoints; example:

```shell
curl -v https://xxxxxxxxxx.execute-api.us-west-2.amazonaws.com/dev/api/v2/echo/hello
```

NOTE: the default configuration exposes a public REST service that anybody could call without control.

The following environment variable can be set to configure servicebox while it runs as a lambda function:
```shell
LOG_LEVEL="debug|info|warn|error"
BACKEND_TYPE="memory|cassandra|redis-cluster|redis-sentinel|dynamodb"
BACKEND_OPTIONS='see documentation in the backend section'
```

### Known Problems
Lambda support is in beta only. The following problems are known:
- Calling ```serverless deploy``` with nodejs 4 cause the deployed function to be broken for some reason. Deployemnt is successfully tested with nodejs 7.5.0 only.
- There is no CI/CD on the lambda integration. Upon a git push the Circle+CI tests should be augmented to deploy a test function on AWS Lambda and test it with real requests.

### Testing Lambda locally
[Serverless Framework](https://serverless.com/) can run the lambda function locally for testing purpose:
```shell
./node_modules/.bin/serverless offline
```

Once it runs the servicebox lambda function is accessible via regular REST enpoints.

There is one significant difference with a real Lambda environment: internal state is lost between each call (this affects the calc/sum service). This should not be much a concern as Lambda functions shall be stateless and disposable; in that regard this serverless behavior is sane as it enforces the worse case scenario.

## Using a Backend
Servicebox needs a backend for the ```/api/v2/calc/sum``` service which increments a counter into a backend. This service is intended to test 12-factor type of interaction with a backend used for transient data such as a session cache. All backends implement an atomic increment that is totally stateless and share-nothing; the same counters can be increment by any number of servicebox instances.

### Memory
This is the default. No configuration needed.

### Cassandra
To use cassandra as a backend add the following options:
```shell
--be-type=cassandra --be-opts='{"contactPoints":["46.101.16.49","178.62.87.192"]}'
```
Plain-text credentials can be set this way (no other credentials supported so far):
```shell
--be-type cassandra --be-opts '{"contactPoints":["52.88.93.64","52.89.85.132","52.89.133.153"], "authProvider":{"type":"PlainTextAuthProvider", "username":"username", "password":"p@ssword"}}'
```
Set load balancing policies:
```shell
--be-type cassandra --be-opts '{"contactPoints":["52.88.93.64","52.89.85.132","52.89.133.153"], "loadBalancingPolicy":{"type":"DCAwareRoundRobinPolicy","localDC":"DC_name_"}}'
```

When running as a lambda function, the same value as the ```--be-opts``` can be set in ```BACKEND_OPTIONS``` environment variable.

### Redis Cluster
To use a redis cluster as a backend add the following options:
```shell
--be-type=redis-cluster --be-opts='{"drivercfg":[{"host":"localhost","port":"6379"}]}'
```

When running as a lambda function, the same value as the ```--be-opts``` can be set in ```BACKEND_OPTIONS``` environment variable.

The "drivercfg" JSON param is the IORedis client JSON connection object.
Any IORedis config is supported. This is basically a list of of the cluster nodes
to connect to in order to discover the cluster topology. A single node can be
configured and this enough, but to improve reliability it is advised to configure
three (3) nodes.

Note that the redis cluster client will try to connect to the cluster until it succeeds.

### Redis Sentinel
To use a redis with sentinels as a backend add the following options:
```shell
--be-type=redis-sentinel --be-opts='{"drivercfg":{ "sentinels": [ {"host": "104.131.130.202", "port":26379}, {"host": "104.236.144.145", "port":26379}, {"host": "104.236.145.222", "port":26379} ], "name": "mymaster" }}'
```

When running as a lambda function, the same value as the ```--be-opts``` can be set in ```BACKEND_OPTIONS``` environment variable.

The "drivercfg" JSON param is the IORedis client JSON connection object.
Any IORedis config is supported. This is basically a list of the sentinels to
connect to in order to discover the whole list of sentinels, masters and slaves.
While a single sentinel can be configured it is advised to configure 3 sentinels
to improve reliability.

Note that the redis client will try to connect to the groups until it succeeds.

### DynamodDB

To use DynamoDB as a backend add the following options (make sure to replace value with your key, your secret and your region):
```shell
--be-type=dynamodb --be-opts='{"accessKeyId": "yourkey", "secretAccessKey": "yoursecret","region": "us-west-2", "apiVersion": "2012-08-10"}'
```

When running as a lambda function, the same value as the ```--be-opts``` can be set in ```BACKEND_OPTIONS``` environment variable.

The DynamoDB shall have a ```servicebox``` table with a ```string``` ```id``` attribute as the primary key.

A local DynamoDB can be used for testing with this sample set of options:
```shell
--be-type=dynamodb --be-opts='{"region":"us-west-2","apiVersion":"2012-08-10","endpoint":{"protocol":"http:","host":"localhost:8000","port":8000,"hostname":"localhost","pathname":"/","path":"/","href":"http://localhost:8000/"}}'
```

A local DynamoDB can be run this way:
```shell
wget http://dynamodb-local.s3-website-us-west-2.amazonaws.com/dynamodb_local_latest.tar.gz
mkdir dynamodb
cd dynamodb
tar xvzf ../dynamodb_local_latest.tar.gz
java -Djava.library.path=./DynamoDBLocal_lib/ -jar DynamoDBLocal.jar -inMemory
```

The servicebox table can be created with this code snippet (run with nodejs):
```javascript
var aws = require('aws-sdk');
var opts = {"region":"localhost","apiVersion":"2012-08-10","endpoint":{"protocol":"http:","host":"localhost:8000","port":8000,"hostname":"localhost","pathname":"/","path":"/","href":"http://localhost:8000/"}};
aws.config.update(opts);
var dynamodb = new aws.DynamoDB(opts);

var createdb_params = {
  TableName: 'servicebox',
  AttributeDefinitions: [
       { AttributeName: 'id', AttributeType: 'S' }
       ],
  KeySchema:[
       { AttributeName: 'id', KeyType: 'HASH' }
  ],
  ProvisionedThroughput: {ReadCapacityUnits: 5, WriteCapacityUnits: 5},
};
dynamodb.createTable(createdb_params, function(err, data) {
  if (err)
    console.log(err, err.stack); // an error occurred
  else {
    console.log('created servicebox table');
    console.log(data);
  }
});
```

# Exposed services
Get Swagger definition at http://yourhost:8080/api/v2/swagger (this will return JSON or YAML based your Accept header).

# Security
Debug log level will log backend configuration strings, including credentials. Make sure NOT to use debug where this is a security issue.

# TODO
* Add txn logs
* Add support for Cassandra cluster options (same as in servicebod-jaxrs)

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
