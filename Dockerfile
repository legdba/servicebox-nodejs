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
FROM node:7.5.0

# Prepare for dir
RUN mkdir -p /opt/node-app
WORKDIR /opt/node-app

# Install all dependencies
COPY package.json /opt/node-app/
RUN npm install

# Add source code and test
COPY app/ /opt/node-app/app/
COPY LICENSE NOTICE /opt/node-app/app/
RUN npm test && \
    node app/server.js --help

# Prepare for service
CMD ["-p", "8080"]
ENTRYPOINT [\
    "npm",\
    "start",\
    "--"\
    ]
EXPOSE 8080

# Set to production mode (only after npm test to avoid mocha tests to fail)
ENV NODE_ENV production
