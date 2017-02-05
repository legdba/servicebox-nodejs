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
const backend_factory = require('./backend_factory').BackendFactory();

var config = require('config');
var err = check_config(config);
if (err) {
  console.error(err);
  process.exit(1);
}

lugg.init({level: 'debug'});
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
    log.error('backend init failed: ' + e);
    process.exit(2);
  }

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
          log.error(err, "failed to init swagger");
          process.exit(2);
      } else {
          // install middleware
          swaggerExpress.register(app);
      }
  });
});

const awsServerlessExpress = require('aws-serverless-express');
const server = awsServerlessExpress.createServer(app);

exports.handler = (event, context) => awsServerlessExpress.proxy(server, event, context);
