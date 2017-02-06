'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');
const app = express();

var SwaggerExpress = require('swagger-express-mw');

var check_config = function(cfg) {
  var loglevels = ['debug', 'info', 'warn', 'error'];
  if ( ! loglevels.includes(cfg.log.level) ) {
    return new Error("invalid loglevel: '" + cfg.log.level + "'; valid values are '" + loglevels.join("', '") + "'");
  }
  if ( ! backend_factory.list().includes(cfg.backend.type)) {
    return new Error("invalid backend type: '" + cfg.backend.type + "'; valid values are '" + backend_factory.list().join("', '") + "'");
  }
}

var lugg = require('lugg');
lugg.init({level: 'error'});
// FIXME: if the following line is BEFORE lugg.init() it throws exception, which means that the underlying code smells :(
const backend_factory = require('./backend_factory');

const awsServerlessExpress = require('aws-serverless-express');
var server = null;

/**
 * Init the express server and it's dependencies.
 * TODO: refactor to share with server.js
 * @method init_server
 * @param cb function(err, server) callback
 */
var init_server = function init_server(cb) {

  var config = require('config');
  var err = check_config(config);
  if (err) {
    cb(err, null);
  } else {
    lugg.init({level: config.get('log.level')});
    var log = lugg('servicebox');
    log.debug('DEBUG enabled');
    log.info('INFO enabled');

    app.use(cors());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(awsServerlessExpressMiddleware.eventContext());

    // Use ephemeral backend for testing purpose so far
    var backend = require('./api/helpers/memory_backend').MemoryBackend();
    log.info('initializating backend...');
    backend.init({}, function init_backend_callback(err) {
      if (err) {
        cb(err, null);
      } else {
        log.info('backend initialized');

        // Add backend to request context
        app.use(function inject_backend_into_context(req, res, next){
            req.locals = {
                backend: backend
            };
            next();
        });

        // Init swagger and express
        var express_config = {
            appRoot: __dirname // required config
        };
        SwaggerExpress.create(express_config, function init_swagger_callback(err, swaggerExpress) {
            if (err) {
              cb(err, null);
            } else {
              // install middleware
              swaggerExpress.register(app);
              var srv = awsServerlessExpress.createServer(app);
              cb(null, srv);
            }
        });
      }
    });
  }
}

/**
 * Calls back with an instance of AwsServerlessExpress.createServer() when ready;
 * The server is built only once and then immediatelly reused every time.
 * @method get_server
 * @param cb function(err, server) callback
 */
var get_server = function get_server(cb) {
  if (server) {
    cb(null, server);
  } else {
    init_server(function(err, srv){
      if (err) {
        cb(err, null);
      } else {
        server = srv;
        cb(null, server);
      }
    });
  }
}

/**
 * AWS Lambda exposed function.
 * Delegate to an Express application via an AWS express proxy.
 * Call to express is defered until express and it's dependencies
 * are successfully initialized.
 */
exports.handler = function(event, context) {
  // Express+Swagger+Backend creation requires async tasks => need to defer
  // the call to awsServerlessExpress.proxy until everything is ready
  get_server(function(err, server) {
    if (err) {
      console.error(err);
      process.exit(1);
    } else {
      awsServerlessExpress.proxy(server, event, context);
    }
  });
}
