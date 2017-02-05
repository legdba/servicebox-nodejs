'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');
const app = express();

var SwaggerExpress = require('swagger-express-mw');

var lugg = require('lugg');
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
