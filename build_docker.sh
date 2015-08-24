#!/bin/bash
###############################################################################
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
###############################################################################
# Build Docker from a tgz archive of the application and a
# Dockerfile template in docker/Dockerfile.in file.
#
# This script MUST be run from the git repo of the application.
#
# Requirements for the archive:
# - TODO
#
# Requirements for the Dockerfile.in
# - TODO
#
# ENV requirements:
# - TODO
#
# In addition to that the script auto-detect the application
# name version and branch based on git commands. The name is
# the repo name, the version is a mix of revision and hash,
# branch is the branch name with master set to an empty name.
#
###############################################################################

# Ensure that when using pipes $? is non-zero if any of the pipe commands fail
# in order to allow || exit 1 to catch it and exit.
set -o pipefail

###############################################################################
# Global variables
###############################################################################
LOCAL=NO
DRYRUN=NO

###############################################################################
# Functions
###############################################################################

# Print and run
function exe() {
    echo "\$ $@"
    if [ ${DRYRUN} == NO ]
    then
        eval "$@" || exit 2
    fi
}

# run without printing (convenient for commands with secrets)
function run() {
    if [ ${DRYRUN} == NO ]
    then
        eval "$@" || exit 2
    fi
}

# Build archive for NPM application (NodeJS)
function build_archive_via_npm() {
    echo "detected NPM build"
    NAME=$1
    DIR=$2
    exe "./build_package.sh --type=npm --app-name=${NAME} --pkg-dir=${DIR}"
}

# Build archive via Gradle as a fat jar
function build_archive_via_gradle_fatjar() {
    echo "detected GRADLE build"
    NAME=$1
    DIR=$2
    exe "./build_package.sh --type=gradle-fatjar --app-name=${NAME} --pkg-dir=${DIR}"
}

# Help
function print_help() {
    echo -e "\
usage: [options]\n\
Options:\n\
\n\
  --local               Do not push docker images to docker registry.\n\
\n\
  --dry                 Dry run; commands are echoed but not run.\n\
\n\
  -h,--help             Display this help.\n\
"
}


###############################################################################
# Main
###############################################################################

###############################################################################
# Parse arguments
for i in "$@"
do
case $i in
    -h|--help)
        print_help
        exit 0
    ;;
    --local)
        LOCAL=YES
        shift # past argument with no value
    ;;
    --dryrun)
        DRYRUN=YES
        shift # past argument with no value
    ;;
    -*)
        echo "invalid option ${i#*=}" >&2
        exit 1
    ;;
    *)
        # ignore, arguments, they are processed later (see below)
    ;;
esac
done

if [[ -n $1 ]]; then
    echo "too many arguments" >&2
    exit 1
fi

echo
echo "=== read arguments ==="
echo "LOCAL           = ${LOCAL}"
echo "DRYRUN          = ${DRYRUN}"

###############################################################################
# Handle dry-run mode
if [ $DRYRUN == YES ]
then
    echo
    echo "++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++"
    echo "+ DRY RUN MODE ENABLED; commands will be printed but NOT applied +"
    echo "++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++"
    echo
fi

###############################################################################
# Check required variable
echo
echo "=== checking environment ==="

# Get CircleCI auto-env
if [ -n ${CIRCLECI} ]; then
    ARTIFACTS_PATH=${CIRCLE_ARTIFACTS}
fi

# Check the env contains the Docker repo to push Docker image to
# use "quai.io" for quay.io
# use "hub.docker.com" for default docker hub
if [ -z "${DOCKER_REPO}" ]
then
    echo "please set DOCKER_REPO"
    exit 1
fi

# Check the env contains the Docker repo login to push Docker image to
if [ -z "${DOCKER_REPO_USER}" ]
then
    echo "please set DOCKER_REPO_USER"
    exit 1
fi

# Check the env contains the Docker repo token to push Docker image to
if [ -z "${DOCKER_REPO_TOKEN}" ]
then
    echo "please set DOCKER_REPO_TOKEN"
    exit 1
fi

# Check the env contains the Docker repo user email to push Docker image to
if [ -z "${DOCKER_REPO_EMAIL}" ]
then
    echo "please set DOCKER_REPO_EMAIL"
    exit 1
fi

# Check the env contains artifact path (auto set when using CircleCI, see above)
if [ -z "${ARTIFACTS_PATH}" ]
then
    echo "please set ARTIFACTS_PATH"
    exit 1
fi

###############################################################################
# Set all variables
echo
echo "=== collecting facts ==="

APP_REVISION=$(git rev-list --count HEAD)
APP_HASH=$(git rev-parse --short HEAD)
APP_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "${APP_BRANCH}" == "master" ]; then
    APP_BRANCH=""
else
    APP_BRANCH="-${APP_BRANCH}"
