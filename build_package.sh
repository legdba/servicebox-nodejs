#!/bin/bash
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
# Convert an application to a standardized package ready for
# install
##############################################################

# Ensure that when using pipes $? is non-zero if any of the pipe commands fail
# in order to allow || exit 1 to catch it and exit.
set -o pipefail

TYPE=""
APP_NAME=""
PKG_DIR=""

function print_help() {
    echo -e "\
usage: [options] --type=(npm|gradle-farjar) --app-name=NAME --pkg-dir=DIR\n\
\n\
Mandatory Parameters:\n\
  --type=TYPE           Build manager type, used to select the packaging\n\
                        mechanism; shall be any of (npm|gradle-farjar)\n\
\n\
                        TYPE='npm'\n\
                        Packaging a npm application to a '{APP_NAME}.tgz'\n\
                        archive with all the application source code.\n\
\n\
                        REQUIREMENTS:\n\
                        - current dir must be the package.json dir\n\
                        - application source must be in a subdir of the current\n\
                          directory, a single subdir\n\
                        - application source dir must be the basedir of the\n\
                          package.json 'main' property\n\
\n\
                        TYPE='gradle-farjar'\n\
                        Packaging a gradle fatJar application to a\n\
                        '{APP_NAME}.tgz' which ocntains only the fat jar\n\
                        renamed to '{APP_NAME}.jar' and without sub dir.
\n\
                        REQUIREMENTS:\n\
                        - current dir must be the gradlew script dir\n\
                        - current dir must be the build.gradle script dir\n\
                        - 'gradlew fatJAr' command must build the fat jar and\n\
                           outputs a 'fatjar: {filename}' line\n\
                        - the fat jar must be generated in ./build/libs (this\n\
                          is the default in gradle)\n\
\n\
  --app-name=APP_NAME   Name used for package generation; exact package name.\n\
\n\
  --pkg-dir=PKG_DIR     Directory where to generate the package.\n\
\n\
Optional Parameters:\n\
  -h,--help             Display this help.\n\
"
}

function package_npm() {
    # Get the dir with the application root
    APP_DIR=$(dirname $(cat package.json | egrep 'main" *:' | awk -F ":" '{ print $2 }' | awk -F '"' '{ print $2 }'))
    if [ -z $APP_DIR ]; then
        echo "cannot find source directory from package.json 'main' property"
        exit 2
    fi
    if [ ! -d $APP_DIR ]; then
        echo "directory not found: ${APP_DIR}"
        exit 2
    fi

    # Get license file if any
    if [ -f ./LICENSE ]; then
        LICENSE="LICENSE"
    else
        LICENSE=""
    fi

    # Archive and sha1
    PKG="${PKG_DIR}/${APP_NAME}.tgz"
    SHA="${PKG}.sha1"
    tar czf ${PKG} package.json ${LICENSE} ${APP_DIR}/* || exit 3
    sha1sum ${PKG} > ${SHA}

    echo "package : ${PKG}"
    echo "hash    : ${SHA}"
}

function package_gradle_fatjar() {
    # Build fat jar and get it's name
    FN=$(./gradlew fatJar | sed -n "s/ *fatjar *: *\(.*\)/\1/p")
    if [ $? -ne 0 ]; then
        exit 2
    fi

    JAR="${APP_NAME}.jar"
    PKG="${APP_NAME}.tgz"
    SHA="${PKG}.sha1"

    # Rename, archive and sha1
    cp ./build/libs/${FN} ${PKG_DIR}/${JAR} || exit 3
    cd ${PKG_DIR} || exit 3
    tar cvf ${PKG} ${JAR} || exit 3
    rm ${JAR} || exit 3
    sha1sum ${PKG} > ${SHA} || exit 3
    cd -

    echo "package : ${PKG_DIR}/${PKG}"
    echo "hash    : ${PKG_DIR}/${SHA}"
}

# Parse arguments
for i in "$@"
do
case $i in
    -h|--help)
        print_help
        exit 0
    ;;
    --type=*)
        TYPE="${i#*=}"
        shift # past argument
    ;;
    --app-name=*)
        APP_NAME="${i#*=}"
        shift # past argument
    ;;
    --pkg-dir=*)
       PKG_DIR="${i#*=}"
        shift # past argument
    ;;
    *)
        echo "invalid argument: $i" >&2
        exit 1
    ;;
esac
done
if [[ -z $TYPE ]] || [[ -z $APP_NAME ]] || [[ -z $PKG_DIR ]]; then
    MISSING=""
    if [[ -z $TYPE ]]; then
        MISSING="$MISSING --type"
    fi
    if [[ -z $APP_NAME ]]; then
        MISSING="$MISSING --app-name"
    fi
    if [[ -z $PKG_DIR ]]; then
        MISSING="$MISSING --pkg-dir"
    fi
    echo "missing required argument(s):${MISSING}" >&2
    exit 1
fi

#echo "TYPE            = ${TYPE}"
#echo "APP_NAME        = ${APP_NAME}"
#echo "PKG_DIR         = ${PKG_DIR}"

if [[ -n $1 ]]; then
    echo "Last line of file specified as non-opt/last argument:" >&2
    tail -1 $1
fi

case $TYPE in
    npm)
        package_npm
    ;;
    gradle-fatjar)
        package_gradle_fatjar
    ;;
    *)
        echo "invalid type $TYPE" >&2
        exit 1
    ;;
esac
