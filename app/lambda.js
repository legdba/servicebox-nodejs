'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');
const app = express();

var SwaggerExpress = require('swagger-express-mw');

/**
 * AWS Lambda support env variable BUT for some weird
 * (and undocumented) reason commas are not allowed in
 * the values. This is obviously VERY annoying as it is
 * convenient to pass JSON docs as en variables.
 *
 * Until this ridiculous limitation is removed, commas
 * Can be replaced with '=comma='.
 */
var unescape_commas = function unescape_commas(str) {
  return str.replace(new RegExp('=comma=', 'g'), ',');
}

var check_config = function(cfg) {
  var loglevels = ['debug', 'info', 'warn', 'error'];
  if ( loglevels.indexOf(cfg.log.level) == -1) {
    return new Error("invalid loglevel: '" + cfg.log.level + "'; valid values are '" + loglevels.join("', '") + "'");
  }
}

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
    var lugg = require('lugg');
    lugg.init({level: config.get('log.level')});
    var log = lugg('servicebox');
    log.debug('DEBUG enabled');
    log.info('INFO enabled');
    log.warn('WARN enabled');

    app.use(cors());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(awsServerlessExpressMiddleware.eventContext());

    // Init backend as per configuration
    const backend_factory = require('./backend_factory');
    var betype = config.get('backend.type');
    var beopts = "" || config.get('backend.options');
    beopts = unescape_commas(beopts);
    log.debug('beopts: %s', beopts);
    beopts = JSON.parse(beopts);
    backend_factory.create(betype, beopts, function init_backend_callback(err, backend) {
      if (err) {
        cb(err, null);
      } else {
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
      console.error(err, err.stack);
      process.exit(1);
    } else {
      awsServerlessExpress.proxy(server, event, context);
    }
  });
}