fi
APP_NAME=$(basename `git rev-parse --show-toplevel`)
APP_VERSION="r${APP_REVISION}-${APP_HASH}${APP_BRANCH}"
APP_FULLNAME="${APP_NAME}-${APP_VERSION}"
ARTIFACT="${APP_FULLNAME}"

echo
echo "APP_NAME       = ${APP_NAME}"
echo "APP_VERSION    = ${APP_VERSION}"
echo "APP_FULLNAME   = ${APP_FULLNAME}"
echo "APP_BRANCH     = ${APP_BRANCH}"
echo "BRANCH         = ${BRANCH}"
echo "VERSION        = ${VERSION}"
echo "ARTIFACT       = ${ARTIFACT}"
echo "ARTIFACTS_PATH = ${ARTIFACTS_PATH}"

###############################################################################
# Generate archive
echo
echo "=== generating archive ==="
if [ -f ./package.json ]; then
    build_archive_via_npm ${ARTIFACT} ${ARTIFACTS_PATH}
elif [ -f ./gradlew ]; then
    build_archive_via_gradle_fatjar ${ARTIFACT} ${ARTIFACTS_PATH}
else
    echo "failed to detect build framework" >&2
    exit 2
fi

# Check archive has been properly generated
if [ $DRYRUN == NO ]; then
    if [ ! -f ${ARTIFACTS_PATH}/${ARTIFACT}.tgz ]
    then
        echo file not found: ${ARTIFACTS_PATH}/${ARTIFACT}.tgz
        exit 1
    fi
    if [ ! -f ${ARTIFACTS_PATH}/${ARTIFACT}.tgz.sha1 ]
    then
        echo file not found: ${ARTIFACTS_PATH}/${ARTIFACT}.tgz.sha1
        exit 1
    fi
fi

###############################################################################
# Generate Dockerfile
echo
echo "=== Generating Dockerfile and docker resources archive ==="
exe "cat ./docker/Dockerfile.in \
     | sed \"s/__APP_FULLNAME__/$(echo ${APP_FULLNAME} | sed -e 's/[\/&]/\\&/g')/g\" \
     | sed \"s/__APP_NAME__/$(echo ${APP_NAME} | sed -e 's/[\/&]/\\&/g')/g\" \
     | sed \"s/__APP_VERSION__/$(echo ${APP_VERSION} | sed -e 's/[\/&]/\\&/g')/g\" \
     | sed \"s/__ARTIFACT__/$(echo ${ARTIFACT} | sed -e 's/[\/&]/\\&/g')/g\" \
     > ${ARTIFACTS_PATH}/Dockerfile"
exe "cp ./docker/* ${ARTIFACTS_PATH}/"

###############################################################################
# Generate Docker Image
echo
echo "=== generating Docker Image(s) ==="
exe "cd ${ARTIFACTS_PATH}"
if [ $LOCAL == NO ]
then
    echo "\$ docker login --username=${DOCKER_REPO_USER} --password=\${DOCKER_REPO_TOKEN} --email=${DOCKER_REPO_EMAIL} ${DOCKER_REPO}"
    run "docker login --username=${DOCKER_REPO_USER} --password=${DOCKER_REPO_TOKEN} --email=${DOCKER_REPO_EMAIL} ${DOCKER_REPO}"
fi
DOCKER_IMAGE_NAME="${DOCKER_REPO}/legdba/${APP_NAME}"
exe "docker build --pull=true --tag=\"${DOCKER_IMAGE_NAME}\" ."
exe "docker run -ti -P ${DOCKER_IMAGE_NAME} --help"
exe "cd -"

###############################################################################
# Push Docker images
echo
if [ $LOCAL == NO ]
then

    echo "=== pushing Docker Image(s) ==="
    
    # Push an image with a label set to the binary version
    DOCKER_IMAGE_LABEL="${DOCKER_IMAGE_NAME}:${APP_VERSION}"
    exe "docker tag -f ${DOCKER_IMAGE_NAME} ${DOCKER_IMAGE_LABEL}"
    exe "docker push ${DOCKER_IMAGE_LABEL}"
    
    if [ "${APP_BRANCH}" == "master" ]
    then
        # If we are on master push and image with label 'latest'
        DOCKER_IMAGE_LABEL="${DOCKER_IMAGE_NAME}:latest"
        exe "docker tag -f ${DOCKER_IMAGE_NAME} ${DOCKER_IMAGE_LABEL}"
        exe "docker push ${DOCKER_IMAGE_LABEL}"
    else
        # If we are NOT master push and image with label set to the branch name
        DOCKER_IMAGE_LABEL="${DOCKER_IMAGE_NAME}:${APP_BRANCH}"
        exe "docker tag -f ${DOCKER_IMAGE_NAME} ${DOCKER_IMAGE_LABEL}"
        exe "docker push ${DOCKER_IMAGE_LABEL}"
    fi
fi
