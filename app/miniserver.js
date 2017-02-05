'use strict'
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');
const app = express();

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
app.use(function(req, res, next){
    req.locals = {
        backend: require('./api/helpers/memory_backend').MemoryBackend()
    };
    next();
});

// Init swagger and express
var SwaggerExpress = require('swagger-express-mw');
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

// Export your express server so you can import it in the lambda function.
module.exports = app;
